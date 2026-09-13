import { Layout } from "@/components/Layout";
import { useProviders } from "@/hooks/use-providers";
import { ProviderCard } from "@/components/ProviderCard";

import { Button, Card, CardBody, Chip, Input, Select, SelectItem, Skeleton } from "@heroui/react";
import { Search as SearchIcon, LayoutList, Map, Navigation, SlidersHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MOROCCAN_CITIES } from "@shared/constants";
import { FR_COMMON } from "@shared/fr";
import { useLanguage } from "@/hooks/use-language";
import { MapSearch } from "@/components/MapSearch";
import { NearbySearch } from "@/components/search/NearbySearch";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";


const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function SearchPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery    = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "";
  const initialCity     = searchParams.get("city") || "";
  const { t, language } = useLanguage();

  const [query, setQuery]       = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [city, setCity]         = useState(initialCity);
  const [view, setView]         = useState<"list" | "map" | "nearby">("list");

  // Fetch categories with caching
  const { data: categoriesData = [], isLoading: catLoading } = useQuery<any[]>({
    queryKey: ["/api/service-categories"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category && category !== "all") params.set("category", category);
    if (city && city !== "all") params.set("city", city);
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [query, category, city]);


  const { data: providers, isLoading } = useProviders({
    search:   query || undefined,
    category: (category === "all" || !category) ? undefined : category,
    city:     (city    === "all" || !city)       ? undefined : city,
  });

  const catOptions = catLoading ? [] : categoriesData.map((cat: any) => ({

    value: cat.nameEn,
    label: language === "ar" ? cat.nameAr : language === "fr" ? cat.nameFr : cat.nameEn,
  }));

  const cities = MOROCCAN_CITIES.map(c => ({
    value: c,
    label: language === "fr" ? (FR_COMMON.citiesFr as Record<string, string>)[c] || c : c
  }));

  const viewOptions = [
    { key: "list",   icon: <LayoutList className="w-4 h-4" />,   label: t("list") },
    { key: "map",    icon: <Map className="w-4 h-4" />,          label: t("map") },
    { key: "nearby", icon: <Navigation className="w-4 h-4" />,   label: language === "ar" ? "قريب" : language === "fr" ? "Proche" : "Nearby" },
  ];

  return (
    <Layout>
      {/* ══ Hero bar ══ */}
      <div className="bg-zinc-50 dark:bg-black border-b border-zinc-200/50 dark:border-zinc-800/50 relative overflow-hidden py-12">
        <div className="absolute inset-0 dot-grid pointer-events-none opacity-40" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight"
          >
            {language === "ar" ? "ابحث عن الحرفي المناسب" : language === "fr" ? "Trouvez le bon artisan" : "Find the Right Professional"}
          </motion.h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-base font-medium mb-8">
            {language === "ar" ? "تصفح آلاف الحرفيين الموثوقين في مدينتك" : language === "fr" ? "Parcourez des milliers d'artisans de confiance" : "Browse thousands of trusted professionals in your city"}
          </p>

          {/* Filter bar — Ultra Modern Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.04)]" style={{ borderRadius: "24px" }}>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Query input */}
                <div className="md:col-span-5">
                  <Input
                    placeholder={t("searchByName")}
                    value={query}
                    onValueChange={setQuery}
                    radius="lg"
                    size="sm"
                    startContent={<SearchIcon className="text-zinc-400 w-4 h-4" />}
                    className="w-full"
                    classNames={{
                      input: "text-zinc-900 dark:text-white placeholder:text-zinc-400 text-sm font-medium",
                      mainWrapper: "h-12",
                      inputWrapper: "h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-white focus-within:border-indigo-500/40 shadow-inner",
                    }}
                    variant="bordered"
                  />
                </div>

                {/* Category — HeroUI Select */}
                <div className="md:col-span-3">
                  <Select
                    placeholder={t("category")}
                    selectedKeys={category ? new Set([category]) : new Set()}
                    onSelectionChange={(keys) => setCategory(Array.from(keys)[0] as string || "")}
                    radius="lg"
                    size="sm"
                    className="w-full"
                    classNames={{
                      trigger: "h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-white shadow-inner",
                      value: "text-zinc-900 dark:text-white text-sm font-medium",
                    }}
                    variant="bordered"
                  >
                    {[
                      <SelectItem key="all">
                        {t("allCategories")}
                      </SelectItem>,
                      ...catOptions.map((c: any) => (
                        <SelectItem key={c.value}>{c.label}</SelectItem>
                      ))
                    ]}
                  </Select>
                </div>

                {/* City Select */}
                <div className="md:col-span-2">
                  <Select
                    placeholder={t("city")}
                    selectedKeys={city ? new Set([city]) : new Set()}
                    onSelectionChange={(keys) => setCity(Array.from(keys)[0] as string || "")}
                    radius="lg"
                    size="sm"
                    className="w-full"
                    classNames={{
                      trigger: "h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-white shadow-inner",
                      value: "text-zinc-900 dark:text-white text-sm font-medium",
                    }}
                    variant="bordered"
                  >
                    {[
                      <SelectItem key="all">
                        {t("allCities")}
                      </SelectItem>,
                      ...cities.map(c => (
                        <SelectItem key={c.value}>{c.label}</SelectItem>
                      ))
                    ]}
                  </Select>
                </div>

                {/* View switcher */}
                <div className="md:col-span-2 flex items-center justify-end">
                  <div className="w-full h-12 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl p-1 flex items-center gap-1 border border-zinc-200/50 dark:border-zinc-700/50">
                    {viewOptions.map((v) => (
                      <button
                        key={v.key}
                        onClick={() => setView(v.key as any)}
                        className={`flex-1 flex items-center justify-center h-10 rounded-xl transition-all text-xs font-bold ${view === v.key ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"}`}
                        title={v.label}
                      >
                        {v.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ══ Results ══ */}
      <div className="section-soft min-h-[400px]">
        <div className="container mx-auto px-4 py-10">
          {view === "nearby" ? (
            <NearbySearch />
          ) : isLoading ? (
            view === "map" ? (
              <Skeleton className="h-[350px] md:h-[500px] lg:h-[600px] w-full rounded-2xl" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} radius="lg" className="border border-border/60">
                    <CardBody className="p-5 space-y-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-default-200" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-3/4 rounded-lg bg-default-200" />
                          <div className="h-3 w-1/2 rounded-lg bg-default-200" />
                        </div>
                      </div>
                      <div className="h-16 w-full rounded-xl bg-default-200" />
                      <div className="h-10 w-full rounded-xl bg-default-200" />
                    </CardBody>
                  </Card>
                ))}
              </div>
            )
          ) : view === "map" ? (
            <div className="h-[350px] md:h-[500px] lg:h-[600px] w-full rounded-2xl overflow-hidden shadow-xl border border-border">
              <MapSearch providers={providers || []} />
            </div>
          ) : providers?.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24"
            >
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6" style={{ background: "rgba(0,188,212,0.08)" }}>
                <SlidersHorizontal className="w-12 h-12 text-cyan-400 opacity-60" />
              </div>
              <h2 className="text-2xl font-extrabold mb-2">
                {t("noResults")}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {t("tryAdjusting")}
              </p>
              <Button
                onPress={() => { setQuery(""); setCategory(""); setCity(""); }}
                style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
                className="text-white font-bold"
                radius="lg"
              >
                {t("resetFilters")}
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground font-medium">
                  <span className="font-extrabold text-foreground">{providers?.length}</span>{" "}
                  {language === "ar" ? "حرفي متاح" : language === "fr" ? "professionnels disponibles" : "professionals available"}
                </p>
                <div className="flex gap-2">
                  {(query || (category && category !== "all") || (city && city !== "all")) && (
                    <Chip
                      onClose={() => { setQuery(""); setCategory(""); setCity(""); }}
                      variant="flat"
                      className="text-xs"
                      style={{ background: "rgba(0,188,212,0.08)", color: "#00838f" }}
                    >
                      {language === "ar" ? "مصفى" : language === "fr" ? "Filtré" : "Filtered"}
                    </Chip>
                  )}
                </div>
              </div>

              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                {providers?.map((provider) => (
                  <motion.div key={provider.id} variants={fadeUp}>
                    <ProviderCard provider={provider} />
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
