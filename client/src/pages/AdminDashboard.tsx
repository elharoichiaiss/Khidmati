import { useQuery } from "@tanstack/react-query";
import { User, Ticket } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCog, UserCheck, Activity, LifeBuoy, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ["/api/admin/users"],
    });

    const { data: tickets, isLoading: ticketsLoading } = useQuery<(Ticket & { user: User })[]>({
        queryKey: ["/api/admin/tickets"],
    });

    if (isLoading || ticketsLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const safeTickets = tickets || [];
    const openTickets = safeTickets.filter(t => t.status === 'open').length;
    const resolvedTickets = safeTickets.filter(t => t.status === 'resolved').length;
    const totalTickets = safeTickets.length;

    const stats = [
        {
            title: "Total Users",
            value: users?.length || 0,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
        {
            title: "Providers",
            value: users?.filter(u => u.role === "provider").length || 0,
            icon: UserCog,
            color: "text-purple-600",
            bg: "bg-purple-100",
        },
        {
            title: "Clients",
            value: users?.filter(u => u.role === "client").length || 0,
            icon: UserCheck,
            color: "text-green-600",
            bg: "bg-green-100",
        },
        {
            title: "Banned",
            value: users?.filter(u => u.isBanned).length || 0,
            icon: Activity,
            color: "text-red-600",
            bg: "bg-red-100",
        },
    ];

    const ticketStats = [
        {
            title: "Open Tickets",
            value: openTickets,
            icon: AlertCircle,
            color: "text-amber-600",
            bg: "bg-amber-100",
        },
        {
            title: "Resolved",
            value: resolvedTickets,
            icon: CheckCircle2,
            color: "text-green-600",
            bg: "bg-green-100",
        },
        {
            title: "Total Tickets",
            value: totalTickets,
            icon: LifeBuoy,
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
                <p className="text-muted-foreground mt-1">Welcome back, Admin.</p>
            </div>

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title} className="border-gray-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-full ${stat.bg}`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Statistics updated live
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Support Tickets Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <LifeBuoy className="w-5 h-5 text-primary" />
                        Support Tickets
                    </h3>
                    <Link href="/k-admin-portal-secure/tickets">
                        <Button variant="outline" size="sm">View All</Button>
                    </Link>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-4">
                    {ticketStats.map((stat) => (
                        <Card key={stat.title} className="border-gray-200 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">
                                    {stat.title}
                                </CardTitle>
                                <div className={`p-2 rounded-full ${stat.bg}`}>
                                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Recent Open Tickets */}
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="w-4 h-4 text-amber-500" />
                            Recent Open Tickets
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {ticketsLoading ? (
                            <div className="text-center text-muted-foreground text-sm py-4">Loading...</div>
                        ) : safeTickets.filter(t => t.status === 'open').length === 0 ? (
                            <div className="text-center text-muted-foreground text-sm py-4">
                                No open tickets 🎉
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {safeTickets.filter(t => t.status === 'open').slice(0, 5).map((ticket) => (
                                    <Link key={ticket.id} href={`/k-admin-portal-secure/tickets/${ticket.id}`}>
                                        <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-sm truncate">{ticket.subject}</span>
                                                    <Badge variant={ticket.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                                        {ticket.priority === 'high' ? '🔴 High' : ticket.priority === 'normal' ? 'Normal' : 'Low'}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    By {ticket.user.fullName} • {new Date(ticket.createdAt || "").toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="sm" className="shrink-0 text-xs">
                                                View →
                                            </Button>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
                <Card className="lg:col-span-4 border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {users?.slice(0, 5).map((user) => (
                                <div key={user.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${user.role === 'provider' ? 'bg-purple-500' : 'bg-green-500'
                                            }`}>
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{user.fullName}</p>
                                            <p className="text-xs text-muted-foreground">{user.email || user.username}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-sm font-medium">{user.role}</span>
                                        <span className="text-xs text-gray-400">{new Date(user.createdAt || "").toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 border-none shadow-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    <CardHeader>
                        <CardTitle className="text-primary-foreground">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-primary-foreground/80">
                            Manage your platform efficiently. Check for new provider applications or handle user reports.
                        </p>
                        <div className="grid gap-2">
                            <Link href="/k-admin-portal-secure/tickets">
                                <button className="w-full text-left px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-md transition-colors border border-white/10 text-white font-medium">
                                    📬 View Support Tickets {openTickets > 0 && `(${openTickets} open)`}
                                </button>
                            </Link>
                            <button className="w-full text-left px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-md transition-colors border border-white/10 text-white font-medium">
                                Send Notification to All
                            </button>
                            <button className="w-full text-left px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-md transition-colors border border-white/10 text-white font-medium">
                                Review Settings
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
