import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Ticket, TicketMessage, User } from "@shared/schema";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocation, useParams, Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type FullTicket = Ticket & {
    user: User;
    messages: (TicketMessage & { sender: User })[];
};

export default function TicketDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const { language } = useLanguage();
    const [location, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isAdminRoute = location.startsWith('/k-admin-portal-secure/');
    const apiBase = isAdminRoute ? '/api/admin/tickets' : '/api/tickets';

    const { data: ticket, isLoading } = useQuery<FullTicket>({
        queryKey: [`${apiBase}/${id}`],
        enabled: (!!user || isAdminRoute) && !!id,
    });

    const sendMessage = useMutation({
        mutationFn: async (content: string) => {
            const res = await fetch(`${apiBase}/${id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ content }),
            });
            if (!res.ok) throw new Error("Failed to send message");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`${apiBase}/${id}`] });
            setNewMessage("");
        },
        onError: () => {
            toast({ title: language === 'ar' ? "فشل إرسال الرسالة" : "Failed to send message", variant: "destructive" });
        },
    });

    const updateStatus = useMutation({
        mutationFn: async (status: string) => {
            const res = await fetch(`${apiBase}/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`${apiBase}/${id}`] });
            queryClient.invalidateQueries({ queryKey: [apiBase] });
            toast({ title: language === 'ar' ? "تم تحديث حالة التذكرة" : "Ticket status updated" });
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

    const statusLabels: Record<string, { ar: string; en: string }> = {
        open: { ar: 'مفتوحة', en: 'Open' },
        resolved: { ar: 'محلولة', en: 'Resolved' },
        closed: { ar: 'مغلقة', en: 'Closed' },
    };

    const getStatusBadge = (status: string) => {
        const label = statusLabels[status]?.[language === 'ar' ? 'ar' : 'en'] || status;
        switch (status) {
            case 'open': return <Badge className="bg-amber-500">{label}</Badge>;
            case 'resolved': return <Badge className="bg-green-500">{label}</Badge>;
            case 'closed': return <Badge variant="secondary">{label}</Badge>;
            default: return <Badge variant="outline">{label}</Badge>;
        }
    };

    if (isLoading) {
        const content = <div className="container mx-auto px-4 py-8 max-w-4xl text-center text-muted-foreground">Loading ticket...</div>;
        return isAdminRoute ? content : <Layout>{content}</Layout>;
    }

    if (!ticket) {
        const content = <div className="container mx-auto px-4 py-8 max-w-4xl text-center text-muted-foreground">Ticket not found.</div>;
        return isAdminRoute ? content : <Layout>{content}</Layout>;
    }

    // Only admins can change ticket status
    const canChangeStatus = isAdminRoute || user?.role === 'admin';

    const inner = (
        <div className="container mx-auto px-4 py-8 max-w-4xl flex flex-col h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 shrink-0">
                {isAdminRoute ? (
                    <Link href="/k-admin-portal-secure/tickets">
                        <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
                    </Link>
                ) : (
                    <Link href="/support">
                        <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
                    </Link>
                )}
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        #{ticket.id} - {ticket.subject}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">
                            {language === 'ar' ? "بواسطة" : "By"}: {ticket.user.fullName}
                        </span>
                        <span>•</span>
                        {getStatusBadge(ticket.status)}
                    </div>
                </div>
                {ticket.status !== 'closed' && canChangeStatus && (
                    <Button
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 gap-2 shrink-0 border-green-200"
                        onClick={() => updateStatus.mutate(ticket.status === 'resolved' ? 'closed' : 'resolved')}
                        disabled={updateStatus.isPending}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        {language === 'ar'
                            ? (ticket.status === 'resolved' ? 'إغلاق التذكرة' : 'تحديد كمحلولة')
                            : (ticket.status === 'resolved' ? 'Close Ticket' : 'Mark Resolved')}
                    </Button>
                )}
            </div>

            <div className="bg-card border rounded-xl flex flex-col flex-1 overflow-hidden shadow-sm">
                {/* Initial description */}
                <div className="p-6 border-b bg-muted/20 shrink-0">
                    <div className="flex items-start gap-4">
                        <Avatar className="w-10 h-10 border shadow-sm">
                            <AvatarFallback>{ticket.user.fullName[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-semibold">
                                {ticket.user.fullName}
                                <span className="text-xs font-normal text-muted-foreground ml-2">
                                    {new Date(ticket.createdAt!).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-foreground mt-2 whitespace-pre-wrap">{ticket.description}</p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    {ticket.messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            {language === 'ar' ? "لا توجد ردود بعد" : "No replies yet. An agent will be with you shortly."}
                        </div>
                    ) : (
                        ticket.messages.map((msg) => {
                            const isSupportAdmin = msg.sender.role === 'admin';
                            
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
                            const senderName = isSupportAdmin ? "Administrator" : msg.sender.fullName;
                            const displayName = isMe ? (language === 'ar' ? 'أنت' : 'You') : senderName;
                            
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
                                    <Avatar className={`w-8 h-8 shrink-0 border ${isSupportAdmin ? 'ring-2 ring-slate-800 ring-offset-1' : ''}`}>
                                        <AvatarImage src={isSupportAdmin ? undefined : msg.sender.profileImage || undefined} />
                                        <AvatarFallback className={isSupportAdmin ? 'bg-slate-800 text-slate-100 text-xs font-bold' : 'text-xs'}>
                                            {isSupportAdmin ? 'A' : msg.sender.fullName[0]?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-muted-foreground">
                                            <span>{displayName}</span>
                                            {isSupportAdmin && (
                                                <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-amber-500 text-amber-600 bg-amber-50 rounded-sm leading-none shrink-0 font-bold uppercase tracking-wider">
                                                    Admin
                                                </Badge>
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
                            {language === 'ar' ? "هذه التذكرة مغلقة ولا يمكن الرد عليها." : "This ticket is closed and cannot be replied to."}
                        </div>
                    ) : (
                        <form onSubmit={handleSend} className="flex gap-3 items-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                            <Input
                                className="flex-1 bg-muted/30 hover:bg-muted/50 transition-colors focus-visible:ring-primary/50 text-base py-6 px-4 rounded-xl"
                                placeholder={language === 'ar' ? "اكتب ردك هنا..." : "Type your reply..."}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                disabled={sendMessage.isPending}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                className="h-12 w-12 rounded-xl shrink-0 shadow-md"
                                disabled={!newMessage.trim() || sendMessage.isPending}
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
