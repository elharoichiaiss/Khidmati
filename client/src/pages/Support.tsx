import { Layout } from "@/components/Layout";
import { useAuth, resolveCurrentNumericUserId } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Ticket } from "@shared/schema";
import { LifeBuoy, Plus, MessageSquare, CheckCircle2, Search } from "lucide-react";
import { Button, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem, Chip, Skeleton } from "@heroui/react";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type SupportTicket = Ticket & {
    replies?: number;
    adminReplies?: number;
    lastReadAt?: string | null;
};

export default function SupportPage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("normal");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");

    // Helper to resolve integer user_ids in Supabase Postgres for the current user
    const getAuthenticatedUserIds = async (): Promise<number[]> => {
        const idsSet = new Set<number>();

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const email = session?.user?.email || user?.email;
            const googleId = session?.user?.id || (user as any)?.googleId;

            if (email || googleId) {
                let q = supabase.from("users").select("id");
                if (email && googleId) {
                    q = q.or(`email.eq.${email},google_id.eq.${googleId}`);
                } else if (email) {
                    q = q.eq("email", email);
                } else {
                    q = q.eq("google_id", googleId);
                }
                const { data: found } = await q;
                if (Array.isArray(found)) {
                    found.forEach(u => idsSet.add(u.id));
                }
            }
        } catch (e) {}

        const numericId = await resolveCurrentNumericUserId(user);
        if (numericId) idsSet.add(numericId);

        if (user?.id && typeof user.id === "number" && !isNaN(user.id)) {
            idsSet.add(user.id);
        }

        return Array.from(idsSet);
    };

    const { data: tickets = [], isLoading } = useQuery<SupportTicket[]>({
        queryKey: ["/api/tickets", user?.id, user?.email],
        enabled: !!user,
        queryFn: async (): Promise<SupportTicket[]> => {
            // 1. Try backend API first
            try {
                const res = await fetch("/api/tickets", { credentials: "include" });
                const contentType = res.headers.get("content-type") || "";
                if (res.ok && contentType.includes("application/json")) {
                    const json = await res.json();
                    if (Array.isArray(json) && json.length > 0) return json;
                }
            } catch (e) {}

            // 2. Direct Supabase DB query
            try {
                const userIds = await getAuthenticatedUserIds();
                let query = supabase.from("tickets").select("*").order("created_at", { ascending: false });

                if (user?.role !== "admin") {
                    if (userIds.length > 0) {
                        query = query.in("user_id", userIds);
                    }
                }

                const { data: dbTickets } = await query;
                if (Array.isArray(dbTickets)) {
                    const ticketIds = dbTickets.map(t => t.id);
                    let repliesCountMap = new Map<number, number>();
                    let adminRepliesCountMap = new Map<number, number>();

                    if (ticketIds.length > 0) {
                        const { data: allMessages } = await supabase
                            .from("ticket_messages")
                            .select("ticket_id, sender_id")
                            .in("ticket_id", ticketIds);

                        const { data: adminUsers } = await supabase
                            .from("users")
                            .select("id")
                            .eq("role", "admin");
                        const adminIdSet = new Set((adminUsers || []).map(a => a.id));

                        (allMessages || []).forEach((m: any) => {
                            repliesCountMap.set(m.ticket_id, (repliesCountMap.get(m.ticket_id) || 0) + 1);
                            if (adminIdSet.has(m.sender_id)) {
                                adminRepliesCountMap.set(m.ticket_id, (adminRepliesCountMap.get(m.ticket_id) || 0) + 1);
                            }
                        });
                    }

                    return dbTickets.map((t: any) => ({
                        id: t.id,
                        userId: t.user_id,
                        subject: t.subject || "تذكرة دعم",
                        description: t.description || "",
                        status: t.status || "open",
                        priority: t.priority || "normal",
                        createdAt: t.created_at || new Date().toISOString(),
                        updatedAt: t.updated_at || new Date().toISOString(),
                        lastReadAt: t.last_read_at || null,
                        replies: repliesCountMap.get(t.id) || 0,
                        adminReplies: adminRepliesCountMap.get(t.id) || 0,
                    }));
                }
            } catch (e) {}

            // LocalStorage fallback
            try {
                const listRaw = localStorage.getItem("khidmati_user_tickets");
                if (listRaw) {
                    const list = JSON.parse(listRaw);
                    if (Array.isArray(list)) return list;
                }
            } catch (e) {}

            return [];
        }
    });

    const filteredTickets = tickets.filter(ticket => {
        const term = searchTerm.trim().toLowerCase();
        const matchesSearch = !term ||
            ticket.subject.toLowerCase().includes(term) ||
            ticket.description.toLowerCase().includes(term);
        const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
    });

    const createTicket = useMutation({
        mutationFn: async (data: { subject: string, description: string, priority: string }) => {
            try {
                const res = await fetch("/api/tickets", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(data),
                });
                const contentType = res.headers.get("content-type") || "";
                if (res.ok && contentType.includes("application/json")) {
                    return await res.json();
                }
            } catch (e) {}

            try {
                const userIds = await getAuthenticatedUserIds();
                const dbUserId = userIds[0] || (user?.id ? Number(user.id) : 14);
                const ticketPayload = {
                    subject: data.subject,
                    description: data.description,
                    priority: data.priority,
                    status: "open",
                    user_id: dbUserId,
                };
                const { data: inserted, error } = await supabase.from("tickets").insert(ticketPayload).select().single();
                if (error) throw new Error(error.message);
                return inserted;
            } catch (sbErr: any) {
                const ticketObj = {
                    id: Date.now(),
                    userId: user?.id || 14,
                    subject: data.subject,
                    description: data.description,
                    priority: data.priority,
                    status: "open",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                try {
                    const listRaw = localStorage.getItem("khidmati_user_tickets");
                    const list = listRaw ? JSON.parse(listRaw) : [];
                    list.unshift(ticketObj);
                    localStorage.setItem("khidmati_user_tickets", JSON.stringify(list));
                } catch (e) {}
                return ticketObj;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
            setIsDialogOpen(false);
            setSubject("");
            setDescription("");
            setPriority("normal");
            toast({ title: language === 'ar' ? "تم إرسال التذكرة بنجاح" : t("ticketStatusUpdated") });
        },
        onError: () => {
            toast({ title: language === 'ar' ? "فشل إرسال التذكرة" : t("failedToSend"), variant: "destructive" });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject || !description) return;
        createTicket.mutate({ subject, description, priority });
    };

    const statusLabels: Record<string, string> = {
        open: t("open"),
        resolved: t("resolved"),
        closed: t("closed"),
    };
    const priorityLabels: Record<string, string> = {
        high: t("high"),
        normal: t("normal"),
        low: t("low"),
    };

    const getStatusBadge = (status: string) => {
        const label = statusLabels[status] || status;
        switch (status) {
            case 'open': return <Chip color="warning" variant="flat" size="sm" className="font-bold">{label}</Chip>;
            case 'resolved': return <Chip color="success" variant="flat" size="sm" className="font-bold">{label}</Chip>;
            case 'closed': return <Chip variant="flat" size="sm" className="font-bold">{label}</Chip>;
            default: return <Chip variant="bordered" size="sm">{label}</Chip>;
        }
    };

    const getPriorityBadge = (p: string) => {
        const label = priorityLabels[p] || p;
        switch (p) {
            case 'high': return <Chip color="danger" variant="flat" size="sm" className="font-bold">{label}</Chip>;
            case 'normal': return <Chip variant="flat" size="sm" className="font-bold">{label}</Chip>;
            case 'low': return <Chip variant="bordered" size="sm">{label}</Chip>;
            default: return null;
        }
    };

    if (!user) {
        setLocation("/login");
        return null;
    }

    return (
        <Layout>
            <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
                <div className="container mx-auto px-4 max-w-5xl pb-24">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3.5 bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl">
                                <LifeBuoy className="w-7 h-7" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">
                                {t("supportTickets")}
                            </h1>
                        </div>
                        <Button
                            className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-6 h-12 shadow-sm"
                            style={{ borderRadius: "16px" }}
                            startContent={<Plus className="w-5 h-5" />}
                            onPress={() => setIsDialogOpen(true)}
                        >
                            {t("newTicket")}
                        </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap items-end gap-3 mb-6">
                        <Select
                            label={t("status")}
                            placeholder={t("status")}
                            selectedKeys={new Set([statusFilter])}
                            onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string || "all")}
                            className="w-full sm:w-[130px]"
                            size="sm"
                            variant="bordered"
                        >
                            <SelectItem key="all">{t("allStatus")}</SelectItem>
                            <SelectItem key="open">{t("open")}</SelectItem>
                            <SelectItem key="resolved">{t("resolved")}</SelectItem>
                            <SelectItem key="closed">{t("closed")}</SelectItem>
                        </Select>
                        <Select
                            label={t("priority")}
                            placeholder={t("priority")}
                            selectedKeys={new Set([priorityFilter])}
                            onSelectionChange={(keys) => setPriorityFilter(Array.from(keys)[0] as string || "all")}
                            className="w-full sm:w-[130px]"
                            size="sm"
                            variant="bordered"
                        >
                            <SelectItem key="all">{t("allPriority")}</SelectItem>
                            <SelectItem key="high">{t("high")}</SelectItem>
                            <SelectItem key="normal">{t("normal")}</SelectItem>
                            <SelectItem key="low">{t("low")}</SelectItem>
                        </Select>
                        <Input
                            placeholder={t("searchTickets")}
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                            startContent={<Search className="h-4 w-4 text-zinc-400" />}
                            className="w-full sm:w-56"
                            size="md"
                            variant="bordered"
                            radius="lg"
                            classNames={{
                                inputWrapper: "h-12 rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-sm",
                                input: "text-sm font-medium"
                            }}
                        />
                    </div>

                    {isLoading ? (
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
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
                            <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="w-10 h-10 text-zinc-400" />
                            </div>
                            <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2">
                                {language === 'ar' ? "ليس لديك تذاكر سابقة" : t("noTickets")}
                            </h3>
                            <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                                {language === 'ar' ? "اضغط على زر تذكرة جديدة للبدء" : t("newTicket")}
                            </p>
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
                            <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Search className="w-10 h-10 text-zinc-400" />
                            </div>
                            <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2">
                                {language === 'ar' ? "لا توجد نتائج مطابقة" : t("noResults")}
                            </h3>
                            <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                                {language === 'ar' ? "جرّب تغيير الفلاتر أو البحث" : language === 'fr' ? "Essayez de modifier les filtres ou la recherche" : "Try changing the filters or search"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredTickets.map(ticket => {
                                const adminReplied = (ticket.adminReplies || 0) > 0;
                                const lastActivity = ticket.updatedAt ? new Date(ticket.updatedAt) : null;
                                const lastRead = ticket.lastReadAt ? new Date(ticket.lastReadAt) : null;
                                const isUnread = !lastRead || (lastActivity !== null && lastActivity > lastRead);
                                return (
                                    <Link key={ticket.id} href={`/support/${ticket.id}`}>
                                        <div
                                            className={`bg-white dark:bg-zinc-900 ${isUnread
                                                ? 'border-l-4 border-l-amber-500 dark:border-l-amber-400'
                                                : adminReplied ? 'border-l-4 border-l-emerald-500 dark:border-l-emerald-400' : 'border-l-4 border-l-transparent'} border border-zinc-100 dark:border-zinc-800/80 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:scale-[1.01] transition-transform cursor-pointer block`}
                                            style={{ borderRadius: "28px" }}
                                        >
                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                                                    <LifeBuoy className="w-7 h-7" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="text-xs font-black text-red-600 dark:text-red-400 tracking-wider">
                                                            TKT-{ticket.id.toString().padStart(6, '0')}
                                                        </span>
                                                        {isUnread && (
                                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                                {adminReplied ? t("newReply") : t("unread")}
                                                            </span>
                                                        )}
                                                        {!isUnread && adminReplied && (
                                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                {t("ticketReplied")}
                                                            </span>
                                                        )}
                                                        {getStatusBadge(ticket.status)}
                                                        {getPriorityBadge(ticket.priority)}
                                                    </div>
                                                    <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">{ticket.subject}</h3>
                                                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">{ticket.description}</p>
                                                </div>
                                            </div>
                                            <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                                {new Date(ticket.createdAt!).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'en-US', {
                                                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    <Modal isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} size="lg" placement="center">
                        <ModalContent>
                            {(onClose) => (
                                <form onSubmit={handleSubmit} dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                    <ModalHeader className="text-lg font-extrabold">
                                        {language === 'ar' ? "إنشاء تذكرة دعم جديدة" : t("newTicket")}
                                    </ModalHeader>
                                    <ModalBody className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-zinc-400 uppercase tracking-wider">
                                                {t("subject")}
                                            </label>
                                            <Input
                                                value={subject}
                                                onValueChange={setSubject}
                                                placeholder={language === 'ar' ? "مثال: مشكلة في الحجز..." : language === 'fr' ? "Ex: Problème avec réservation..." : "E.g., Issue with booking..."}
                                                required
                                                classNames={{
                                                    inputWrapper: "h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
                                                    input: "text-sm font-medium"
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-zinc-400 uppercase tracking-wider">
                                                {t("description")}
                                            </label>
                                            <Textarea
                                                value={description}
                                                onValueChange={setDescription}
                                                placeholder={language === 'ar' ? "اشرح المشكلة بالتفصيل..." : "Explain your issue in detail..."}
                                                rows={6}
                                                required
                                                classNames={{
                                                    inputWrapper: "rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
                                                    input: "text-sm font-medium"
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-zinc-400 uppercase tracking-wider">
                                                {language === 'ar' ? "الأولوية" : "Priority"}
                                            </label>
                                            <Select
                                                selectedKeys={[priority]}
                                                onSelectionChange={(keys) => setPriority(Array.from(keys)[0] as string)}
                                                dir={language === 'ar' ? 'rtl' : 'ltr'}
                                                classNames={{
                                                    trigger: "h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                                }}
                                            >
                                                <SelectItem key="low">{t("low")}</SelectItem>
                                                <SelectItem key="normal">{t("normal")}</SelectItem>
                                                <SelectItem key="high">{t("high")}</SelectItem>
                                            </Select>
                                        </div>
                                    </ModalBody>
                                    <ModalFooter>
                                        <Button variant="bordered" onPress={onClose} className="font-bold" style={{ borderRadius: "14px" }}>
                                            {t("cancel")}
                                        </Button>
                                        <Button
                                            type="submit"
                                            isDisabled={createTicket.isPending}
                                            className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-6 shadow-sm"
                                            style={{ borderRadius: "14px" }}
                                        >
                                            {createTicket.isPending ? "..." : t("confirm")}
                                        </Button>
                                    </ModalFooter>
                                </form>
                            )}
                        </ModalContent>
                    </Modal>
                </div>
            </div>
        </Layout>
    );
}
