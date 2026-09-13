import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardBody, Chip, Button, Input,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

  const { data: stats } = useQuery<any>({ 
    queryKey: ["/api/admin/stats"],
    queryFn: () => fetch("/api/admin/stats", { credentials: "include" }).then(res => res.json())
  });
  const { data: usersData, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/bookings", bookingStatusFilter].filter(Boolean),
    queryFn: () => {
      const params = bookingStatusFilter ? `?status=${bookingStatusFilter}` : "";
      return fetch(`/api/admin/bookings${params}`, { credentials: "include" }).then(r => r.json());
    },
  });
  const { data: verificationsData, isLoading: verificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/verifications"],
    queryFn: () => fetch("/api/admin/verifications", { credentials: "include" }).then(res => res.json())
  });
  const { data: revenueData, isLoading: revenueLoading } = useQuery<any>({
    queryKey: ["/api/admin/revenue"],
    queryFn: () => fetch("/api/admin/revenue", { credentials: "include" }).then(res => res.json())
  });
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/invoices"],
    queryFn: () => fetch("/api/admin/invoices", { credentials: "include" }).then(res => res.json())
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
    { label: t("totalUsersLabel"), value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: t("providersLabel"), value: stats?.totalProviders ?? 0, icon: Wrench, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
    { label: t("totalBookingsLabel"), value: stats?.totalBookings ?? 0, icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
    { label: t("verificationLabel"), value: stats?.pendingVerifications ?? 0, icon: Shield, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
    { label: t("revenueLabel"), value: stats ? `${stats.totalRevenue} DH` : "0 DH", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: t("activeBookingsLabel"), value: stats?.recentBookings?.filter((b: any) => b.status === "confirmed" || b.status === "pending").length ?? 0, icon: Activity, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30" },
  ];

  return (
    <div className="bg-zinc-50 dark:bg-black min-h-screen py-10" dir="rtl">
      <div className="container mx-auto px-4 max-w-7xl pb-24 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-blue-50 dark:bg-blue-950/40 rounded-2xl p-4">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("adminDashboard")}</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] w-max">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
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
          <div className="space-y-8 animate-in">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 dark:bg-blue-950/40 rounded-2xl p-3">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("overviewLabel")}</h2>
            </div>
            <div className="grid gap-5 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {statCards.map((s) => (
                <div key={s.label} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-6" style={{ borderRadius: "28px" }}>
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${s.bg}`}>
                      <s.icon className={`w-7 h-7 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-1">{s.label}</p>
                      <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{s.value}</p>
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
                      <div key={u.id} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-900 dark:text-white">
                            {u.fullName?.[0] || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{u.fullName}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{u.email || u.username}</p>
                          </div>
                        </div>
                        <Chip size="sm" variant="flat">{u.role}</Chip>
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
              <div className="bg-purple-50 dark:bg-purple-950/40 rounded-2xl p-3">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
              <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl p-3">
                <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
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
              <div className="bg-amber-50 dark:bg-amber-950/40 rounded-2xl p-3">
                <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
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
                <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl p-3">
                  <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("revenueLabel2")}</h2>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 px-5 py-3 rounded-2xl">
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
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
              <div className="bg-blue-50 dark:bg-blue-950/40 rounded-2xl p-3">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                        <TableCell className="font-medium text-blue-600 dark:text-blue-400" dir="ltr">{inv.agreedPrice} DH</TableCell>
                        <TableCell><StatusBadge status={inv.status} t={t} /></TableCell>
                        <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("ar-MA") : "-"}</TableCell>
                        <TableCell>
                          {inv.status === "completed" ? (
                            <Link href={`/invoice/${inv.id}/print`} target="_blank">
                              <Button isIconOnly variant="light" size="sm" color="primary" title={t("viewInvoiceBtn")}>
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
