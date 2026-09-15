import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateProfile } from "@/hooks/use-providers";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Input, Textarea, Button, Avatar } from "@heroui/react";
import { useForm } from "react-hook-form";
import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  LayoutDashboard,
  Camera,
  Save,
  BarChart3,
  Calendar,
  Ticket,
  Heart,
  Repeat,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import { usePush } from "@/hooks/use-push";
import { useLanguage } from "@/hooks/use-language";
import { LocationPicker } from "@/components/LocationPicker";
import { DeleteAccountCard } from "@/components/DeleteAccountCard";
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

// Client/Non-provider editable profile section
function ClientProfileSection({ user, language, t, subscribe, isSubscribing }: any) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [city, setCity] = useState(user.city || "");
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: tickets } = useQuery<any[]>({
    queryKey: ["/api/tickets"],
    enabled: !!user,
  });
  const { data: bookings } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });
  const { data: favorites } = useQuery<any[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });
  const { data: recurringBookings, refetch: refetchRecurring } = useQuery<any[]>({
    queryKey: ["/api/recurring-bookings"],
    enabled: !!user,
  });

  const recentBookings = bookings?.slice(0, 5) || [];
  const recentTickets = tickets?.slice(0, 5) || [];
  const totalBookings = bookings?.length || 0;
  const pendingBookings = bookings?.filter((b: any) => b.status === "pending").length || 0;
  const completedBookings = bookings?.filter((b: any) => b.status === "completed").length || 0;

  const updateRecurringMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/recurring-bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => refetchRecurring(),
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/recurring-bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => refetchRecurring(),
  });

  const statusColors: Record<string, string> = {
    active: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
    paused: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
    cancelled: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
  };

  const bookingStatusColors: Record<string, string> = {
    confirmed: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
    completed: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
    rejected: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
    pending: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
    default: "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-400",
  };

  const ticketStatusColors: Record<string, string> = {
    open: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
    resolved: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
    closed: "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-400",
    default: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('city', city);
      if (fileRef.current?.files?.[0]) {
        formData.append('avatar', fileRef.current.files[0]);
      }
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setEditing(false);
      setPreviewUrl(null);
    } catch {
      alert(t('failedToSaveName'));
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = previewUrl || (user.profileImage ? (user.profileImage.startsWith('/') ? user.profileImage : `/uploads/${user.profileImage}`) : undefined);

  return (
    <Layout>
      <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
        <div className="container mx-auto px-4 max-w-5xl pb-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 dark:text-blue-400">
              <UserIcon className="w-7 h-7" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t('clientProfile') || 'Profile'}</h1>
          </div>

          <div className="text-center mb-8 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
            <div className="pt-8 pb-6 px-6">
              <div className="relative inline-block">
                <Avatar src={avatarSrc} name={fullName} showFallback className="w-24 h-24 mx-auto border-4 border-white shadow-lg" classNames={{ fallback: "text-2xl bg-primary text-primary-foreground" }} />
                {editing && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow-md border-2 border-white hover:bg-primary/90 transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setPreviewUrl(URL.createObjectURL(file));
                  }}
                />
              </div>

              {editing ? (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="max-w-xs text-center font-bold text-lg"
                    classNames={{
                      inputWrapper: "rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    }}
                  />
                </div>
              ) : (
                <h1 className="text-3xl font-bold font-display mt-3 text-zinc-900 dark:text-white">{user.fullName}</h1>
              )}
              <span className="inline-flex items-center px-3 py-1 mt-2 rounded-2xl text-xs font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                {t('client') || 'Client'}
              </span>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] mb-4" style={{ borderRadius: "28px" }}>
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-lg font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 dark:text-blue-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                {t('contactInfo')}
              </h3>
            </div>
            <div className="p-6">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">{t('emailLabel')}</p>
                    <Input value={email} onValueChange={setEmail} type="email" classNames={{ inputWrapper: "rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">{t('phoneLabel')}</p>
                    <Input value={phone} onValueChange={setPhone} type="tel" classNames={{ inputWrapper: "rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">{t('city')}</p>
                    <Input value={city} onValueChange={setCity} classNames={{ inputWrapper: "rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" }} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {user.email && <p className="text-sm"><span className="text-zinc-500 dark:text-zinc-400 font-medium">{t('emailLabel')}:</span> <span className="text-zinc-900 dark:text-white font-semibold">{user.email}</span></p>}
                  {user.phone && <p className="text-sm"><span className="text-zinc-500 dark:text-zinc-400 font-medium">{t('phoneLabel')}:</span> <span className="text-zinc-900 dark:text-white font-semibold">{user.phone}</span></p>}
                  {user.city && <p className="text-sm"><span className="text-zinc-500 dark:text-zinc-400 font-medium">{t('city')}:</span> <span className="text-zinc-900 dark:text-white font-semibold">{user.city}</span></p>}
                  {!user.email && !user.phone && !user.city && <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noContactInfo')}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            {editing ? (
              <>
                <Button
                  onPress={handleSave}
                  isDisabled={saving}
                  className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-5 h-12 shadow-sm"
                  style={{ borderRadius: "16px" }}
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {t('save')}
                </Button>
                <Button
                  variant="bordered"
                  onPress={() => { setEditing(false); setFullName(user.fullName); setEmail(user.email || ""); setPhone(user.phone || ""); setCity(user.city || ""); setPreviewUrl(null); }}
                  className="font-bold px-5 h-12 rounded-2xl border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                >
                  {t('cancel')}
                </Button>
              </>
            ) : (
              <div className="flex gap-2 flex-wrap justify-center">
                <Button
                  variant="bordered"
                  onPress={() => setEditing(true)}
                  className="font-bold px-5 h-12 rounded-2xl border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {t('editProfile')}
                </Button>
                <Link href="/invoices">
                  <Button
                    variant="bordered"
                    className="gap-2 font-bold px-5 h-12 rounded-2xl border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                  >
                    <FileText className="w-4 h-4" />
                    {t('myInvoices')}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] mb-4" style={{ borderRadius: "28px" }}>
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-lg font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-2xl text-amber-600 dark:text-amber-400">
                  <Bell className="w-5 h-5" />
                </div>
                {t('notifications') || 'Notifications'}
              </h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white">{t('pushNotifications') || 'Push Notifications'}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {t('enableNotificationsDesc')}
                  </p>
                </div>
                <Button
                  onPress={subscribe}
                  isDisabled={isSubscribing}
                  className="shrink-0 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-5 h-12 shadow-sm"
                  style={{ borderRadius: "16px" }}
                >
                  {isSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                  {t('enableNotifications')}
                </Button>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] mb-4" style={{ borderRadius: "28px" }}>
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-lg font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                {t('quickStats')}
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl">
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{totalBookings}</p>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-1">{t('totalBookingsStat')}</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl">
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingBookings}</p>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-1">{t('pendingBookings')}</p>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedBookings}</p>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-1">{t('completedBookings')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] mb-4" style={{ borderRadius: "28px" }}>
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-lg font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 dark:text-blue-400">
                  <Calendar className="w-5 h-5" />
                </div>
                {t('recentBookings')}
              </h3>
            </div>
            <div className="p-6">
              {recentBookings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">{t('noBookings')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl">
                      <div>
                        <p className="font-bold text-sm text-zinc-900 dark:text-white">{b.service || b.provider?.fullName || `Booking #${b.id}`}</p>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {b.date ? new Date(b.date).toLocaleDateString() : ''} — {b.time || ''}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-2xl text-xs font-bold ${bookingStatusColors[b.status] || bookingStatusColors.default}`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recurring Bookings */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] mb-4" style={{ borderRadius: "28px" }}>
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-lg font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-2xl text-purple-600 dark:text-purple-400">
                  <Repeat className="w-5 h-5" />
                </div>
                {t('recurringBookings')}
              </h3>
            </div>
            <div className="p-6">
              {!recurringBookings || recurringBookings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Repeat className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">{t('noRecurringBookings')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recurringBookings.map((rb: any) => (
                    <div key={rb.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-zinc-900 dark:text-white">{rb.serviceCategory}</p>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {t(rb.frequency)} • {rb.time}
                        </p>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {new Date(rb.startDate).toLocaleDateString()}{rb.endDate ? ` - ${new Date(rb.endDate).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-2xl text-xs font-bold ${statusColors[rb.status] || ''}`}>
                          {t(rb.status)}
                        </span>
                        {rb.status === "active" && (
                          <button
                            onClick={() => updateRecurringMutation.mutate({ id: rb.id, data: { status: "paused" } })}
                            className="p-1.5 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-950/30 text-amber-600 dark:text-amber-400 transition"
                            title={t('pause')}
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {rb.status === "paused" && (
                          <button
                            onClick={() => updateRecurringMutation.mutate({ id: rb.id, data: { status: "active" } })}
                            className="p-1.5 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 transition"
                            title={t('resume')}
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء هذا الحجز المتكرر؟' : language === 'fr' ? 'Êtes-vous sûr de vouloir annuler cette réservation récurrente ?' : 'Are you sure you want to cancel this recurring booking?')) {
                              updateRecurringMutation.mutate({ id: rb.id, data: { status: "cancelled" } });
                            }
                          }}
                          className="p-1.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition"
                          title={t('cancel')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Tickets */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] mb-4" style={{ borderRadius: "28px" }}>
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-lg font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-2xl text-amber-600 dark:text-amber-400">
                  <Ticket className="w-5 h-5" />
                </div>
                {t('supportTickets')}
              </h3>
            </div>
            <div className="p-6">
              {recentTickets.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Ticket className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">{t('noTickets')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTickets.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl">
                      <div>
                        <p className="font-bold text-sm text-zinc-900 dark:text-white">{t.subject}</p>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-2xl text-xs font-bold ${ticketStatusColors[t.status] || ticketStatusColors.default}`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Favorites */}
          {favorites && favorites.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] mb-4" style={{ borderRadius: "28px" }}>
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                <h3 className="text-lg font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">
                  <div className="p-2 bg-red-50 dark:bg-red-950/40 rounded-2xl text-red-600 dark:text-red-400">
                    <Heart className="w-5 h-5" />
                  </div>
                  {t('favoriteProviders')}
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {favorites.slice(0, 5).map((fav: any) => (
                    <div key={fav.id} className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl">
                      <Avatar src={fav.provider?.profileImage ? (fav.provider.profileImage.startsWith('/') ? fav.provider.profileImage : `/uploads/${fav.provider.profileImage}`) : undefined} name={fav.provider?.fullName || 'P'} showFallback className="w-10 h-10" />
                      <div>
                        <p className="font-bold text-sm text-zinc-900 dark:text-white">{fav.provider?.fullName || 'Provider'}</p>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{fav.provider?.profile?.city || ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Delete Account */}
          <DeleteAccountCard user={user} />
        </div>
      </div>
    </Layout>
  );
}

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { t, language } = useLanguage();
  const { subscribe, isSubscribing } = usePush();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

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
      setIsEditing(false);
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

  if (isLoading || !user) return (
    <Layout>
      <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
        <div className="container mx-auto px-4 max-w-5xl pb-24">
          <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );

  if (user.role !== "provider") {
    return (
      <ClientProfileSection
        user={user}
        language={language}
        t={t}
        subscribe={subscribe}
        isSubscribing={isSubscribing}
      />
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
      formData.append('image', file);

      try {
        const res = await fetch('/api/upload/image', {
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
          <Button type="button" variant="bordered" className="cursor-pointer font-bold px-5 h-12 rounded-2xl border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white" isDisabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            {label}
          </Button>
        </label>
      </div>
    );
  };

  const currentProfileImage = form.watch("profileImage");
  const currentPortfolio = form.watch("portfolioImages");

  const { data: providerStats } = useQuery<any>({
    queryKey: ["/api/provider/stats"],
    enabled: user.role === "provider",
  });

  const { data: reviews } = useQuery<any[]>({
    queryKey: ["/api/providers", user.id, "reviews"],
    queryFn: async () => {
      const res = await fetch(`/api/providers/${user.id}`);
      const data = await res.json();
      return data.reviews || [];
    },
    enabled: user.role === "provider",
  });

  const avgRating = reviews?.length
    ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // --- View Mode ---
  if (!isEditing) {

    return (
      <Layout>
        <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
          <div className="container mx-auto px-4 max-w-5xl pb-24">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 dark:text-blue-400">
                <UserIcon className="w-7 h-7" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t('myProfile') || 'Profile'}</h1>
            </div>

            {/* Header / Hero */}
            <div className="mb-8 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] overflow-hidden relative" style={{ borderRadius: "28px" }}>
              <div className="absolute top-0 right-0 p-4 flex gap-2 z-10">
                <Link href="/provider/dashboard">
                  <Button variant="bordered" className="gap-2 shadow-sm font-bold px-5 h-12 rounded-2xl border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white">
                    <LayoutDashboard className="w-4 h-4" />
                    {t('dashboard')}
                  </Button>
                </Link>
                <Link href="/provider/reports">
                  <Button variant="bordered" className="gap-2 shadow-sm font-bold px-5 h-12 rounded-2xl border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white">
                    <BarChart3 className="w-4 h-4" />
                    {t('reports')}
                  </Button>
                </Link>
                <Button onPress={() => setIsEditing(true)} className="gap-2 shadow-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-5 h-12" style={{ borderRadius: "16px" }}>
                  <Edit2 className="w-4 h-4" /> {t('editProfile')}
                </Button>
              </div>
              <div className="pt-12 pb-8 px-6 flex flex-col md:flex-row items-center gap-8">
                <Avatar src={getImageUrl(user.providerProfile?.profileImage)} name={user.fullName} showFallback className="w-32 h-32 border-4 border-white shadow-xl" classNames={{ fallback: "text-4xl bg-primary text-primary-foreground" }} />
                <div className="text-center md:text-left space-y-2">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newName}
                        onValueChange={setNewName}
                        onKeyDown={async e => {
                          if (e.key === 'Enter') {
                            setSavingName(true);
                            try {
                              const fd = new FormData();
                              fd.append('fullName', newName);
                              await fetch('/api/user/profile', { method: 'PATCH', body: fd, credentials: 'include' });
                              await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                              setEditingName(false);
                             } catch { alert(t('failedToSaveName')); }
                            finally { setSavingName(false); }
                          }
                          if (e.key === 'Escape') setEditingName(false);
                        }}
                        onBlur={() => setEditingName(false)}
                        className="max-w-xs text-xl font-bold"
                        autoFocus
                        classNames={{ inputWrapper: "rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" }}
                      />
                      {savingName && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                  ) : (
                    <h1 className="text-3xl font-black font-display group inline-flex items-center gap-2 text-zinc-900 dark:text-white">
                      {user.fullName}
                      <button
                        onClick={() => { setNewName(user.fullName); setEditingName(true); }}
                        className="text-zinc-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                        title={t('editName')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </h1>
                  )}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-2xl text-xs font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                      {user.providerProfile?.serviceCategory || t('provider')}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {user.providerProfile?.citiesServed?.[0] || t('morocco')}
                    </span>
                    {avgRating && (
                      <span className="text-amber-600 dark:text-amber-400 text-sm font-medium flex items-center gap-1">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        {avgRating} ({reviews?.length || 0})
                      </span>
                    )}
                  </div>
                  <p className="max-w-xl text-zinc-500 dark:text-zinc-400 font-medium">
                    {user.providerProfile?.bio || t('noBioAdded')}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Details */}
              <div className="space-y-8">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                    <h3 className="text-lg font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 dark:text-blue-400">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      {t('professionalInfo')}
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t('experience')}</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{user.providerProfile?.yearsOfExperience || 0} {t('years')}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t('rating')}</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{avgRating ? `${avgRating} / 5` : t('noReviews')}</span>
                    </div>
                    {providerStats && (
                      <>
                        <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                          <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t('totalBookingsStat')}</span>
                          <span className="font-bold text-zinc-900 dark:text-white">{providerStats.totalBookings || 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                          <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t('completedBookings')}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{providerStats.totalEarnings > 0 ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex justify-between pb-2">
                          <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t('earnings')}</span>
                          <span className="font-bold text-zinc-900 dark:text-white">{providerStats.totalEarnings} DH</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t('status')}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold flex items-center gap-1 ${user.providerProfile?.isAvailable ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"}`}>
                          {user.providerProfile?.isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                    <h3 className="text-sm font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-2xl text-amber-600 dark:text-amber-400">
                        <Bell className="w-4 h-4" />
                      </div>
                      {t('pushNotifications')}
                    </h3>
                  </div>
                  <div className="p-6">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 font-medium">
                      {t('enableNotificationsDesc')}
                    </p>
                    <Button
                      onPress={subscribe}
                      isDisabled={isSubscribing}
                      className="w-full font-bold px-5 h-12 shadow-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      style={{ borderRadius: "16px" }}
                    >
                      {isSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4 mr-2 text-primary" />}
                      {t('enableNotifications')}
                    </Button>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                    <h3 className="text-lg font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      Location
                    </h3>
                  </div>
                  <div className="h-[250px] relative">
                    {user.providerProfile?.latitude && user.providerProfile?.longitude ? (
                      <MapContainer
                        center={[user.providerProfile.latitude, user.providerProfile.longitude]}
                        zoom={14}
                        dragging={false}
                        zoomControl={false}
                        scrollWheelZoom={false}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[user.providerProfile.latitude, user.providerProfile.longitude]} />
                      </MapContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                        {t('noLocationPinned')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Portfolio & Contact */}
              <div className="space-y-8">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                    <h3 className="text-lg font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 dark:text-blue-400">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      {t('contactInfo')}
                    </h3>
                  </div>
                  <div className="p-6 space-y-2">
                    {user.email && <p className="text-sm"><span className="text-zinc-500 dark:text-zinc-400 font-medium">{t('emailLabel')}:</span> <span className="text-zinc-900 dark:text-white font-semibold">{user.email}</span></p>}
                    {user.phone && <p className="text-sm"><span className="text-zinc-500 dark:text-zinc-400 font-medium">{t('phoneLabel')}:</span> <span className="text-zinc-900 dark:text-white font-semibold">{user.phone}</span></p>}
                    {user.city && <p className="text-sm"><span className="text-zinc-500 dark:text-zinc-400 font-medium">{t('city')}:</span> <span className="text-zinc-900 dark:text-white font-semibold">{user.city}</span></p>}
                    {!user.email && !user.phone && !user.city && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noContactInfo')}</p>
                    )}
                  </div>
                </div>

                {/* Reviews Section */}
                {reviews && reviews.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                      <h3 className="text-lg font-extrabold flex items-center justify-between text-zinc-900 dark:text-white">
                        <span className="flex items-center gap-2">
                          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-2xl text-amber-600 dark:text-amber-400">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          </div>
                          {t('reviewsAndRatings')}
                        </span>
                        <span className="px-3 py-1 rounded-2xl text-sm font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                          {avgRating} / 5 ({reviews.length})
                        </span>
                      </h3>
                    </div>
                    <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto">
                      {reviews.map((r: any, i: number) => (
                        <div key={r.id || i} className="border-b border-zinc-100 dark:border-zinc-800/80 last:border-b-0 pb-4 last:pb-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar src={r.client?.profileImage ? (r.client.profileImage.startsWith('/') ? r.client.profileImage : `/uploads/${r.client.profileImage}`) : undefined} name={r.client?.fullName || 'C'} showFallback className="w-9 h-9 border" classNames={{ fallback: "text-xs bg-primary/10 text-primary" }} />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate text-zinc-900 dark:text-white">{r.client?.fullName || 'Client'}</p>
                              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</p>
                            </div>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(star => (
                                <svg key={star} className={`w-4 h-4 ${star <= r.rating ? 'text-amber-400 fill-current' : 'text-gray-300 fill-current'}`} viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                          {r.comment && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 ml-12 leading-relaxed font-medium">{r.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {user.providerProfile?.citiesServed && user.providerProfile.citiesServed.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                      <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">{t('citiesServed')}</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex flex-wrap gap-2">
                        {user.providerProfile.citiesServed.map((city: string, i: number) => (
                          <span key={i} className="inline-flex items-center px-3 py-1 rounded-2xl text-xs font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                            {city}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] h-full" style={{ borderRadius: "28px" }}>
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                    <h3 className="text-lg font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">{t('portfolio')}</h3>
                  </div>
                  <div className="p-6">
                    {user.providerProfile?.portfolioImages && user.providerProfile.portfolioImages.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {user.providerProfile.portfolioImages.map((img: string, i: number) => (
                          <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800/80 shadow-sm hover:shadow-md transition-shadow">
                            <img src={getImageUrl(img)} alt="Portfolio" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700">
                        <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <UploadCloud className="w-8 h-8 text-zinc-400" />
                        </div>
                        <p className="font-medium">{t('noPortfolioImages')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Account */}
          <DeleteAccountCard user={user} />
        </div>
      </Layout>
    );
  }

  // --- Edit Mode (Original Form with enhancements) ---
  return (
    <Layout>
      <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
        <div className="container mx-auto px-4 max-w-3xl pb-24">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/provider/profile">
              <Button variant="light" isIconOnly className="text-zinc-900 dark:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 dark:text-blue-400">
                <Edit2 className="w-7 h-7" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t('editProfile')}</h1>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Avatar Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">{t('profilePhoto')}</h3>
              </div>
              <div className="p-6 flex items-center gap-6">
                <Avatar src={getImageUrl(currentProfileImage)} name={user.fullName} showFallback className="w-24 h-24 border" classNames={{ fallback: "text-2xl" }} />

                <LocalImageUpload
                  label={t('changePhoto')}
                  onUpload={(url) => form.setValue("profileImage", url, { shouldDirty: true })}
                />
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">{t('basicInformation')}</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('emailLabel')}</p>
                    <Input defaultValue={user.email || ""} placeholder="your@email.com" classNames={{ inputWrapper: "rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" }} />
                  </div>
                  <div className="grid gap-2">
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('phoneLabel')}</p>
                    <Input defaultValue={user.phone || ""} placeholder="+212 6XX XXX XXX" classNames={{ inputWrapper: "rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" }} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('bio')}</p>
                  <Textarea
                    {...form.register("bio")}
                    placeholder={t('tellAboutExperience')}
                    className="h-32"
                    classNames={{ inputWrapper: "rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('yearsOfExperience')}</p>
                    <Input
                      type="number"
                      {...form.register("yearsOfExperience", { valueAsNumber: true })}
                      classNames={{ inputWrapper: "rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('yourCity')}</p>
                    <Input defaultValue={user.city || ""} placeholder={t('yourCity')} classNames={{ inputWrapper: "rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Working Hours Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">{t('workingHours')}</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid gap-4">
                  {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                    const dayState = (form.watch(`workingHours.${day}` as any) as any) || { active: true, start: "09:00", "end": "17:00" };

                    return (
                      <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl gap-3 sm:gap-0">
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
                            <span className="capitalize font-bold text-zinc-900 dark:text-white">{day}</span>
                          </div>
                        </div>

                        {dayState.active ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={dayState.start}
                              onValueChange={(value) => form.setValue(`workingHours.${day}.start` as any, value, { shouldDirty: true })}
                              className="w-32"
                              classNames={{ inputWrapper: "rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" }}
                            />
                            <span className="text-zinc-400">-</span>
                            <Input
                              type="time"
                              value={dayState.end}
                              onValueChange={(value) => form.setValue(`workingHours.${day}.end` as any, value, { shouldDirty: true })}
                              className="w-32"
                              classNames={{ inputWrapper: "rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" }}
                            />
                          </div>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500 text-sm italic px-4">{t('closed')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">Location</h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{t('clickMapToPin')}</p>
                <LocationPicker
                  initialLat={form.watch("latitude") || undefined}
                  initialLng={form.watch("longitude") || undefined}
                  onLocationSelect={(lat, lng) => {
                    form.setValue("latitude", lat, { shouldDirty: true });
                    form.setValue("longitude", lng, { shouldDirty: true });
                  }}
                />
              </div>
            </div>

            {/* Portfolio */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">{t('portfolio')}</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {currentPortfolio?.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={getImageUrl(img)}
                        className="w-full h-32 object-cover rounded-2xl border border-zinc-100 dark:border-zinc-800"
                        alt={t('portfolio')}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newPortfolio = [...currentPortfolio];
                          newPortfolio.splice(i, 1);
                          form.setValue("portfolioImages", newPortfolio, { shouldDirty: true });
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <LocalImageUpload
                    label={t('addImage')}
                    onUpload={(url) => {
                      const current = form.getValues("portfolioImages") || [];
                      form.setValue("portfolioImages", [...current, url], { shouldDirty: true });
                    }}
                    className="h-32 w-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex flex-col items-center justify-center text-zinc-400 gap-2 rounded-2xl cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 sticky bottom-4 z-10 bg-zinc-50/80 dark:bg-black/80 backdrop-blur p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
              <Button type="button" variant="bordered" onPress={() => setIsEditing(false)} className="font-bold px-5 h-12 rounded-2xl border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white">
                {t('cancel')}
              </Button>
              <Button type="submit" size="lg" isDisabled={updateProfile.isPending} className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-5 h-12 shadow-sm" style={{ borderRadius: "16px" }}>
                {updateProfile.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t('saveChanges')}
              </Button>
            </div>
          </form>

          {/* Delete Account */}
          <DeleteAccountCard user={user} />
        </div>
      </div>
    </Layout>
  );
}
