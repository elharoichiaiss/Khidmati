import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    DollarSign,
    Calendar,
    Clock,
    Star,
    TrendingUp,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Loader2,
    User
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "@/hooks/use-toast";
import { useStartConversation } from "@/hooks/use-messages";

export default function ProviderDashboard() {
    const { t, language } = useLanguage();
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();

    const { data: stats, isLoading: statsLoading } = useQuery<any>({
        queryKey: ["/api/provider/stats"],
    });

    const { data: bookings, isLoading: bookingsLoading } = useQuery<any[]>({
        queryKey: ["/api/bookings"],
    });

    const startConversation = useStartConversation();

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, clientId }: { id: number, status: string, clientId?: number }) => {
            const res = await fetch(`/api/bookings/${id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: async (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
            queryClient.invalidateQueries({ queryKey: ["/api/provider/stats"] });
            toast({ title: t("statusUpdated") || "Status Updated" });

            // If accepted, navigate to chat
            if (variables.status === 'confirmed' && variables.clientId) {
                try {
                    const conv = await startConversation.mutateAsync(variables.clientId);
                    setLocation(`/messages?id=${conv.id}`);
                } catch (error) {
                    console.error("Failed to navigate to chat", error);
                    toast({ title: "Could not open chat", variant: "destructive" });
                }
            }
        },
    });

    if (statsLoading || bookingsLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </Layout>
        );
    }

    const recentBookings = bookings?.slice(0, 3) || [];

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">
                            {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                        </h1>
                        <p className="text-muted-foreground">
                            {language === 'ar' ? 'نظرة عامة على أدائك' : 'Overview of your business performance'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/profile">
                            <Button variant="outline" className="gap-2">
                                <User className="w-4 h-4" />
                                {language === 'ar' ? 'تعديل الملف' : 'Edit Profile'}
                            </Button>
                        </Link>
                        <Link href="/messages">
                            <Button variant="outline" className="gap-2">
                                <ArrowRight className="w-4 h-4 ml-2 rtl:rotate-180" />
                                {language === 'ar' ? 'إدارة الرسائل' : 'Manage Messages'}
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                {language === 'ar' ? 'إجمالي الأرباح' : 'Total Revenue'}
                                <DollarSign className="w-4 h-4 text-emerald-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {stats?.totalEarnings || 0} MAD
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                {language === 'ar' ? 'تم الانتهاء' : 'Completed jobs'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                {language === 'ar' ? 'إجمالي الحجوزات' : 'Total Bookings'}
                                <Calendar className="w-4 h-4 text-blue-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {language === 'ar' ? 'منذ البداية' : 'Lifetime bookings'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer hover:border-orange-200 transition-colors"
                        onClick={() => setLocation("/messages")} // Or dedicated bookings page
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                {language === 'ar' ? 'طلبات معلقة' : 'Pending Requests'}
                                <Clock className="w-4 h-4 text-orange-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {stats?.pendingRequests || 0}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {language === 'ar' ? 'انتظار الرد' : 'Awaiting your action'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                {language === 'ar' ? 'التقييم العام' : 'Rating'}
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.averageRating || 0}</div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {language === 'ar' ? 'بناءً على التقييمات' : 'Based on customer reviews'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Chart Section */}
                    <Card className="lg:col-span-2 shadow-sm border-slate-100 dark:border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">
                                {language === 'ar' ? 'تحليلات الدخل (7 أيام)' : 'Revenue Trend (7 Days)'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats?.chartData || []}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="income"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorIncome)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Recent Activity Section */}
                    <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-bold">
                                {language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
                            </CardTitle>
                            <Link href="/messages" className="text-xs text-primary hover:underline font-medium">
                                {language === 'ar' ? 'عرض الكل' : 'View All'}
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {recentBookings.length > 0 ? (
                                    recentBookings.map((booking: any) => (
                                        <div key={booking.id} className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 pb-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="w-6 h-6">
                                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                            {booking.client.fullName[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-semibold">{booking.client.fullName}</span>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-normal">
                                                    {booking.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                                {booking.description || (language === 'ar' ? 'لا يوجد وصف' : 'No description')}
                                            </p>

                                            {booking.status === 'pending' && (
                                                <div className="flex gap-2 mt-2">
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-[10px] bg-emerald-500 hover:bg-emerald-600 gap-1"
                                                        onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'confirmed', clientId: booking.client.id })}
                                                    >
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {language === 'ar' ? 'قبول' : 'Accept'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-[10px] border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1"
                                                        onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'rejected' })}
                                                    >
                                                        <XCircle className="w-3 h-3" />
                                                        {language === 'ar' ? 'رفض' : 'Decline'}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground text-sm">
                                        {language === 'ar' ? 'لا توجد حجوزات حديثة' : 'No recent bookings'}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
