import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { Ban, Trash2, CheckCircle, Search, Eye, Phone, MapPin, Globe, Mail, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Button,
  Input,
  Textarea,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";

import { supabase } from "@/lib/supabase";

export default function AdminUsersPage() {
    const { toast } = useToast();
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState("all");
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deleteReason, setDeleteReason] = useState("");

    // Reset the reason each time the delete confirmation modal opens
    useEffect(() => {
        if (confirmDeleteId) setDeleteReason("");
    }, [confirmDeleteId]);

    const fetchCombinedUsers = async () => {
        const usersMap = new Map<string, any>();

        // 1. Query Supabase DB users table (Primary source)
        try {
            const { data: usersList } = await supabase.from("users").select("*").order("created_at", { ascending: false });
            if (Array.isArray(usersList)) {
                usersList.forEach((u: any) => {
                    const formatted = {
                        id: u.id,
                        fullName: u.full_name || u.fullName || u.name || u.email || "مستخدم",
                        username: u.username || u.email?.split("@")[0] || "user",
                        email: u.email || "",
                        phone: u.phone || "",
                        role: u.role || "client",
                        status: u.status || "active",
                        avatar: u.profile_image || u.avatar || u.avatar_url || "",
                        city: u.city || "",
                        createdAt: u.created_at || u.createdAt || new Date().toISOString(),
                        isBanned: Boolean(u.is_banned || u.isBanned),
                    };
                    const key = formatted.email || String(formatted.id) || formatted.username;
                    if (key) {
                        usersMap.set(String(key).toLowerCase(), formatted);
                    }
                });
            }
        } catch (e) {}

        // 2. Current Supabase Auth session
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const u = session.user;
                const meta = u.user_metadata || {};
                const email = u.email || meta.email || "";
                const key = email || u.id;
                if (key && !usersMap.has(String(key).toLowerCase())) {
                    const formatted = {
                        id: u.id,
                        fullName: meta.full_name || meta.fullName || meta.name || email || "مستخدم",
                        username: meta.username || email?.split("@")[0] || "user",
                        email: email,
                        phone: meta.phone || u.phone || "",
                        role: meta.role || "client",
                        status: meta.status || "active",
                        avatar: meta.avatar_url || meta.picture || "",
                        city: meta.city || "",
                        createdAt: u.created_at || new Date().toISOString(),
                        isBanned: Boolean(meta.is_banned),
                    };
                    usersMap.set(String(key).toLowerCase(), formatted);
                }
            }
        } catch (e) {}

        // 3. LocalStorage registered users list
        try {
            const listRaw = localStorage.getItem("khidmati_registered_users");
            if (listRaw) {
                const list = JSON.parse(listRaw);
                if (Array.isArray(list)) {
                    list.forEach((u: any) => {
                        const key = u.email || u.id || u.username;
                        if (key && !usersMap.has(String(key).toLowerCase())) {
                            usersMap.set(String(key).toLowerCase(), u);
                        }
                    });
                }
            }
        } catch (e) {}

        // 4. Backend API
        try {
            const res = await fetch("/api/admin/users", { credentials: "include" });
            const contentType = res.headers.get("content-type") || "";
            if (res.ok && contentType.includes("application/json")) {
                const json = await res.json();
                if (Array.isArray(json)) {
                    json.forEach((u: any) => {
                        const key = u.email || u.id || u.username;
                        if (key && !usersMap.has(String(key).toLowerCase())) {
                            usersMap.set(String(key).toLowerCase(), u);
                        }
                    });
                }
            }
        } catch (e) {}

        // 4b. Backend API: Supabase Auth users (users registered via Google with no DB row)
        try {
            const res = await fetch("/api/admin/auth-users", { credentials: "include" });
            const contentType = res.headers.get("content-type") || "";
            if (res.ok && contentType.includes("application/json")) {
                const json = await res.json();
                if (Array.isArray(json)) {
                    json.forEach((u: any) => {
                        const formatted = {
                            id: u.id,
                            fullName: u.fullName || u.email || "مستخدم",
                            username: u.username || u.email?.split("@")[0] || "user",
                            email: u.email || "",
                            phone: u.phone || "",
                            role: u.role || "client",
                            status: u.status || "active",
                            avatar: u.avatar || "",
                            city: u.city || "",
                            createdAt: u.createdAt || new Date().toISOString(),
                            isBanned: Boolean(u.isBanned),
                            source: "supabase-auth",
                        };
                        const key = formatted.email || formatted.id || formatted.username;
                        if (key && !usersMap.has(String(key).toLowerCase())) {
                            usersMap.set(String(key).toLowerCase(), formatted);
                        }
                    });
                }
            }
        } catch (e) {}

        // 5. Scan LocalStorage for Supabase Auth Tokens & Profiles
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes("auth-token") || key.includes("khidmati_user") || key === "user")) {
                    try {
                        const val = localStorage.getItem(key);
                        if (val) {
                            const parsed = JSON.parse(val);
                            const userObj = parsed.user || parsed;
                            if (userObj && (userObj.email || userObj.user_metadata)) {
                                const meta = userObj.user_metadata || {};
                                const email = userObj.email || meta.email || "";
                                const formatted = {
                                    id: userObj.id || Date.now(),
                                    fullName: meta.full_name || meta.name || userObj.fullName || userObj.full_name || email || "مستخدم",
                                    username: meta.username || userObj.username || email?.split("@")[0] || "user",
                                    email: email,
                                    phone: meta.phone || userObj.phone || "",
                                    role: meta.role || userObj.role || "client",
                                    status: meta.status || userObj.status || "active",
                                    avatar: meta.avatar_url || meta.picture || userObj.avatar || "",
                                    city: meta.city || userObj.city || "",
                                    createdAt: userObj.created_at || userObj.createdAt || new Date().toISOString(),
                                    isBanned: Boolean(meta.is_banned || userObj.isBanned),
                                };
                                const mapKey = formatted.email || formatted.id || formatted.username;
                                if (mapKey && !usersMap.has(String(mapKey).toLowerCase())) {
                                    usersMap.set(String(mapKey).toLowerCase(), formatted);
                                }
                            }
                        }
                    } catch (err) {}
                }
            }
        } catch (e) {}

        return Array.from(usersMap.values());
    };

    const { data: users, isLoading } = useQuery<any[]>({
        queryKey: ["/api/admin/users"],
        queryFn: fetchCombinedUsers,
    });

    const deleteMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: any; reason: string }) => {
            try {
                await apiRequest("DELETE", `/api/admin/users/${id}`, { reason });
            } catch (e) {}

            try {
                const targetStr = String(id);
                const isNumeric = /^\d+$/.test(targetStr);

                // Find numeric DB user ID if possible
                let numericDbId: number | null = isNumeric ? Number(id) : null;
                if (!numericDbId) {
                    const { data: found } = await supabase
                        .from("users")
                        .select("id")
                        .or(`email.eq.${targetStr},username.eq.${targetStr},google_id.eq.${targetStr}`)
                        .maybeSingle();
                    if (found?.id) numericDbId = found.id;
                }

                if (numericDbId) {
                    await supabase.from("provider_profiles").delete().eq("user_id", numericDbId);
                    await supabase.from("tickets").delete().eq("user_id", numericDbId);
                    await supabase.from("reviews").delete().or(`provider_id.eq.${numericDbId},client_id.eq.${numericDbId}`);
                    await supabase.from("users").delete().eq("id", numericDbId);
                } else {
                    await supabase.from("users").delete().or(`email.eq.${targetStr},username.eq.${targetStr},google_id.eq.${targetStr}`);
                }
            } catch (e) {}

            try {
                const listRaw = localStorage.getItem("khidmati_registered_users");
                if (listRaw) {
                    const list = JSON.parse(listRaw);
                    if (Array.isArray(list)) {
                        const filtered = list.filter((u: any) => String(u.id) !== String(id) && u.email !== id && u.username !== id);
                        localStorage.setItem("khidmati_registered_users", JSON.stringify(filtered));
                    }
                }
            } catch (e) {}
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({ title: t("userDeleted"), description: t("userDeletedDesc") });
            setSelectedUser(null);
        },
        onError: () => {
            toast({ title: t("operationFailed"), description: t("error"), variant: "destructive" });
        },
    });

    const banMutation = useMutation({
        mutationFn: async (target: any) => {
            const targetId = typeof target === "object" ? target.id : target;
            const userObj = (users || []).find((u: any) => String(u.id) === String(targetId) || u.email === target || u.username === target) || (typeof target === "object" ? target : null);
            const currentBanned = userObj ? Boolean(userObj.isBanned) : false;
            const newBannedState = !currentBanned;
            const targetStr = String(targetId);
            const email = userObj?.email || targetStr;
            const username = userObj?.username || targetStr;

            try {
                await apiRequest("POST", `/api/admin/users/${targetId}/ban`);
            } catch (e) {}

            try {
                const isNumeric = /^\d+$/.test(targetStr);
                let numericDbId: number | null = isNumeric ? Number(targetId) : null;

                if (!numericDbId) {
                    const { data: found } = await supabase
                        .from("users")
                        .select("id")
                        .or(`email.eq.${targetStr},username.eq.${targetStr},google_id.eq.${targetStr}`)
                        .maybeSingle();
                    if (found?.id) numericDbId = found.id;
                }

                if (numericDbId) {
                    await supabase.from("users").update({ is_banned: newBannedState }).eq("id", numericDbId);
                } else {
                    await supabase.from("users").update({ is_banned: newBannedState }).or(`email.eq.${email},username.eq.${username}`);
                }
            } catch (e) {}

            try {
                const listRaw = localStorage.getItem("khidmati_registered_users");
                if (listRaw) {
                    const list = JSON.parse(listRaw);
                    if (Array.isArray(list)) {
                        const updated = list.map((u: any) => {
                            if (String(u.id) === String(targetId) || u.email === email || u.username === username) {
                                return { ...u, isBanned: newBannedState };
                            }
                            return u;
                        });
                        localStorage.setItem("khidmati_registered_users", JSON.stringify(updated));
                    }
                }
            } catch (e) {}
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({ title: t("statusUpdated"), description: t("statusUpdatedDesc") });
        },
        onError: () => {
            toast({ title: t("operationFailed"), description: t("error"), variant: "destructive" });
        },
    });

    const activateMutation = useMutation({
        mutationFn: async (id: number) => {
            try {
                await apiRequest("POST", `/api/admin/providers/${id}/activate`);
            } catch (e) {
                await supabase.from("users").update({ status: "active" }).eq("id", id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({ title: t("providerActivated"), description: t("providerActivatedDesc") });
            setSelectedUser(null);
        },
        onError: () => {
            toast({ title: t("operationFailed"), description: t("error"), variant: "destructive" });
        },
    });

    const filteredUsers = (users || []).filter(user => {
        const username = user?.username || "";
        const fullName = user?.fullName || user?.full_name || "";
        const email = user?.email || "";
        const phone = user?.phone || "";
        const s = searchTerm.toLowerCase();

        const matchesSearch = username.toLowerCase().includes(s) ||
            fullName.toLowerCase().includes(s) ||
            email.toLowerCase().includes(s) ||
            phone.toLowerCase().includes(s);
            
        if (!matchesSearch) return false;
        
        if (activeTab === "clients") return user.role === "client";
        if (activeTab === "providers_active") return user.role === "provider" && user.status === "active";
        if (activeTab === "providers_pending") return user.role === "provider" && user.status === "pending";
        return true;
    });

    const roleLabels: Record<string, string> = {
        admin: "admin",
        provider: t("provider"),
        client: t("clients"),
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">admin</span>;
            case 'provider': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400">{roleLabels[role]}</span>;
            default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400">{roleLabels[role]}</span>;
        }
    };

    const pendingCount = users?.filter(u => u.role === "provider" && u.status === "pending").length ?? 0;

    return (
        <>
        <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
            <div className="container mx-auto px-4 max-w-5xl pb-24">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl">
                            <Users className="w-7 h-7" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("usersManagement")}</h1>
                    </div>
                    <Input
                        placeholder={t("searchUsers")}
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                        startContent={<Search className="h-4 w-4 text-zinc-400" />}
                        className="w-full sm:w-64"
                        variant="bordered"
                        radius="lg"
                        size="md"
                        classNames={{
                            inputWrapper: "h-12 rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-sm",
                            input: "text-sm font-medium"
                        }}
                    />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
                    <TabsList className="flex flex-wrap gap-2 bg-transparent h-auto p-0">
                        <TabsTrigger value="all" className={`px-5 h-10 font-bold text-sm rounded-2xl ${activeTab === "all" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"}`}>{t("allUsers")}</TabsTrigger>
                        <TabsTrigger value="clients" className={`px-5 h-10 font-bold text-sm rounded-2xl ${activeTab === "clients" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"}`}>{t("clients")}</TabsTrigger>
                        <TabsTrigger value="providers_active" className={`px-5 h-10 font-bold text-sm rounded-2xl ${activeTab === "providers_active" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"}`}>{t("activeProviders")}</TabsTrigger>
                        <TabsTrigger value="providers_pending" className={`px-5 h-10 font-bold text-sm rounded-2xl ${activeTab === "providers_pending" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"}`}>
                            {t("pendingProviders")}
                            {pendingCount > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                                    {pendingCount}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] overflow-hidden" style={{ borderRadius: "28px" }}>
                    <Table aria-label={t("usersTable")}>
                        <TableHeader>
                            <TableColumn className="w-[60px] bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("id")}</TableColumn>
                            <TableColumn className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("user")}</TableColumn>
                            <TableColumn className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("role")}</TableColumn>
                            <TableColumn className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("contact")}</TableColumn>
                            <TableColumn className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("status")}</TableColumn>
                            <TableColumn className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("joined")}</TableColumn>
                            <TableColumn className="text-right bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-xs">{t("actions")}</TableColumn>
                        </TableHeader>
                        <TableBody emptyContent={t("noUsersFound")}>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-zinc-400">
                                        {t("loading")}
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers && filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id} className="cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors" onClick={() => setSelectedUser(user)}>
                                        <TableCell className="font-medium text-xs text-zinc-400">{user.id}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${user.role === 'provider' ? 'bg-purple-500' : user.role === 'admin' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                                                    {user.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-zinc-900 dark:text-white">{user.fullName}</span>
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">@{user.username}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                                        <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                                            <div className="flex flex-col">
                                                <span>{user.email || "-"}</span>
                                                <span className="text-xs text-zinc-400 dark:text-zinc-500">{user.phone || ""}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {user.isBanned ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">{t("banned")}</span>
                                            ) : user.role === "provider" ? (
                                                user.status === "active" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">{t("active")}</span>
                                                ) : user.status === "pending" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">{t("pending")}</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">{t("rejected")}</span>
                                                )
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">{t("active")}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-zinc-500 dark:text-zinc-400">
                                            {new Date(user.createdAt || "").toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {user.role === 'provider' && user.status === 'pending' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                        onPress={() => activateMutation.mutate(user.id)}
                                                        title={t("activateProvider")}
                                                        isDisabled={activateMutation.isPending}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8"
                                                    onPress={() => setSelectedUser(user)}
                                                    title={t("viewDetails")}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`h-8 w-8 ${user.isBanned ? "text-green-600" : "text-amber-600"}`}
                                                    onPress={() => banMutation.mutate(user.id)}
                                                    title={user.isBanned ? t("unbanUser") : t("banUser")}
                                                >
                                                    {user.isBanned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 text-red-500"
                                                    onPress={() => setConfirmDeleteId(user.id)}
                                                    title={t("deleteUser")}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : []}
                        </TableBody>
                    </Table>
                </div>

                {/* User Detail Modal */}
                <Modal isOpen={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} size="md">
                    <ModalContent>
                        {selectedUser && (
                            <>
                                <ModalHeader className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${selectedUser?.role === 'provider' ? 'bg-purple-500' : selectedUser?.role === 'admin' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                                        {selectedUser?.fullName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <span>{selectedUser?.fullName}</span>
                                        <p className="text-sm font-normal text-muted-foreground">@{selectedUser?.username}</p>
                                    </div>
                                </ModalHeader>
                                <ModalBody>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm py-2 border-b">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400">{selectedUser.role}</span>
                                            {selectedUser.isBanned && <span className="inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">{t("banned")}</span>}
                                            {selectedUser.role === "provider" && (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold ${
                                                    selectedUser.status === "active" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" :
                                                    selectedUser.status === "pending" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" :
                                                    "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                                                }`}>
                                                    {selectedUser.status === "active" ? t("activated") : selectedUser.status === "pending" ? t("pendingApproval") : t("rejected")}
                                                </span>
                                            )}
                                            <span className="text-muted-foreground ml-auto text-xs">{t("id")}: {selectedUser.id}</span>
                                        </div>
                                        {selectedUser.email && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Mail className="w-4 h-4 text-muted-foreground" />
                                                <span>{selectedUser.email}</span>
                                            </div>
                                        )}
                                        {selectedUser.phone && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Phone className="w-4 h-4 text-muted-foreground" />
                                                <span>{selectedUser.phone}</span>
                                            </div>
                                        )}
                                        {selectedUser.city && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                                <span>{selectedUser.city}</span>
                                            </div>
                                        )}
                                        {selectedUser.language && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Globe className="w-4 h-4 text-muted-foreground" />
                                                <span className="uppercase">{selectedUser.language}</span>
                                            </div>
                                        )}
                                        <div className="text-xs text-muted-foreground pt-2 border-t">
                                            {t("joined")}: {new Date(selectedUser.createdAt || "").toLocaleString()}
                                        </div>
                                    </div>
                                </ModalBody>
                                <ModalFooter>
                                    <div className="flex gap-2 w-full">
                                        {selectedUser.role === 'provider' && selectedUser.status === 'pending' && (
                                            <Button
                                                color="success"
                                                size="sm"
                                                className="flex-1 text-white font-semibold"
                                                onPress={() => { activateMutation.mutate(selectedUser.id); }}
                                                isDisabled={activateMutation.isPending}
                                            >
                                                {t("activateAccount")}
                                            </Button>
                                        )}
                                        <Button
                                            color={selectedUser.isBanned ? "default" : "danger"}
                                            variant={selectedUser.isBanned ? "bordered" : "solid"}
                                            size="sm"
                                            className="flex-1"
                                            onPress={() => { banMutation.mutate(selectedUser.id); }}
                                        >
                                            {selectedUser.isBanned ? t("unbanUser") : t("banUser")}
                                        </Button>
                                        <Button
                                            color="danger"
                                            variant="solid"
                                            size="sm"
                                            className="flex-1"
                                            onPress={() => setConfirmDeleteId(selectedUser.id)}
                                        >
                                            {t("deleteUser")}
                                        </Button>
                                    </div>
                                </ModalFooter>
                            </>
                        )}
                    </ModalContent>
                </Modal>
            </div>
        </div>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)} size="sm">
            <ModalContent>
                <ModalHeader className="text-red-600">{t("confirmDeletion")}</ModalHeader>
                <ModalBody className="space-y-3">
                    <p className="text-sm text-muted-foreground">{t("confirmDeletionDesc")}</p>
                    <div>
                        <Textarea
                            label={t("adminDeleteReason")}
                            placeholder={t("adminDeleteReasonPlaceholder")}
                            value={deleteReason}
                            onValueChange={setDeleteReason}
                            variant="bordered"
                            isRequired
                            maxLength={500}
                            description={t("adminDeleteReasonHint")}
                            classNames={{ input: "text-sm" }}
                        />
                        {!deleteReason.trim() && (
                            <p className="text-xs text-red-500 mt-1 font-medium">{t("adminDeleteReasonRequired")}</p>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="bordered" size="sm" onPress={() => setConfirmDeleteId(null)}>{t("cancel")}</Button>
                    <Button color="danger" size="sm" isDisabled={deleteMutation.isPending || !deleteReason.trim()} onPress={() => { if (confirmDeleteId) { deleteMutation.mutate({ id: confirmDeleteId, reason: deleteReason.trim() }); setConfirmDeleteId(null); } }}>{t("deletePermanently")}</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
        </>
    );
}
