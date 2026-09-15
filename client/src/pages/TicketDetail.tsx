import { Layout } from "@/components/Layout";
import { useAuth, resolveCurrentNumericUserId } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Ticket, TicketMessage, User } from "@shared/schema";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { Button, Input, Chip, Avatar } from "@heroui/react";
import { useLocation, useParams, Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type FullTicket = Ticket & {
    user: User;
    messages: (TicketMessage & { sender: User })[];
};

export default function TicketDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [location, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isAdminRoute = location.startsWith('/k-admin-portal-secure/');
    const apiBase = isAdminRoute ? '/api/admin/tickets' : '/api/tickets';

    const { data: ticket, isLoading } = useQuery<FullTicket | null>({
        queryKey: [`${apiBase}/${id}`],
        enabled: !!id,
        queryFn: async (): Promise<FullTicket | null> => {
            const ticketId = Number(id);
            if (!ticketId) return null;

            // 1. Try backend API first
            try {
                const res = await fetch(`${apiBase}/${id}`, { credentials: "include" });
                const contentType = res.headers.get("content-type") || "";
                if (res.ok && contentType.includes("application/json")) {
                    const json = await res.json();
                    if (json && json.id) return json;
                }
            } catch (e) {}

            // 2. Direct Supabase Query Fallback
            try {
                const { data: tData, error: tErr } = await supabase
                    .from("tickets")
                    .select("*")
                    .eq("id", ticketId)
                    .maybeSingle();

                if (tErr || !tData) return null;

                // Resolve ticket owner user
                let userObj: any = {
                    id: tData.user_id || 0,
                    fullName: tData.userName || tData.user_name || "مستخدم",
                    username: tData.userEmail ? tData.userEmail.split("@")[0] : "user",
                    email: tData.userEmail || "",
                    role: "client",
                    isBanned: false,
                };

                if (tData.user_id) {
                    const { data: u } = await supabase
                        .from("users")
                        .select("*")
                        .eq("id", tData.user_id)
                        .maybeSingle();
                    if (u) {
                        userObj = {
                            id: u.id,
                            fullName: u.full_name || u.fullName || userObj.fullName,
                            username: u.username || userObj.username,
                            email: u.email || userObj.email,
                            role: u.role || "client",
                            isBanned: Boolean(u.is_banned ?? u.isBanned ?? false),
                        };
                    }
                }

                // Fetch ticket messages
                const { data: rawMsgs } = await supabase
                    .from("ticket_messages")
                    .select("*")
                    .eq("ticket_id", ticketId)
                    .order("created_at", { ascending: true });

                const senderIds = Array.from(new Set((rawMsgs || []).map((m: any) => m.sender_id).filter(Boolean)));
                const senderMap = new Map<number, any>();
                if (senderIds.length > 0) {
                    const { data: senders } = await supabase
                        .from("users")
                        .select("*")
                        .in("id", senderIds);
                    (senders || []).forEach((s: any) => senderMap.set(s.id, s));
                }

                const messages = (rawMsgs || []).map((m: any) => {
                    const s = senderMap.get(m.sender_id) || {};
                    const isSenderAdmin = s.role === "admin" || m.sender_role === "admin";
                    return {
                        id: m.id,
                        ticketId: m.ticket_id,
                        senderId: m.sender_id,
                        content: m.content || "",
                        createdAt: m.created_at,
                        sender: {
                            id: m.sender_id,
                            fullName: isSenderAdmin ? "Administrator" : (s.full_name || s.fullName || "مستخدم"),
                            username: s.username || "user",
                            email: s.email || "",
                            role: s.role || (isSenderAdmin ? "admin" : "client"),
                        }
                    };
                });

                return {
                    id: tData.id,
                    userId: tData.user_id,
                    subject: tData.subject || "بدون عنوان",
                    description: tData.description || "",
                    status: tData.status || "open",
                    priority: tData.priority || "normal",
                    createdAt: tData.created_at || new Date().toISOString(),
                    updatedAt: tData.updated_at || new Date().toISOString(),
                    user: userObj,
                    messages: messages as any,
                } as any;
            } catch (e) {
                console.error("TicketDetail Supabase query error:", e);
            }

            return null;
        }
    });

    const sendMessage = useMutation({
        mutationFn: async (content: string) => {
            const ticketId = Number(id);
            try {
                const res = await fetch(`${apiBase}/${id}/messages`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ content }),
                });
                const contentType = res.headers.get("content-type") || "";
                if (res.ok && contentType.includes("application/json")) {
                    return await res.json();
                }
            } catch (e) {}

            // Supabase fallback
            let senderNumericId: number;
            if (isAdminRoute) {
                const { data: adminRow } = await supabase.from("users").select("id").eq("role", "admin").limit(1).maybeSingle();
                senderNumericId = adminRow?.id || 11;
            } else {
                senderNumericId = await resolveCurrentNumericUserId(user);
            }

            const { data: newMsg, error } = await supabase
                .from("ticket_messages")
                .insert({
                    ticket_id: ticketId,
                    sender_id: senderNumericId,
                    content,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw new Error(error.message);

            await supabase
                .from("tickets")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", ticketId);

            return newMsg;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`${apiBase}/${id}`] });
            setNewMessage("");
        },
        onError: () => {
            toast({ title: t("failedToSend"), variant: "destructive" });
        },
    });

    const updateStatus = useMutation({
        mutationFn: async (status: string) => {
            const ticketId = Number(id);
            try {
                const res = await fetch(`${apiBase}/${id}/status`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ status }),
                });
                const contentType = res.headers.get("content-type") || "";
                if (res.ok && contentType.includes("application/json")) {
                    return await res.json();
                }
            } catch (e) {}

            // Supabase fallback
            const { data: updated, error } = await supabase
                .from("tickets")
                .update({ status, updated_at: new Date().toISOString() })
                .eq("id", ticketId)
                .select()
                .single();

            if (error) throw new Error(error.message);
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`${apiBase}/${id}`] });
            queryClient.invalidateQueries({ queryKey: [apiBase] });
            toast({ title: t("ticketStatusUpdated") });
        },
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [ticket?.messages]);

    if (!user && !isAdminRoute) {
        setLocation("/login");
        return null;
    }

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !ticket || ticket.status === 'closed') return;
        sendMessage.mutate(newMessage);
    };

    const statusLabels: Record<string, string> = {
        open: t("open"),
        resolved: t("resolved"),
        closed: t("closed"),
    };

    const getStatusBadge = (status: string) => {
        const label = statusLabels[status] || status;
        switch (status) {
            case 'open': return <Chip color="warning" variant="flat">{label}</Chip>;
            case 'resolved': return <Chip color="success" variant="flat">{label}</Chip>;
            case 'closed': return <Chip variant="flat">{label}</Chip>;
            default: return <Chip variant="bordered">{label}</Chip>;
        }
    };

    if (isLoading) {
        const content = <div className="container mx-auto px-4 py-8 max-w-4xl text-center text-muted-foreground">{t("loadingTicket")}</div>;
        return isAdminRoute ? content : <Layout>{content}</Layout>;
    }

    if (!ticket) {
        const content = <div className="container mx-auto px-4 py-8 max-w-4xl text-center text-muted-foreground">{t("ticketNotFound")}</div>;
        return isAdminRoute ? content : <Layout>{content}</Layout>;
    }

    // Only admins can change ticket status
    const canChangeStatus = isAdminRoute || user?.role === 'admin';

    const ticketOwnerName = ticket.user?.fullName || t("user") || "User";

    const inner = (
        <div className="container mx-auto px-4 py-8 max-w-4xl flex flex-col h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 shrink-0">
                {isAdminRoute ? (
                    <Link href="/k-admin-portal-secure/tickets">
                        <Button variant="light" isIconOnly><ArrowLeft className="w-5 h-5" /></Button>
                    </Link>
                ) : (
                    <Link href="/support">
                        <Button variant="light" isIconOnly><ArrowLeft className="w-5 h-5" /></Button>
                    </Link>
                )}
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        #{ticket.id} - {ticket.subject}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">
                            {t("by")}: {ticketOwnerName}
                        </span>
                        <span>•</span>
                        {getStatusBadge(ticket.status)}
                    </div>
                </div>
                {ticket.status !== 'closed' && canChangeStatus && (
                    <Button
                        variant="bordered"
                        className="gap-2 shrink-0"
                        onPress={() => updateStatus.mutate(ticket.status === 'resolved' ? 'closed' : 'resolved')}
                        isDisabled={updateStatus.isPending}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        {language === 'ar'
                            ? (ticket.status === 'resolved' ? t("closeTicket") : t("markResolved"))
                            : (ticket.status === 'resolved' ? t("closeTicket") : t("markResolved"))}
                    </Button>
                )}
            </div>

            <div className="bg-card border rounded-xl flex flex-col flex-1 overflow-hidden shadow-sm">
                {/* Initial description */}
                <div className="p-6 border-b bg-muted/20 shrink-0">
                    <div className="flex items-start gap-4">
                        <Avatar name={ticketOwnerName} showFallback className="w-10 h-10 border shadow-sm" />
                        <div>
                            <div className="font-semibold">
                                {ticketOwnerName}
                                <span className="text-xs font-normal text-muted-foreground ml-2">
                                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("ar-MA") : "-"}
                                </span>
                            </div>
                            <p className="text-foreground mt-2 whitespace-pre-wrap">{ticket.description}</p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    {(!ticket.messages || ticket.messages.length === 0) ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            {t("noRepliesYet")}
                        </div>
                    ) : (
                        (ticket.messages || []).map((msg) => {
                            const sender = msg.sender;
                            const isSupportAdmin = sender?.role === 'admin';
                            
                            // Determine if this message should be rendered as "Me" (on the right side)
                            let isMe = false;
                            if (isAdminRoute) {
                                // In the admin portal, the admin is "Me"
                                isMe = isSupportAdmin;
                            } else {
                                // In the client portal, the logged-in user is "Me"
                                isMe = user ? user.id === msg.senderId : false;
                            }

                            // Which avatar and name to show
                            const senderName = isSupportAdmin ? "Administrator" : (sender?.fullName || t("user") || "User");
                            const displayName = isMe ? t("you") : senderName;
                            
                            // Bubble styling
                            let bubbleClass = 'bg-white border rounded-tl-sm shadow-sm'; // Default client
                            if (isMe && isAdminRoute) {
                                bubbleClass = 'bg-slate-800 text-slate-100 rounded-tr-sm shadow-md'; // Admin in their own portal
                            } else if (isMe && !isAdminRoute) {
                                bubbleClass = 'bg-primary text-primary-foreground rounded-tr-sm'; // Client in client portal
                            } else if (isSupportAdmin) {
                                bubbleClass = 'bg-amber-100 text-amber-900 rounded-tl-sm border border-amber-200'; // Admin seen by client
                            }

                            return (
                                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <Avatar
                                        src={isSupportAdmin ? undefined : sender?.profileImage || undefined}
                                        name={sender?.fullName || t("user")}
                                        showFallback
                                        className={`w-8 h-8 shrink-0 border ${isSupportAdmin ? 'ring-2 ring-slate-800 ring-offset-1' : ''}`}
                                        classNames={{ fallback: isSupportAdmin ? 'bg-slate-800 text-slate-100 text-xs font-bold' : 'text-xs' }}
                                    />
                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-muted-foreground">
                                            <span>{displayName}</span>
                                            {isSupportAdmin && (
                                                <Chip variant="bordered" size="sm" className="text-[9px] h-4 px-1 border-amber-500 text-amber-600 bg-amber-50 rounded-sm leading-none shrink-0 font-bold uppercase tracking-wider">
                                                    Admin
                                                </Chip>
                                            )}
                                            <span>{' • '}</span>
                                            <span>{new Date(msg.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className={`px-4 py-2.5 rounded-2xl ${bubbleClass}`}>
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-background border-t shrink-0">
                    {ticket.status === 'closed' ? (
                        <div className="text-center p-3 text-muted-foreground bg-muted rounded-lg text-sm border border-dashed">
                            {t("ticketClosed")}
                        </div>
                    ) : (
                        <form onSubmit={handleSend} className="flex gap-3 items-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                            <Input
                                className="flex-1 text-base"
                                placeholder={t("typeReply")}
                                value={newMessage}
                                onValueChange={setNewMessage}
                                isDisabled={sendMessage.isPending}
                            />
                            <Button
                                type="submit"
                                isIconOnly
                                className="h-12 w-12 rounded-xl shrink-0 shadow-md"
                                isDisabled={!newMessage.trim() || sendMessage.isPending}
                            >
                                <Send className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );

    return isAdminRoute ? inner : <Layout>{inner}</Layout>;
}
