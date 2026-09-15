import { Switch, Route, useLocation } from "wouter";
import { useEffect, lazy, Suspense, Component, type ReactNode } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { LanguageProvider } from "@/hooks/use-language";
import { HeroUIProvider } from "@heroui/react";

import Home from "@/pages/Home";
import SearchPage from "@/pages/Search";
import AuthPage from "@/pages/Auth";

const ProviderDetail = lazy(() => import("@/pages/ProviderDetail"));
const Messages = lazy(() => import("@/pages/Messages"));
const Profile = lazy(() => import("@/pages/Profile"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminUsersPage = lazy(() => import("@/pages/admin/Users"));
const AdminTicketsPage = lazy(() => import("@/pages/admin/Tickets"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/Settings"));
const AdminReportsPage = lazy(() => import("@/pages/admin/Reports"));
const Favorites = lazy(() => import("@/pages/Favorites"));
const BookingHistory = lazy(() => import("@/pages/BookingHistory"));
const ProviderDashboard = lazy(() => import("@/pages/provider/Dashboard"));
const ProviderPending = lazy(() => import("@/pages/provider/Pending"));
const ProviderReports = lazy(() => import("@/pages/provider/Reports"));
const ProviderBookings = lazy(() => import("@/pages/provider/ProviderBookings"));
const ProviderVerification = lazy(() => import("@/pages/provider/Verification"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const SupportPage = lazy(() => import("@/pages/Support"));
const TicketDetailPage = lazy(() => import("@/pages/TicketDetail"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const CompleteProfilePage = lazy(() => import("@/pages/CompleteProfile"));
const TermsPage = lazy(() => import("@/pages/Terms"));
const PrivacyPage = lazy(() => import("@/pages/Privacy"));
const InvoicePrint = lazy(() => import("@/pages/InvoicePrint"));
const Invoices = lazy(() => import("@/pages/Invoices"));

import AdminLayout from "@/layouts/AdminLayout";
import AdminLogin from "@/pages/admin/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import { useAuth } from "@/hooks/use-auth";
import { BannedAccountPage } from "@/components/BannedAccountPage";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <h2 className="text-xl font-bold mb-2">حدث خطأ</h2>
          <p className="text-muted-foreground mb-4">يرجى إعادة تحميل الصفحة</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            إعادة تحميل
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function DashboardRedirect() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      if (user.role === "provider") {
        setLocation("/provider/dashboard");
      } else if (user.role === "admin") {
        setLocation("/k-admin-portal-secure");
      } else {
        setLocation("/");
      }
    } else {
      setLocation("/login");
    }
  }, [user, setLocation]);

  return <LoadingSpinner />;
}

function Router() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const mode = localStorage.getItem("app_mode");
    const isBrowsing = sessionStorage.getItem("admin_browsing_mode");

    if (mode === "admin" && location === "/" && !isBrowsing) {
      setLocation("/k-admin-portal-secure");
    }

    if (user && !user.city && location !== "/complete-profile" && location !== "/terms" && location !== "/privacy" && !location.startsWith("/k-admin")) {
      setLocation("/complete-profile");
    }
  }, [location, setLocation, user]);

  if (user?.isBanned) {
    return <BannedAccountPage />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ErrorBoundary>
        <Switch>
        <Route path="/" component={Home} />
        <Route path="/search" component={SearchPage} />
        <Route path="/login" component={AuthPage} />
        <Route path="/register" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/complete-profile" component={CompleteProfilePage} />
        <Route path="/providers/:id" component={ProviderDetail} />
        <Route path="/messages" component={Messages} />
        <Route path="/invoice/:id/print" component={InvoicePrint} />
        <Route path="/favorites">
          <ProtectedRoute>
            <Favorites />
          </ProtectedRoute>
        </Route>
        <Route path="/invoices">
          <ProtectedRoute>
            <Invoices />
          </ProtectedRoute>
        </Route>
        <Route path="/bookings">
          <ProtectedRoute>
            <BookingHistory />
          </ProtectedRoute>
        </Route>
        <Route path="/notifications">
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        </Route>
        <Route path="/support">
          <ProtectedRoute>
            <SupportPage />
          </ProtectedRoute>
        </Route>
        <Route path="/support/:id">
          <ProtectedRoute>
            <TicketDetailPage />
          </ProtectedRoute>
        </Route>
        <Route path="/profile">
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        </Route>
        <Route path="/provider/pending">
          <ProtectedRoute>
            <ProviderPending />
          </ProtectedRoute>
        </Route>
        <Route path="/provider/dashboard">
          <ProtectedRoute>
            <ProviderDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/provider/bookings">
          <ProtectedRoute>
            <ProviderBookings />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        </Route>
        <Route path="/provider/reports">
          <ProtectedRoute>
            <ProviderReports />
          </ProtectedRoute>
        </Route>
        <Route path="/provider/verification">
          <ProtectedRoute>
            <ProviderVerification />
          </ProtectedRoute>
        </Route>

        <Route path="/terms" component={TermsPage} />
        <Route path="/privacy" component={PrivacyPage} />

        {/* Admin Routes */}
        <Route path="/k-admin-portal-secure/login" component={AdminLogin} />

        <Route path="/k-admin-portal-secure">
          <ProtectedAdminRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedAdminRoute>
        </Route>

        <Route path="/k-admin-portal-secure/users">
          <ProtectedAdminRoute>
            <AdminLayout>
              <AdminUsersPage />
            </AdminLayout>
          </ProtectedAdminRoute>
        </Route>

        <Route path="/k-admin-portal-secure/tickets">
          <ProtectedAdminRoute>
            <AdminLayout>
              <AdminTicketsPage />
            </AdminLayout>
          </ProtectedAdminRoute>
        </Route>

        <Route path="/k-admin-portal-secure/tickets/:id">
          <ProtectedAdminRoute>
            <AdminLayout>
              <TicketDetailPage />
            </AdminLayout>
          </ProtectedAdminRoute>
        </Route>

        <Route path="/k-admin-portal-secure/reports">
          <ProtectedAdminRoute>
            <AdminLayout>
              <AdminReportsPage />
            </AdminLayout>
          </ProtectedAdminRoute>
        </Route>

        <Route path="/k-admin-portal-secure/settings">
          <ProtectedAdminRoute>
            <AdminLayout>
              <AdminSettingsPage />
            </AdminLayout>
          </ProtectedAdminRoute>
        </Route>

        <Route component={NotFound} />
        </Switch>
      </ErrorBoundary>
    </Suspense>
  );
}

function App() {
  return (
    <HeroUIProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </HeroUIProvider>
  );
}

export default App;

