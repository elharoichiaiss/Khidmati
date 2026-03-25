import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";
import { Bell, Calendar, Info, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";

export default function NotificationsPage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery<Notification[]>({
        queryKey: ["/api/notifications"],
        enabled: !!user,
    });

    const markRead = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
            if (!res.ok) throw new Error("Failed to mark as read");
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    });

    const markAllRead = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/notifications/read-all`, { method: "PATCH", credentials: "include" });
            if (!res.ok) throw new Error("Failed to mark all as read");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            toast({ title: language === 'ar' ? "تم تحديد الكل كمقروء" : "All marked as read" });
        },
    });

    const handleNotifClick = (notif: Notification) => {
        if (!notif.read) markRead.mutate(notif.id);
        if (notif.link) setLocation(notif.link);
    };

    const getNotifIcon = (type: string) => {
        switch (type) {
            case "booking_update": return <Calendar className="w-5 h-5 text-primary" />;
            case "new_message": return <Mail className="w-5 h-5 text-blue-500" />;
            default: return <Info className="w-5 h-5 text-muted-foreground" />;
        }
    };

    if (!user) {
        setLocation("/login");
        return null;
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                            <Bell className="w-8 h-8 text-primary" />
                            {t("notifications") || "Notifications"}
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            {unreadCount > 0
                                ? (language === 'ar' ? `لديك ${unreadCount} إشعارات غير مقروءة` : `You have ${unreadCount} unread notifications`)
                                : (language === 'ar' ? "لا توجد إشعارات غير مقروءة" : "You're all caught up!")
                            }
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => markAllRead.mutate()}
                            disabled={markAllRead.isPending}
                            className="gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {language === 'ar' ? "تحديد الكل كمقروء" : "Mark all as read"}
                        </Button>
                    )}
                </div>

                <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground">
                            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg">{language === 'ar' ? 'لا توجد إشعارات' : 'No notifications yet'}</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotifClick(notif)}
                                    className={`p-4 flex gap-4 transition-colors cursor-pointer hover:bg-muted/50 ${!notif.read ? 'bg-primary/5' : ''}`}
                                >
                                    <div className={`p-3 rounded-full flex-shrink-0 ${!notif.read ? 'bg-background shadow-sm' : 'bg-muted'}`}>
                                        {getNotifIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-base ${!notif.read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                            {notif.message}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {notif.createdAt ? new Date(notif.createdAt).toLocaleString(language === 'ar' ? 'ar-MA' : 'en-US', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short'
                                            }) : ""}
                                        </p>
                                    </div>
                                    {!notif.read && (
                                        <div className="w-3 h-3 rounded-full bg-primary mt-2 flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
