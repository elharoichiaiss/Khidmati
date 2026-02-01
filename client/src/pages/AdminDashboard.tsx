import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCog, UserCheck, Activity } from "lucide-react";

export default function AdminDashboard() {
    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ["/api/admin/users"],
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

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

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
                <p className="text-muted-foreground mt-1">Welcome back, Admin.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-gray-200 shadow-sm">
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

                <Card className="col-span-3 border-none shadow-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    <CardHeader>
                        <CardTitle className="text-primary-foreground">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-primary-foreground/80">
                            Manage your platform efficiently. Check for new provider applications or handle user reports.
                        </p>
                        <div className="grid gap-2">
                            <button className="w-full text-left px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-md transition-colors border border-white/10 text-white font-medium">
                                Send Notification to All
                            </button>
                            <button className="w-full text-left px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-md transition-colors border border-white/10 text-white font-medium">
                                Generate Monthly Report
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
