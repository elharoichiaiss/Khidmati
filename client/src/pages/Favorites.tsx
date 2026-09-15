import { Layout } from "@/components/Layout";
import { useAuth, resolveCurrentNumericUserId } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProviderCard } from "@/components/ProviderCard";
import { Heart, Search, X, Grid3X3, List, ArrowUpDown } from "lucide-react";
import { Button, Input, Skeleton } from "@heroui/react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { User, ProviderProfile, Favorite } from "@shared/schema";
import { supabase } from "@/lib/supabase";

type FavoriteWithProvider = Favorite & {
  provider: User & { profile: ProviderProfile };
};

type SortMode = "date" | "rating" | "name";

export default function FavoritesPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<SortMode>("date");

  const { data: favorites, isLoading } = useQuery<FavoriteWithProvider[]>({
    queryKey: ["/api/favorites", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FavoriteWithProvider[]> => {
      try {
        const res = await fetch("/api/favorites", { credentials: "include" });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const json = await res.json();
          if (Array.isArray(json)) return json;
        }
      } catch (e) {}

      // Supabase fallback
      try {
        const clientNumericId = await resolveCurrentNumericUserId(user);
        const { data: favRows } = await supabase
          .from("favorites")
          .select("*")
          .eq("client_id", clientNumericId)
          .order("created_at", { ascending: false });

        if (!Array.isArray(favRows) || favRows.length === 0) return [];

        const providerIds = favRows.map((f: any) => f.provider_id);
        const { data: provUsers } = await supabase.from("users").select("*").in("id", providerIds);
        const { data: provProfiles } = await supabase.from("provider_profiles").select("*").in("user_id", providerIds);

        const usersMap = new Map((provUsers || []).map((u: any) => [u.id, u]));
        const profilesMap = new Map((provProfiles || []).map((p: any) => [p.user_id, p]));

        return favRows.map((f: any) => {
          const u: any = usersMap.get(f.provider_id) || {};
          const p: any = profilesMap.get(f.provider_id) || {};
          return {
            id: f.id,
            clientId: f.client_id,
            providerId: f.provider_id,
            createdAt: f.created_at,
            provider: {
              id: u.id || f.provider_id,
              fullName: u.full_name || u.fullName || u.username || "حرفي",
              username: u.username || "provider",
              email: u.email || null,
              phone: u.phone || null,
              city: u.city || "الدار البيضاء",
              profileImage: u.profile_image || u.avatar || null,
              role: "provider",
              status: "active",
              isBanned: false,
              isVerified: true,
              profile: {
                id: p.id || f.provider_id,
                userId: f.provider_id,
                serviceCategory: p.service_category || "صيانة",
                yearsOfExperience: p.years_of_experience || 5,
                bio: p.bio || "",
                hourlyRate: p.hourly_rate || 100,
                rating: 5,
                reviewCount: 1,
              } as any,
            } as any,
          };
        });
      } catch (e) {
        return [];
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (providerId: number) => {
      try {
        const res = await fetch(`/api/favorites/${providerId}`, { method: "POST", credentials: "include" });
        if (res.ok) return;
      } catch (e) {}

      const clientNumericId = await resolveCurrentNumericUserId(user);
      await supabase.from("favorites").delete().eq("client_id", clientNumericId).eq("provider_id", providerId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/favorites"] }),
  });

  const sorted = useMemo(() => {
    if (!favorites) return [];
    let list = [...favorites];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => {
        const p = f.provider;
        return (
          p.fullName?.toLowerCase().includes(q) ||
          p.profile?.serviceCategory?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q)
        );
      });
    }
    switch (sort) {
      case "rating":
        list.sort((a, b) => ((b.provider as any).rating || 0) - ((a.provider as any).rating || 0));
        break;
      case "name":
        list.sort((a, b) => (a.provider.fullName || "").localeCompare(b.provider.fullName || ""));
        break;
      default:
        list.sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
    }
    return list;
  }, [favorites, search, sort]);

  if (!user) return null;

  return (
    <Layout>
      <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
        <div className="container mx-auto px-4 max-w-5xl pb-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3.5 bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl">
                <Heart className="w-7 h-7 fill-current" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("myFavorites")}</h1>
                {favorites && (
                  <span className="text-xs font-bold text-zinc-400">{favorites.length} {language === "ar" ? "مزوّد" : "providers"}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Input
              className="w-full sm:max-w-xs"
              placeholder={t("searchFavorites")}
              startContent={<Search className="w-4 h-4 text-zinc-400" />}
              value={search}
              onValueChange={setSearch}
              variant="bordered"
              radius="lg"
              size="md"
              classNames={{
                inputWrapper: "h-12 rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-sm",
                input: "text-sm font-medium"
              }}
            />
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1">
              <button onClick={() => setViewMode("grid")} className={cn("p-2 rounded-xl transition-all", viewMode === "grid" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={cn("p-2 rounded-xl transition-all", viewMode === "list" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}>
                <List className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-zinc-400" />
              <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-sm font-bold text-zinc-900 dark:text-white outline-none cursor-pointer">
                <option value="date">{t("dateAdded")}</option>
                <option value="rating">{t("rating")}</option>
                <option value="name">{t("name")}</option>
              </select>
            </div>
          </div>

          {isLoading && (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6" style={{ borderRadius: "28px" }}>
                  <Skeleton className={cn(viewMode === "grid" ? "h-48 w-full mb-4 rounded-xl" : "w-14 h-14 rounded-2xl")} />
                  <div className="space-y-2 flex-1"><Skeleton className="h-4 w-40 rounded-lg" /><Skeleton className="h-3 w-24 rounded-lg" /></div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && sorted.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-zinc-400" />
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2">{t("noFavorites")}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-6">{t("noFavoritesDesc")}</p>
              <Button onPress={() => setLocation("/search")} className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-6 h-12 shadow-sm" style={{ borderRadius: "16px" }}>
                {t("browseProviders")}
              </Button>
            </div>
          )}

          {!isLoading && sorted.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sorted.map((fav) => (
                <div key={fav.id} className="relative group">
                  <ProviderCard provider={fav.provider} />
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeMutation.mutate(fav.providerId); }} className="absolute top-3 right-3 z-10 w-10 h-10 rounded-xl bg-white/90 dark:bg-zinc-900/90 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isLoading && sorted.length > 0 && viewMode === "list" && (
            <div className="space-y-3">
              {sorted.map((fav) => {
                const p = fav.provider;
                const img = p.profileImage?.startsWith("http") ? p.profileImage : p.profileImage ? `/objects/${p.profileImage}` : null;
                return (
                  <div key={fav.id} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-5 flex items-center gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:scale-[1.01] transition-transform cursor-pointer" style={{ borderRadius: "28px" }} onClick={() => setLocation(`/providers/${p.id}`)}>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg flex-shrink-0 overflow-hidden">
                      {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : (p.fullName || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">{p.fullName}</h3>
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">{p.profile?.serviceCategory || p.city || t("professional")}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {(p as any).rating && <span className="text-sm font-black text-amber-500">{(p as any).rating}</span>}
                      <button onClick={(e) => { e.stopPropagation(); removeMutation.mutate(fav.providerId); }} className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                        <Heart className="w-4 h-4 text-red-500 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
