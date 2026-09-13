import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Settings, LogOut, Home,
  Menu, LifeBuoy, FileText, Wrench, ChevronRight,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@heroui/react";
import { InstallAppButton } from "@/components/InstallAppButton";
import { cn } from "@/lib/utils";

const NAVIGATION = [
  { name: "لوحة التحكم",    nameEn: "Overview",         href: "/k-admin-portal-secure",          icon: LayoutDashboard },
  { name: "المستخدمون",      nameEn: "Users Management",  href: "/k-admin-portal-secure/users",    icon: Users },
  { name: "تذاكر الدعم",    nameEn: "Support Tickets",   href: "/k-admin-portal-secure/tickets",  icon: LifeBuoy },
  { name: "التقارير",        nameEn: "Reports",            href: "/k-admin-portal-secure/reports",  icon: FileText },
  { name: "الإعدادات",       nameEn: "Settings",           href: "/k-admin-portal-secure/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { admin, isLoading, logout } = useAdminAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !admin && location !== "/k-admin-portal-secure/login") {
      setLocation("/k-admin-portal-secure/login");
    }
  }, [admin, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-brand">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-12 h-12 rounded-2xl object-cover animate-pulse"
          />
          <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!admin) return null;

  const NavContent = () => (
    <div className="flex flex-col h-full hero-brand relative overflow-hidden">
      <div className="absolute inset-0 dot-grid pointer-events-none opacity-20" />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3 px-6 pt-8 pb-8">
        <img
          src="/logo.png"
          alt="Logo"
          className="w-10 h-10 rounded-2xl object-cover flex-shrink-0"
          style={{ boxShadow: "0 0 20px rgba(0,188,212,0.4)" }}
        />
        <div>
          <h1 className="text-lg font-extrabold text-zinc-900 dark:text-white leading-none">Khidmati</h1>
          <p className="text-[11px] text-zinc-500 dark:text-white/40 mt-0.5">Admin Portal</p>
        </div>
      </div>

      {/* Nav section label */}
      <div className="relative z-10 px-6 mb-3">
        <p className="text-[10px] font-bold text-zinc-400 dark:text-white/25 uppercase tracking-[0.2em]">القائمة الرئيسية</p>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-3 flex-1 space-y-1">
        {NAVIGATION.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href} onClick={() => setOpen(false)}>
              <div
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200",
                  isActive
                    ? "text-white shadow-lg"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-white/40 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5",
                )}
                style={isActive ? { background: "linear-gradient(135deg, rgba(0,188,212,0.25), rgba(14,165,233,0.15))", border: "1px solid rgba(0,188,212,0.2)" } : {}}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors",
                    isActive ? "text-cyan-400" : "text-zinc-400 dark:text-white/30 group-hover:text-cyan-400",
                  )}
                />
                <span className="text-sm font-semibold">{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-cyan-400 opacity-60" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="relative z-10 px-3 pb-4 mt-4 space-y-1 border-t border-zinc-200 dark:border-white/10 pt-4">
        <div className="px-1 mb-2">
          <InstallAppButton className="w-full justify-start text-zinc-500 hover:text-zinc-900 dark:text-white/50 dark:hover:text-white border-zinc-200 dark:border-white/10" variant="bordered" />
        </div>
        <Link href="/" onClick={() => sessionStorage.setItem("admin_browsing_mode", "true")}>
          <div className="group flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-white/40 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer">
            <Home className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
            <span className="text-sm font-semibold">عرض الموقع</span>
          </div>
        </Link>
        <button
          onClick={() => logout()}
          className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-semibold">تسجيل الخروج</span>
        </button>
      </div>

      {/* Admin info card */}
      <div className="relative z-10 mx-3 mb-4 rounded-2xl p-4 glass-dark">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
          >
            AD
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-900 dark:text-white">Administrator</p>
            <p className="text-[10px] text-zinc-500 dark:text-white/35">Secure Access · Khidmati</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-8 h-8 rounded-xl object-cover"
          />
          <span className="font-extrabold text-gray-900">Khidmati Admin</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" isIconOnly className="rounded-xl">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-0">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-[260px] flex-col fixed inset-y-0 z-30">
        <NavContent />
      </div>

      {/* Main content */}
      <div className="md:pl-[260px] flex flex-col flex-1 min-w-0">
        <main className="flex-1 w-full">
          <div className="py-6 md:py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
