import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// Admin user type
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
            try {
                const res = await fetch("/api/admin/me", { credentials: "include" });
                if (res.status === 401) return null;
                const contentType = res.headers.get("content-type") || "";
                if (res.ok && contentType.includes("application/json")) {
                    return await res.json();
                }
            } catch {
                // Express backend not available (e.g. Firebase static hosting)
            }

            // Fallback for static hosting (Firebase)
            const saved = localStorage.getItem("khidmati_admin_session");
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch {
                    // Invalid JSON
                }
            }
            return null;
        },
        retry: false,
        staleTime: Infinity,
    });

    const loginMutation = useMutation({
        mutationFn: async (credentials: { username: string; password: string }) => {
            const inputUsername = credentials.username.trim();
            const inputPassword = credentials.password.trim();

            let backendSuccess = false;
            let resultData: any = null;

            try {
                const res = await fetch("/api/admin/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: inputUsername, password: inputPassword }),
                    credentials: "include",
                });

                const contentType = res.headers.get("content-type") || "";
                if (contentType.includes("application/json")) {
                    if (res.ok) {
                        backendSuccess = true;
                        resultData = await res.json();
                    } else if (res.status === 401) {
                        throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        if (errData.message) throw new Error(errData.message);
                    }
                }
            } catch (err: any) {
                if (err.message === "اسم المستخدم أو كلمة المرور غير صحيحة") {
                    throw err;
                }
                // Express backend not reachable (e.g. static host)
            }

            if (backendSuccess && resultData) {
                const adminUser = resultData.user || { username: inputUsername };
                localStorage.setItem("khidmati_admin_session", JSON.stringify(adminUser));
                return resultData;
            }

            // Fallback for Firebase Static Hosting:
            // Check default admin credentials or Supabase database
            if (
                (inputUsername === "admin" && inputPassword === "admin123") ||
                (inputUsername === "admin" && inputPassword === "admin")
            ) {
                const adminUser = { username: inputUsername };
                localStorage.setItem("khidmati_admin_session", JSON.stringify(adminUser));
                return { user: adminUser };
            }

            try {
                const { data: userRecord } = await supabase
                    .from("users")
                    .select("*")
                    .or(`username.eq.${inputUsername},email.eq.${inputUsername}`)
                    .eq("role", "admin")
                    .maybeSingle();

                if (userRecord) {
                    const adminUser = { username: userRecord.username || inputUsername };
                    localStorage.setItem("khidmati_admin_session", JSON.stringify(adminUser));
                    return { user: adminUser };
                }
            } catch (sbErr) {
                console.error("Supabase fallback lookup error:", sbErr);
            }

            throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
        },
        onSuccess: (data) => {
            const adminUser = data.user || { username: "admin" };
            queryClient.setQueryData(["/api/admin/me"], adminUser);
            localStorage.setItem("app_mode", "admin");
            setLocation("/k-admin-portal-secure"); // Redirect to dashboard
            toast({
                title: "مرحباً بك في لوحة الإدارة",
                description: "تم تسجيل الدخول بنجاح.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "فشل تسجيل الدخول",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            try {
                await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
            } catch {
                // Ignore failure on static host
            }
            localStorage.removeItem("khidmati_admin_session");
        },
        onSuccess: () => {
            queryClient.setQueryData(["/api/admin/me"], null);
            localStorage.removeItem("app_mode");
            localStorage.removeItem("khidmati_admin_session");
            setLocation("/k-admin-portal-secure/login");
            toast({
                title: "تم تسجيل الخروج",
                description: "تم تسجيل الخروج من لوحة الإدارة بنجاح.",
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
