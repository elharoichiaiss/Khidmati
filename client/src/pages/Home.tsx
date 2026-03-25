import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, ArrowRight, ShieldCheck, Zap, Users, Download } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { useProviders } from "@/hooks/use-providers";
import { ProviderCard } from "@/components/ProviderCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };
  const { t } = useLanguage();
  const { data: providers, isLoading } = useProviders({});

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation(`/search?q=${encodeURIComponent(search)}`);
  };

  const categories = [
    { key: "homeRepair", icon: "🏠", bg: "bg-blue-100", text: "text-blue-700", search: "Home Repair" },
    { key: "beautySpa", icon: "💅", bg: "bg-pink-100", text: "text-pink-700", search: "Beauty" },
    { key: "cleaning", icon: "✨", bg: "bg-purple-100", text: "text-purple-700", search: "Cleaning" },
    { key: "moving", icon: "📦", bg: "bg-orange-100", text: "text-orange-700", search: "Moving" },
    { key: "electrician", icon: "⚡", bg: "bg-yellow-100", text: "text-yellow-700", search: "Electrician" },
    { key: "plumbing", icon: "🔧", bg: "bg-cyan-100", text: "text-cyan-700", search: "Plumbing" },
    { key: "tutoring", icon: "📚", bg: "bg-emerald-100", text: "text-emerald-700", search: "Tutoring" },
    { key: "techSupport", icon: "💻", bg: "bg-slate-100", text: "text-slate-700", search: "Tech Support" },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-bg.png"
            alt="Background"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/60" />
        </div>

        <div className="container mx-auto px-4 relative z-10 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-6 leading-tight text-balance">
              {t("heroTitle1")} <span className="text-primary">{t("heroTitle2")}</span> <br />
              {t("heroTitle3")}
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto text-balance">
              {t("heroSubtitle")}
            </p>

            {deferredPrompt && (
              <Button
                onClick={handleInstallClick}
                className="mb-8 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
              >
                <Download className="mr-2 h-4 w-4" />
                {t("installApp")}
              </Button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-3xl mx-auto bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-2xl shadow-2xl"
          >
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder={t("whatServiceNeed")}
                  className="pl-12 h-14 bg-white/90 border-0 text-slate-900 placeholder:text-slate-500 rounded-xl focus-visible:ring-2 focus-visible:ring-primary"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" className="h-14 px-8 text-lg font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/25">
                {t("search")}
              </Button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 flex flex-wrap justify-center gap-4 text-sm font-medium text-slate-400"
          >
            <span>{t("popular")}</span>
            <Link href="/search?c=plumbing" className="text-white hover:text-primary underline decoration-primary/50 underline-offset-4">{t("plumbing")}</Link>
            <Link href="/search?c=cleaning" className="text-white hover:text-primary underline decoration-primary/50 underline-offset-4">{t("cleaning")}</Link>
            <Link href="/search?c=electrician" className="text-white hover:text-primary underline decoration-primary/50 underline-offset-4">{t("electrician")}</Link>
            <Link href="/search?c=moving" className="text-white hover:text-primary underline decoration-primary/50 underline-offset-4">{t("moving")}</Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Providers */}
      <section className="py-16 bg-background border-t">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">{t("serviceProviders")}</h2>
            <Link href="/search">
              <Button variant="outline" size="sm">{t("viewAll")}</Button>
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : providers && providers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.slice(0, 6).map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{t("noProvidersYet")}</p>
          )}
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("exploreCategories")}</h2>
            <p className="text-muted-foreground">{t("exploreCategoriesDesc")}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {categories.map((cat) => (
              <Link key={cat.key} href={`/search?category=${cat.search}`}>
                <div className="group cursor-pointer flex flex-col items-center p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                  <div className={`w-16 h-16 rounded-full ${cat.bg} ${cat.text} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                    {cat.icon}
                  </div>
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{t(cat.key)}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-primary mb-6">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t("verifiedPros")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("verifiedProsDesc")}</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-primary mb-6">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t("fastBooking")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("fastBookingDesc")}</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-primary mb-6">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t("communityRated")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("communityRatedDesc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Users className="w-96 h-96" />
        </div>
        <div className="container mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">{t("areYouPro")}</h2>
            <p className="text-lg opacity-90 mb-8 leading-relaxed">{t("joinProDesc")}</p>
            <Link href="/register?role=provider">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-bold shadow-lg">
                {t("joinAsProvider")} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-secondary rounded-2xl transform rotate-6 scale-95 opacity-20"></div>
            <img
              src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1000&auto=format&fit=crop"
              alt="Professional"
              className="rounded-2xl shadow-2xl w-[400px] h-[300px] object-cover relative z-10 rotate-3 transition-transform hover:rotate-0 duration-500"
            />
          </div>
        </div>
      </section>
    </Layout>
  );
}
