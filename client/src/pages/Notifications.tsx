import { Layout } from "@/components/Layout";
import { useAuth, resolveCurrentNumericUserId } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";
import { Bell, Calendar, Info, Mail, CheckCircle2, MessageSquare } from "lucide-react";
import { Button, Skeleton } from "@heroui/react";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { getNotifTarget } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export default function NotificationsPage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery<Notification[]>({
        queryKey: ["/api/notifications", user?.id],
        enabled: !!user,
        queryFn: async (): Promise<Notification[]> => {
            try {
                const res = await fetch("/api/notifications", { credentials: "include" });
                const contentType = res.headers.get("content-type") || "";
                if (res.ok && contentType.includes("application/json")) {
                    const data = await res.json();
                    if (Array.isArray(data)) return data;
                }
            } catch (e) {}

            try {
                const numericId = await resolveCurrentNumericUserId(user);
                const { data: notifs } = await supabase
                    .from("notifications")
                    .select("*")
                    .eq("user_id", numericId)
                    .order("created_at", { ascending: false });

                if (Array.isArray(notifs)) {
                    return notifs.map((n: any) => ({
                        id: n.id,
                        userId: n.user_id,
                        type: n.type,
                        message: n.message,
                        read: Boolean(n.read),
                        link: n.link,
                        createdAt: n.created_at,
                    }));
                }
            } catch (e) {}
            return [];
        },
    });

    const markRead = useMutation({
        mutationFn: async (id: number) => {
            try {
                const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
                if (res.ok) return await res.json();
            } catch (e) {}

            await supabase.from("notifications").update({ read: true }).eq("id", id);
            return { success: true };
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    });

    const markAllRead = useMutation({
        mutationFn: async () => {
            try {
                const res = await fetch("/api/notifications/read-all", { method: "PATCH", credentials: "include" });
                if (res.ok) return await res.json();
            } catch (e) {}

            const numericId = await resolveCurrentNumericUserId(user);
            await supabase.from("notifications").update({ read: true }).eq("user_id", numericId);
            return { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            toast({ title: language === 'ar' ? "تم تحديد الكل كمقروء" : "All marked as read" });
        },
    });

    const handleNotifClick = (notif: Notification) => {
        if (!notif.read) markRead.mutate(notif.id);
        setLocation(getNotifTarget(notif, user?.role));
    };

    const getNotifIcon = (type: string) => {
        switch (type) {
            case "booking_update": return <Calendar className="w-5 h-5" />;
            case "new_message": return <MessageSquare className="w-5 h-5" />;
            default: return <Info className="w-5 h-5" />;
        }
    };

    const getNotifColor = (type: string) => {
        switch (type) {
            case "booking_update": return { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400" };
            case "new_message": return { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400" };
            default: return { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-500" };
        }
    };

    if (!user) {
        setLocation("/login");
        return null;
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <Layout>
            <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
                <div className="container mx-auto px-4 max-w-5xl pb-24">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3.5 bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl">
                                <Bell className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">
                                    {t("notifications") || "Notifications"}
                                </h1>
                                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
                                    {unreadCount > 0
                                        ? (language === 'ar' ? `${unreadCount} غير مقروءة` : `${unreadCount} unread`)
                                        : (language === 'ar' ? "لا توجد غير مقروءة" : "All caught up")
                                    }
                                </p>
                            </div>
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-6 h-12 shadow-sm"
                                style={{ borderRadius: "16px" }}
                                startContent={<CheckCircle2 className="w-4 h-4" />}
                                onPress={() => markAllRead.mutate()}
                                isDisabled={markAllRead.isPending}
                            >
                                {language === 'ar' ? "تحديد الكل" : "Mark all read"}
                            </Button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6" style={{ borderRadius: "28px" }}>
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="w-12 h-12 rounded-2xl" />
                                        <div className="space-y-2 flex-1"><Skeleton className="h-4 w-64 rounded-lg" /><Skeleton className="h-3 w-32 rounded-lg" /></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
                            <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-10 h-10 text-zinc-400" />
                            </div>
                            <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2">
                                {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications yet'}
                            </h3>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((notif) => {
                                const colors = getNotifColor(notif.type);
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotifClick(notif)}
                                        className={`bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-5 flex items-center gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:scale-[1.01] transition-transform cursor-pointer ${!notif.read ? 'border-l-4 border-l-amber-500' : ''}`}
                                        style={{ borderRadius: "28px" }}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center ${colors.text} shrink-0`}>
                                            {getNotifIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notif.read ? 'font-extrabold text-zinc-900 dark:text-white' : 'font-medium text-zinc-600 dark:text-zinc-400'}`}>
                                                {notif.message}
                                            </p>
                                            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-1">
                                                {notif.createdAt ? new Date(notif.createdAt).toLocaleString(language === 'ar' ? 'ar-MA' : 'en-US', {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short'
                                                }) : ""}
                                            </p>
                                        </div>
                                        {!notif.read && (
                                            <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0 animate-pulse" />
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
