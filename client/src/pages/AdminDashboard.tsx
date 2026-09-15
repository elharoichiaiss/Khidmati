import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardBody, Chip, Button, Input,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import {
  Users, Wrench, Calendar, Shield, DollarSign, Activity,
  Search, CheckCircle, XCircle, Ban, UserCheck, FileText
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";

type Tab = "stats" | "users" | "bookings" | "verifications" | "revenue" | "invoices";

const TABS: { key: Tab; labelKey: string }[] = [
  { key: "stats", labelKey: "overviewTab" },
  { key: "users", labelKey: "usersTab" },
  { key: "bookings", labelKey: "bookingsTab" },
  { key: "verifications", labelKey: "verificationTab" },
  { key: "revenue", labelKey: "revenueTab" },
  { key: "invoices", labelKey: "invoicesTab" },
];

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const map: Record<string, { label: string; color: "success" | "warning" | "danger" | "default" | "primary" }> = {
    active: { label: t("active"), color: "success" },
    pending: { label: t("underReview"), color: "warning" },
    rejected: { label: t("rejected"), color: "danger" },
    banned: { label: t("banned"), color: "default" },
    confirmed: { label: t("confirmed"), color: "primary" },
    completed: { label: t("completed"), color: "success" },
    approved: { label: t("acceptedLabel"), color: "success" },
    pending_agreement: { label: t("pending"), color: "warning" },
    agreed: { label: t("agreed"), color: "primary" },
    awaiting_confirmation: { label: t("pendingApproval"), color: "warning" },
  };
  const s = map[status] || { label: status, color: "default" as const };
  return <Chip color={s.color} variant="bordered" size="sm">{s.label}</Chip>;
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("stats");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<any>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

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

    // 4. Try Express API
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

    // 4b. Express API: Supabase Auth users (users who registered via Google but have no DB row)
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

    // 5. Scan LocalStorage for Supabase Auth Tokens and Profiles
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

  const { data: stats } = useQuery<any>({ 
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      let uArr = await fetchCombinedUsers();
      let bArr: any[] = [];
      let vArr: any[] = [];

      // Recent bookings (prefer backend, fallback to Supabase)
      try {
        const res = await fetch("/api/admin/bookings", { credentials: "include" });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) bArr = json;
        }
      } catch (e) {}

      try {
        const { data: statsRes } = await supabase.from("bookings").select("*");
        const { data: verificationsList } = await supabase.from("verification_requests").select("*");
        if (Array.isArray(statsRes) && bArr.length === 0) bArr = statsRes;
        if (Array.isArray(verificationsList)) vArr = verificationsList;
      } catch (err) {}

      let apiStats: any = null;
      try {
        const res = await fetch("/api/admin/stats", { credentials: "include" });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          apiStats = await res.json();
        }
      } catch (e) {}

      const totalUsers = Math.max(apiStats?.totalUsers || 0, uArr.length);
      const totalProviders = Math.max(apiStats?.totalProviders || 0, uArr.filter((u: any) => u.role === "provider").length);
      const totalBookings = Math.max(apiStats?.totalBookings || 0, bArr.length);
      const pendingVerifications = Math.max(apiStats?.pendingVerifications || 0, vArr.filter((v: any) => v.status === "pending").length);
      const totalRevenue = apiStats?.totalRevenue || bArr.reduce((acc: number, b: any) => acc + (b.price || 0), 0);

      return {
        totalUsers,
        totalProviders,
        totalBookings,
        pendingVerifications,
        totalRevenue,
        recentUsers: uArr.slice(0, 10),
        recentBookings: bArr.slice(0, 10),
      };
    }
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: fetchCombinedUsers,
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/bookings", bookingStatusFilter].filter(Boolean),
    queryFn: async () => {
      try {
        const params = bookingStatusFilter ? `?status=${bookingStatusFilter}` : "";
        const res = await fetch(`/api/admin/bookings${params}`, { credentials: "include" });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const json = await res.json();
          if (Array.isArray(json)) return json;
        }
      } catch (e) {}

      try {
        const { data: bookingsList } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
        if (Array.isArray(bookingsList)) return bookingsList;
      } catch (e) {}

      return [];
    },
  });

  const { data: verificationsData, isLoading: verificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/verifications"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/verifications", { credentials: "include" });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const json = await res.json();
          if (Array.isArray(json)) return json;
        }
      } catch (e) {}

      try {
        const { data: verifList } = await supabase.from("verification_requests").select("*");
        if (Array.isArray(verifList)) return verifList;
      } catch (e) {}

      return [];
    }
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery<any>({
    queryKey: ["/api/admin/revenue"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/revenue", { credentials: "include" });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const json = await res.json();
          if (json) return json;
        }
      } catch (e) {}

      try {
        const { data: paymentsList } = await supabase.from("payments").select("*");
        return { payments: paymentsList || [] };
      } catch (e) {
        return { payments: [] };
      }
    }
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/invoices"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/invoices", { credentials: "include" });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const json = await res.json();
          if (Array.isArray(json)) return json;
        }
      } catch (e) {}

      try {
        const { data: invList } = await supabase.from("invoices").select("*");
        if (Array.isArray(invList)) return invList;
      } catch (e) {}

      return [];
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: t("updateSuccess"), description: t("updateSuccessDesc") });
    },
    onError: () => toast({ title: t("updateFailed"), description: t("updateFailedDesc"), variant: "destructive" }),
  });

  const approveVerificationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/admin/verification-requests/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: t("updateSuccess"), description: t("verificationUpdated") });
    },
    onError: () => toast({ title: t("updateFailed"), description: t("verificationFailed"), variant: "destructive" }),
  });

  const filteredUsers = (usersData || []).filter((u: any) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!u.fullName?.toLowerCase().includes(s) && !u.username?.toLowerCase().includes(s) && !u.email?.toLowerCase().includes(s) && !u.phone?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const statCards = [
    { label: t("totalUsersLabel"), value: stats?.totalUsers ?? 0, icon: Users, color: "text-[#00bcd4]", bg: "bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)]" },
    { label: t("providersLabel"), value: stats?.totalProviders ?? 0, icon: Wrench, color: "text-[#00bcd4]", bg: "bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)]" },
    { label: t("totalBookingsLabel"), value: stats?.totalBookings ?? 0, icon: Calendar, color: "text-[#00bcd4]", bg: "bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)]" },
    { label: t("verificationLabel"), value: stats?.pendingVerifications ?? 0, icon: Shield, color: "text-[#00bcd4]", bg: "bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)]" },
    { label: t("revenueLabel"), value: stats ? `${stats.totalRevenue} DH` : "0 DH", icon: DollarSign, color: "text-[#00bcd4]", bg: "bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)]" },
    { label: t("activeBookingsLabel"), value: stats?.recentBookings?.filter((b: any) => b.status === "confirmed" || b.status === "pending").length ?? 0, icon: Activity, color: "text-[#00bcd4]", bg: "bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)]" },
  ];

  return (
    <div className="bg-zinc-50 dark:bg-black min-h-screen py-4 md:py-10 max-w-full overflow-x-hidden" dir="rtl">
      <div className="container mx-auto px-2 sm:px-4 max-w-7xl pb-24 space-y-6 md:space-y-8 w-full max-w-full overflow-x-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 md:gap-4 mb-2">
          <div className="bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl p-3 md:p-4 shrink-0">
            <Shield className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">{t("adminDashboard")}</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] w-full max-w-full overflow-x-auto scrollbar-none whitespace-nowrap">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all shrink-0 whitespace-nowrap ${
                tab === tabItem.key 
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {t(tabItem.labelKey)}
            </button>
          ))}
        </div>

        {/* ────────── STATS TAB ────────── */}
        {tab === "stats" && (
          <div className="space-y-6 md:space-y-8 animate-in">
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl p-2.5 md:p-3 shrink-0">
                <Activity className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("overviewLabel")}</h2>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              {statCards.map((s) => (
                <div key={s.label} className="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-3.5 sm:p-5 rounded-2xl sm:rounded-[28px] transition-all duration-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4">
                    <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl ${s.bg} shrink-0 transition-transform duration-200 group-hover:scale-105`}>
                      <s.icon className={`w-5 h-5 sm:w-7 sm:h-7 ${s.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-0.5 truncate">{s.label}</p>
                      <p className="text-lg sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight truncate">{s.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-5" style={{ borderRadius: "28px" }}>
                <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-white">{t("latestUsers")}</h3>
                {stats?.recentUsers?.length ? (
                  <div className="space-y-3">
                    {stats.recentUsers.slice(0, 5).map((u: any) => (
                      <div key={u.id || u.email || Math.random()} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 pt-1">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl || u.avatar ? (
                            <img src={u.avatarUrl || u.avatar} alt={u.fullName || "User"} className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-base font-bold shrink-0">
                              {u.fullName?.[0]?.toUpperCase() || u.username?.[0]?.toUpperCase() || "U"}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{u.fullName || t("unnamedUser")}</p>
                              {u.username && <span className="text-xs text-zinc-400 font-mono">@{u.username}</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {u.email && <span>{u.email}</span>}
                              {u.phone && <span>• {u.phone}</span>}
                            </div>
                          </div>
                        </div>
                        <Chip
                          size="sm"
                          color={u.role === "admin" ? "primary" : u.role === "provider" ? "secondary" : "default"}
                          variant="flat"
                          className="shrink-0 font-semibold"
                        >
                          {u.role === "admin" ? t("adminRoleBadge") : u.role === "provider" ? t("providerRoleBadge") : t("clientRoleBadge")}
                        </Chip>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t("noUsersYet")}</p>
                )}
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-5" style={{ borderRadius: "28px" }}>
                <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-white">{t("latestBookings")}</h3>
                {stats?.recentBookings?.length ? (
                  <div className="space-y-3">
                    {stats.recentBookings.slice(0, 5).map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">{t("bookingNumber")}{b.id}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{b.date ? new Date(b.date).toLocaleDateString("ar-MA") : ""}</p>
                        </div>
                        <StatusBadge status={b.status} t={t} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t("noBookingsYet")}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ────────── USERS TAB ────────── */}
        {tab === "users" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl p-3 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("usersManagementLabel")}</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  placeholder={t("searchLabel")}
                  value={search}
                  onValueChange={setSearch}
                  startContent={<Search className="h-4 w-4 text-default-400" />}
                  className="w-48"
                  size="sm"
                  style={{ borderRadius: "16px" }}
                />
                <Select
                  placeholder={t("roleLabel")}
                  selectedKeys={roleFilter ? new Set([roleFilter]) : new Set()}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setRoleFilter(value === "all" ? "" : value);
                  }}
                  className="w-32"
                  size="sm"
                >
                  <SelectItem key="all">{t("allRoles")}</SelectItem>
                  <SelectItem key="client">{t("clientRole")}</SelectItem>
                  <SelectItem key="provider">{t("providerRole")}</SelectItem>
                  <SelectItem key="admin">{t("adminRole")}</SelectItem>
                </Select>
                <Select
                  placeholder={t("statusLabel")}
                  selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setStatusFilter(value === "all" ? "" : value);
                  }}
                  className="w-32"
                  size="sm"
                >
                  <SelectItem key="all">{t("allRoles")}</SelectItem>
                  <SelectItem key="active">{t("activeStatus")}</SelectItem>
                  <SelectItem key="pending">{t("underReviewStatus")}</SelectItem>
                  <SelectItem key="rejected">{t("rejectedStatus")}</SelectItem>
                </Select>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] overflow-x-auto" style={{ borderRadius: "28px" }}>
              <Table aria-label={t("usersManagementLabel")}>
                <TableHeader>
                  <TableColumn>ID</TableColumn>
                  <TableColumn>{t("name")}</TableColumn>
                  <TableColumn>{t("usernameLabel")}</TableColumn>
                  <TableColumn>{t("emailLabel")}</TableColumn>
                  <TableColumn>{t("phoneLabel")}</TableColumn>
                  <TableColumn>{t("roleLabel")}</TableColumn>
                  <TableColumn>{t("statusLabel")}</TableColumn>
                  <TableColumn>{t("actionsLabel")}</TableColumn>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">{t("loadingLabel")}</TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center gap-3">
                          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4">
                            <Users className="w-8 h-8 text-zinc-400" />
                          </div>
                          <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t("noUsersFoundMessage")}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs text-zinc-500">{u.id}</TableCell>
                        <TableCell className="font-medium text-zinc-900 dark:text-white">{u.fullName}</TableCell>
                        <TableCell className="text-zinc-700 dark:text-zinc-300">@{u.username}</TableCell>
                        <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">{u.email || "-"}</TableCell>
                        <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">{u.phone || "-"}</TableCell>
                        <TableCell>
                          <Chip
                            color={u.role === "admin" ? "primary" : u.role === "provider" ? "secondary" : "default"}
                            variant="flat"
                            size="sm"
                          >
                            {u.role === "admin" ? t("adminRoleBadge") : u.role === "provider" ? t("providerRoleBadge") : t("clientRoleBadge")}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          {u.isBanned ? (
                            <Chip color="default" variant="bordered" size="sm">{t("banned")}</Chip>
                          ) : (
                            <StatusBadge status={u.status || "active"} t={t} />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="light"
                              isIconOnly
                              size="sm"
                              className="text-green-600"
                              onPress={() => updateUserMutation.mutate({ id: u.id, data: { status: "active" } })}
                              isDisabled={u.status === "active"}
                              title={t("activateProvider")}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="light"
                              isIconOnly
                              size="sm"
                              className="text-red-600"
                              onPress={() => { setUserToBan(u); setBanDialogOpen(true); }}
                              isDisabled={u.isBanned}
                              title={t("banUser")}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ────────── BOOKINGS TAB ────────── */}
        {tab === "bookings" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl p-3 shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("bookingManagementLabel")}</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <Select
                placeholder={t("filterByStatusLabel")}
                selectedKeys={bookingStatusFilter ? new Set([bookingStatusFilter]) : new Set()}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string;
                  setBookingStatusFilter(value === "all" ? "" : value);
                }}
                className="w-40"
                size="sm"
              >
                <SelectItem key="all">{t("all")}</SelectItem>
                <SelectItem key="pending">{t("pendingStatus")}</SelectItem>
                <SelectItem key="confirmed">{t("confirmedStatus")}</SelectItem>
                <SelectItem key="completed">{t("completedStatus")}</SelectItem>
                <SelectItem key="rejected">{t("rejectedStatus")}</SelectItem>
              </Select>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] overflow-x-auto" style={{ borderRadius: "28px" }}>
              <Table aria-label={t("bookingManagementLabel")}>
                <TableHeader>
                  <TableColumn>ID</TableColumn>
                  <TableColumn>{t("customerLabel")}</TableColumn>
                  <TableColumn>{t("professionalLabel")}</TableColumn>
                  <TableColumn>{t("date")}</TableColumn>
                  <TableColumn>{t("amountLabel2")}</TableColumn>
                  <TableColumn>{t("statusLabel")}</TableColumn>
                </TableHeader>
                <TableBody>
                  {bookingsLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">{t("loadingLabel")}</TableCell></TableRow>
                  ) : !bookingsData?.length ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4">
                          <Calendar className="w-8 h-8 text-zinc-400" />
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t("noBookingsMessage")}</p>
                      </div>
                    </TableCell></TableRow>
                  ) : (
                    bookingsData.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell className="text-xs text-zinc-500">{b.id}</TableCell>
                        <TableCell className="text-zinc-700 dark:text-zinc-300">{b.clientId}</TableCell>
                        <TableCell className="text-zinc-700 dark:text-zinc-300">{b.providerId}</TableCell>
                        <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">{b.date ? new Date(b.date).toLocaleDateString("ar-MA") : "-"}</TableCell>
                        <TableCell className="text-sm text-zinc-700 dark:text-zinc-300">{b.price ? `${b.price} DH` : "-"}</TableCell>
                        <TableCell><StatusBadge status={b.status} t={t} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ────────── VERIFICATIONS TAB ────────── */}
        {tab === "verifications" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl p-3 shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("verificationRequests")}</h2>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] overflow-x-auto" style={{ borderRadius: "28px" }}>
              <Table aria-label={t("verificationRequests")}>
                <TableHeader>
                  <TableColumn>ID</TableColumn>
                  <TableColumn>{t("professionalLabel")}</TableColumn>
                  <TableColumn>{t("statusLabel")}</TableColumn>
                  <TableColumn>{t("date")}</TableColumn>
                  <TableColumn>{t("actionsLabel")}</TableColumn>
                </TableHeader>
                <TableBody>
                  {verificationsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">{t("loadingLabel")}</TableCell></TableRow>
                  ) : !verificationsData?.length ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4">
                          <Shield className="w-8 h-8 text-zinc-400" />
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t("noBookingsMessage")}</p>
                      </div>
                    </TableCell></TableRow>
                  ) : (
                    verificationsData.map((v: any) => {
                      const req = v.request || v;
                      const user = v.user;
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="text-xs text-zinc-500">{req.id}</TableCell>
                          <TableCell className="font-medium text-zinc-900 dark:text-white">{user?.fullName || `${t("usernameLabel")} ${req.userId}`}</TableCell>
                          <TableCell><StatusBadge status={req.status} t={t} /></TableCell>
                          <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">{req.createdAt ? new Date(req.createdAt).toLocaleDateString("ar-MA") : "-"}</TableCell>
                          <TableCell>
                            {req.status === "pending" && (
                              <div className="flex gap-1">
                                <Button
                                  variant="light"
                                  size="sm"
                                  className="text-green-600"
                                  onPress={() => approveVerificationMutation.mutate({ id: req.id, status: "approved" })}
                                >
                                   <CheckCircle className="h-4 w-4 ml-1" /> {t("acceptBtn")}
                                </Button>
                                <Button
                                  variant="light"
                                  size="sm"
                                  className="text-red-600"
                                  onPress={() => approveVerificationMutation.mutate({ id: req.id, status: "rejected" })}
                                >
                                   <XCircle className="h-4 w-4 ml-1" /> {t("rejectBtn")}
                                </Button>
                              </div>
                            )}
                            {req.status !== "pending" && (
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {req.status === "approved" ? t("acceptedLabel") : t("rejectedLabel")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ────────── REVENUE TAB ────────── */}
        {tab === "revenue" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl p-3 shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("revenueLabel2")}</h2>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] px-5 py-3 rounded-2xl">
                <span className="text-lg font-bold text-[#00838f] dark:text-[#00bcd4]">
                  {t("totalLabel")} {revenueData?.payments?.reduce((s: number, p: any) => s + (p.amount || 0), 0) || 0} DH
                </span>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] overflow-x-auto" style={{ borderRadius: "28px" }}>
              <Table aria-label={t("revenueLabel2")}>
                <TableHeader>
                  <TableColumn>ID</TableColumn>
                  <TableColumn>{t("amountLabel2")}</TableColumn>
                  <TableColumn>{t("description")}</TableColumn>
                  <TableColumn>{t("statusLabel")}</TableColumn>
                  <TableColumn>{t("dateLabelShort")}</TableColumn>
                </TableHeader>
                <TableBody>
                  {revenueLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">{t("loadingLabel")}</TableCell></TableRow>
                  ) : !revenueData?.payments?.length ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4">
                          <DollarSign className="w-8 h-8 text-zinc-400" />
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t("noBookingsMessage")}</p>
                      </div>
                    </TableCell></TableRow>
                  ) : (
                    revenueData.payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs text-zinc-500">{p.id}</TableCell>
                        <TableCell className="font-medium text-zinc-900 dark:text-white">{p.amount} DH</TableCell>
                        <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">{p.method}</TableCell>
                        <TableCell><StatusBadge status={p.status} t={t} /></TableCell>
                        <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">{p.paidAt ? new Date(p.paidAt).toLocaleDateString("ar-MA") : "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ────────── INVOICES TAB ────────── */}
        {tab === "invoices" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl p-3 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("invoicesLabel")}</h2>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] overflow-x-auto" style={{ borderRadius: "28px" }}>
              <Table aria-label={t("invoicesLabel")}>
                <TableHeader>
                  <TableColumn>ID</TableColumn>
                  <TableColumn>{t("clientProviderLabel")}</TableColumn>
                  <TableColumn>{t("professionalLabel")}</TableColumn>
                  <TableColumn>{t("description")}</TableColumn>
                  <TableColumn>{t("amountLabel2")}</TableColumn>
                  <TableColumn>{t("statusLabel")}</TableColumn>
                  <TableColumn>{t("date")}</TableColumn>
                  <TableColumn>{t("actionsLabel")}</TableColumn>
                </TableHeader>
                <TableBody>
                  {invoicesLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8">{t("loadingLabel")}</TableCell></TableRow>
                  ) : !invoicesData?.length ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4">
                          <FileText className="w-8 h-8 text-zinc-400" />
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t("noBookingsMessage")}</p>
                      </div>
                    </TableCell></TableRow>
                  ) : (
                    invoicesData.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-xs text-zinc-500">{inv.id}</TableCell>
                        <TableCell className="font-medium text-zinc-900 dark:text-white">{inv.clientName}</TableCell>
                        <TableCell className="text-zinc-700 dark:text-zinc-300">{inv.providerName}</TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-400">{inv.serviceType}</TableCell>
                        <TableCell className="font-medium text-zinc-900 dark:text-white" dir="ltr">{inv.agreedPrice} DH</TableCell>
                        <TableCell><StatusBadge status={inv.status} t={t} /></TableCell>
                        <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("ar-MA") : "-"}</TableCell>
                        <TableCell>
                          {inv.status === "completed" ? (
                            <Link href={`/invoice/${inv.id}/print`} target="_blank">
                              <Button isIconOnly variant="light" size="sm" className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white" title={t("viewInvoiceBtn")}>
                                <FileText className="h-4 w-4" />
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Ban Confirm Modal */}
        <Modal isOpen={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <ModalContent>
            <ModalHeader>{t("banConfirmTitle")}</ModalHeader>
            <ModalBody>
              <p>{t("banDescription")}</p>
            </ModalBody>
            <ModalFooter className="gap-2">
              <Button variant="bordered" onPress={() => setBanDialogOpen(false)}>{t("cancelBtn")}</Button>
              <Button
                color="danger"
                onPress={() => {
                  if (userToBan) {
                    updateUserMutation.mutate({ id: userToBan.id, data: { isBanned: true } });
                    setBanDialogOpen(false);
                    setUserToBan(null);
                  }
                }}
              >
                {t("confirmBanBtn")}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
