import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateProfile } from "@/hooks/use-providers";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge"; // Ensure Badge is available or use a div
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import {
  Loader2,
  UploadCloud,
  X,
  MapPin,
  Briefcase,
  User as UserIcon,
  Edit2,
  Check,
  ArrowLeft,
  Bell,
  LayoutDashboard
} from "lucide-react";
import { Link } from "wouter";
import { usePush } from "@/hooks/use-push";
import { useLanguage } from "@/hooks/use-language";
import { LocationPicker } from "@/components/LocationPicker";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { t, language } = useLanguage();
  const { subscribe, isSubscribing } = usePush();
  const updateProfile = useUpdateProfile();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm({
    defaultValues: {
      bio: "",
      yearsOfExperience: 0,
      profileImage: "",
      portfolioImages: [] as string[],
      latitude: null as number | null,
      longitude: null as number | null,
      workingHours: {
        monday: { active: true, start: "09:00", end: "17:00" },
        tuesday: { active: true, start: "09:00", end: "17:00" },
        wednesday: { active: true, start: "09:00", end: "17:00" },
        thursday: { active: true, start: "09:00", end: "17:00" },
        friday: { active: true, start: "09:00", end: "17:00" },
        saturday: { active: false, start: "09:00", end: "17:00" },
        sunday: { active: false, start: "09:00", end: "17:00" },
      }
    }
  });

  // Sync form with user data when loaded
  useEffect(() => {
    if (user?.providerProfile) {
      form.reset({
        bio: user.providerProfile.bio || "",
        yearsOfExperience: user.providerProfile.yearsOfExperience || 0,
        profileImage: user.providerProfile.profileImage || "",
        portfolioImages: user.providerProfile.portfolioImages || [],
        latitude: user.providerProfile.latitude,
        longitude: user.providerProfile.longitude,
        workingHours: (user.providerProfile.workingHours as any) || {
          monday: { active: true, start: "09:00", end: "17:00" },
          tuesday: { active: true, start: "09:00", end: "17:00" },
          wednesday: { active: true, start: "09:00", end: "17:00" },
          thursday: { active: true, start: "09:00", end: "17:00" },
          friday: { active: true, start: "09:00", end: "17:00" },
          saturday: { active: false, start: "09:00", end: "17:00" },
          sunday: { active: false, start: "09:00", end: "17:00" },
        },
      });
    }
  }, [user]);

  const onSubmit = async (data: any) => {
    try {
      await updateProfile.mutateAsync(data);
      // Exit edit mode on success
      setIsEditing(false);
      // toast handled in hook or we can add here (missing hook import, but not critical for logic)
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const getUploadParams = async (file: File) => {
    const res = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type,
      }),
    });
    const { uploadURL } = await res.json();
    return {
      method: "PUT" as const,
      url: uploadURL,
      headers: { "Content-Type": file.type },
    };
  };

  if (isLoading || !user) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading profile...</div>;

  if (user.role !== "provider") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center mb-8">
            <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-white shadow-lg">
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{user.fullName[0]}</AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-bold font-display">{user.fullName}</h1>
            <Badge variant="secondary" className="mt-2">{t("client") || "Client"}</Badge>
          </div>

          <Card className="shadow-md">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> {t("notifications") || "Notifications"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{t("pushNotifications") || "Push Notifications"}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === 'ar'
                      ? 'احصل على إشعارات فورية عند وصول رسائل جديدة أو تحديثات في الخدمة.'
                      : 'Get instant alerts for new messages and service updates.'}
                  </p>
                </div>
                <Button
                  onClick={subscribe}
                  disabled={isSubscribing}
                  className="shrink-0"
                >
                  {isSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                  {language === 'ar' ? 'تفعيل' : 'Enable'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Helper for image URLs
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return path;
    return `/uploads/${path}`;
  };

  const LocalImageUpload = ({ onUpload, label, className }: { onUpload: (url: string) => void, label: React.ReactNode, className?: string }) => {
    const [uploading, setUploading] = useState(false);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.url) {
          onUpload(data.url);
        }
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setUploading(false);
      }
    };

    return (
      <div className={className}>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id={`file-${label}`}
          onChange={handleFile}
        />
        <label htmlFor={`file-${label}`}>
          <Button type="button" variant="outline" className="cursor-pointer" disabled={uploading} asChild>
            <span>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
              {label}
            </span>
          </Button>
        </label>
      </div>
    );
  };

  const currentProfileImage = form.watch("profileImage");
  const currentPortfolio = form.watch("portfolioImages");

  // --- View Mode ---
  if (!isEditing) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header / Hero */}
          <Card className="mb-8 border-none shadow-lg overflow-hidden relative bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="absolute top-0 right-0 p-4 flex gap-2">
              <Link href="/provider/dashboard">
                <Button variant="outline" className="gap-2 shadow-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <LayoutDashboard className="w-4 h-4" />
                  {language === 'ar' ? 'لوحة الأداء' : 'Performance'}
                </Button>
              </Link>
              <Button onClick={() => setIsEditing(true)} variant="secondary" className="gap-2 shadow-sm">
                <Edit2 className="w-4 h-4" /> Edit Profile
              </Button>
            </div>
            <CardContent className="pt-12 pb-8 flex flex-col md:flex-row items-center gap-8">
              <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                <AvatarImage src={getImageUrl(user.providerProfile?.profileImage)} />
                <AvatarFallback className="text-4xl bg-primary text-primary-foreground">{user.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left space-y-2">
                <h1 className="text-3xl font-bold font-display">{user.fullName}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary">
                    {user.providerProfile?.serviceCategory || "Provider"}
                  </span>
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {user.providerProfile?.citiesServed?.[0] || "Morocco"}
                  </span>
                </div>
                <p className="max-w-xl text-muted-foreground">
                  {user.providerProfile?.bio || "No bio added yet."}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Details */}
            <div className="space-y-8">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> Professional Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="font-medium">{user.providerProfile?.yearsOfExperience || 0} Years</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Joined</span>
                    <span className="font-medium">2024</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-green-600 font-medium flex items-center gap-1"><Check className="w-4 h-4" /> Active</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-primary/20">
                <CardHeader className="bg-primary/5 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" /> Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-4">
                    Receive push notifications for new bookings and messages.
                  </p>
                  <Button
                    onClick={subscribe}
                    disabled={isSubscribing}
                    className="w-full h-9 text-sm"
                    variant="outline"
                  >
                    {isSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4 mr-2 text-primary" />}
                    {language === 'ar' ? 'تفعيل الإشعارات' : 'Enable Notifications'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Location</CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-[250px] relative">
                  {user.providerProfile?.latitude && user.providerProfile?.longitude ? (
                    <MapContainer
                      center={[user.providerProfile.latitude, user.providerProfile.longitude]}
                      zoom={14}
                      dragging={false}   // Read-Only
                      zoomControl={false} // Clean look
                      scrollWheelZoom={false}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[user.providerProfile.latitude, user.providerProfile.longitude]} />
                    </MapContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/30">
                      No location pinned
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Portfolio */}
            <div className="space-y-8">
              <Card className="h-full shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Portfolio</CardTitle>
                </CardHeader>
                <CardContent>
                  {user.providerProfile?.portfolioImages && user.providerProfile.portfolioImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {user.providerProfile.portfolioImages.map((img, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                          <img src={getImageUrl(img)} alt="Portfolio" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                      No portfolio images yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // --- Edit Mode (Original Form with enhancements) ---
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold font-display">Edit Profile</h1>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <Avatar className="w-24 h-24 border">
                <AvatarImage src={getImageUrl(currentProfileImage)} />
                <AvatarFallback className="text-2xl">{user.fullName[0]}</AvatarFallback>
              </Avatar>

              <LocalImageUpload
                label="Change Photo"
                onUpload={(url) => form.setValue("profileImage", url, { shouldDirty: true })}
              />
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Bio</Label>
                <Textarea
                  {...form.register("bio")}
                  placeholder="Tell clients about your experience..."
                  className="h-32"
                />
              </div>

              <div className="grid gap-2">
                <Label>Years of Experience</Label>
                <Input
                  type="number"
                  {...form.register("yearsOfExperience", { valueAsNumber: true })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Working Hours Section */}
          <Card>
            <CardHeader>
              <CardTitle>Working Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                  const dayState = (form.watch(`workingHours.${day}` as any) as any) || { active: true, start: "09:00", "end": "17:00" };

                  return (
                    <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3 sm:gap-0">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 w-32">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={dayState.active}
                            onChange={(e) => {
                              form.setValue(`workingHours.${day}` as any, { ...dayState, active: e.target.checked }, { shouldDirty: true });
                            }}
                          />
                          <span className="capitalize font-medium">{day}</span>
                        </div>
                      </div>

                      {dayState.active ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={dayState.start}
                            onChange={(e) => form.setValue(`workingHours.${day}.start` as any, e.target.value, { shouldDirty: true })}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="time"
                            value={dayState.end}
                            onChange={(e) => form.setValue(`workingHours.${day}.end` as any, e.target.value, { shouldDirty: true })}
                            className="w-32"
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm italic px-4">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Location Section */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Click on the map to pin your exact location. This helps clients find you.</p>
              <LocationPicker
                initialLat={form.watch("latitude") || undefined}
                initialLng={form.watch("longitude") || undefined}
                onLocationSelect={(lat, lng) => {
                  form.setValue("latitude", lat, { shouldDirty: true });
                  form.setValue("longitude", lng, { shouldDirty: true });
                }}
              />
            </CardContent>
          </Card>

          {/* Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {currentPortfolio?.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={getImageUrl(img)}
                      className="w-full h-32 object-cover rounded-lg border"
                      alt="Portfolio"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newPortfolio = [...currentPortfolio];
                        newPortfolio.splice(i, 1);
                        form.setValue("portfolioImages", newPortfolio, { shouldDirty: true });
                      }}
                      className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <LocalImageUpload
                  label="Add Image"
                  onUpload={(url) => {
                    const current = form.getValues("portfolioImages") || [];
                    form.setValue("portfolioImages", [...current, url], { shouldDirty: true });
                  }}
                  className="h-32 w-full border-2 border-dashed border-muted-foreground/25 bg-secondary/10 hover:bg-secondary/20 flex flex-col items-center justify-center text-muted-foreground gap-2 rounded-lg cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 sticky bottom-4 z-10 bg-background/80 backdrop-blur p-4 rounded-lg border shadow-lg">
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
