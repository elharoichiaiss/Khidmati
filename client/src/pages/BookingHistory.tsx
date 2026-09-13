import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Booking, User, ProviderProfile } from "@shared/schema";
import {
  CalendarDays, Clock, Search, X, ChevronDown, ChevronUp,
  MessageSquare, FileText, MapPin, CheckCircle2
} from "lucide-react";
import { Button, Input, Chip, Skeleton, Avatar } from "@heroui/react";
import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { toast } from "@/hooks/use-toast";

type BookingRow = {
  booking: Booking;
  provider: User;
  profile: ProviderProfile | null;
};

const STATUSES = ["all", "pending", "confirmed", "completed", "rejected"] as const;

const chipColor: Record<string, "warning" | "primary" | "success" | "danger"> = {
  pending: "warning",
  confirmed: "primary",
  completed: "success",
  rejected: "danger",
};

const statusOrder = ["pending", "confirmed", "completed"];

function StatusTracker({ currentStatus }: { currentStatus: string }) {
  const { language } = useLanguage();
  const labels: Record<string, Record<string, string>> = {
    pending: { ar: "قيد الانتظار", fr: "En attente", en: "Pending" },
    confirmed: { ar: "تم التأكيد", fr: "Confirmé", en: "Confirmed" },
    completed: { ar: "مكتمل", fr: "Terminé", en: "Completed" },
  };
  const currentIndex = statusOrder.indexOf(currentStatus);
  const isRejected = currentStatus === "rejected";

  return (
    <div className="flex items-center gap-1 w-full mt-3">
      {statusOrder.map((step, idx) => {
        const isDone = !isRejected && idx <= currentIndex;
        const isCurrent = !isRejected && idx === currentIndex;
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                isDone
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : isCurrent
                    ? "bg-primary border-primary text-white animate-pulse"
                    : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400"
              }`}>
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span className={`text-[10px] mt-1 font-semibold ${isDone ? "text-emerald-600" : "text-zinc-400 dark:text-zinc-500"}`}>
                {labels[step]?.[language as "ar" | "fr" | "en"] || step}
              </span>
            </div>
            {idx < statusOrder.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 rounded-full mt-[-14px] ${
                !isRejected && idx < currentIndex ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BookingHistory() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: bookings, isLoading } = useQuery<BookingRow[]>({
    queryKey: ["/api/my-bookings"],
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to cancel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-bookings"] });
      toast({ title: t("cancelBooking") });
    },
  });

  const filtered = useMemo(() => {
    if (!bookings) return [];
    let list = bookings;
    if (activeTab !== "all") {
      list = list.filter((b) => b.booking.status === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.provider.fullName?.toLowerCase().includes(q) ||
          b.booking.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookings, activeTab, search]);

  const getProviderImage = (provider: User) => {
    const raw = provider.profileImage;
    if (!raw) return undefined;
    return raw.startsWith("http") ? raw : `/objects/${raw}`;
  };

  const tabColor = (s: string) => {
    if (activeTab !== s) return "";
    switch (s) {
      case "all": return "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900";
      case "pending": return "bg-amber-500 text-white";
      case "confirmed": return "bg-blue-500 text-white";
      case "completed": return "bg-emerald-500 text-white";
      case "rejected": return "bg-red-500 text-white";
      default: return "bg-zinc-900 text-white";
    }
  };

  const stats = useMemo(() => ({
    pending: bookings?.filter((b) => b.booking.status === "pending").length || 0,
    confirmed: bookings?.filter((b) => b.booking.status === "confirmed").length || 0,
    completed: bookings?.filter((b) => b.booking.status === "completed").length || 0,
  }), [bookings]);

  if (!user) return null;

  // Providers receive service requests, they don't make them — send them to the provider bookings page
  useEffect(() => {
    if (user.role === "provider") {
      setLocation("/provider/bookings");
    }
  }, [user, setLocation]);

  if (user.role === "provider") return null;

  const statusChipColor = (s: string) => {
    switch (s) {
      case "pending": return <Chip color="warning" variant="flat" size="sm" className="font-bold">{t("pending")}</Chip>;
      case "confirmed": return <Chip color="primary" variant="flat" size="sm" className="font-bold">{t("confirmed")}</Chip>;
      case "completed": return <Chip color="success" variant="flat" size="sm" className="font-bold">{t("completed")}</Chip>;
      case "rejected": return <Chip color="danger" variant="flat" size="sm" className="font-bold">{t("rejected")}</Chip>;
      default: return <Chip variant="flat" size="sm" className="font-bold">{s}</Chip>;
    }
  };

  return (
    <Layout>
      <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
        <div className="container mx-auto px-4 max-w-5xl pb-24">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <CalendarDays className="w-7 h-7" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">
                {t("myBookings")}
              </h1>
            </div>
            <Input
              className="w-full sm:max-w-xs"
              placeholder={t("searchBookings")}
              startContent={<Search className="w-4 h-4 text-zinc-400" />}
              value={search}
              onValueChange={setSearch}
              variant="bordered"
              radius="lg"
              size="md"
              classNames={{
                inputWrapper: "h-12 rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-sm",
                input: "text-sm font-medium"
              }}
            />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { count: stats.pending, label: t("pendingBookings"), textColor: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/40" },
              { count: stats.confirmed, label: t("confirmed"), textColor: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/40" },
              { count: stats.completed, label: t("completedBookings"), textColor: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-950/40" },
            ].map((s) => (
              <div key={s.label} className={`${s.bgColor} rounded-2xl p-4 text-center`}>
                <div className={`text-3xl font-black ${s.textColor}`}>{s.count}</div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setActiveTab(s); setExpandedId(null); }}
                className={
                  "px-5 py-2.5 rounded-2xl text-sm font-bold transition-all " +
                  (activeTab === s
                    ? tabColor(s) + " shadow-sm"
                    : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800")
                }
              >
                {t(s)}
              </button>
            ))}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 space-y-3" style={{ borderRadius: "28px" }}>
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-14 h-14 rounded-2xl" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-40 rounded-lg" />
                      <Skeleton className="h-3 w-24 rounded-lg" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-10 h-10 text-zinc-400" />
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2">{t("noBookings")}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-6">{t("noBookingsDesc")}</p>
              <Button
                onPress={() => setLocation("/search")}
                className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-6 h-12 shadow-sm"
                style={{ borderRadius: "16px" }}
              >
                {t("browseProviders")}
              </Button>
            </div>
          )}

          {/* List */}
          {!isLoading && filtered.length > 0 && (
            <div className="space-y-4">
              {filtered.map(({ booking, provider, profile }) => {
                const isPending = booking.status === "pending";
                const isConfirmed = booking.status === "confirmed";
                const isCompleted = booking.status === "completed";
                const expanded = expandedId === booking.id;

                return (
                  <div
                    key={booking.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:scale-[1.01] transition-transform"
                    style={{ borderRadius: "28px" }}
                  >
                    <button
                      onClick={() => setExpandedId(expanded ? null : booking.id)}
                      className="w-full text-left p-6 flex items-center gap-4"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 overflow-hidden">
                        {getProviderImage(provider) ? (
                          <img src={getProviderImage(provider)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-black">{(provider.fullName || "?")[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-base text-zinc-900 dark:text-white">{provider.fullName}</span>
                          {profile?.serviceCategory && (
                            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                              {profile.serviceCategory}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {new Date(booking.date).toLocaleDateString(language === "ar" ? "ar-MA" : language === "fr" ? "fr-FR" : "en-US")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(booking.date).toLocaleTimeString(language === "ar" ? "ar-MA" : language === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {booking.price ? (
                            <span className="font-black text-zinc-900 dark:text-white">{booking.price} DH</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusChipColor(booking.status)}
                        {expanded ? (
                          <ChevronUp className="w-5 h-5 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-zinc-400" />
                        )}
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-6 pb-6 pt-0 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="mt-4 mb-2">
                          <StatusTracker currentStatus={booking.status} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                          {/* Booking details */}
                          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4">
                            <h4 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                              {t("bookingDetails")}
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              <div className="flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t("bookingNumber")}</span>
                                <span className="font-black text-zinc-900 dark:text-white">#{booking.id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t("date")}</span>
                                <span className="font-bold text-zinc-900 dark:text-white">
                                  {new Date(booking.date).toLocaleDateString(language === "ar" ? "ar-MA" : language === "fr" ? "fr-FR" : "en-US", { dateStyle: "long" })}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t("price")}</span>
                                <span className="font-black text-zinc-900 dark:text-white">{booking.price ? `${booking.price} DH` : "—"}</span>
                              </div>
                              {booking.description && (
                                <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
                                  <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">{t("description")}</p>
                                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{booking.description}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Provider info + Actions */}
                          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4">
                            <h4 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                              {t("provider")}
                            </h4>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0 overflow-hidden">
                                {getProviderImage(provider) ? (
                                  <img src={getProviderImage(provider)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (provider.fullName || "?")[0]
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-zinc-900 dark:text-white">{provider.fullName}</p>
                                <div className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                  {profile?.serviceCategory || ""}
                                  {provider.city && <><span>·</span><span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{provider.city}</span></>}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {isPending && (
                                <Button
                                  size="sm"
                                  className="font-bold h-10 px-4 shadow-sm"
                                  style={{ borderRadius: "14px", background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
                                  onPress={() => cancelMutation.mutate(booking.id)}
                                  isLoading={cancelMutation.isPending}
                                  isDisabled={cancelMutation.isPending}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  {t("cancel")}
                                </Button>
                              )}
                              {(isConfirmed || isCompleted) && (
                                <Button
                                  size="sm"
                                  className="font-bold h-10 px-4 shadow-sm"
                                  style={{ borderRadius: "14px", background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
                                  onPress={() => setLocation(`/messages?userId=${provider.id}`)}
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  {t("message")}
                                </Button>
                              )}
                              {isCompleted && (
                                <Button
                                  size="sm"
                                  variant="bordered"
                                  className="font-bold h-10 px-4 border-zinc-200 dark:border-zinc-700"
                                  style={{ borderRadius: "14px" }}
                                  onPress={() => setLocation(`/invoice/${booking.id}/print`)}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  {t("invoiceBtn")}
                                </Button>
                              )}
                              <Button
                                variant="light"
                                size="sm"
                                className="font-bold h-10 px-4"
                                style={{ borderRadius: "14px" }}
                                onPress={() => setLocation(`/providers/${provider.id}`)}
                              >
                                {t("viewProfile")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
