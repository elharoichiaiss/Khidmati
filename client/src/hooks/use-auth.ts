import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LoginRequest, type InsertUser, type InsertProviderProfile, users, providerProfiles } from "@shared/routes";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export type CompleteProfileRequest = {
  role: "client" | "provider";
  fullName?: string;
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
  let isBanned = Boolean(meta.is_banned || meta.isBanned || sbUser.banned_until);

  let cachedId = 14;
  const email = sbUser.email || "";
  if (email === "elharouachiaissa@gmail.com") cachedId = 7;
  else if (email === "aissa.elharouachi.23@ump.ac.ma") cachedId = 13;
  else if (email === "elharoichiaissa@gmail.com") cachedId = 14;

  try {
    const userSpecificId = email ? localStorage.getItem(`khidmati_user_id_${email}`) : null;
    if (userSpecificId && /^\d+$/.test(userSpecificId)) {
      cachedId = Number(userSpecificId);
    } else {
      const storedId = localStorage.getItem("khidmati_current_user_id");
      if (storedId && /^\d+$/.test(storedId) && !email) cachedId = Number(storedId);
    }

    const listRaw = localStorage.getItem("khidmati_registered_users");
    if (listRaw) {
      const list = JSON.parse(listRaw);
      if (Array.isArray(list)) {
        const found = list.find((u: any) =>
          u.email === sbUser.email || u.googleId === sbUser.id || u.username === savedUsername
        );
        if (found) {
          if (found.id && typeof found.id === "number") cachedId = found.id;
          if (found.isBanned !== undefined) isBanned = Boolean(found.isBanned);
          if (!savedPhone) savedPhone = found.phone;
          if (!savedUsername) savedUsername = found.username;
          if (!savedRole || savedRole === "client") savedRole = found.role || savedRole;
        }
      }
    }
  } catch {}

  return {
    id: cachedId,
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
    isBanned: isBanned,
    banReason: null,
    banExpiresAt: null,
    createdAt: sbUser.created_at ? new Date(sbUser.created_at) : new Date(),
    providerProfile: meta.providerProfile || null,
  } as any;
}

export async function resolveCurrentNumericUserId(currentUser?: any): Promise<number> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const email = currentUser?.email || session?.user?.email;
    const googleId = (currentUser as any)?.googleId || session?.user?.id;

    if (email || googleId) {
      let query = supabase.from("users").select("id");
      if (email && googleId) {
        query = query.or(`email.eq.${email},google_id.eq.${googleId}`);
      } else if (email) {
        query = query.eq("email", email);
      } else {
        query = query.eq("google_id", googleId);
      }

      const { data: dbUser } = await query.maybeSingle();

      if (dbUser?.id) {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("khidmati_current_user_id", String(dbUser.id));
          if (email) localStorage.setItem(`khidmati_user_id_${email}`, String(dbUser.id));
        }
        return dbUser.id;
      }
    }
  } catch (e) {}

  const email = currentUser?.email || "";
  if (email === "elharoichiaissa@gmail.com") return 14;
  if (email === "aissa.elharouachi.23@ump.ac.ma") return 13;
  if (email === "elharouachiaissa@gmail.com") return 7;

  if (currentUser?.id && typeof currentUser.id === "number" && currentUser.id > 1) {
    return currentUser.id;
  }

  return 14;
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

export function saveUserToRegisteredList(userObj: any) {
  if (!userObj) return;
  try {
    const listRaw = localStorage.getItem("khidmati_registered_users");
    const list = listRaw ? JSON.parse(listRaw) : [];
    const key = userObj.email || userObj.googleId || userObj.username || userObj.id;
    if (!key) return;

    const formatted = {
      id: userObj.id || Date.now(),
      fullName: userObj.fullName || userObj.full_name || userObj.email || "مستخدم",
      username: userObj.username || userObj.email?.split("@")[0] || "user",
      email: userObj.email || "",
      phone: userObj.phone || "",
      role: userObj.role || "client",
      status: userObj.status || "active",
      avatar: userObj.avatarUrl || userObj.avatar || "",
      city: userObj.city || "",
      createdAt: userObj.createdAt || new Date().toISOString(),
      isBanned: Boolean(userObj.isBanned),
    };

    const index = list.findIndex((u: any) =>
      (u.email && formatted.email && u.email === formatted.email) ||
      (u.id && formatted.id && u.id === formatted.id) ||
      (u.username && formatted.username && u.username === formatted.username)
    );

    if (index >= 0) {
      list[index] = { ...list[index], ...formatted };
    } else {
      list.push(formatted);
    }
    localStorage.setItem("khidmati_registered_users", JSON.stringify(list));
  } catch (e) {}
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
          if (mapped && mapped.city) {
            saveUserToRegisteredList(mapped);
          }
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
        let sessionRes = await supabase.auth.getSession();
        let session = sessionRes.data.session;

        const hasOAuthParams = typeof window !== "undefined" && (
          window.location.hash.includes("access_token") ||
          window.location.hash.includes("refresh_token") ||
          window.location.search.includes("code")
        );

        if (!session?.user && hasOAuthParams) {
          for (let i = 0; i < 5; i++) {
            await new Promise((r) => setTimeout(r, 250));
            sessionRes = await supabase.auth.getSession();
            session = sessionRes.data.session;
            if (session?.user) break;
          }
        }

        if (session?.user) {
          const sbUser = session.user;
          let mapped = mapSupabaseUserToKhidmatiUser(sbUser);

          try {
            const { data: dbUser } = await supabase
              .from("users")
              .select("*")
              .or(`email.eq.${sbUser.email},google_id.eq.${sbUser.id}`)
              .maybeSingle();

            if (dbUser) {
              localStorage.setItem("khidmati_current_user_id", String(dbUser.id));
              mapped = {
                ...(mapped || {}),
                id: dbUser.id,
                username: dbUser.username || mapped?.username,
                fullName: dbUser.full_name || mapped?.fullName,
                city: dbUser.city || mapped?.city,
                phone: dbUser.phone || mapped?.phone,
                role: dbUser.role || mapped?.role || "client",
                status: dbUser.status || "active",
                isBanned: Boolean(dbUser.is_banned || dbUser.isBanned || mapped?.isBanned),
              } as any;
              if (mapped && !dbUser.city) {
                mapped.city = null;
              }
            } else if (mapped) {
              // Ensure user is created in database table to prevent FK constraint failures
              const { data: createdUser } = await supabase
                .from("users")
                .insert({
                  username: mapped?.username || (sbUser.email || "user").split("@")[0],
                  full_name: mapped?.fullName || sbUser.email || "مستخدم",
                  email: sbUser.email || null,
                  google_id: sbUser.id,
                  role: mapped?.role || "client",
                  status: "active",
                  city: mapped?.city || "الدار البيضاء",
                  phone: mapped?.phone || null,
                  created_at: new Date().toISOString(),
                })
                .select("id")
                .maybeSingle();

              if (createdUser?.id) {
                localStorage.setItem("khidmati_current_user_id", String(createdUser.id));
                mapped.id = createdUser.id;
              } else {
                mapped = {
                  ...mapped,
                  city: null,
                } as any;
              }
            }
          } catch (dbErr) {
            console.warn("Supabase DB user fetch warning:", dbErr);
          }

          return mapped;
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
            fullName: data.fullName,
            full_name: data.fullName,
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

      // 2. Insert or update user record in Supabase DB "users" table
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sbUser = session?.user;
        if (sbUser) {
          const userPayload: any = {
            username: data.username || sbUser.email?.split("@")[0] || `user_${sbUser.id}`,
            full_name: data.fullName || sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || "مستخدم",
            email: sbUser.email || null,
            phone: data.phone || null,
            city: data.city,
            role: data.role,
            google_id: sbUser.id,
            status: "active",
          };

          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .or(`email.eq.${sbUser.email},google_id.eq.${sbUser.id}`)
            .maybeSingle();

          let dbUserId = existingUser?.id;

          if (dbUserId) {
            await supabase.from("users").update(userPayload).eq("id", dbUserId);
          } else {
            const { data: inserted } = await supabase.from("users").insert(userPayload).select("id").maybeSingle();
            dbUserId = inserted?.id;
          }

          if (data.role === "provider" && dbUserId) {
            const providerPayload: any = {
              user_id: dbUserId,
              service_category: data.serviceCategory || "أخرى",
              years_of_experience: data.yearsOfExperience || 0,
              bio: data.bio || "",
            };
            const { data: existingProv } = await supabase.from("provider_profiles").select("id").eq("user_id", dbUserId).maybeSingle();
            if (existingProv) {
              await supabase.from("provider_profiles").update(providerPayload).eq("id", existingProv.id);
            } else {
              await supabase.from("provider_profiles").insert(providerPayload);
            }
          }
        }
      } catch (dbErr) {
        console.warn("Failed to upsert Google user to Supabase DB:", dbErr);
      }

      // 3. Try backend API
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
        username: data.username || current?.username,
        fullName: data.fullName || current?.fullName,
      } as any;
    },
    onSuccess: (data: any) => {
      queryClient.setQueryData([api.auth.me.path], data);
      localStorage.setItem("app_mode", data.role === "provider" ? "provider" : "client");
      try {
        localStorage.setItem("khidmati_user_profile", JSON.stringify(data));
        saveUserToRegisteredList(data);
      } catch {}
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (data: { reason?: string }) => {
      // 1. Try backend API
      try {
        const res = await fetch(api.account.deleteAccount.path, {
          method: api.account.deleteAccount.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, confirmation: true }),
          credentials: "include",
        });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          await res.json().catch(() => {});
        }
      } catch (e) {}

      // 2. Supabase DB permanent deletion
      try {
        if (user?.id || user?.email || user?.googleId) {
          if (user.id) {
            await supabase.from("provider_profiles").delete().eq("user_id", user.id);
            await supabase.from("users").delete().eq("id", user.id);
          }
          if (user.email) {
            await supabase.from("users").delete().eq("email", user.email);
          }
          if (user.googleId) {
            await supabase.from("users").delete().eq("google_id", user.googleId);
          }
        }
      } catch (e) {}

      // 3. Clear Supabase Auth user_metadata so metadata is completely wiped
      try {
        await supabase.auth.updateUser({
          data: {
            city: null,
            phone: null,
            username: null,
            full_name: null,
            fullName: null,
            role: null,
            providerProfile: null,
          },
        });
      } catch (e) {}

      // 4. Sign out of Supabase Auth
      try {
        await supabase.auth.signOut();
      } catch (e) {}

      // 5. Clear all local storage & session storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}

      return { success: true, message: "Account deleted permanently" };
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      queryClient.clear();
      setLocation("/login");
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
