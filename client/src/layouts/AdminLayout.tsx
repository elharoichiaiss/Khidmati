import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Settings, LogOut, Home } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [location] = useLocation();
    const { logout } = useAuth();

    const navigation = [
        { name: "Overview", href: "/admin", icon: LayoutDashboard },
        { name: "Users Management", href: "/admin/users", icon: Users },
        { name: "Settings", href: "/admin/settings", icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className="hidden md:flex w-72 flex-col fixed inset-y-0 bg-slate-900 text-white shadow-2xl">
                <div className="flex-1 flex flex-col pt-8 pb-4 overflow-y-auto">
                    <div className="flex items-center flex-shrink-0 px-6 mb-10">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl mr-3">
                            K
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">Khidmati <span className="text-primary font-light">Admin</span></h1>
                    </div>

                    <div className="px-4 mb-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Main Menu</p>
                        <nav className="space-y-1">
                            {navigation.map((item) => {
                                const isActive = location === item.href;
                                return (
                                    <Link key={item.name} href={item.href}>
                                        <div
                                            className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200 ${isActive
                                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                                }`}
                                        >
                                            <item.icon
                                                className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? "text-white" : "text-slate-500 group-hover:text-white"
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
                                <div className="group flex items-center px-3 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                                    <Home className="mr-3 h-5 w-5 text-slate-500 group-hover:text-white" />
                                    Back to Site
                                </div>
                            </Link>
                            <div
                                className="group flex items-center px-3 py-3 text-sm font-medium rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
                                onClick={() => logout()}
                            >
                                <LogOut className="mr-3 h-5 w-5 text-red-500/70 group-hover:text-red-400" />
                                Sign Out
                            </div>
                        </nav>
                    </div>
                </div>

                <div className="flex-shrink-0 flex bg-slate-800/50 p-4 border-t border-white/5">
                    <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold border border-white/10">
                            AD
                        </div>
                        <div className="ml-3">
                            <p className="text-xs font-bold text-white">Administrator</p>
                            <p className="text-[10px] text-slate-500">Full Access</p>
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
