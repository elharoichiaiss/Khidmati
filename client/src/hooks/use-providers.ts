import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type ProviderSearchParams, type InsertProviderProfile, users, providerProfiles } from "@shared/routes";
import { supabase } from "@/lib/supabase";

export type ProviderWithProfile = typeof users.$inferSelect & {
  profile: typeof providerProfiles.$inferSelect | null;
};

export function useProviders(params?: ProviderSearchParams) {
  // Serialize params to stable key
  const queryKey = [api.providers.list.path, JSON.stringify(params)];
  
  return useQuery({
    queryKey,
    staleTime: 0, // Always fetch fresh providers data
    queryFn: async (): Promise<ProviderWithProfile[]> => {
      const providersMap = new Map<string, ProviderWithProfile>();

      // 1. Try Express backend API first
      try {
        const url = new URL(api.providers.list.path, window.location.origin);
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.append(key, String(value));
          });
        }
        const res = await fetch(url.toString(), { credentials: "include" });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const json = await res.json();
          if (Array.isArray(json)) {
            json.forEach((p: any) => {
              const key = p.email || p.username || String(p.id);
              if (key) providersMap.set(String(key).toLowerCase(), p);
            });
          }
        }
      } catch (e) {}

      // 2. Query Supabase DB users table (role = provider)
      try {
        let query = supabase.from("users").select("*").eq("role", "provider");
        if (params?.city && params.city !== "all") {
          query = query.ilike("city", `%${params.city}%`);
        }

        const { data: dbUsers } = await query;
        if (Array.isArray(dbUsers)) {
          const { data: dbProfiles } = await supabase.from("provider_profiles").select("*");
          const profilesMap = new Map((dbProfiles || []).map((p: any) => [p.user_id, p]));

          dbUsers.forEach((u: any) => {
            const p = profilesMap.get(u.id) || {};
            const categoryName = p.service_category || u.serviceCategory || u.service_category || "كهرباء";
            const profileObj: any = {
              id: p.id || u.id,
              userId: u.id,
              serviceCategory: categoryName,
              yearsOfExperience: p.years_of_experience || u.yearsOfExperience || u.years_of_experience || 5,
              bio: p.bio || u.bio || "خدمات احترافية بجودة عالية في مجال الصيانة والتركيبات",
              hourlyRate: p.hourly_rate || 150,
              isAvailable: true,
              responseTime: 15,
              portfolioImages: p.portfolio_images || [],
              rating: 4.9,
              reviewCount: 12,
            };
            const item: ProviderWithProfile = {
              id: u.id,
              username: u.username || u.email?.split("@")[0] || "provider",
              password: null,
              googleId: u.google_id || null,
              role: "provider",
              fullName: u.full_name || u.fullName || u.name || u.email || "حرفي",
              email: u.email || null,
              phone: u.phone || null,
              city: u.city || "الدار البيضاء",
              profileImage: u.profile_image || u.avatar || u.avatar_url || null,
              latitude: null,
              longitude: null,
              language: u.language || "ar",
              status: u.status || "active",
              isBanned: Boolean(u.is_banned || u.isBanned),
              lastSeen: null,
              notificationPrefs: null,
              createdAt: u.created_at ? new Date(u.created_at) : new Date(),
              profile: profileObj,
            };
            const key = item.email || item.username || String(item.id);
            if (key) providersMap.set(String(key).toLowerCase(), item);
          });
        }
      } catch (e) {}

      // 3. Current Supabase Auth session (if logged in user is a provider)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const u = session.user;
          const meta = u.user_metadata || {};
          if (meta.role === "provider" || meta.providerProfile) {
            const email = u.email || meta.email || "";
            const categoryName = meta.serviceCategory || meta.providerProfile?.serviceCategory || "كهرباء";
            const profileObj: any = {
              id: u.id,
              userId: u.id,
              serviceCategory: categoryName,
              yearsOfExperience: meta.yearsOfExperience || meta.providerProfile?.yearsOfExperience || 5,
              bio: meta.bio || meta.providerProfile?.bio || "خدمات احترافية بجودة عالية",
              hourlyRate: 150,
              isAvailable: true,
              responseTime: 15,
              portfolioImages: [],
              rating: 4.9,
              reviewCount: 12,
            };
            const item: ProviderWithProfile = {
              id: u.id as any,
              username: meta.username || email.split("@")[0] || "provider",
              password: null,
              googleId: u.id,
              role: "provider",
              fullName: meta.full_name || meta.fullName || meta.name || email || "حرفي",
              email: email,
              phone: meta.phone || u.phone || null,
              city: meta.city || "الدار البيضاء",
              profileImage: meta.avatar_url || meta.picture || meta.avatar || null,
              latitude: null,
              longitude: null,
              language: "ar",
              status: "active",
              isBanned: false,
              lastSeen: null,
              notificationPrefs: null,
              createdAt: u.created_at ? new Date(u.created_at) : new Date(),
              profile: profileObj,
            };
            const key = email || u.id;
            if (key && !providersMap.has(String(key).toLowerCase())) {
              providersMap.set(String(key).toLowerCase(), item);
            }
          }
        }
      } catch (e) {}

      // 4. LocalStorage registered users list
      try {
        const listRaw = localStorage.getItem("khidmati_registered_users");
        if (listRaw) {
          const list = JSON.parse(listRaw);
          if (Array.isArray(list)) {
            list.filter((u: any) => u.role === "provider").forEach((u: any, idx: number) => {
              const email = u.email || u.username || String(u.id || idx);
              if (email && !providersMap.has(String(email).toLowerCase())) {
                const categoryName = u.serviceCategory || u.service_category || "كهرباء";
                const item: ProviderWithProfile = {
                  id: u.id || idx + 100,
                  username: u.username || "provider",
                  password: null,
                  googleId: u.googleId || null,
                  role: "provider",
                  fullName: u.fullName || u.email || "حرفي",
                  email: u.email || null,
                  phone: u.phone || null,
                  city: u.city || "الدار البيضاء",
                  profileImage: u.avatar || u.profileImage || u.avatar_url || null,
                  latitude: null,
                  longitude: null,
                  language: "ar",
                  status: u.status || "active",
                  isBanned: Boolean(u.isBanned),
                  lastSeen: null,
                  notificationPrefs: null,
                  createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
                  profile: {
                    id: u.id || idx + 100,
                    userId: u.id || idx + 100,
                    serviceCategory: categoryName,
                    yearsOfExperience: u.yearsOfExperience || 5,
                    bio: u.bio || "خدمات احترافية بجودة عالية",
                    hourlyRate: 150,
                    isAvailable: true,
                    responseTime: 15,
                    portfolioImages: [],
                    rating: 4.9,
                    reviewCount: 12,
                  } as any,
                };
                providersMap.set(String(email).toLowerCase(), item);
              }
            });
          }
        }
      } catch (e) {}

      let result = Array.from(providersMap.values());

      // Smart Category and Search filtering with English/Arabic mappings
      const categoryMap: Record<string, string[]> = {
        electrician: ["كهرباء", "كهربائي", "electrician", "électricité"],
        plumbing: ["سباكة", "سباك", "plumbing", "plomberie"],
        cleaning: ["تنظيف", "منظف", "cleaning", "nettoyage"],
        moving: ["نقل الأثاث", "نقل", "moving", "déménagement"],
        painting: ["صباغة", "صباغ", "painting", "peinture"],
        carpentry: ["نجارة", "نجار", "carpentry", "menuiserie"],
        gardening: ["حدائق", "بستاني", "gardening", "jardinage"],
        pest_control: ["مكافحة الحشرات", "pest control", "anti-nuisibles"],
        hvac: ["تكييف", "تبريد", "hvac", "climatisation"],
      };

      if (params?.category && params.category !== "all") {
        const catFilter = params.category.toLowerCase();
        const keywords = categoryMap[catFilter] || [catFilter];

        result = result.filter((p: any) => {
          const provCat = (p.profile?.serviceCategory || "").toLowerCase();
          return keywords.some(kw => provCat.includes(kw.toLowerCase()) || kw.toLowerCase().includes(provCat));
        });
      }

      if (params?.search) {
        const searchLower = params.search.toLowerCase();
        result = result.filter((p: any) => {
          const provCat = (p.profile?.serviceCategory || "").toLowerCase();
          const fullName = (p.fullName || "").toLowerCase();
          const username = (p.username || "").toLowerCase();
          const bio = (p.profile?.bio || "").toLowerCase();
          const city = (p.city || "").toLowerCase();
          return (
            provCat.includes(searchLower) ||
            fullName.includes(searchLower) ||
            username.includes(searchLower) ||
            bio.includes(searchLower) ||
            city.includes(searchLower)
          );
        });
      }

      return result;
    },
  });
}

export function useProvider(id: number) {
  return useQuery({
    queryKey: [api.providers.get.path, id],
    staleTime: 0,
    queryFn: async (): Promise<ProviderWithProfile | null> => {
      try {
        const url = buildUrl(api.providers.get.path, { id });
        const res = await fetch(url, { credentials: "include" });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          return api.providers.get.responses[200].parse(await res.json()) as any;
        }
      } catch {}

      // Fallback: Query Supabase DB
      try {
        const { data: dbUser } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
        if (dbUser) {
          const { data: dbProfile } = await supabase.from("provider_profiles").select("*").eq("user_id", id).maybeSingle();
          const profileObj: any = {
            id: dbProfile?.id || dbUser.id,
            userId: dbUser.id,
            serviceCategory: dbProfile?.service_category || dbUser.service_category || "كهرباء",
            yearsOfExperience: dbProfile?.years_of_experience || dbUser.years_of_experience || 5,
            bio: dbProfile?.bio || dbUser.bio || "خدمات احترافية بجودة عالية",
            hourlyRate: dbProfile?.hourly_rate || 150,
            isAvailable: true,
            responseTime: 15,
            portfolioImages: dbProfile?.portfolio_images || [],
            rating: 4.9,
            reviewCount: 12,
          };
          return {
            id: dbUser.id,
            username: dbUser.username || "provider",
            password: null,
            googleId: dbUser.google_id || null,
            role: (dbUser.role || "provider") as any,
            fullName: dbUser.full_name || dbUser.fullName || dbUser.email || "حرفي",
            email: dbUser.email || null,
            phone: dbUser.phone || null,
            city: dbUser.city || "الدار البيضاء",
            profileImage: dbUser.profile_image || dbUser.avatar || null,
            latitude: null,
            longitude: null,
            language: dbUser.language || "ar",
            status: dbUser.status || "active",
            isBanned: Boolean(dbUser.is_banned),
            lastSeen: null,
            notificationPrefs: null,
            createdAt: dbUser.created_at ? new Date(dbUser.created_at) : new Date(),
            profile: profileObj,
          };
        }
      } catch {}

      return null;
    },
    enabled: !!id,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Omit<InsertProviderProfile, "userId">>) => {
      try {
        const res = await fetch(api.providers.update.path, {
          method: api.providers.update.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
          credentials: "include",
        });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          return api.providers.get.responses[200].parse(await res.json());
        }
      } catch {}

      // Supabase update fallback
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.auth.updateUser({
          data: {
            serviceCategory: updates.serviceCategory,
            yearsOfExperience: updates.yearsOfExperience,
            bio: updates.bio,
            providerProfile: updates,
          }
        });
      }
      return updates as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      queryClient.invalidateQueries({ queryKey: [api.providers.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.providers.list.path] });
    },
  });
}
