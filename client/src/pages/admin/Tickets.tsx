import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import type { Ticket, User } from "@shared/schema";
import { Search, Eye, Headphones } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Button,
  Input,
  Select,
  SelectItem,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";

type AdminTicket = Ticket & { user: User };

export default function AdminTicketsPage() {
    const { t, language } = useLanguage();
    const isAr = language === "ar";
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<"all" | "ban_appeals" | "general">("all");

    const { data: tickets, isLoading } = useQuery<AdminTicket[]>({
        queryKey: ["/api/admin/tickets"],
        queryFn: async () => {
            try {
                const res = await fetch("/api/admin/tickets", { credentials: "include" });
                const contentType = res.headers.get("content-type") || "";
                if (res.ok && contentType.includes("application/json")) {
                    const json = await res.json();
                    if (Array.isArray(json)) {
                        return json.map((t: any) => {
                            const u = t.user || {};
                            return {
                                ...t,
                                user: {
                                    ...u,
                                    fullName: u.fullName || u.full_name || t.userName || t.user_name || "مستخدم",
                                    username: u.username || (u.email || t.userEmail || "user").split("@")[0],
                                    email: u.email || t.userEmail || "",
                                    isBanned: Boolean(u.isBanned ?? u.is_banned ?? false),
                                }
                            };
                        });
                    }
                }
            } catch (e) {}

            try {
                const { data: rawTickets } = await supabase.from("tickets").select("*");
                const { data: usersList } = await supabase.from("users").select("*");
                const userMap = new Map((usersList || []).map((u: any) => [u.id, u]));

                return (rawTickets || []).map((t: any) => {
                    const rawUser: any = userMap.get(t.user_id) || {};
                    const fullName = rawUser.full_name || rawUser.fullName || t.userName || t.user_name || "مستخدم";
                    const username = rawUser.username || (rawUser.email || t.userEmail || t.user_email || "user").split("@")[0];
                    const email = rawUser.email || t.userEmail || t.user_email || "";
                    const isBanned = Boolean(rawUser.is_banned ?? rawUser.isBanned ?? false);

                    return {
                        ...t,
                        id: t.id,
                        subject: t.subject || "بدون عنوان",
                        status: t.status || "open",
                        priority: t.priority || "normal",
                        createdAt: t.created_at || t.createdAt || new Date().toISOString(),
                        user: {
                            id: t.user_id || rawUser.id || 0,
                            fullName,
                            username,
                            email,
                            isBanned,
                        }
                    };
                });
            } catch (e) {}

            return [];
        }
    });

    const isBanAppeal = (ticket: any) =>
        Boolean(
            ticket?.user?.isBanned ||
            ticket?.user?.is_banned ||
            ticket?.subject?.includes("[اعتراض حظر]") ||
            ticket?.subject?.toLowerCase().includes("حظر") ||
            ticket?.subject?.toLowerCase().includes("ban")
        );

    const banAppealsCount = tickets?.filter(isBanAppeal).length || 0;
    const generalTicketsCount = (tickets?.length || 0) - banAppealsCount;

    const filteredTickets = tickets?.filter(ticket => {
        if (!ticket) return false;
        const isAppeal = isBanAppeal(ticket);
        const matchesCategory =
            categoryFilter === "all" ||
            (categoryFilter === "ban_appeals" && isAppeal) ||
            (categoryFilter === "general" && !isAppeal);

        const searchLower = searchTerm.toLowerCase();
        const userFullName = String(ticket?.user?.fullName || (ticket?.user as any)?.full_name || "");
        const userUsername = String(ticket?.user?.username || "");
        const matchesSearch =
            !searchTerm ||
            (ticket?.subject && ticket.subject.toLowerCase().includes(searchLower)) ||
            userFullName.toLowerCase().includes(searchLower) ||
            userUsername.toLowerCase().includes(searchLower);

        const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

        return matchesCategory && matchesSearch && matchesStatus && matchesPriority;
    });

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
        switch (status) {
            case 'open': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">{statusLabels[status] || status}</span>;
            case 'resolved': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">{statusLabels[status] || status}</span>;
            case 'closed': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400">{statusLabels[status] || status}</span>;
            default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400">{status}</span>;
        }
    };

    const getPriorityBadge = (p: string) => {
        switch (p) {
            case 'high': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">{priorityLabels[p] || p}</span>;
            case 'normal': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400">{priorityLabels[p] || p}</span>;
            case 'low': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">{priorityLabels[p] || p}</span>;
            default: return null;
        }
    };

    return (
        <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
            <div className="container mx-auto px-4 max-w-5xl pb-24">
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3.5 bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl">
                                <Headphones className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("supportTickets")}</h1>
                                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                                    {isAr ? "إدارة تيكيتات الدعم الفني واستفسارات اعتراضات الحظر" : "Gérer les tickets de support et demandes de débannissement"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Select
                                label={t("status")}
                                placeholder={t("status")}
                                selectedKeys={new Set([statusFilter])}
                                onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string || "all")}
                                className="w-[130px]"
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
                                className="w-[130px]"
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
                    </div>

                    {/* Dedicated Category Tabs (All / Ban Appeals / General) */}
                    <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm w-fit overflow-x-auto">
                        <button
                            onClick={() => setCategoryFilter("all")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                                categoryFilter === "all"
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            }`}
                        >
                            <span>{isAr ? "جميع التيكيتات" : "Tous les tickets"}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                                {tickets?.length || 0}
                            </span>
                        </button>

                        <button
                            onClick={() => setCategoryFilter("ban_appeals")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                                categoryFilter === "ban_appeals"
                                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                                    : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            }`}
                        >
                            <span>{isAr ? "🛑 اعتراضات الحظر" : "🛑 Appels Débannissement"}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold">
                                {banAppealsCount}
                            </span>
                        </button>

                        <button
                            onClick={() => setCategoryFilter("general")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                                categoryFilter === "general"
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            }`}
                        >
                            <span>{isAr ? "💬 الدعم العام" : "Support Général"}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                {generalTicketsCount}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] overflow-hidden" style={{ borderRadius: "28px" }}>
                    <Table aria-label={t("ticketsTable")}>
                        <TableHeader>
                            <TableColumn className="w-[80px] bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("id")}</TableColumn>
                            <TableColumn className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("subject")}</TableColumn>
                            <TableColumn className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("user")}</TableColumn>
                            <TableColumn className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("status")}</TableColumn>
                            <TableColumn className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("priority")}</TableColumn>
                            <TableColumn className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("created")}</TableColumn>
                            <TableColumn className="text-right bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("action")}</TableColumn>
                        </TableHeader>
                        <TableBody
                            isLoading={isLoading}
                            emptyContent={t("noTicketsFound")}
                            items={isLoading ? [] : (filteredTickets ?? [])}
                        >
                            {(ticket) => {
                                const isAppeal = isBanAppeal(ticket);
                                const userObj = ticket?.user || ({} as any);
                                const userName = String(userObj.fullName || userObj.full_name || userObj.username || t("unnamedUser") || "مستخدم");
                                const userInitial = (userName.trim()[0] || "U").toUpperCase();
                                const userHandle = String(userObj.username || (userObj.email ? userObj.email.split("@")[0] : "user"));

                                return (
                                <TableRow key={ticket.id} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors ${isAppeal ? "bg-rose-50/30 dark:bg-rose-950/10" : ""}`}>
                                    <TableCell className="font-medium text-xs text-zinc-400">#{ticket.id}</TableCell>
                                    <TableCell className="font-semibold text-zinc-900 dark:text-white">
                                        <div className="flex items-center gap-2">
                                            {isAppeal && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shrink-0 shadow-sm">
                                                    🛑 اعتراض حظر
                                                </span>
                                            )}
                                            <span className="line-clamp-1">{ticket.subject || "—"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-950/30 flex items-center justify-center text-[10px] font-bold text-[#00bcd4]">
                                                {userInitial}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-1">
                                                    {userName}
                                                    {userObj.isBanned && (
                                                        <span className="text-[10px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-950 dark:text-rose-400 px-1.5 py-0.2 rounded">محظور</span>
                                                    )}
                                                </span>
                                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">@{userHandle}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                                    <TableCell className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("ar-MA") : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/k-admin-portal-secure/tickets/${ticket.id}`}>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                                );
                            }}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {isLoading ? (
                        <div className="text-center py-12 text-zinc-400">{t("loading")}</div>
                    ) : filteredTickets?.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
                            <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Headphones className="w-10 h-10 text-zinc-400" />
                            </div>
                            <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2">{t("noTicketsFound")}</h3>
                            <p className="text-zinc-500 dark:text-zinc-400 font-medium">{t("noTicketsFound")}</p>
                        </div>
                    ) : (
                        filteredTickets?.map((ticket) => {
                            const isAppeal = isBanAppeal(ticket);
                            const userObj = ticket?.user || ({} as any);
                            const userName = String(userObj.fullName || userObj.full_name || userObj.username || t("unnamedUser") || "مستخدم");
                            const userInitial = (userName.trim()[0] || "U").toUpperCase();

                            return (
                            <div key={ticket.id} className={`bg-white dark:bg-zinc-900 border transition-all p-5 ${isAppeal ? "border-rose-300 dark:border-rose-900 bg-rose-50/20" : "border-zinc-100 dark:border-zinc-800/80"} shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:scale-[1.01]`} style={{ borderRadius: "28px" }}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-zinc-400">#{ticket.id}</span>
                                        {isAppeal && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shrink-0 shadow-sm">
                                                🛑 اعتراض حظر
                                            </span>
                                        )}
                                    </div>
                                    {getStatusBadge(ticket.status)}
                                </div>
                                <h3 className="font-bold text-base mb-1 line-clamp-1 text-zinc-900 dark:text-white">{ticket.subject || "—"}</h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-950/30 flex items-center justify-center text-[9px] font-bold text-[#00bcd4]">
                                        {userInitial}
                                    </div>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                        {userName}
                                        {userObj.isBanned && <span className="text-[10px] text-rose-600 font-bold ml-1">(محظور)</span>}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                    {getPriorityBadge(ticket.priority)}
                                    <Link href={`/k-admin-portal-secure/tickets/${ticket.id}`}>
                                        <Button
                                            size="sm"
                                            className="bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-sm font-bold px-4 h-9 text-xs gap-1.5 hover:border-[#00bcd4]"
                                            style={{ borderRadius: "12px" }}
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            {t("viewTicket")}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
