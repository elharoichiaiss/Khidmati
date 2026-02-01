import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Settings, LogOut, Home } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [location, setLocation] = useLocation();
    const { admin, isLoading, logout } = useAdminAuth();

    useEffect(() => {
        if (!isLoading && !admin && location !== "/k-admin-portal-secure/login") {
            setLocation("/k-admin-portal-secure/login");
        }
    }, [admin, isLoading, location, setLocation]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>;
    }

    if (!admin) {
        return null;
    }

    const navigation = [
        { name: "Overview", href: "/k-admin-portal-secure", icon: LayoutDashboard },
        { name: "Users Management", href: "/k-admin-portal-secure/users", icon: Users },
        { name: "Settings", href: "/k-admin-portal-secure/settings", icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50/50 flex">
            {/* Sidebar */}
            <div className="hidden md:flex w-72 flex-col fixed inset-y-0 bg-white border-r border-gray-100 shadow-sm z-30">
                <div className="flex-1 flex flex-col pt-8 pb-4 overflow-y-auto">
                    <div className="flex items-center flex-shrink-0 px-6 mb-10">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl mr-3 shadow-lg shadow-primary/20">
                            K
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Khidmati <span className="text-primary font-medium">Admin</span></h1>
                    </div>

                    <div className="px-4 mb-4">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-4 mb-3">Main Menu</p>
                        <nav className="space-y-1">
                            {navigation.map((item) => {
                                const isActive = location === item.href;
                                return (
                                    <Link key={item.name} href={item.href}>
                                        <div
                                            className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200 ${isActive
                                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                                : "text-muted-foreground hover:bg-gray-50 hover:text-primary"
                                                }`}
                                        >
                                            <item.icon
                                                className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? "text-primary-foreground" : "text-gray-400 group-hover:text-primary"
                                                    }`}
                                                aria-hidden="true"
                                            />
                                            {item.name}
                                        </div>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="px-4 mt-auto">
                        <nav className="space-y-1">
                            <Link href="/">
                                <div className="group flex items-center px-4 py-3 text-sm font-medium rounded-xl text-muted-foreground hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer">
                                    <Home className="mr-3 h-5 w-5 text-gray-400 group-hover:text-primary" />
                                    Back to Site
                                </div>
                            </Link>
                            <div
                                className="group flex items-center px-4 py-3 text-sm font-medium rounded-xl text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                onClick={() => logout()}
                            >
                                <LogOut className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" />
                                Sign Out
                            </div>
                        </nav>
                    </div>
                </div>

                <div className="flex-shrink-0 flex bg-gray-50 p-4 border-t border-gray-100 m-4 rounded-2xl">
                    <div className="flex items-center w-full">
                        <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-xs font-bold border border-gray-200 text-primary shadow-sm">
                            AD
                        </div>
                        <div className="ml-3">
                            <p className="text-xs font-bold text-foreground">Administrator</p>
                            <p className="text-[10px] text-muted-foreground">Secure Access</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="md:pl-72 flex flex-col flex-1">
                <main className="flex-1">
                    <div className="py-8">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
