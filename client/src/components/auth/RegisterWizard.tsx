import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, MapPin, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MOROCCAN_CITIES } from "@shared/constants";

// Fix for default Leaflet icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;


const step1Schema = z.object({
    role: z.enum(["client", "provider"]),
    fullName: z.string().min(3, "Name is too short"),
    username: z.string().min(3, "Username must be at least 3 chars"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 chars"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
});

const step2Schema = z.object({
    phone: z.string().optional(),
    bio: z.string().optional(),
    // profileImage handled manually
});

const step3Schema = z.object({
    city: z.string().min(1, "Please select a city")
});

// We'll validate step by step, but submit one big object
const steps = [
    { id: 1, title: "Account", description: "Choose your role & credentials" },
    { id: 2, title: "Profile", description: "Add a photo & details" },
    { id: 3, title: "Location", description: "Where are you located?" }
];

export function RegisterWizard({ onSuccess }: { onSuccess: () => void }) {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState<"client" | "provider">("client");
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

    const { register: registerUser, isRegistering } = useAuth();

    // Forms for each step
    const form = useForm({
        resolver: zodResolver(step === 1 ? step1Schema : step === 2 ? step2Schema : step3Schema),
        defaultValues: {
            role: "client",
            fullName: "",
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
            phone: "",
            bio: "",
            city: "",
            serviceCategory: ""
        }
    });

    // Watch role to update UI
    const watchedRole = form.watch("role");
    useEffect(() => {
        setRole(watchedRole as "client" | "provider");
    }, [watchedRole]);


    const nextStep = async () => {
        const isValid = await form.trigger();
        if (isValid) {
            setStep(s => Math.min(s + 1, 3));
        }
    };

    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const LocationMarker = () => {
        useMapEvents({
            click(e) {
                setLocation(e.latlng);
            },
        });
        return location ? <Marker position={location} /> : null;
    };

    const onSubmit = async (data: any) => {
        try {
            if (role === 'provider' && !data.serviceCategory) {
                form.setError("serviceCategory", { message: "Category is required" });
                return;
            }

            // Construct FormData
            const formData = new FormData();
            Object.keys(data).forEach(key => {
                if (key !== 'confirmPassword') {
                    formData.append(key, data[key]);
                }
            });

            if (selectedFile) {
                formData.append("profileImage", selectedFile);
            }

            if (location) {
                formData.append("latitude", location.lat.toString());
                formData.append("longitude", location.lng.toString());
            }

            // Need to adjust how useAuth calls register since it expects a specific object structure
            // We are hacking it a bit here: useAuth calls fetch with JSON.stringify usually.
            // But we need Multipart/Form-Data. 
            // SOLUTION: We will call the API directly here instead of using the useAuth wrapper which might force JSON.
            // Or we can modify useAuth, but simpler to do fetch here.

            const res = await fetch("/api/auth/register", {
                method: "POST",
                body: formData, // fetch automatically sets Content-Type to multipart/form-data
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Registration failed");
            }

            const user = await res.json();

            // Manually update query cache if needed, or just reload/redirect
            window.location.href = "/login"; // Force reload to clear state and go to login
            onSuccess();

        } catch (e: any) {
            console.error(e);
            form.setError("root", { message: e.message });
        }
    };


    return (
        <div className="w-full max-w-lg mx-auto">
            {/* Progress Bar */}
            <div className="mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
                {/* Animated Progress Line */}
                <motion.div
                    className="absolute top-1/2 left-0 h-1 bg-primary -z-10 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${((step - 1) / 2) * 100}%` }}
                    transition={{ duration: 0.5 }}
                />

                <div className="flex justify-between">
                    {steps.map((s) => (
                        <div key={s.id} className="flex flex-col items-center gap-2 bg-white px-2">
                            <motion.div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${step >= s.id ? "bg-primary text-white border-primary" : "bg-white text-gray-400 border-gray-200"}`}
                                animate={{ scale: step === s.id ? 1.1 : 1 }}
                            >
                                {step > s.id ? <Check className="w-5 h-5" /> : s.id}
                            </motion.div>
                            <span className={`text-xs font-medium ${step >= s.id ? "text-primary" : "text-gray-400"}`}>{s.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            <Card className="shadow-xl bg-white/95 backdrop-blur border-t-4 border-t-primary">
                <Form {...form}>
                    <form className="space-y-4">
                        <CardHeader>
                            <CardTitle>{steps[step - 1].title}</CardTitle>
                            <CardDescription>{steps[step - 1].description}</CardDescription>
                        </CardHeader>

                        <CardContent className="min-h-[300px]">
                            <AnimatePresence mode="wait">

                                {/* STEP 1: ACCOUNT */}
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={form.control}
                                            name="role"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex bg-secondary p-1 rounded-lg">
                                                        <button
                                                            type="button"
                                                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${field.value === 'client' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                                                            onClick={() => field.onChange('client')}
                                                        >
                                                            I want to Hire
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${field.value === 'provider' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                                                            onClick={() => field.onChange('provider')}
                                                        >
                                                            I want to Work
                                                        </button>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField control={form.control} name="fullName" render={({ field }) => (
                                            <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />

                                        <FormField control={form.control} name="username" render={({ field }) => (
                                            <FormItem><FormLabel>Username</FormLabel><FormControl><Input placeholder="johndoe" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />

                                        <FormField control={form.control} name="email" render={({ field }) => (
                                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="password" render={({ field }) => (
                                                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                                <FormItem><FormLabel>Confirm</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 2: PROFILE */}
                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-primary transition-colors cursor-pointer group">
                                                {previewImage ? (
                                                    <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Upload className="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors" />
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={handleImageChange}
                                                />
                                            </div>
                                            <span className="text-sm text-muted-foreground">Tap to upload profile picture</span>
                                        </div>

                                        <FormField control={form.control} name="phone" render={({ field }) => (
                                            <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="+212..." {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />

                                        {role === 'provider' && (
                                            <FormField control={form.control} name="bio" render={({ field }) => (
                                                <FormItem><FormLabel>Short Bio</FormLabel><FormControl><Textarea placeholder="Tell clients about your experience..." {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        )}
                                    </motion.div>
                                )}

                                {/* STEP 3: LOCATION */}
                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        {role === 'provider' && (
                                            <FormField control={form.control} name="serviceCategory" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Service Category</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Plumbing">Plumbing</SelectItem>
                                                            <SelectItem value="Electrician">Electrician</SelectItem>
                                                            <SelectItem value="Cleaning">Cleaning</SelectItem>
                                                            <SelectItem value="Beauty">Beauty</SelectItem>
                                                            <SelectItem value="Moving">Moving</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        )}

                                        <FormField control={form.control} name="city" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>City</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {MOROCCAN_CITIES.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <div className="space-y-2">
                                            <FormLabel>Pin Exact Location</FormLabel>
                                            <div className="h-[200px] w-full rounded-lg overflow-hidden border">
                                                <MapContainer center={[33.5731, -7.5898]} zoom={13} style={{ height: "100%", width: "100%" }}>
                                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                    <LocationMarker />
                                                </MapContainer>
                                            </div>
                                            <p className="text-xs text-muted-foreground"><MapPin className="w-3 h-3 inline mr-1" /> Tap map to set location</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {form.formState.errors.root && (
                                <div className="text-red-500 text-sm font-medium p-2 bg-red-50 rounded">{form.formState.errors.root.message}</div>
                            )}
                        </CardContent>

                        <CardFooter className="flex justify-between">
                            {step > 1 ? (
                                <Button type="button" variant="outline" onClick={prevStep}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                            ) : (
                                <div></div>
                            )}

                            {step < 3 ? (
                                <Button type="button" onClick={nextStep}>Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                            ) : (
                                <Button type="button" onClick={form.handleSubmit(onSubmit)} className="bg-primary" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                                </Button>
                            )}
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
