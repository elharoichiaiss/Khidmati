import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Booking, User } from "@shared/schema";
import { CalendarDays, Clock, Search, ChevronDown, ChevronUp, MessageSquare, CheckCircle2, XCircle, User as UserIcon } from "lucide-react";
import { Button, Input, Chip, Skeleton } from "@heroui/react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { useStartConversation } from "@/hooks/use-messages";
import { supabase } from "@/lib/supabase";

type BookingRow = {
  booking: Booking;
  client: User;
};

const STATUSES = ["all", "pending", "confirmed", "completed", "rejected"] as const;

const statusLabels: Record<string, Record<string, string>> = {
  pending: { ar: "قيد الانتظار", fr: "En attente", en: "Pending" },
  confirmed: { ar: "مؤكد", fr: "Confirmé", en: "Confirmed" },
  completed: { ar: "مكتمل", fr: "Terminé", en: "Completed" },
  rejected: { ar: "مرفوض", fr: "Refusé", en: "Rejected" },
};

export default function ProviderBookings() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const startConversation = useStartConversation();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: bookings = [], isLoading } = useQuery<BookingRow[]>({
    queryKey: ["/api/provider/my-bookings"],
    enabled: !!user,
    queryFn: async (): Promise<BookingRow[]> => {
      try {
        const res = await fetch("/api/provider/my-bookings", { credentials: "include" });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json();
          if (Array.isArray(data)) return data;
        }
      } catch (e) {}

      try {
        const targetStr = String(user?.id || user?.email || "");
        let numericDbId: number | null = /^\d+$/.test(targetStr) ? Number(targetStr) : null;
        if (!numericDbId) {
          const { data: found } = await supabase.from("users").select("id").or(`email.eq.${user?.email},google_id.eq.${user?.id}`).maybeSingle();
          if (found?.id) numericDbId = found.id;
        }

        if (numericDbId) {
          const { data: dbBookings } = await supabase.from("bookings").select("*").eq("provider_id", numericDbId).order("created_at", { ascending: false });
          if (Array.isArray(dbBookings)) {
            const clientIds = Array.from(new Set(dbBookings.map((b: any) => b.client_id)));
            const { data: dbClients } = await supabase.from("users").select("*").in("id", clientIds.length > 0 ? clientIds : [0]);
            const clientsMap = new Map((dbClients || []).map((c: any) => [c.id, c]));

            return dbBookings.map((b: any) => {
              const cli: any = clientsMap.get(b.client_id) || {};
              return {
                booking: {
                  id: b.id,
                  clientId: b.client_id,
                  providerId: b.provider_id,
                  date: b.date || b.created_at,
                  status: b.status || "pending",
                  price: b.price || 0,
                  description: b.description || "",
                  createdAt: b.created_at
                },
                client: {
                  id: cli.id || b.client_id,
                  fullName: cli.full_name || cli.fullName || cli.email || "عميل",
                  username: cli.username || "client",
                  email: cli.email || null,
                  phone: cli.phone || null,
                  city: cli.city || "",
                  profileImage: cli.profile_image || cli.avatar || null,
                  role: "client",
                  status: "active",
                  isBanned: false,
                  isVerified: true
                } as any
              };
            });
          }
        }
      } catch (e) {}

      return [];
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, price }: { id: number; status: string; price?: number }) => {
      try {
        const res = await fetch(`/api/bookings/${id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, price }),
          credentials: "include",
        });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          return await res.json();
        }
      } catch (e) {}

      try {
        const payload: any = { status };
        if (price !== undefined) payload.price = price;
        const { data: updated, error } = await supabase.from("bookings").update(payload).eq("id", id).select().single();
        if (error) throw new Error(error.message);
        return updated;
      } catch (e: any) {
        throw new Error(e?.message || "Failed to update booking status");
      }
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/stats"] });
      toast({
        title: variables.status === "confirmed"
          ? (language === "ar" ? "تم تأكيد الحجز" : language === "fr" ? "Réservation confirmée" : "Booking confirmed")
          : variables.status === "rejected"
            ? (language === "ar" ? "تم رفض الحجز" : language === "fr" ? "Réservation refusée" : "Booking rejected")
            : (language === "ar" ? "تم تحديث الحجز" : language === "fr" ? "Réservation mise à jour" : "Booking updated"),
      });
      if (variables.status === "confirmed") {
        try {
          const row = bookings.find((b) => b.booking.id === variables.id);
          if (row) {
            const conv = await startConversation.mutateAsync(row.client.id);
            setLocation(`/messages?id=${conv.id}`);
          }
        } catch { /* stay on page */ }
      }
    },
  });

  const openChatWithClient = async (clientId: number) => {
    try {
      const conv = await startConversation.mutateAsync(clientId);
      setLocation(`/messages?id=${conv.id}`);
    } catch {
      toast({ title: t("operationFailed"), variant: "destructive" });
    }
  };

  const filtered = useMemo(() => {
    let list = bookings;
    if (activeTab !== "all") {
      list = list.filter((b) => b.booking.status === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.client.fullName?.toLowerCase().includes(q) ||
          b.booking.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookings, activeTab, search]);

  const getClientImage = (client: User) => {
    const raw = client.profileImage;
    if (!raw) return undefined;
    return raw.startsWith("http") ? raw : `/objects/${raw}`;
  };

  const stats = useMemo(() => ({
    pending: bookings.filter((b) => b.booking.status === "pending").length,
    confirmed: bookings.filter((b) => b.booking.status === "confirmed").length,
    completed: bookings.filter((b) => b.booking.status === "completed").length,
  }), [bookings]);

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

  if (!user) return null;

  return (
    <Layout>
      <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
        <div className="container mx-auto px-4 max-w-5xl pb-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3.5 bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl">
                <CalendarDays className="w-7 h-7" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">
                {t("myBookings")}
              </h1>
            </div>
            <Input
              className="w-full sm:max-w-xs"
              placeholder={t("searchPlaceholder")}
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
                {statusLabels[s]?.[language as "ar" | "fr" | "en"] || s}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 space-y-3" style={{ borderRadius: "28px" }}>
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-14 h-14 rounded-2xl" />
                    <div className="space-y-2 flex-1"><Skeleton className="h-4 w-40 rounded-lg" /><Skeleton className="h-3 w-24 rounded-lg" /></div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-10 h-10 text-zinc-400" />
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2">
                {t("noBookings")}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                {t("noBookingsDesc")}
              </p>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="space-y-4">
              {filtered.map(({ booking, client }) => {
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
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 overflow-hidden">
                        {getClientImage(client) ? (
                          <img src={getClientImage(client)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-black">{(client.fullName || "?")[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-base text-zinc-900 dark:text-white">{client.fullName}</span>
                          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{client.city || ""}</span>
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
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Chip color={{ pending: "warning", confirmed: "primary", completed: "success", rejected: "danger" }[booking.status] as any || "warning"} variant="flat" size="sm" className="font-bold">
                          {statusLabels[booking.status]?.[language as "ar" | "fr" | "en"] || booking.status}
                        </Chip>
                        {expanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-6 pb-6 pt-0 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4">
                            <h4 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                              {t("bookingDetails")}
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              <div className="flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t("date")}</span>
                                <span className="font-bold text-zinc-900 dark:text-white">
                                  {new Date(booking.date).toLocaleDateString(language === "ar" ? "ar-MA" : language === "fr" ? "fr-FR" : "en-US", { dateStyle: "long" })}
                                </span>
                              </div>
                              {booking.description && (
                                <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
                                  <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">{t("description")}</p>
                                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{booking.description}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4">
                            <h4 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                              {t("clientName")}
                            </h4>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm shrink-0 overflow-hidden">
                                {getClientImage(client) ? <img src={getClientImage(client)} alt="" className="w-full h-full object-cover" /> : (client.fullName || "?")[0]}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-zinc-900 dark:text-white">{client.fullName}</p>
                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{client.city || ""}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {isPending && (
                                <>
                                  <Button size="sm" className="font-bold h-10 px-4 shadow-sm" style={{ borderRadius: "14px", background: "linear-gradient(135deg, #10b981, #059669)" }} onPress={() => openChatWithClient(client.id)}>
                                     <MessageSquare className="w-3.5 h-3.5" /> {t("confirmInChat")}
                                  </Button>
                                  <Button size="sm" className="font-bold h-10 px-4 shadow-sm" style={{ borderRadius: "14px", background: "linear-gradient(135deg, #ef4444, #dc2626)" }} onPress={() => updateStatusMutation.mutate({ id: booking.id, status: "rejected" })} isLoading={updateStatusMutation.isPending}>
                                    <XCircle className="w-3.5 h-3.5" /> {language === "ar" ? "رفض" : "Decline"}
                                  </Button>
                                </>
                              )}
                              {isConfirmed && (
                                <Button size="sm" className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold h-10 px-4 shadow-sm" style={{ borderRadius: "14px" }} onPress={() => updateStatusMutation.mutate({ id: booking.id, status: "completed" })} isLoading={updateStatusMutation.isPending}>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> {language === "ar" ? "إتمام" : "Complete"}
                                </Button>
                              )}
                              {(isConfirmed || isCompleted) && (
                                <Button size="sm" variant="bordered" className="font-bold h-10 px-4 border-zinc-200 dark:border-zinc-700" style={{ borderRadius: "14px" }} onPress={() => setLocation(`/messages?userId=${client.id}`)}>
                                   <MessageSquare className="w-3.5 h-3.5" /> {t("message")}
                                </Button>
                              )}
                              <Button variant="light" size="sm" className="font-bold h-10 px-4" style={{ borderRadius: "14px" }} onPress={() => setLocation(`/profile?view=${client.id}`)}>
                                 <UserIcon className="w-3.5 h-3.5" /> {t("viewProfile")}
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
