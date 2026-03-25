import { useState, useEffect, useMemo } from "react";
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

// --- Leaflet Icon Fix ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Schemas ---

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
});

const createStep3Schema = (role: string) => {
    return z.object({
        city: z.string().min(1, "Please select a city"),
        serviceCategory: role === 'provider'
            ? z.string().min(1, "Category is required")
            : z.string().optional()
    });
};

// Step 4 is specialized for working hours
const workingHoursSchema = z.record(z.string(), z.object({
    active: z.boolean(),
    start: z.string(),
    end: z.string()
}));

export function RegisterWizard({ onSuccess }: { onSuccess: () => void }) {
    const [step, setStep] = useState(1);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [currentRole, setCurrentRole] = useState<string>("client");

    const { register: registerUser, isRegistering } = useAuth();

    const form = useForm({
        resolver: async (values, context, options) => {
            if (step === 1) return zodResolver(step1Schema)(values, context, options);
            if (step === 2) return zodResolver(step2Schema)(values, context, options);
            if (step === 3) return zodResolver(createStep3Schema(values.role || "client"))(values, context, options);
            return { values, errors: {} }; // No strict validation for Step 4 JSON yet
        },
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
            serviceCategory: "",
            workingHours: {
                monday: { active: true, start: "09:00", end: "18:00" },
                tuesday: { active: true, start: "09:00", end: "18:00" },
                wednesday: { active: true, start: "09:00", end: "18:00" },
                thursday: { active: true, start: "09:00", end: "18:00" },
                friday: { active: true, start: "09:00", end: "18:00" },
                saturday: { active: false, start: "09:00", end: "18:00" },
                sunday: { active: false, start: "09:00", end: "18:00" }
            }
        },
        mode: "onChange"
    });

    const watchedRole = form.watch("role");
    useEffect(() => {
        if (watchedRole) setCurrentRole(watchedRole);
    }, [watchedRole]);

    const steps = useMemo(() => {
        const base = [
            { id: 1, title: "Account", description: "Choose your role & credentials" },
            { id: 2, title: "Profile", description: "Add a photo & details" },
            { id: 3, title: "Location", description: "Where are you located?" }
        ];
        if (currentRole === 'provider') {
            base.push({ id: 4, title: "Hours", description: "When do you work?" });
        }
        return base;
    }, [currentRole]);

    const nextStep = async () => {
        const isValid = await form.trigger();
        if (isValid) {
            setStep(s => Math.min(s + 1, steps.length));
        }
    };

    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreviewImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const LocationController = () => {
        const map = useMapEvents({
            click(e) {
                setLocation(e.latlng);
                form.clearErrors("root");
            },
        });

        const currentCity = form.watch("city");
        useEffect(() => {
            if (!currentCity) return;
            const cityCoords: Record<string, [number, number]> = {
                "Casablanca": [33.5731, -7.5898], "Rabat": [34.0209, -6.8416], "Marrakech": [31.6295, -7.9811],
                "Tangier": [35.7595, -5.8340], "Agadir": [30.4278, -9.5981], "Fes": [34.0181, -5.0078],
                "Meknes": [33.8732, -5.5407], "Oujda": [34.6814, -1.9086], "Tetouan": [35.5785, -5.3684], "Nador": [35.1681, -2.9335]
            };
            if (cityCoords[currentCity]) map.flyTo(cityCoords[currentCity], 13);
        }, [currentCity, map]);

        return location ? <Marker position={location} /> : null;
    };

    const onSubmit = async (data: any) => {
        try {
            const allData = form.getValues();
            console.log("Frontend onSubmit allData:", allData);
            console.log("Working Hours value:", allData.workingHours);

            const formData = new FormData();
            Object.keys(allData).forEach(key => {
                // @ts-ignore
                const value = allData[key];
                if (key === 'workingHours') {
                    const stringified = JSON.stringify(value);
                    console.log("Appending workingHours as:", stringified);
                    formData.append(key, stringified);
                } else if (key !== 'confirmPassword' && value !== undefined && value !== null && value !== "") {
                    formData.append(key, value);
                }
            });

            if (selectedFile) formData.append("profileImage", selectedFile);
            if (location) {
                formData.append("latitude", location.lat.toString());
                formData.append("longitude", location.lng.toString());
            }

            const res = await fetch("/api/register", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Registration failed");
            }

            // window.location.href = "/login"; // Removed to prevent full reload
            onSuccess();
        } catch (e: any) {
            console.error(e);
            form.setError("root", { message: e.message });
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.target instanceof HTMLTextAreaElement) return;
        if (e.key === "Enter") {
            e.preventDefault();
            if (step < steps.length) await nextStep();
            else form.handleSubmit(onSubmit)();
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto">
            <div className="mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
                <motion.div
                    className="absolute top-1/2 left-0 h-1 bg-primary -z-10 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
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
                    <form className="space-y-4" onKeyDown={handleKeyDown}>
                        <CardHeader>
                            <CardTitle>{steps[step - 1].title}</CardTitle>
                            <CardDescription>{steps[step - 1].description}</CardDescription>
                        </CardHeader>

                        <CardContent className="min-h-[300px]">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="role"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex bg-secondary p-1 rounded-lg">
                                                        <button type="button" className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${field.value === 'client' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-900'}`} onClick={() => field.onChange('client')}>I want to Hire</button>
                                                        <button type="button" className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${field.value === 'provider' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-900'}`} onClick={() => field.onChange('provider')}>I want to Work</button>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="username" render={({ field }) => (<FormItem><FormLabel>Username</FormLabel><FormControl><Input placeholder="johndoe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirm</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-primary transition-colors cursor-pointer group">
                                                {previewImage ? <img src={previewImage} alt="Profile" className="w-full h-full object-cover" /> : <Upload className="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors" />}
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                                            </div>
                                            <span className="text-sm text-muted-foreground">Tap to upload profile picture</span>
                                        </div>
                                        <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="+212..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        {currentRole === 'provider' && (
                                            <FormField control={form.control} name="bio" render={({ field }) => (<FormItem><FormLabel>Short Bio</FormLabel><FormControl><Textarea placeholder="Tell clients about your experience..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        )}
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                        {currentRole === 'provider' && (
                                            <FormField control={form.control} name="serviceCategory" render={({ field }) => (
                                                <FormItem><FormLabel>Service Category</FormLabel><Select onValueChange={(val) => { field.onChange(val); form.clearErrors("serviceCategory"); }} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl><SelectContent>{["Plumbing", "Electrician", "Cleaning", "Beauty", "Moving"].map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                                            )} />
                                        )}
                                        <FormField control={form.control} name="city" render={({ field }) => (
                                            <FormItem><FormLabel>City</FormLabel><Select onValueChange={(val) => { field.onChange(val); form.clearErrors("city"); }} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger></FormControl><SelectContent>{MOROCCAN_CITIES.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                        )} />
                                        <div className="space-y-2">
                                            <FormLabel>Pin Exact Location</FormLabel>
                                            <div className="h-[200px] w-full rounded-lg overflow-hidden border relative z-0">
                                                <MapContainer key="register-map" center={[33.5731, -7.5898]} zoom={13} style={{ height: "100%", width: "100%" }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><LocationController /></MapContainer>
                                            </div>
                                            <p className="text-xs text-muted-foreground"><MapPin className="w-3 h-3 inline mr-1" /> Tap map to set location</p>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 4 && currentRole === 'provider' && (
                                    <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                        <div className="grid gap-3">
                                            {Object.entries(form.watch("workingHours")).map(([day, hours]: [string, any]) => (
                                                <div key={day} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 border border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={hours.active}
                                                            className="w-4 h-4 text-primary"
                                                            onChange={(e) => {
                                                                const currentHours = form.getValues("workingHours");
                                                                // @ts-ignore
                                                                form.setValue(`workingHours.${day}`, { ...hours, active: e.target.checked });
                                                            }}
                                                        />
                                                        <span className="capitalize font-medium text-sm w-20">{day}</span>
                                                    </div>
                                                    {hours.active && (
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="time"
                                                                className="h-8 w-24 text-xs"
                                                                value={hours.start}
                                                                onChange={(e) => {
                                                                    // @ts-ignore
                                                                    form.setValue(`workingHours.${day}`, { ...hours, start: e.target.value });
                                                                }}
                                                            />
                                                            <span className="text-gray-400">-</span>
                                                            <Input
                                                                type="time"
                                                                className="h-8 w-24 text-xs"
                                                                value={hours.end}
                                                                onChange={(e) => {
                                                                    // @ts-ignore
                                                                    form.setValue(`workingHours.${day}`, { ...hours, end: e.target.value });
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {form.formState.errors.root && (
                                <div className="text-red-500 text-sm font-medium p-2 bg-red-50 rounded mt-4">{form.formState.errors.root.message}</div>
                            )}
                        </CardContent>

                        <CardFooter className="flex justify-between">
                            {step > 1 ? <Button type="button" variant="outline" onClick={prevStep}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button> : <div></div>}
                            {step < steps.length ? <Button type="button" onClick={nextStep}>Next <ArrowRight className="w-4 h-4 ml-2" /></Button> : (
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
