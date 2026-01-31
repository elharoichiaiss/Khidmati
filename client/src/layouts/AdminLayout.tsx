import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Settings, LogOut } from "lucide-react";
import { useUser } from "@/hooks/use-user";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [location] = useLocation();
    const { logout } = useUser();

    const navigation = [
        { name: "Overview", href: "/admin", icon: LayoutDashboard },
        { name: "Users Management", href: "/admin/users", icon: Users },
        { name: "Settings", href: "/admin/settings", icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <div className="hidden md:flex w-64 flex-col fixed inset-y-0 bg-slate-900 text-white">
                <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                    <div className="flex items-center flex-shrink-0 px-4 mb-6">
                        <h1 className="text-xl font-bold tracking-wider uppercase">Khidmati Admin</h1>
                    </div>
                    <nav className="mt-5 flex-1 px-2 space-y-1">
                        {navigation.map((item) => {
                            const isActive = location === item.href;
                            return (
                                <Link key={item.name} href={item.href}>
                                    <div
                                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${isActive
                                                ? "bg-slate-800 text-white"
                                                : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                            }`}
                                    >
                                        <item.icon
                                            className={`mr-3 flex-shrink-0 h-6 w-6 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"
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
                <div className="flex-shrink-0 flex border-t border-slate-800 p-4">
                    <div
                        className="flex-shrink-0 w-full group block cursor-pointer"
                        onClick={() => logout()}
                    >
                        <div className="flex items-center">
                            <div>
                                <LogOut className="inline-block h-9 w-9 rounded-full text-slate-400 bg-slate-800 p-1" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-white group-hover:text-gray-300">
                                    Sign out
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="md:pl-64 flex flex-col flex-1">
                <main className="flex-1">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
