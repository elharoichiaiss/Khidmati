import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Admin user type (simple for now)
type AdminUser = {
    username: string;
};

export function useAdminAuth() {
    const queryClient = useQueryClient();
    const [_, setLocation] = useLocation();
    const { toast } = useToast();

    const { data: admin, isLoading } = useQuery<AdminUser | null>({
        queryKey: ["/api/admin/me"],
        queryFn: async () => {
            const res = await fetch("/api/admin/me");
            if (res.status === 401) return null;
            if (!res.ok) throw new Error("Failed to fetch admin status");
            return await res.json();
        },
        retry: false,
        staleTime: Infinity,
    });

    const loginMutation = useMutation({
        mutationFn: async (credentials: { username: string; password: string }) => {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials),
            });

            if (!res.ok) {
                let errorMessage = "Admin login failed";
                try {
                    const errData = await res.json();
                    if (errData && errData.message) {
                        errorMessage = errData.message;
                    }
                } catch (e) {
                    // fallback to default
                }
                
                if (res.status === 401 && errorMessage === "Admin login failed") {
                    throw new Error("Invalid admin credentials");
                }
                throw new Error(errorMessage);
            }
            return await res.json();
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["/api/admin/me"], data.user);
            localStorage.setItem("app_mode", "admin");
            setLocation("/k-admin-portal-secure"); // Redirect to dashboard
            toast({
                title: "Welcome Admin",
                description: "You have successfully logged in.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Login Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            await fetch("/api/admin/logout", { method: "POST" });
        },
        onSuccess: () => {
            queryClient.setQueryData(["/api/admin/me"], null);
            localStorage.removeItem("app_mode");
            setLocation("/k-admin-portal-secure/login");
            toast({
                title: "Logged Out",
                description: "You have been logged out of the admin portal.",
            });
        },
    });

    return {
        admin,
        isLoading,
        login: loginMutation.mutateAsync,
        isLoggingIn: loginMutation.isPending,
        logout: logoutMutation.mutateAsync,
    };
}
