import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Menu, X, User, MessageSquare, LogOut, Globe, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { InstallAppButton } from "@/components/InstallAppButton";
import { AdminReturnButton } from "@/components/AdminReturnButton";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className={cn("min-h-screen flex flex-col bg-background font-sans", isRTL && "font-arabic")}>
      {/* Navbar */}
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
              <div className="flex items-center gap-4">
                <Link href="/messages">
                  <Button variant="ghost" size="icon" className="relative">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    {/* Badge could go here */}
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

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

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
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="py-2">
                  {t("profile")}
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

      {/* Footer */}
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
    </div >
  );
}
