import { useState, useEffect } from "react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { ProviderCard } from "@/components/ProviderCard";
import { useLanguage } from "@/hooks/use-language";
import { motion } from "framer-motion";
import { Loader2, Navigation, MapPin, Crosshair } from "lucide-react";
import { Skeleton } from "@heroui/react";

interface NearbyProvider {
  id: number;
  fullName: string;
  username: string;
  profileImage: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  distance: number;
  rating: number | null;
  reviewCount: number | null;
  profile: {
    serviceCategory: string;
    bio: string | null;
    yearsOfExperience: number;
    citiesServed: string[];
    isVerified: boolean;
    completedBookings: number;
  } | null;
}

const RADII = [5, 10, 25, 50];

export function NearbySearch() {
  const { language } = useLanguage();
  const geo = useGeolocation();
  const [radius, setRadius] = useState(10);
  const [category, setCategory] = useState("");
  const [providers, setProviders] = useState<NearbyProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/service-categories")
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setCategories([]);
        }
      })
      .catch(() => setCategories([]));
  }, []);

  const searchNearby = async () => {
    if (!geo.latitude || !geo.longitude) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({
        lat: geo.latitude.toString(),
        lng: geo.longitude.toString(),
        radius: radius.toString(),
      });
      if (category) params.set("category", category);

      const res = await fetch(`/api/providers/nearby?${params}`);
      const data = await res.json();
      setProviders(data);
    } catch (err) {
      console.error("Nearby search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    if (geo.latitude && geo.longitude) {
      searchNearby();
    }
  };

  const catOptions = categories.map((cat: any) => ({
    value: cat.nameEn,
    label: language === "ar" ? cat.nameAr : language === "fr" ? cat.nameFr : cat.nameEn,
  }));

  return (
    <div className="space-y-6">
      {/* Location status */}
      <div className="glass-dark p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${geo.loading ? "bg-amber-500/20" : geo.latitude ? "bg-emerald-500/20" : "bg-zinc-100 dark:bg-white/10"}`}>
            {geo.loading ? (
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            ) : geo.latitude ? (
              <Crosshair className="w-5 h-5 text-emerald-400" />
            ) : (
              <Navigation className="w-5 h-5 text-zinc-400 dark:text-white/40" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              {geo.loading
                ? (language === "ar" ? "جاري تحديد موقعك..." : language === "fr" ? "Localisation en cours..." : "Getting your location...")
                : geo.error
                ? geo.error
                : geo.latitude
                ? (language === "ar" ? "تم تحديد موقعك" : language === "fr" ? "Position trouvée" : "Location found")
                : (language === "ar" ? "لم يتم تحديد الموقع بعد" : language === "fr" ? "Position non définie" : "Location not set yet")}
            </p>
            {geo.latitude !== null && geo.longitude !== null && (
              <p className="text-xs text-zinc-500 dark:text-white/40">
                {geo.latitude.toFixed(4)}, {geo.longitude.toFixed(4)}
              </p>
            )}
            {geo.error && (
              <p className="text-xs text-red-400 mt-1">{geo.error}</p>
            )}
          </div>
        </div>

        {/* Radius selector */}
        <div>
          <p className="text-xs text-zinc-500 dark:text-white/50 mb-2 font-medium">
            {language === "ar" ? "نطاق البحث" : language === "fr" ? "Rayon de recherche" : "Search radius"}
          </p>
          <div className="flex gap-2">
            {RADII.map(r => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`flex-1 h-9 rounded-xl text-sm font-medium transition-all ${
                  radius === r
                    ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                    : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-white/60 border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/20"
                }`}
              >
                {r} {language === "ar" ? "كم" : "km"}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter */}
        <div>
          <p className="text-xs text-zinc-500 dark:text-white/50 mb-2 font-medium">
            {language === "ar" ? "الفئة" : language === "fr" ? "Catégorie" : "Category"}
          </p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-10 rounded-xl bg-white border border-zinc-200 text-zinc-900 dark:bg-white/10 dark:border-white/10 dark:text-white/80 text-sm px-3 focus:outline-none focus:border-cyan-400"
          >
            <option value="">
              {language === "ar" ? "كل الفئات" : language === "fr" ? "Toutes les catégories" : "All categories"}
            </option>
            {catOptions.map(c => (
              <option key={c.value} value={c.value} className="text-black">{c.label}</option>
            ))}
          </select>
        </div>

        {/* Search button */}
        <button
          onClick={requestLocation}
          disabled={geo.loading || !geo.latitude}
          className="w-full h-11 rounded-xl font-bold text-sm transition-all bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          {language === "ar" ? "البحث بالقرب مني" : language === "fr" ? "Rechercher à proximité" : "Search near me"}
        </button>
      </div>

      {/* Results */}
      {searched && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border border-border bg-white p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-14 h-14 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : providers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: "rgba(0,188,212,0.08)" }}>
                <MapPin className="w-10 h-10 text-cyan-400 opacity-60" />
              </div>
              <h3 className="text-xl font-bold mb-1">
                {language === "ar" ? "لا يوجد حرفيون قريبون" : language === "fr" ? "Aucun professionnel à proximité" : "No nearby professionals"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "جرّب زيادة نطاق البحث" : language === "fr" ? "Essayez d'élargir le rayon" : "Try increasing search radius"}
              </p>
            </motion.div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground font-medium">
                {providers.length}{" "}
                {language === "ar" ? "حرفي قريب منك" : language === "fr" ? "professionnels près de chez vous" : "professionals near you"}
              </p>

              {/* Mini CSS Map */}
              <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: "radial-gradient(circle at 20% 50%, rgba(0,188,212,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(14,165,233,0.2) 0%, transparent 50%)",
                }} />
                <div className="absolute inset-0" style={{
                  backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(255,255,255,0.03) 19px, rgba(255,255,255,0.03) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(255,255,255,0.03) 19px, rgba(255,255,255,0.03) 20px)",
                }} />
                <div className="absolute inset-0 p-4">
                  <div className="relative w-full h-full">
                    {providers.slice(0, 20).map((p, i) => {
                      if (!p.latitude || !p.longitude || !geo.latitude || !geo.longitude) return null;
                      const dLat = p.latitude - geo.latitude;
                      const dLng = p.longitude - geo.longitude;
                      const maxSpan = Math.max(Math.abs(dLat), Math.abs(dLng), 0.01);
                      const x = 50 + (dLng / maxSpan) * 40;
                      const y = 50 - (dLat / maxSpan) * 40;
                      return (
                        <div
                          key={p.id}
                          className="absolute w-3 h-3 rounded-full border-2 border-white shadow-lg transition-transform hover:scale-150"
                          style={{
                            left: `${Math.max(2, Math.min(98, x))}%`,
                            top: `${Math.max(2, Math.min(98, y))}%`,
                            background: "linear-gradient(135deg, #00bcd4, #0ea5e9)",
                          }}
                          title={`${p.fullName} - ${p.distance} كم`}
                        />
                      );
                    })}
                    {/* User dot */}
                    <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg z-10" style={{
                      left: "50%",
                      top: "50%",
                      background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                      transform: "translate(-50%, -50%)",
                      boxShadow: "0 0 12px rgba(239,68,68,0.5)",
                    }} />
                  </div>
                </div>
                <div className="absolute bottom-2 right-3 text-[10px] text-white/30 font-medium">
                  {language === "ar" ? "أنت" : language === "fr" ? "Vous" : "You"}
                </div>
              </div>

              {/* Results grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {providers.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <ProviderCard provider={p} distance={p.distance} />
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Initial state */}
      {!searched && !geo.loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6" style={{ background: "rgba(0,188,212,0.08)" }}>
            <Navigation className="w-12 h-12 text-cyan-400 opacity-60" />
          </div>
          <h3 className="text-xl font-bold mb-2">
            {language === "ar" ? "ابحث عن حرفيين بالقرب منك" : language === "fr" ? "Trouvez des professionnels près de chez vous" : "Find professionals near you"}
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {language === "ar" ? "استخدم موقعك للعثور على أفضل الحرفيين المتاحين في منطقتك" : language === "fr" ? "Utilisez votre position pour trouver les meilleurs professionnels disponibles dans votre région" : "Use your location to find the best available professionals in your area"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
