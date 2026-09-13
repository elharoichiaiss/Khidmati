import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LoginRequest, type InsertUser, type InsertProviderProfile, users, providerProfiles } from "@shared/routes";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export type CompleteProfileRequest = {
  role: "client" | "provider";
  username?: string;
  phone?: string | null;
  city: string;
  serviceCategory?: string;
  yearsOfExperience?: number;
  bio?: string;
};

export type AuthUser = typeof users.$inferSelect & {
  providerProfile?: typeof providerProfiles.$inferSelect | null;
};

function mapSupabaseUserToKhidmatiUser(sbUser: any): AuthUser | null {
  if (!sbUser) return null;
  const meta = sbUser.user_metadata || {};
  let savedCity = meta.city || null;
  let savedPhone = meta.phone || sbUser.phone || null;
  let savedUsername = meta.username || null;
  let savedRole = meta.role || "client";

  try {
    const saved = localStorage.getItem("khidmati_user_profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.email === sbUser.email || parsed.googleId === sbUser.id) {
        if (!savedCity) savedCity = parsed.city;
        if (!savedPhone) savedPhone = parsed.phone;
        if (!savedUsername) savedUsername = parsed.username;
        if (!savedRole || savedRole === "client") savedRole = parsed.role || savedRole;
      }
    }
  } catch {}

  return {
    id: 1,
    username: savedUsername || sbUser.email || sbUser.id,
    password: null,
    googleId: sbUser.id,
    email: sbUser.email || null,
    phone: savedPhone,
    city: savedCity,
    status: "active",
    fullName:
      meta.full_name ||
      meta.name ||
      meta.fullName ||
      sbUser.email?.split("@")[0] ||
      "مستخدم",
    avatarUrl:
      meta.avatar_url ||
      meta.picture ||
      null,
    role: (savedRole as "client" | "provider" | "admin") || "client",
    isVerified: true,
    isBanned: false,
    banReason: null,
    banExpiresAt: null,
    createdAt: sbUser.created_at ? new Date(sbUser.created_at) : new Date(),
    providerProfile: meta.providerProfile || null,
  } as any;
}

async function safeJsonResponse(res: Response, fallbackErrorMessage = "حدث خطأ غير متوقع") {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      throw new Error("تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الخادم بشكل صحيح.");
    }
    throw new Error(text || fallbackErrorMessage);
  }
  return res.json().catch(() => {
    throw new Error(fallbackErrorMessage);
  });
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const mapped = mapSupabaseUserToKhidmatiUser(session.user);
          queryClient.setQueryData([api.auth.me.path], mapped);
        }
      }
    );
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      try {
        const res = await fetch(api.auth.me.path, { credentials: "include" });
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await res.json();
            return api.auth.me.responses[200].parse(data);
          }
        }
      } catch {
        // Express backend might not be reachable on static hosting
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          return mapSupabaseUserToKhidmatiUser(session.user);
        }
      } catch {
        // Fall through
      }

      return null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      const body = await safeJsonResponse(res, "فشل تسجيل الدخول");

      if (!res.ok) {
        if (res.status === 403 && body?.deleted) {
          const err: any = new Error(body.message || "Account deleted");
          err.deleted = true;
          err.reason = body.reason || "";
          throw err;
        }
        if (res.status === 401) throw new Error(body?.message || "اسم المستخدم أو كلمة المرور غير صحيحة");
        throw new Error(body?.message || "فشل تسجيل الدخول");
      }
      return api.auth.login.responses[200].parse(body);
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);

      // Smart Redirect Logic: Save mode
      localStorage.setItem("app_mode", "client");

      if (data.role === "admin") {
        setLocation("/k-admin-portal-secure");
      } else if (data.role === "provider") {
        setLocation("/provider/dashboard");
      } else {
        setLocation("/");
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser & { providerProfile?: Omit<InsertProviderProfile, "userId"> }) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const errorOrData = await safeJsonResponse(res, "فشل إنشاء الحساب");
      if (!res.ok) {
        throw new Error(errorOrData?.message || "Registration failed");
      }
      return api.auth.register.responses[201].parse(errorOrData);
    },
    onSuccess: () => {
      // Auto login logic usually follows, or redirect to login
      setLocation("/login");
    },
  });

  const completeProfileMutation = useMutation({
    mutationFn: async (data: CompleteProfileRequest) => {
      // 1. Sync with Supabase Auth user_metadata
      try {
        const { data: updateRes, error: updateErr } = await supabase.auth.updateUser({
          data: {
            role: data.role,
            username: data.username,
            phone: data.phone,
            city: data.city,
            serviceCategory: data.serviceCategory,
            yearsOfExperience: data.yearsOfExperience,
            bio: data.bio,
            providerProfile: data.role === "provider" ? {
              serviceCategory: data.serviceCategory,
              yearsOfExperience: data.yearsOfExperience,
              bio: data.bio,
            } : null,
          },
        });
        if (updateRes?.user) {
          const mapped = mapSupabaseUserToKhidmatiUser(updateRes.user);
          if (mapped) {
            queryClient.setQueryData([api.auth.me.path], mapped);
          }
        }
      } catch (sbErr) {
        console.warn("Supabase updateUser warning:", sbErr);
      }

      // 2. Try backend API
      try {
        const res = await fetch(api.auth.completeProfile.path, {
          method: api.auth.completeProfile.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        });
        if (res.ok) {
          return api.auth.completeProfile.responses[200].parse(await res.json());
        }
      } catch {}

      // Fallback
      const current = queryClient.getQueryData<AuthUser | null>([api.auth.me.path]);
      return {
        ...(current || {}),
        role: data.role,
        city: data.city,
        phone: data.phone || null,
      } as any;
    },
    onSuccess: (data: any) => {
      queryClient.setQueryData([api.auth.me.path], data);
      localStorage.setItem("app_mode", data.role === "provider" ? "provider" : "client");
      try {
        localStorage.setItem("khidmati_user_profile", JSON.stringify(data));
      } catch {}
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (data: { reason?: string }) => {
      const res = await fetch(api.account.deleteAccount.path, {
        method: api.account.deleteAccount.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, confirmation: true }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to delete account");
      }
      return api.account.deleteAccount.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      localStorage.removeItem("app_mode");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await supabase.auth.signOut();
      } catch {}
      try {
        await fetch(api.auth.logout.path, {
          method: api.auth.logout.method,
          credentials: "include",
        });
      } catch {}
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      localStorage.removeItem("app_mode");
      setLocation("/login");
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    completeProfile: completeProfileMutation.mutateAsync,
    isCompleting: completeProfileMutation.isPending,
    deleteAccount: deleteAccountMutation.mutateAsync,
    isDeleting: deleteAccountMutation.isPending,
    logout: logoutMutation.mutateAsync,
    logoutMutation,
  };
}
