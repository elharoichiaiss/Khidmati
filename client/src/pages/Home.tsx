import { Layout } from "@/components/Layout";
import {
  Button, Card, CardBody, CardFooter,
  Chip, Avatar, Spinner,
} from "@heroui/react";

import {
  Search, MapPin, ArrowRight, ShieldCheck, Zap, Users,
  Star, Droplets, PaintBucket, Wind, Wrench,
  Sparkles, ChevronRight, CheckCircle2, Clock, TrendingUp,
  BookOpen, Truck, Hammer, Square, Box, Flower2, Bug, Settings, MoreHorizontal,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { useProviders } from "@/hooks/use-providers";
import { ProviderCard } from "@/components/ProviderCard";
import { PWAInstallButton } from "@/components/PWAInstallButton";

/* ── Floating orb ─────────────────────────────────────────────── */
function Orb({ size, style, delay = 0 }: { size: number; style: React.CSSProperties; delay?: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: size, height: size, filter: "blur(70px)", opacity: 0.18, ...style }}
      animate={{ y: [0, -20, 0], scale: [1, 1.07, 1] }}
      transition={{ repeat: Infinity, duration: 8 + delay, ease: "easeInOut", delay }}
    />
  );
}

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Droplets, Zap, Sparkles, PaintBucket, Wind, Wrench, BookOpen, Truck,
  Hammer, Square, Box, Flower2, Bug, Settings, MoreHorizontal, Search, MapPin,
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function Home() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useLocation();
  const [categories, setCategories] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const { t, language } = useLanguage();
  const { data: providers, isLoading } = useProviders({});

  useEffect(() => {
    fetch("/api/service-categories")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setCategories(Array.isArray(data) ? data : []); setCatLoading(false); })
      .catch(() => { setCategories([]); setCatLoading(false); });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation(`/search?q=${encodeURIComponent(search)}`);
  };

  const getCategoryLabel = (cat: any) =>
    language === "ar" ? cat.nameAr : language === "fr" ? cat.nameFr : cat.nameEn;

  const popular = [t("plumbing"), t("cleaning"), t("electrician"), t("moving")];

  return (
    <Layout>
      {/* ══════════════════════════════════════════════════
          HERO — Clean, Airy Premium Aesthetic
      ══════════════════════════════════════════════════ */}
      <section className="hero-brand relative min-h-[700px] flex items-center justify-center overflow-hidden">
        {/* Ambient subtle glow instead of heavy orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-400/10 dark:bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-400/10 dark:bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10 py-24 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex justify-center mb-10"
          >
            <Chip
              startContent={<span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ml-2" />}
              className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md text-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-zinc-800/50 px-4 py-5 shadow-sm font-medium"
              style={{ borderRadius: "20px" }}
            >
              {t("heroBadge")}
            </Chip>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-zinc-900 dark:text-white mb-6 leading-[1.1] text-balance tracking-tight"
          >
            {t("heroTitle1")} <br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">{t("heroTitle2")} {t("heroTitle3")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            {t("heroSubtitle")}
          </motion.p>

          {/* Premium Search Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="max-w-3xl mx-auto"
          >
            <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/40 dark:border-zinc-800/60 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.06)]" style={{ borderRadius: "24px" }}>
              <CardBody className="p-2">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 w-6 h-6 z-10" />
                    <input
                      placeholder={t("whatServiceNeed")}
                      className="w-full h-16 pl-14 pr-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-transparent text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500/30 focus:bg-white dark:focus:bg-zinc-900 transition-all text-lg font-medium shadow-inner"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setLocation(`/search?q=${encodeURIComponent(search)}`); } }}
                    />
                  </div>
                  <Button
                    onPress={() => setLocation(`/search?q=${encodeURIComponent(search)}`)}
                    className="h-16 px-10 text-lg font-bold text-white flex-shrink-0 bg-zinc-900 dark:bg-white dark:text-zinc-900 shadow-lg hover:scale-[1.02] transition-transform"
                    style={{ borderRadius: "16px" }}
                  >
                    {t("search")}
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Popular tags */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">{t("popular")}</span>
              {popular.map((tag, i) => (
                <Chip
                  key={i}
                  onClick={() => setLocation(`/search?q=${encodeURIComponent(tag)}`)}
                  className="cursor-pointer bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all font-semibold px-4"
                  size="md"
                  style={{ borderRadius: "12px" }}
                >
                  {tag}
                </Chip>
              ))}
            </div>

            {/* PWA Install */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 flex justify-center">
              <PWAInstallButton
                alwaysShow
                variant="flat"
                className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/50 font-medium"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CATEGORIES — Ultra Modern Premium Cards
      ══════════════════════════════════════════════════ */}
      <section className="py-20 section-soft">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Chip variant="flat" className="mb-4 font-bold tracking-widest uppercase text-xs" style={{ background: "rgba(99,102,241,0.1)", color: "#4f46e5" }}>
              {t("categories")}
            </Chip>
            <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white mb-3">
              {t("browseServices")}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto font-medium text-sm md:text-base">
              {t("browseServicesDesc")}
            </p>
          </motion.div>

          {catLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-40 rounded-[28px] bg-zinc-200/50 dark:bg-zinc-800/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {categories.map((cat: any) => {
                const CatIcon = iconMap[cat.icon] || Wrench;
                return (
                  <motion.div key={cat.id} variants={fadeUp} className="flex">
                    <Link href={`/search?category=${encodeURIComponent(cat.nameEn)}`} className="w-full">
                      <div
                        className="group cursor-pointer bg-white dark:bg-zinc-900/90 border border-zinc-100 dark:border-zinc-800/80 hover:border-indigo-500/30 p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:scale-[1.03] shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.08)] w-full h-full"
                        style={{ borderRadius: "28px" }}
                      >
                        <div
                          className="w-20 h-20 rounded-[22px] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 shadow-sm"
                          style={{ background: `${cat.color}15` }}
                        >
                          <CatIcon className="w-9 h-9 transition-transform group-hover:rotate-6" style={{ color: cat.color }} />
                        </div>
                        <div className="text-center">
                          <p className="font-extrabold text-base text-zinc-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {getCategoryLabel(cat)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FEATURED PROVIDERS — HeroUI Cards
      ══════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Chip variant="flat" className="mb-3 font-bold tracking-widest uppercase text-xs" style={{ background: "rgba(0,188,212,0.1)", color: "#00838f" }}>
                {t("featured")}
              </Chip>
              <h2 className="text-3xl md:text-4xl font-extrabold">
                {t("serviceProviders")}
              </h2>
            </motion.div>
            <Link href="/search">
              <Button
                variant="bordered"
                endContent={<ChevronRight className="w-4 h-4" />}
                radius="lg"
                className="border-border hover:border-cyan-400 hover:text-cyan-600 transition-colors"
              >
                {t("viewAll")}
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
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
          ) : providers && providers.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {providers.slice(0, 6).map((provider) => (
                <motion.div key={provider.id} variants={fadeUp}>
                  <ProviderCard provider={provider} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(0,188,212,0.08)" }}>
                <Users className="w-10 h-10 text-cyan-500" />
              </div>
              <p className="text-muted-foreground">{t("noProvidersYet")}</p>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          WHY KHIDMATI — HeroUI Cards with glow
      ══════════════════════════════════════════════════ */}
      <section className="py-20 section-brand-light">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Chip variant="flat" className="mb-4 font-bold tracking-widest uppercase text-xs" style={{ background: "rgba(0,188,212,0.1)", color: "#00838f" }}>
              {t("whyKhidmati")}
            </Chip>
            <h2 className="text-3xl md:text-4xl font-extrabold">
              {t("platformTrust")}
            </h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {[
              { icon: ShieldCheck, color: "#00bcd4", title: t("verifiedPros"), desc: t("verifiedProsDesc") },
              { icon: Zap, color: "#0ea5e9", title: t("fastBooking"), desc: t("fastBookingDesc") },
              { icon: Star, color: "#f59e0b", title: t("communityRated"), desc: t("communityRatedDesc") },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card
                  className="text-center border border-border/40 bg-white dark:bg-card group hover:shadow-xl transition-all duration-300 h-full"
                  radius="lg"
                >
                  <CardBody className="flex flex-col items-center p-8 gap-5">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300" style={{ background: `${item.color}18` }}>
                      <item.icon className="w-8 h-8" style={{ color: item.color }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Chip variant="flat" className="mb-4 font-bold tracking-widest uppercase text-xs" style={{ background: "rgba(0,188,212,0.1)", color: "#00838f" }}>
              {t("howItWorks")}
            </Chip>
            <h2 className="text-3xl md:text-4xl font-extrabold">
              {t("threeSteps")}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px"
              style={{ background: "linear-gradient(90deg, transparent, #00bcd4, transparent)" }} />

            {[
              { step: "01", icon: Search, title: t("searchAService"), desc: t("searchAServiceDesc") },
              { step: "02", icon: Users, title: t("chooseAPro"), desc: t("chooseAProDesc") },
              { step: "03", icon: CheckCircle2, title: t("bookAndEnjoy"), desc: t("bookAndEnjoyDesc") },
            ].map((s, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-teal-glow" style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}>
                    <s.icon className="w-9 h-9 text-white" />
                  </div>
                  <Chip
                    size="sm"
                    className="absolute -top-2 -right-2 font-black text-[11px] border-2 bg-white"
                    style={{ borderColor: "#00bcd4", color: "#00bcd4" }}
                  >
                    {s.step}
                  </Chip>
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CTA — Join as Provider
      ══════════════════════════════════════════════════ */}
      <section className="py-20 hero-brand relative overflow-hidden">
        <Orb size={400} style={{ bottom: "-15%", right: "-5%", background: "radial-gradient(circle, #0ea5e9, transparent)" }} delay={1} />

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <motion.div
              className="max-w-xl text-center md:text-left"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <Chip className="mb-5 bg-zinc-900/5 text-zinc-800 dark:bg-zinc-100/10 dark:text-zinc-200 border border-zinc-200/50 dark:border-zinc-800/50 font-bold tracking-widest uppercase text-xs" variant="flat">
                {t("forProfessionals")}
              </Chip>
              <h2 className="text-3xl md:text-5xl font-extrabold text-zinc-900 dark:text-white mb-6 leading-tight">
                {t("areYouPro")}<br /><span className="text-brand-gradient">{t("joinAsProvider")}</span>
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed mb-8">
                {t("joinProDesc")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register?role=provider">
                  <Button
                    className="h-13 px-8 text-base font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)", boxShadow: "0 4px 20px rgba(0,188,212,0.4)" }}
                    radius="lg"
                    endContent={<ArrowRight className="w-5 h-5" />}
                    size="lg"
                  >
                    {t("joinAsProvider")}
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-5 mt-8">
                {[
                  { icon: Clock, text: t("freeSetup") },
                  { icon: TrendingUp, text: t("boostIncome") },
                  { icon: Users, text: t("thousandsClients") },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm">
                    <f.icon className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                    {f.text}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative flex-shrink-0"
            >
              <div className="absolute inset-0 rounded-3xl rotate-3" style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)", opacity: 0.3 }} />
              <img
                src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop"
                alt="Professional craftsman"
                className="relative z-10 w-[360px] h-[260px] object-cover rounded-2xl shadow-2xl -rotate-1 hover:rotate-0 transition-transform duration-500"
              />
              <Card
                className="absolute -bottom-4 -left-4 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/40 dark:border-zinc-800/60 shadow-[0_20px_60px_rgba(0,0,0,0.06)]"
                radius="lg"
              >
                <CardBody className="flex flex-row items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}>
                    <Star className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div>
                    <p className="text-zinc-900 dark:text-white font-bold text-sm">4.9 / 5</p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs">{t("proRating")}</p>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
