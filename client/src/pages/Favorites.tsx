import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { ProviderCard } from "@/components/ProviderCard";
import { Loader2, Heart } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import type { Favorite, User, ProviderProfile } from "@shared/schema";

type FavoriteWithProvider = Favorite & {
    provider: User & { profile: ProviderProfile }
};

export default function Favorites() {
    const { t } = useLanguage();
    const { data: favorites, isLoading } = useQuery<FavoriteWithProvider[]>({
        queryKey: ["/api/favorites"],
    });

    return (
        <Layout>
            <div className="bg-slate-50 dark:bg-slate-900 min-h-screen py-12">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-3 mb-8">
                        <Heart className="w-8 h-8 text-red-500 fill-current" />
                        <h1 className="text-3xl font-display font-bold">{t("myFavorites")}</h1>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : favorites?.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <Heart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-slate-600 dark:text-slate-300">{t("noFavorites")}</h2>
                            <p className="text-slate-400">{t("noFavoritesDesc")}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {favorites?.map((fav) => (
                                <ProviderCard key={fav.id} provider={fav.provider} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
