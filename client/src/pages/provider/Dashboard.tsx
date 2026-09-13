import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import {
  Button,
  Avatar,
  Chip,
  Switch,
  Skeleton,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import {
  DollarSign,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  XCircle,
  ArrowRight,
  Loader2,
  User,
  MessageCircle,
  MessageSquare,
  Wallet,
  CalendarCheck,
  CircleAlert,
  BarChart3,
  IndianRupee,
  Repeat,
  LayoutDashboard,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "@/hooks/use-toast";
import { useStartConversation } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateProfile } from "@/hooks/use-providers";

const teal = "#0d9488";
const tealLight = "#14b8a6";

const statusChipColor: Record<string, "success" | "warning" | "danger" | "primary"> = {
  pending: "warning",
  confirmed: "success",
  completed: "primary",
  rejected: "danger",
};

const statusChipBg: Record<string, string> = {
  pending: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  confirmed: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
  completed: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  rejected: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400",
};

function StatSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-20 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export default function ProviderDashboard() {
  const { t, language, isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const startConversation = useStartConversation();
  const [chartPeriod, setChartPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t("pendingStatusShort"),
      confirmed: t("confirmedStatusShort"),
      completed: t("completedStatusShort"),
      rejected: t("cancelledStatusShort"),
    };
    return labels[status] || status;
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      weekly: t("weekly"),
      biweekly: t("biweekly"),
      monthly: t("monthly"),
    };
    return labels[freq] || freq;
  };

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/provider/stats"],
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: recurringBookings, refetch: refetchRecurring } = useQuery<any[]>({
    queryKey: ["/api/recurring-bookings"],
  });

  const updateRecurringMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/recurring-bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => refetchRecurring(),
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/recurring-bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => refetchRecurring(),
  });

  const recurringChipColor: Record<string, "success" | "warning" | "danger"> = {
    active: "success",
    paused: "warning",
    cancelled: "danger",
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      clientId,
      price,
    }: {
      id: number;
      status: string;
      clientId?: number;
      price?: number;
    }) => {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, price }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/stats"] });
      toast({
        title:
          variables.status === "confirmed"
            ? t("statusUpdated")
            : t("operationFailed"),
      });

      if (variables.status === "confirmed" && variables.clientId) {
        try {
          const conv = await startConversation.mutateAsync(variables.clientId);
          setLocation(`/messages?id=${conv.id}`);
        } catch (error) {
          console.error("Failed to navigate to chat", error);
          toast({ title: t("operationFailed"), variant: "destructive" });
        }
      }
    },
  });

  const openChatWithClient = async (clientId?: number) => {
    if (!clientId) return;
    try {
      const conv = await startConversation.mutateAsync(clientId);
      setLocation(`/messages?id=${conv.id}`);
    } catch (error) {
      console.error("Failed to open chat", error);
      toast({ title: t("operationFailed"), variant: "destructive" });
    }
  };

  const isAvailable = user?.providerProfile?.isAvailable ?? true;

  const handleToggleAvailability = () => {
    updateProfile.mutate(
      { isAvailable: !isAvailable },
      {
        onSuccess: () => {
          toast({
            title: isAvailable
              ? t("unavailable")
              : t("available"),
          });
        },
        onError: () => {
          toast({
            title: t("operationFailed"),
            variant: "destructive",
          });
        },
      }
    );
  };

  const todayBookings = useMemo(() => {
    if (!bookings) return [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return bookings
      .filter((b: any) => {
        const d = new Date(b.date);
        return d >= todayStart && d < todayEnd;
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bookings]);

  const pendingBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b: any) => b.status === "pending");
  }, [bookings]);

  const recentBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.slice(0, 10);
  }, [bookings]);

  const chartData =
    chartPeriod === "weekly"
      ? stats?.weeklyData || []
      : chartPeriod === "monthly"
        ? stats?.monthlyData || []
        : stats?.chartData || [];

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(language === "ar" ? "ar-MA" : language === "fr" ? "fr-FR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === "ar" ? "ar-MA" : language === "fr" ? "fr-FR" : "en-US", {
      day: "numeric",
      month: "short",
    });
  };

  const pendingCount = pendingBookings.length;

  if (statsLoading || bookingsLoading) {
    return (
      <Layout>
        <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
          <div className="container mx-auto px-4 max-w-7xl pb-24">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 dark:text-blue-400">
                  <LayoutDashboard className="w-7 h-7" />
                </div>
                <div>
                  <Skeleton className="h-9 w-48 mb-2" />
                  <Skeleton className="h-5 w-64" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32 rounded-xl" />
                <Skeleton className="h-10 w-40 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
                <Skeleton className="h-6 w-40 mb-3" />
                <Skeleton className="h-[300px] w-full rounded-lg" />
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
                <Skeleton className="h-6 w-32 mb-3" />
                <Skeleton className="h-[300px] w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-zinc-50 dark:bg-black min-h-screen py-10" dir={isRTL ? "rtl" : "ltr"}>
        <div className="container mx-auto px-4 max-w-7xl pb-24">
        {user?.status === "pending" && (
          <div className="mb-6 p-4 border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-amber-800 dark:text-amber-400 text-sm sm:text-base">
                  {t("accountUnderReview")}
                </h3>
                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-500 mt-0.5">
                  {t("contactAdminWhatsApp")}
                </p>
              </div>
            </div>
            {import.meta.env.VITE_ADMIN_WHATSAPP && (
              <a
                href={`https://wa.me/${import.meta.env.VITE_ADMIN_WHATSAPP}?text=${encodeURIComponent("مرحباً، أريد تفعيل حسابي كحرفي في Khidmati. اسم المستخدم: " + user.username)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] shrink-0"
                style={{
                  background: "linear-gradient(135deg, #25D366, #128C7E)",
                }}
              >
                <MessageCircle className="w-4 h-4" />
                {t("activateViaWhatsApp")}
              </a>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 dark:text-blue-400">
              <LayoutDashboard className="w-7 h-7" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">
              {t("dashboard")}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Availability Toggle */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                isAvailable
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
                  : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
              }`}
            >
              <span
                className={`text-sm font-bold ${
                  isAvailable
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-red-700 dark:text-red-400"
                }`}
              >
                {isAvailable ? t("available") : t("unavailable")}
              </span>
              <Switch
                isSelected={isAvailable}
                onValueChange={handleToggleAvailability}
                isDisabled={updateProfile.isPending}
              />
            </div>
            <Link href="/provider/bookings">
              <Button
                className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-5 h-12 shadow-sm gap-2"
                style={{ borderRadius: "16px" }}
              >
                <Calendar className="w-4 h-4" />
                {t("myBookings")}
              </Button>
            </Link>
            <Link href="/profile">
              <Button
                className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-5 h-12 shadow-sm gap-2"
                style={{ borderRadius: "16px" }}
              >
                <User className="w-4 h-4" />
                {t("editProfile")}
              </Button>
            </Link>
            <Link href="/messages">
              <Button
                className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-5 h-12 shadow-sm gap-2"
                style={{ borderRadius: "16px" }}
              >
                <ArrowRight
                  className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`}
                />
                {t("messages")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:scale-[1.02] transition-transform" style={{ borderRadius: "28px" }}>
            <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between mb-1">
              {t("totalEarnings")}
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {stats?.totalEarnings || 0} MAD
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              {t("completedJobs")}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:scale-[1.02] transition-transform" style={{ borderRadius: "28px" }}>
            <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between mb-1">
              {t("totalBookings")}
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-2xl text-blue-600 dark:text-blue-400">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {stats?.todayBookingsCount || 0}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1 font-medium">
              <Wallet className="w-3 h-3 text-blue-500" />
              {stats?.todayEarnings
                ? `${stats.todayEarnings} MAD ${t("today")}`
                : t("noBookings")}
            </p>
          </div>

          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:scale-[1.02] transition-transform cursor-pointer"
            style={{ borderRadius: "28px" }}
            onClick={() => setLocation("/messages")}
          >
            <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between mb-1">
              {t("pendingRequests")}
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-2xl text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              {pendingCount}
              {pendingCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl">
                  {t("pendingStatusShort")}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
              {t("viewAll")}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:scale-[1.02] transition-transform" style={{ borderRadius: "28px" }}>
            <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between mb-1">
              {t("averageRating")}
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-2xl text-amber-600 dark:text-amber-400">
                <Star className="w-4 h-4 fill-amber-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              {stats?.averageRating || 0}
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
              {t("averageRatingLabel")}
            </p>
          </div>
        </div>

        {/* Today's Schedule + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Today's Appointments */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
            <div className="flex flex-row items-center justify-between mb-3">
              <div className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                <Calendar className="w-5 h-5 text-blue-500" />
                {t("today")}
              </div>
              <span className="text-[11px] font-bold px-3 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
                {todayBookings.length}{" "}
                {t("today")}
              </span>
            </div>
            {todayBookings.length > 0 ? (
              <div className="space-y-1">
                {todayBookings.map((booking: any, idx: number) => (
                  <div
                    key={booking.id}
                    className="relative flex gap-4 pb-4"
                  >
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                          booking.status === "confirmed"
                            ? "bg-emerald-500"
                            : booking.status === "pending"
                              ? "bg-amber-500"
                              : booking.status === "completed"
                                ? "bg-blue-500"
                                : "bg-red-500"
                        }`}
                      />
                      {idx < todayBookings.length - 1 && (
                        <div className="w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-700 mt-1" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {formatTime(booking.date)}
                          </span>
                          <Avatar
                            size="sm"
                            name={booking.client?.fullName || "?"}
                            showFallback
                          />
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                            {booking.client?.fullName || t("clientName")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl ${statusChipBg[booking.status] || "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500"}`}>
                            {getStatusLabel(booking.status)}
                          </span>
                        </div>
                      </div>
                      {booking.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1 mr-11 font-medium">
                          {booking.description}
                        </p>
                      )}
                      {booking.status === "pending" && (
                        <div className="flex gap-2 mt-2 mr-11">
                          <Button
                            size="sm"
                            className="h-7 text-[11px] bg-emerald-500 hover:bg-emerald-600 gap-1"
                            onPress={() => openChatWithClient(booking.client?.id)}
                            isDisabled={user?.status === "pending"}
                          >
                            <MessageSquare className="w-3 h-3" />
                            {t("confirmInChat")}
                          </Button>
                          <Button
                            size="sm"
                            variant="bordered"
                            className="h-7 text-[11px] border-red-200 text-red-600 gap-1"
                            onPress={() =>
                              updateStatusMutation.mutate({
                                id: booking.id,
                                status: "rejected",
                              })
                            }
                            isDisabled={user?.status === "pending"}
                          >
                            <XCircle className="w-3 h-3" />
                                {t("rejectBtn")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-zinc-400" />
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
                  {t("noBookings")}
                </p>
              </div>
            )}
          </div>

          {/* Chart Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                {t("earnings")}
              </div>
              <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl">
                {(["daily", "weekly", "monthly"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-lg transition-all ${
                      chartPeriod === p
                        ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    {p === "daily"
                      ? t("today")
                      : p === "weekly"
                        ? t("weekly")
                        : t("monthly")}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={teal} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={tealLight} stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(v) => `${v}`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [`${value} MAD`, t("earnings")]}
                    />
                    <Bar
                      dataKey="income"
                      fill="url(#barGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                  {t("noBookings")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recurring Bookings */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] mb-8" style={{ borderRadius: "28px" }}>
          <div className="flex flex-row items-center justify-between mb-3">
            <div className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
              <Repeat className="w-5 h-5 text-blue-500" />
              {t("recurringBookings")}
            </div>
          </div>
          {!recurringBookings || recurringBookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Repeat className="w-10 h-10 text-zinc-400" />
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
                {t("noRecurringBookings")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recurringBookings.map((rb: any) => (
                <div
                  key={rb.id}
                  className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-white">{rb.serviceCategory}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      {getFrequencyLabel(rb.frequency)} • {rb.time}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      {new Date(rb.startDate).toLocaleDateString()}
                      {rb.endDate ? ` - ${new Date(rb.endDate).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl ${statusChipBg[rb.status] || "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500"}`}>
                      {rb.status === "active"
                        ? t("activeStatusShort")
                        : rb.status === "paused"
                          ? t("pendingStatusShort")
                          : t("cancelledStatusShort")}
                    </span>
                    {rb.status === "active" && (
                      <Button
                        size="sm"
                        variant="bordered"
                        className="h-7 text-[10px] border-amber-200 text-amber-600 gap-1 px-2"
                        onPress={() =>
                          updateRecurringMutation.mutate({ id: rb.id, data: { status: "cancelled" } })
                        }
                      >
                        {t("cancel")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Bookings Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] mb-8" style={{ borderRadius: "28px" }}>
          <div className="flex flex-row items-center justify-between px-6 pt-6 pb-3">
            <div className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
              <Clock className="w-5 h-5 text-blue-500" />
              {t("recentBookings")}
            </div>
            <Link
              href="/provider/bookings"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold"
            >
              {t("viewAll")}
            </Link>
          </div>
          {recentBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table aria-label="Recent bookings table" removeWrapper>
                <TableHeader>
                  <TableColumn className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                    {t("date")}
                  </TableColumn>
                  <TableColumn className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                    {t("client")}
                  </TableColumn>
                  <TableColumn className="text-xs font-medium text-zinc-400 dark:text-zinc-500 hidden sm:table-cell">
                    {t("description")}
                  </TableColumn>
                  <TableColumn className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                    {t("status")}
                  </TableColumn>
                  <TableColumn className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                    {t("actions")}
                  </TableColumn>
                </TableHeader>
                <TableBody>
                  {recentBookings.map((booking: any) => (
                    <TableRow key={booking.id} className="group">
                      <TableCell className="text-sm whitespace-nowrap">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                          {formatDate(booking.date)}
                        </span>
                        <br />
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                          {formatTime(booking.date)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar
                            size="sm"
                            name={booking.client?.fullName || "?"}
                            showFallback
                          />
                          <span className="text-sm font-medium truncate max-w-[100px] text-zinc-900 dark:text-white">
                            {booking.client?.fullName || t("client")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 max-w-[150px] block font-medium">
                          {booking.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl ${statusChipBg[booking.status] || "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500"}`}>
                          {getStatusLabel(booking.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {booking.status === "pending" ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="h-7 text-[10px] bg-emerald-500 hover:bg-emerald-600 gap-1 px-2"
                              onPress={() => openChatWithClient(booking.client?.id)}
                              isDisabled={user?.status === "pending"}
                            >
                              <MessageSquare className="w-3 h-3" />
                              {t("confirmInChat")}
                            </Button>
                            <Button
                              size="sm"
                              variant="bordered"
                              className="h-7 text-[10px] border-red-200 text-red-600 gap-1 px-2"
                              onPress={() =>
                                updateStatusMutation.mutate({
                                  id: booking.id,
                                  status: "rejected",
                                })
                              }
                              isDisabled={user?.status === "pending"}
                            >
                              <XCircle className="w-3 h-3" />
                              {t("rejectBtn")}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                            {booking.status === "confirmed"
                              ? t("confirmedStatusShort")
                              : booking.status === "completed"
                                ? t("completedStatusShort")
                                : t("cancelledStatusShort")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-zinc-400" />
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
                {t("noBookings")}
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    </Layout>
  );
}
