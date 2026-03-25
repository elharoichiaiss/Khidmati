import { Switch, Route, useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import SearchPage from "@/pages/Search";
import AuthPage from "@/pages/Auth";

// Lazy-load heavy pages for faster initial load
const ProviderDetail = lazy(() => import("@/pages/ProviderDetail"));
const Messages = lazy(() => import("@/pages/Messages"));
const Profile = lazy(() => import("@/pages/Profile"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminUsersPage = lazy(() => import("@/pages/admin/Users"));
const AdminTicketsPage = lazy(() => import("@/pages/admin/Tickets"));
const Favorites = lazy(() => import("@/pages/Favorites"));
const ProviderDashboard = lazy(() => import("@/pages/provider/Dashboard"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const SupportPage = lazy(() => import("@/pages/Support"));
const TicketDetailPage = lazy(() => import("@/pages/TicketDetail"));

import AdminLayout from "@/layouts/AdminLayout";
import AdminLogin from "@/pages/admin/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const mode = localStorage.getItem("app_mode");
    const isBrowsing = sessionStorage.getItem("admin_browsing_mode");

    if (mode === "admin" && location === "/" && !isBrowsing) {
      setLocation("/k-admin-portal-secure");
    }
  }, [location, setLocation]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/search" component={SearchPage} />
        <Route path="/login" component={AuthPage} />
        <Route path="/register" component={AuthPage} />
        <Route path="/providers/:id" component={ProviderDetail} />
        <Route path="/messages" component={Messages} />
        <Route path="/favorites">
          <ProtectedRoute>
            <Favorites />
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
        <Route path="/provider/dashboard">
          <ProtectedRoute>
            <ProviderDashboard />
          </ProtectedRoute>
        </Route>

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

        <Route path="/k-admin-portal-secure/settings">
          <ProtectedAdminRoute>
            <AdminLayout>
              <div>Settings Page (Coming Soon)</div>
            </AdminLayout>
          </ProtectedAdminRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

