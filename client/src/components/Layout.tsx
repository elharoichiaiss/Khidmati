import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Menu, X, User, MessageSquare, LogOut, Globe, LayoutDashboard, Bell, Calendar, Mail, Info, Heart, LifeBuoy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { InstallAppButton } from "@/components/InstallAppButton";
import { AdminReturnButton } from "@/components/AdminReturnButton";
import { ProviderReturnButton } from "@/components/ProviderReturnButton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const isMessagesPage = location === '/messages';

  // Notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 15000, // poll every 15s
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
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const unreadCount = notifications.length;

  // Messages
  const { data: unreadMessagesData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    enabled: !!user,
    refetchInterval: 15000,
  });
  const unreadMessagesCount = unreadMessagesData?.count || 0;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "booking_update": return <Calendar className="w-4 h-4 text-primary" />;
      case "new_message": return <Mail className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleNotifClick = (notif: Notification) => {
    markRead.mutate(notif.id);
    if (notif.link) setLocation(notif.link);
  };

  return (
    <div className={cn(
      "flex flex-col bg-background font-sans",
      isRTL && "font-arabic",
      isMessagesPage ? "h-[100dvh] overflow-hidden overscroll-none" : "min-h-screen"
    )}>
      {/* Navbar - Hide on messages page */}
      {!isMessagesPage && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <img
                src="/logo.png"
                alt="Khidmati Logo"
                className="w-8 h-8 rounded-lg shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform object-cover"
              />
              <span className="font-display font-bold text-2xl tracking-tight text-foreground">
                Khidmati
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
                <Link href="/search" className={cn("hover:text-primary transition-colors", location === "/search" && "text-primary font-bold")}>
                  {t("findService")}
                </Link>
                {!user && (
                  <Link href="/register?role=provider" className="hover:text-primary transition-colors">
                    {t("joinProvider")}
                  </Link>
                )}
              </nav>

              <div className="w-px h-6 bg-border mx-2" />

              <div className="w-px h-6 bg-border mx-2" />

              <InstallAppButton />

              {/* Language Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Globe className="w-4 h-4" />
                    <span className="uppercase">{language}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLanguage("en")}>English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("fr")}>Français</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("ar")}>العربية</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Auth Buttons */}
              {user ? (
                <div className="flex items-center gap-2">
                  {user.role === "provider" && (
                    <Link href="/provider/dashboard">
                      <Button variant="ghost" size="sm" className="hidden md:flex gap-2 text-muted-foreground hover:text-emerald-600 transition-colors">
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="font-medium">{language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                      </Button>
                    </Link>
                  )}
                  <Link href="/favorites">
                    <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-red-500 transition-colors">
                      <Heart className="w-5 h-5" />
                    </Button>
                  </Link>

                  {/* Notifications Bell */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-0 rounded-xl shadow-xl border-0">
                      <div className="px-4 py-3 border-b bg-muted/30 flex justify-between items-center">
                        <h3 className="font-bold text-sm">{t("notifications")}</h3>
                        {unreadCount > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); markAllRead.mutate(); }} 
                            className="h-auto p-0 text-xs text-primary hover:bg-transparent"
                            disabled={markAllRead.isPending}
                          >
                            {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                          </Button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-sm text-muted-foreground">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            {t("noNotifications")}
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <button
                              key={notif.id}
                              onClick={() => handleNotifClick(notif)}
                              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b last:border-0"
                            >
                              <div className="mt-0.5 flex-shrink-0">{getNotifIcon(notif.type)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-snug">{notif.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                </p>
                              </div>
                              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0 animate-pulse" />
                            </button>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t text-center bg-muted/10">
                        <Link href="/notifications">
                          <Button variant="link" className="text-sm h-auto p-0 font-medium text-primary">
                            {language === 'ar' ? 'عرض السجل الكامل' : 'View full history'}
                          </Button>
                        </Link>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Link href="/messages">
                    <Button variant="ghost" size="icon" className="relative">
                      <MessageSquare className="w-5 h-5 text-muted-foreground" />
                      {unreadMessagesCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white animate-pulse">
                          {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                        </span>
                      )}
                    </Button>
                  </Link>

                  <Link href="/support">
                    <Button variant="ghost" size="icon" className="relative hover:text-primary transition-colors" title={language === 'ar' ? 'الدعم الفني' : 'Support Tickets'}>
                      <LifeBuoy className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2 rounded-full pl-2 pr-4 border-2 hover:bg-secondary/50">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {user.fullName[0].toUpperCase()}
                        </div>
                        <span className="max-w-[100px] truncate">{user.fullName}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={user.role === 'provider' ? `/providers/${user.id}` : "/profile"}>
                          <User className="w-4 h-4 mr-2" />
                          {t("profile")}
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link href="/support">
                          <LifeBuoy className="w-4 h-4 mr-2" />
                          {language === 'ar' ? 'الدعم الفني' : 'Support'}
                        </Link>
                      </DropdownMenuItem>

                      {user.role === 'provider' && (
                        <DropdownMenuItem asChild>
                          <Link href="/provider/dashboard">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            {t("dashboard")}
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {user.role === 'client' && (
                        <DropdownMenuItem asChild>
                          <Link href="/favorites">
                            <Heart className="w-4 h-4 mr-2" />
                            {t("favorites")}
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {/* Legacy Admin Link Removed */}

                      <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        {t("logout")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost">{t("login")}</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90">
                      {t("register")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Actions (Visible on small screens) */}
            <div className="flex md:hidden items-center gap-2 mr-2">
              {user && (
                <>
                  <Link href="/messages">
                    <Button variant="ghost" size="icon" className="relative w-8 h-8">
                      <MessageSquare className="w-5 h-5 text-muted-foreground" />
                      {unreadMessagesCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3 min-w-[12px] items-center justify-center rounded-full bg-blue-500 px-0.5 text-[8px] font-bold text-white animate-pulse">
                          {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                        </span>
                      )}
                    </Button>
                  </Link>

                  <Link href="/favorites">
                    <Button variant="ghost" size="icon" className="relative w-8 h-8">
                      <Heart className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </Link>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative w-8 h-8">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-3 min-w-[12px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white animate-pulse">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-0 rounded-xl shadow-xl border-0">
                      <div className="px-4 py-3 border-b bg-muted/30 flex justify-between items-center">
                        <h3 className="font-bold text-sm">{t("notifications")}</h3>
                        {unreadCount > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); markAllRead.mutate(); }} 
                            className="h-auto p-0 text-xs text-primary hover:bg-transparent"
                            disabled={markAllRead.isPending}
                          >
                            {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                          </Button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-sm text-muted-foreground">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            {t("noNotifications")}
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <button
                              key={notif.id}
                              onClick={() => handleNotifClick(notif)}
                              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b last:border-0"
                            >
                              <div className="mt-0.5 flex-shrink-0">{getNotifIcon(notif.type)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-snug">{notif.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                </p>
                              </div>
                              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0 animate-pulse" />
                            </button>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t text-center bg-muted/10">
                        <Link href="/notifications">
                          <Button variant="link" className="text-sm h-auto p-0 font-medium text-primary">
                            {language === 'ar' ? 'عرض السجل الكامل' : 'View full history'}
                          </Button>
                        </Link>
                      </div>
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </header>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background pt-20 px-4 animate-in">
          <nav className="flex flex-col gap-4 text-lg">
            <Link href="/search" onClick={() => setIsMobileMenuOpen(false)} className="py-2 border-b">
              {t("findService")}
            </Link>
            {!user && (
              <Link href="/register?role=provider" onClick={() => setIsMobileMenuOpen(false)} className="py-2 border-b">
                {t("joinProvider")}
              </Link>
            )}

            <div className="py-2">
              <InstallAppButton className="w-full justify-start" variant="outline" />
            </div>

            <div className="py-4 flex gap-4">
              <Button variant={language === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('en')}>EN</Button>
              <Button variant={language === 'fr' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('fr')}>FR</Button>
              <Button variant={language === 'ar' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('ar')}>AR</Button>
            </div>

            {user ? (
              <>
                <Link href="/messages" onClick={() => setIsMobileMenuOpen(false)} className="py-2 font-bold text-primary">
                  {t("messages")}
                </Link>
                <Link href="/support" onClick={() => setIsMobileMenuOpen(false)} className="py-2 flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4" /> {language === 'ar' ? 'الدعم الفني' : 'Support Tickets'}
                </Link>
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="py-2">
                  {t("profile")}
                </Link>
                {user.role === 'provider' && (
                  <Link href="/provider/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="py-2 font-bold text-emerald-600">
                    <LayoutDashboard className="w-4 h-4 inline mr-2" /> {t("dashboard")}
                  </Link>
                )}
                <Link href="/favorites" onClick={() => setIsMobileMenuOpen(false)} className="py-2 flex items-center gap-2 border-b">
                  <Heart className="w-4 h-4" /> {t("favorites")}
                </Link>
                {/* Legacy Admin Link Removed */}
                <Button variant="destructive" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                  {t("logout")}
                </Button>
              </>
            ) : (
              <div className="flex flex-col gap-3 mt-4">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">{t("login")}</Button>
                </Link>
                <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full">{t("register")}</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )
      }

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      <AdminReturnButton />
      <ProviderReturnButton />

      {/* Footer - Hide on Messages page for full height app feel */}
      {!isMessagesPage && (
        <footer className="border-t bg-card py-12 mt-12">
          <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Khidmati Logo" className="w-6 h-6 rounded object-cover" />
                <span className="font-display font-bold text-lg">Khidmati</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Connecting trusted professionals with clients across the region. Quality service, guaranteed.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/search" className="hover:text-primary">Find Services</Link></li>
                <li><Link href="/register?role=provider" className="hover:text-primary">Become a Pro</Link></li>
                <li><Link href="/login" className="hover:text-primary">Sign In</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Help Center</a></li>
                <li><a href="#" className="hover:text-primary">Safety</a></li>
                <li><a href="#" className="hover:text-primary">Terms of Service</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>support@khidmati.com</li>
                <li>+1 (555) 123-4567</li>
              </ul>
            </div>
          </div>
          <div className="container mx-auto px-4 mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Khidmati. All rights reserved.
          </div>
        </footer>
      )}
    </div >
  );
}
