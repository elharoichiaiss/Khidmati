import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import SearchPage from "@/pages/Search";
import AuthPage from "@/pages/Auth";
import ProviderDetail from "@/pages/ProviderDetail";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUsersPage from "@/pages/admin/Users";
import AdminLayout from "@/layouts/AdminLayout";
import AdminLogin from "@/pages/admin/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/providers/:id" component={ProviderDetail} />
      <Route path="/messages" component={Messages} />
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>

      {/* Admin Routes with nested switch for sub-routes */}
      {/* Secure Admin Routes */}
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

      <Route path="/k-admin-portal-secure/settings">
        <ProtectedAdminRoute>
          <AdminLayout>
            <div>Settings Page (Coming Soon)</div>
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
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
