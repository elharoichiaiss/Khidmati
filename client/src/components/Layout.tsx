import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import {
  Menu, X, User, MessageSquare, LogOut, Globe,
  LayoutDashboard, Bell, Calendar, Mail, Info,
  Heart, LifeBuoy, BarChart3, Wrench, CalendarDays, FileText
} from "lucide-react";
import { useState } from "react";
import {
  Dropdown, DropdownTrigger,
  DropdownMenu, DropdownItem,
  Popover, PopoverTrigger, PopoverContent,
  Button,
} from "@heroui/react";
import { cn, getNotifTarget } from "@/lib/utils";
import { InstallAppButton } from "@/components/InstallAppButton";
import { DashboardEdgeTab } from "@/components/DashboardEdgeTab";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────── */
/*  Navbar link helper                         */
/* ─────────────────────────────────────────── */
function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link href={href}>
      <span
        className={cn(
          "relative text-sm font-medium transition-colors duration-200 group cursor-pointer",
          active ? "text-cyan-500" : "text-gray-500 hover:text-gray-900 dark:hover:text-white",
        )}
      >
        {children}
        <span
          className={cn(
            "absolute -bottom-1 left-0 h-0.5 rounded-full transition-all duration-300",
            active ? "w-full" : "w-0 group-hover:w-full",
          )}
          style={{ background: "linear-gradient(90deg, #00bcd4, #0ea5e9)" }}
        />
      </span>
    </Link>
  );
}


export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { admin } = useAdminAuth();

  const isAdmin    = (user?.role === "admin") || (!user && !!admin);
  const isProvider = user?.role === "provider";
  const isMessagesPage = location === "/messages";

  /* Notifications */
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 15000,
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/notifications/read-all`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const unreadCount = notifications.length;

  /* Messages */
  const { data: unreadMessagesData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    enabled: !!user,
    refetchInterval: 15000,
  });
  const unreadMessagesCount = unreadMessagesData?.count || 0;

  const getNotifIcon = (type: string) => {
    if (type === "booking_update") return <Calendar className="w-4 h-4 text-cyan-500" />;
    if (type === "new_message")    return <Mail className="w-4 h-4 text-blue-500" />;
    return <Info className="w-4 h-4 text-gray-400" />;
  };

  const handleNotifClick = (notif: Notification) => {
    markRead.mutate(notif.id);
    setLocation(getNotifTarget(notif, user?.role));
  };

  /* Notification Popover Content (shared) */
  const NotifPanel = () => (
    <div className="w-80">
      <div className="px-4 py-3 border-b flex justify-between items-center">
        <h3 className="font-bold text-sm">{t("notifications")}</h3>
        {unreadCount > 0 && (
          <Button
            variant="light" size="sm"
            onPress={() => markAllRead.mutate()}
            className="h-auto p-0 text-xs text-cyan-600"
            isDisabled={markAllRead.isPending}
          >
            {language === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}
          </Button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Bell className="w-9 h-9 mx-auto mb-2 opacity-20" />
            {t("noNotifications")}
          </div>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleNotifClick(notif)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left border-b last:border-0"
            >
              <div className="mt-0.5 flex-shrink-0">{getNotifIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{notif.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
              <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0 animate-pulse" />
            </button>
          ))
        )}
      </div>
      <div className="p-2 border-t text-center">
        <Link href="/notifications">
          <button className="text-sm font-semibold text-cyan-600 hover:text-cyan-700 transition-colors">
            {language === "ar" ? "عرض السجل الكامل" : "View full history"}
          </button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className={cn(
      "flex flex-col bg-background font-sans",
      isRTL && "font-arabic",
      isMessagesPage ? "h-[100dvh] overflow-hidden overscroll-none" : "min-h-screen",
    )}>
      {/* ══════════════════════════════════════════════════
          NAVBAR — Premium Floating Glass Style
      ══════════════════════════════════════════════════ */}
      {!isMessagesPage && (
        <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-9 h-9 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform"
              />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-6">
                <NavLink href="/search" active={location === "/search"}>
                  {t("findService")}
                </NavLink>
                {!user && (
                  <NavLink href="/register?role=provider">
                    {t("joinProvider")}
                  </NavLink>
                )}
              </nav>

              <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1" />

              <InstallAppButton />

              {/* Language Switcher */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 border border-zinc-200/50 dark:border-zinc-700/50">
                {(["ar", "fr", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200",
                      language === lang
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
                    )}
                  >
                    {lang === "ar" ? "ع" : lang.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Auth */}
              {user ? (
                <div className="flex items-center gap-1">
                  {(isAdmin || isProvider) && (
                    <Link href={isAdmin ? "/k-admin-portal-secure" : "/provider/dashboard"}>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-cyan-600 transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold text-xs">{t("dashboard")}</span>
                      </Button>
                    </Link>
                  )}

                  <Link href="/invoices">
                    <Button variant="ghost" isIconOnly className="relative text-muted-foreground hover:text-cyan-600 transition-colors">
                      <FileText className="w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href={isProvider ? "/provider/bookings" : "/bookings"}>
                    <Button variant="ghost" isIconOnly className="relative text-muted-foreground hover:text-cyan-600 transition-colors">
                      <CalendarDays className="w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href="/favorites">
                    <Button variant="ghost" isIconOnly className="relative text-muted-foreground hover:text-red-500 transition-colors">
                      <Heart className="w-5 h-5" />
                    </Button>
                  </Link>

                  {/* Notifications */}
                  <Popover placement="bottom-end" showArrow={false}>
                    <PopoverTrigger>
                      <Button variant="ghost" isIconOnly className="relative">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-0 overflow-hidden">
                      <NotifPanel />
                    </PopoverContent>
                  </Popover>

                  {/* Messages */}
                  <Link href="/messages">
                    <Button variant="ghost" isIconOnly className="relative">
                      <MessageSquare className="w-5 h-5 text-muted-foreground" />
                      {unreadMessagesCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white animate-pulse">
                          {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                        </span>
                      )}
                    </Button>
                  </Link>

                  {/* Support */}
                  <Link href="/support">
                    <Button variant="ghost" isIconOnly className="text-muted-foreground hover:text-cyan-600 transition-colors">
                      <LifeBuoy className="w-5 h-5" />
                    </Button>
                  </Link>

                  {/* User Menu */}
                  <Dropdown placement="bottom-end" className="rounded-2xl shadow-xl border border-divider bg-background">
                    <DropdownTrigger>
                      <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border-2 border-border hover:border-cyan-300 transition-colors focus:outline-none">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
                        >
                          {user.fullName[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold max-w-[90px] truncate">{user.fullName}</span>
                      </button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="User Menu Actions" variant="flat" disabledKeys={[]}>
                      <DropdownItem key="profile" textValue={t("profile")}>
                        <Link href={user.role === "provider" ? `/providers/${user.id}` : "/profile"} className="flex items-center gap-2 w-full text-foreground">
                          <User className="w-4 h-4 text-cyan-500" />
                          <span>{t("profile")}</span>
                        </Link>
                      </DropdownItem>
                      <DropdownItem key="support" textValue="Support">
                        <Link href="/support" className="flex items-center gap-2 w-full text-foreground">
                          <LifeBuoy className="w-4 h-4 text-blue-500" />
                          <span>{language === "ar" ? "الدعم الفني" : "Support"}</span>
                        </Link>
                      </DropdownItem>
                      {user.role === "provider" ? (
                        <DropdownItem key="dashboard" textValue={t("dashboard")}>
                          <Link href="/provider/dashboard" className="flex items-center gap-2 w-full text-emerald-500 font-medium">
                            <LayoutDashboard className="w-4 h-4" />
                            <span>{t("dashboard")}</span>
                          </Link>
                        </DropdownItem>
                      ) : null}
                      {user.role === "provider" ? (
                        <DropdownItem key="reports" textValue="Reports">
                          <Link href="/provider/reports" className="flex items-center gap-2 w-full text-foreground">
                            <BarChart3 className="w-4 h-4 text-purple-500" />
                            <span>{language === "ar" ? "التقارير" : "Reports"}</span>
                          </Link>
                        </DropdownItem>
                      ) : null}
                      {user.role === "client" ? (
                        <DropdownItem key="favorites" textValue={t("favorites")}>
                          <Link href="/favorites" className="flex items-center gap-2 w-full text-foreground">
                            <Heart className="w-4 h-4 text-red-400" />
                            <span>{t("favorites")}</span>
                          </Link>
                        </DropdownItem>
                      ) : null}
                      <DropdownItem key="invoices" textValue="Invoices">
                        <Link href="/invoices" className="flex items-center gap-2 w-full text-foreground">
                          <FileText className="w-4 h-4 text-cyan-500" />
                          <span>{language === "ar" ? "الفواتير" : "Invoices"}</span>
                        </Link>
                      </DropdownItem>
                      <DropdownItem key="logout" className="text-danger border-t border-divider mt-1" color="danger" textValue={t("logout")} onClick={() => logout()}>
                        <div className="flex items-center gap-2 w-full">
                          <LogOut className="w-4 h-4" />
                          <span>{t("logout")}</span>
                        </div>
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" className="font-semibold">{t("login")}</Button>
                  </Link>
                  <Link href="/register">
                    <Button
                      className="font-bold rounded-xl shadow-teal-glow"
                      style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
                    >
                      {t("register")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile: quick icons + hamburger */}
            <div className="flex md:hidden items-center gap-1">
              {user && (
                <>
                  <Link href="/messages">
                    <Button variant="ghost" isIconOnly className="relative w-9 h-9">
                      <MessageSquare className="w-5 h-5 text-muted-foreground" />
                      {unreadMessagesCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                          {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Popover placement="bottom-end" showArrow={false}>
                    <PopoverTrigger>
                      <Button variant="ghost" isIconOnly className="relative w-9 h-9">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold animate-pulse">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-0 overflow-hidden">
                      <NotifPanel />
                    </PopoverContent>
                  </Popover>
                </>
              )}
              <button
                className="p-2 text-foreground rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* ═══════════════════════════════════════════
          MOBILE MENU
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-40 bg-white dark:bg-gray-950 pt-20 px-5 overflow-y-auto"
          >
            <nav className="flex flex-col gap-1">
              {/* Lang switcher */}
              <div className="flex gap-2 mb-4 p-1 bg-secondary rounded-xl w-fit">
                {(["ar", "fr", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      language === lang ? "text-white" : "text-muted-foreground",
                    )}
                    style={language === lang ? { background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" } : {}}
                  >
                    {lang === "ar" ? "ع" : lang.toUpperCase()}
                  </button>
                ))}
              </div>

              {[
                { href: "/search", label: t("findService") },
                ...(!user ? [{ href: "/register?role=provider", label: t("joinProvider") }] : []),
              ].map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="py-3 px-4 rounded-xl hover:bg-secondary font-semibold transition-colors">{item.label}</div>
                </Link>
              ))}

              <div className="py-2 px-1">
                <InstallAppButton className="w-full justify-start" variant="bordered" />
              </div>

              {user ? (
                <>
                  <Link href="/messages" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="py-3 px-4 rounded-xl hover:bg-secondary font-semibold text-cyan-600 flex items-center gap-2 transition-colors">
                      <MessageSquare className="w-4 h-4" />{t("messages")}
                    </div>
                  </Link>
                  <Link href={isProvider ? "/provider/bookings" : "/bookings"} onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="py-3 px-4 rounded-xl hover:bg-secondary flex items-center gap-2 transition-colors">
                      <CalendarDays className="w-4 h-4 text-cyan-500" />{t("myBookings")}
                    </div>
                  </Link>
                  <Link href="/invoices" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="py-3 px-4 rounded-xl hover:bg-secondary flex items-center gap-2 transition-colors">
                      <FileText className="w-4 h-4 text-cyan-500" />{language === "ar" ? "الفواتير" : "Invoices"}
                    </div>
                  </Link>
                  <Link href="/support" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="py-3 px-4 rounded-xl hover:bg-secondary flex items-center gap-2 transition-colors">
                      <LifeBuoy className="w-4 h-4 text-blue-500" />
                      {language === "ar" ? "الدعم الفني" : "Support"}
                    </div>
                  </Link>
                  <Link href={user.role === "provider" ? `/providers/${user.id}` : "/profile"} onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="py-3 px-4 rounded-xl hover:bg-secondary flex items-center gap-2 transition-colors">
                      <User className="w-4 h-4 text-cyan-500" />{t("profile")}
                    </div>
                  </Link>
                  {(isAdmin || isProvider) && (
                    <Link href={isAdmin ? "/k-admin-portal-secure" : "/provider/dashboard"} onClick={() => setIsMobileMenuOpen(false)}>
                      <div className="py-3 px-4 rounded-xl hover:bg-secondary flex items-center gap-2 font-bold transition-colors" style={{ color: "#00bcd4" }}>
                        <LayoutDashboard className="w-4 h-4" />{t("dashboard")}
                      </div>
                    </Link>
                  )}
                  <Link href="/favorites" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="py-3 px-4 rounded-xl hover:bg-secondary flex items-center gap-2 transition-colors border-b">
                      <Heart className="w-4 h-4 text-red-400" />{t("favorites")}
                    </div>
                  </Link>
                  <button
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="mt-4 w-full py-3 px-4 rounded-xl bg-red-50 text-red-600 font-semibold flex items-center gap-2 hover:bg-red-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />{t("logout")}
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 mt-4">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="bordered" className="w-full rounded-xl">{t("login")}</Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      className="w-full rounded-xl font-bold"
                      style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
                    >
                      {t("register")}
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Dashboard edge tab */}
      {(isAdmin || isProvider) && (
        <DashboardEdgeTab href={isAdmin ? "/k-admin-portal-secure" : "/provider/dashboard"} />
      )}

      {/* ═══════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════ */}
      {!isMessagesPage && (
        <footer className="hero-brand border-t border-zinc-200 dark:border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 dot-grid pointer-events-none opacity-30" />
          <div className="container mx-auto px-4 pt-14 pb-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-9 h-9 rounded-xl object-cover"
                  />
                  <span className="font-extrabold text-xl text-zinc-900 dark:text-white">Khidmati</span>
                </div>
                <p className="text-zinc-500 dark:text-white/40 text-sm leading-relaxed">
                  {language === "ar"
                    ? "نربط الحرفيين الموثوقين بالعملاء في جميع أنحاء المغرب."
                    : language === "fr"
                    ? "Nous connectons les artisans de confiance avec les clients à travers le Maroc."
                    : "Connecting trusted professionals with clients across Morocco."}
                </p>
                <div className="flex items-center gap-1.5 mt-5">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className="text-amber-400 text-sm">★</span>
                  ))}
                  <span className="text-zinc-400 dark:text-white/30 text-xs ml-1">4.8 / 5</span>
                </div>
              </div>

              {/* Platform links */}
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-white mb-4 text-sm uppercase tracking-wider">
                  {language === "ar" ? "المنصة" : "Platform"}
                </h4>
                <ul className="space-y-3 text-sm text-zinc-500 dark:text-white/40">
                  <li><Link href="/search" className="hover:text-cyan-400 transition-colors">{language === "ar" ? "ابحث عن خدمة" : "Find Services"}</Link></li>
                  <li><Link href="/register?role=provider" className="hover:text-cyan-400 transition-colors">{language === "ar" ? "انضم كحرفي" : "Become a Pro"}</Link></li>
                  <li><Link href="/login" className="hover:text-cyan-400 transition-colors">{language === "ar" ? "تسجيل الدخول" : "Sign In"}</Link></li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-white mb-4 text-sm uppercase tracking-wider">
                  {language === "ar" ? "الدعم" : "Support"}
                </h4>
                <ul className="space-y-3 text-sm text-zinc-500 dark:text-white/40">
                  <li><Link href="/support" className="hover:text-cyan-400 transition-colors">{language === "ar" ? "مركز المساعدة" : "Help Center"}</Link></li>
                  <li><Link href="/privacy" className="hover:text-cyan-400 transition-colors">{language === "ar" ? "الأمان والخصوصية" : "Safety & Privacy"}</Link></li>
                  <li><Link href="/terms" className="hover:text-cyan-400 transition-colors">{language === "ar" ? "الشروط والأحكام" : "Terms of Service"}</Link></li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-white mb-4 text-sm uppercase tracking-wider">
                  {language === "ar" ? "تواصل معنا" : "Contact"}
                </h4>
                <ul className="space-y-3 text-sm text-zinc-500 dark:text-white/40">
                  <li className="hover:text-cyan-400 transition-colors">support@khidmati.ma</li>
                  <li className="hover:text-cyan-400 transition-colors">+212 6 00 00 00 00</li>
                  <li className="text-zinc-400 dark:text-white/25">{language === "ar" ? "الدار البيضاء، المغرب" : "Casablanca, Morocco"}</li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-zinc-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-zinc-400 dark:text-white/25 text-xs">
                © {new Date().getFullYear()} Khidmati · {language === "ar" ? "جميع الحقوق محفوظة" : "All rights reserved"}
              </p>
              <p className="text-zinc-400 dark:text-white/15 text-xs">
                {language === "ar" ? "صُنع بـ❤️ في المغرب" : "Made with ❤️ in Morocco"}
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
