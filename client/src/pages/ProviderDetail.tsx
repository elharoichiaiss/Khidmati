import { Layout } from "@/components/Layout";
import { useProvider } from "@/hooks/use-providers";
import { useReviews } from "@/hooks/use-reviews";
import { useStartConversation } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useLocation, useRoute } from "wouter";
import { Avatar, Button, Skeleton, Textarea, Modal, ModalContent } from "@heroui/react";
import {
  Star, MapPin, CheckCircle2, MessageSquare, Briefcase, Calendar,
  Loader2, Heart, LayoutDashboard, Edit2, BadgeCheck, Clock, Shield,
  ArrowLeft, Zap, Award, UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardEdgeTab } from "@/components/DashboardEdgeTab";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/* ─── Stat Chip ──────────────────────────────────────────────────── */
function StatChip({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: any;
  label: string;
  value: string | number;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
      <Icon className={cn("w-4 h-4 flex-shrink-0", colorClass)} />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 leading-none">{label}</p>
        <p className="text-sm font-black text-zinc-900 dark:text-white mt-1">{value}</p>
      </div>
    </div>
  );
}

/* ─── Section Header ─────────────────────────────────────────────── */
function SectionTitle({ icon: Icon, title, tintClass }: { icon: any; title: string; tintClass?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className={cn("p-2 rounded-xl", tintClass || "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400")}>
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-base font-black text-zinc-900 dark:text-white">{title}</h2>
    </div>
  );
}

/* ─── Star Rating ─────────────────────────────────────────────────── */
function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            size === "lg" ? "w-5 h-5" : "w-4 h-4",
            i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-zinc-200 fill-zinc-200 dark:text-zinc-700 dark:fill-zinc-700",
          )}
        />
      ))}
    </div>
  );
}

export default function ProviderDetail() {
  const [match, params] = useRoute("/providers/:id");
  const id = parseInt(params?.id || "0");
  const [location, setLocation] = useLocation();

  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { data: provider, isLoading } = useProvider(id);
  const { data: reviews } = useReviews(id);
  const { data: badges } = useQuery({
    queryKey: [`/api/providers/${id}/badges`],
    enabled: !!id,
  });
  const startConversation = useStartConversation();
  const queryClient = useQueryClient();

  // Check if current user already reviewed this provider
  const hasReviewed = !!user && Array.isArray(reviews) && reviews.some((r: any) => r.client?.id === user.id || r.clientId === user.id);


  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingDescription, setBookingDescription] = useState("");

  const bookingMutation = useMutation({
    mutationFn: async (data: { providerId: number; date: string; description: string }) => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Booking failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("newBookingRequest"),
        description: language === "ar" ? "سيراجع الحرفي طلبك." : language === "fr" ? "L'artisan examinera votre demande." : "The provider will review your request.",
      });
      setBookingOpen(false);
      setBookingDate("");
      setBookingDescription("");
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  const createReview = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, providerId: id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit review");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("submitReview") });
      setReviewComment("");
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: [`/api/providers/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/providers/${id}/reviews`] });
    },
    onError: (err: Error) => {
      if (err.message === "already_reviewed") {
        toast({
          title: language === "ar" ? "سبق لك التقييم" : language === "fr" ? "Déjà évalué" : "Already Reviewed",
          description: language === "ar" ? "لقد قمت بتقييم هذا الحرفي مسبقاً" : language === "fr" ? "Vous avez déjà évalué ce prestataire" : "You have already reviewed this provider",
          variant: "destructive",
        });
        // Refresh reviews so the hasReviewed state updates
        queryClient.invalidateQueries({ queryKey: [`/api/providers/${id}/reviews`] });
        return;
      }
      toast({ title: language === "ar" ? "خطأ" : language === "fr" ? "Erreur" : "Error", description: err.message, variant: "destructive" });
    },
  });


  const { data: favData } = useQuery<{ favorited: boolean }>({
    queryKey: [`/api/favorites/${id}/check`],
    enabled: !!user && !!id,
  });
  const isFavorited = favData?.favorited;

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/favorites/${id}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([`/api/favorites/${id}/check`], data);
      toast({
        title: data.favorited
          ? (language === "ar" ? "تمت الإضافة إلى المفضلة ❤️" : language === "fr" ? "Ajouté aux favoris ❤️" : "Added to favorites ❤️")
          : (language === "ar" ? "تمت الإزالة من المفضلة" : language === "fr" ? "Retiré des favoris" : "Removed from favorites"),
        duration: 2000,
      });
    },
    onError: () => toast({ title: "Error", description: "Could not update favorites", variant: "destructive" }),
  });

  const isProviderAvailable = (dateStr: string) => {
    if (!provider || !provider.profile?.workingHours) return true;
    const date = new Date(dateStr);
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = days[date.getDay()];
    const workingHours = (provider.profile.workingHours as any)[dayName];
    if (!workingHours?.active) return false;
    return true;
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setLocation("/login");
    if (!bookingDate) {
      toast({ title: t("error"), description: language === "ar" ? "يرجى اختيار التاريخ والوقت" : "Please select a date and time", variant: "destructive" });
      return;
    }
    if (!isProviderAvailable(bookingDate)) {
      toast({ title: language === "ar" ? "الحرفي غير متاح" : "Provider Unavailable", description: language === "ar" ? "الحرفي مغلق في هذا اليوم." : "The provider is closed on this day.", variant: "destructive" });
      return;
    }
    bookingMutation.mutate({ providerId: id, date: bookingDate, description: bookingDescription });
  };

  const handleMessage = async () => {
    if (!user) { setLocation("/login"); return; }
    try {
      const conv = await startConversation.mutateAsync(id);
      setLocation(`/messages?id=${conv.id}`);
    } catch (_) {
      toast({ title: "Error", description: "Could not start conversation", variant: "destructive" });
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setLocation("/login");
    if (reviewRating === 0) return toast({ title: language === "ar" ? "يرجى اختيار تقييم" : "Please select a rating", variant: "destructive" });
    createReview.mutate({ rating: reviewRating, comment: reviewComment });
  };

  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return path;
    return `/uploads/${path}`;
  };

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <Layout>
        <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
          <div className="container mx-auto px-4 max-w-6xl pb-24">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 sm:p-8 space-y-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <Skeleton className="w-24 h-24 rounded-2xl" />
                <div className="flex-1 space-y-3 pt-1">
                  <Skeleton className="h-7 w-56 rounded-lg" />
                  <Skeleton className="h-4 w-80 rounded-lg" />
                  <div className="flex flex-wrap gap-3 mt-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-32 rounded-2xl" />)}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 space-y-5">
              <Skeleton className="h-40 w-full rounded-[28px]" />
              <Skeleton className="h-60 w-full rounded-[28px]" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!provider) {
    return (
      <Layout>
        <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-10 h-10 text-zinc-400" />
              </div>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2">{language === "ar" ? "الحرفي غير موجود" : language === "fr" ? "Artisan introuvable" : "Provider not found"}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">{language === "ar" ? "تحقق من الرابط أو ابحث عن حرفي آخر" : language === "fr" ? "Vérifiez le lien ou recherchez un autre artisan" : "Check the link or search for another provider"}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const profileImageUrl = getImageUrl(provider.profileImage || provider.profile?.profileImage);
  const rating = (provider as any).rating;
  const reviewCount = (provider as any).reviewCount || 0;
  const isAvailable = provider.profile?.isAvailable;

  return (
    <Layout>
      {user && user.id === provider.id && <DashboardEdgeTab href="/provider/dashboard" />}

      <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
        <div className="container mx-auto px-4 max-w-6xl pb-24">

          {/* Back button */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === "ar" ? "رجوع" : language === "fr" ? "Retour" : "Back"}
          </button>

          {/* ═══════════════════════════════════════════════════════════
              PROFILE HEADER CARD
          ═══════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.03)]"
            style={{ borderRadius: "28px" }}
          >
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar
                  src={profileImageUrl}
                  name={provider.fullName}
                  showFallback
                  fallback={
                    <span className="text-2xl font-black text-white rounded-2xl flex items-center justify-center w-full h-full" style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}>
                      {provider.fullName[0]}
                    </span>
                  }
                  className="w-24 h-24 border-4 bg-zinc-50 dark:bg-zinc-800 shadow-md rounded-2xl"
                  style={{ borderColor: "rgba(0,188,212,0.25)" }}
                />
                {/* Online indicator */}
                <div className={cn(
                  "absolute -bottom-1 -right-1 z-20 w-6 h-6 rounded-full border-[3px] border-white dark:border-zinc-900 shadow-lg flex items-center justify-center",
                  isAvailable ? "bg-emerald-400" : "bg-slate-400",
                )} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-2 flex-wrap">
                      {provider.fullName}
                      {provider.profile?.isVerified && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          {t("verified")}
                        </span>
                      )}
                    </h1>
                    <p className="mt-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
                      <Briefcase className="w-4 h-4 text-cyan-500" />
                      {provider.profile?.serviceCategory || t("professional")}
                      <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      <MapPin className="w-4 h-4 text-cyan-500" />
                      {provider.profile?.citiesServed?.join(", ") || provider.city || t("remote")}
                    </p>
                  </div>

                  {/* Availability badge */}
                  <span className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0",
                    isAvailable
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
                  )}>
                    {isAvailable
                      ? (language === "ar" ? "● متاح الآن" : language === "fr" ? "● Disponible" : `● ${t("available")}`)
                      : (language === "ar" ? "○ مشغول حالياً" : language === "fr" ? "○ Occupé" : "○ Currently Busy")}
                  </span>
                </div>

                {/* Stat chips */}
                <div className="flex flex-wrap gap-2 mt-5">
                  <StatChip
                    icon={Star}
                    label={t("rating")}
                    value={rating ? `${rating} / 5` : t("new")}
                    colorClass="text-amber-500"
                  />
                  <StatChip
                    icon={CheckCircle2}
                    label={language === "ar" ? "مكتمل" : language === "fr" ? "Terminés" : "Completed"}
                    value={provider.profile?.completedBookings || 0}
                    colorClass="text-emerald-500"
                  />
                  <StatChip
                    icon={Briefcase}
                    label={t("experience")}
                    value={`${provider.profile?.yearsOfExperience || 0} ${language === "ar" ? "سنة" : language === "fr" ? "ans" : "yrs"}`}
                    colorClass="text-cyan-500"
                  />
                  <StatChip
                    icon={Zap}
                    label={language === "ar" ? "وقت الرد" : language === "fr" ? "Réponse" : "Response"}
                    value={`${provider.profile?.responseTime || 0} min`}
                    colorClass="text-blue-500"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-6">
                  {user && user.id === provider.id ? (
                    <>
                      <button
                        onClick={() => setLocation("/provider/dashboard")}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-sm font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-sm"
                        style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        {t("dashboard")}
                      </button>
                      <button
                        onClick={() => setLocation("/profile")}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-sm font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                        {t("editProfile")}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Message */}
                      <button
                        onClick={handleMessage}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-sm font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-sm"
                        style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
                      >
                        <MessageSquare className="w-4 h-4" />
                        {t("contact")}
                      </button>

                      {/* Favorite */}
                      <button
                        onClick={() => { if (!user) return setLocation("/login"); toggleFavorite.mutate(); }}
                        disabled={toggleFavorite.isPending}
                        className={cn(
                          "w-11 h-11 rounded-[14px] flex items-center justify-center transition-all border",
                          isFavorited ? "text-red-500 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30" : "text-zinc-400 hover:text-red-500 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800",
                        )}
                      >
                        <Heart className={cn("w-5 h-5", isFavorited && "fill-current")} />
                      </button>

                      {/* Book Now */}
                      <button
                        onClick={() => { if (!user) { setLocation("/login"); return; } setBookingOpen(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-sm font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-sm"
                      >
                        <Calendar className="w-4 h-4" />
                        {t("book")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════════
              BODY CONTENT
          ═══════════════════════════════════════════════════════════ */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">

            {/* ── Left / Main column ── */}
            <div className="md:col-span-2 space-y-6">

              {/* About */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.03)]"
                style={{ borderRadius: "28px" }}
              >
                <SectionTitle icon={UserRound} title={t("bio")} />
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap text-sm">
                  {provider.profile?.bio || t("noBio")}
                </p>
              </motion.section>

              {/* Badges */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.03)]"
                style={{ borderRadius: "28px" }}
              >
                <SectionTitle icon={Award} title={language === "ar" ? "الشارات والتوثيق" : language === "fr" ? "Badges & Vérification" : "Badges & Verification"} />
                <div className="flex flex-wrap gap-3">
                  {provider.profile?.isVerified && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                      <BadgeCheck className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-bold text-sm text-blue-600 dark:text-blue-400">{language === "ar" ? "هوية موثقة" : language === "fr" ? "Identité vérifiée" : "Verified Identity"}</p>
                        <p className="text-xs text-blue-400/80">{language === "ar" ? "تم التحقق من هوية الحرفي" : language === "fr" ? "Identité confirmée" : "Identity confirmed"}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                    <Shield className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{provider.profile?.completedBookings || 0} {language === "ar" ? "حجز مكتمل" : language === "fr" ? "réservations" : "bookings"}</p>
                      <p className="text-xs text-emerald-500/80">{language === "ar" ? "خدمات منجزة بنجاح" : language === "fr" ? "Services terminés" : "Completed successfully"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                    <Clock className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="font-bold text-sm text-amber-600 dark:text-amber-400">{language === "ar" ? `رد خلال ${provider.profile?.responseTime || 0} دقيقة` : language === "fr" ? `Réponse en ${provider.profile?.responseTime || 0} min` : `Responds in ${provider.profile?.responseTime || 0} min`}</p>
                      <p className="text-xs text-amber-500/80">{language === "ar" ? "سرعة الاستجابة" : language === "fr" ? "Temps de réponse" : "Response speed"}</p>
                    </div>
                  </div>
                  {(() => {
                    const badgeList = badges as any[];
                    if (!badgeList) return null;
                    const cfgMap: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
                      top_rated: { label: language === "ar" ? "الأفضل تقييماً" : "Top Rated", icon: Award, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-100 dark:border-amber-900/40" },
                      fast_response: { label: language === "ar" ? "رد سريع" : "Fast Response", icon: Zap, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-100 dark:border-green-900/40" },
                      popular: { label: language === "ar" ? "مطلوب" : "Popular", icon: Star, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-100 dark:border-rose-900/40" },
                    };
                    return badgeList.filter((b: any) => b.badgeType !== "verified").map((badge: any) => {
                      const cfg = cfgMap[badge.badgeType];
                      if (!cfg) return null;
                      const Icon = cfg.icon;
                      return (
                        <div key={badge.id} className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl border", cfg.bg, cfg.border)}>
                          <Icon className={cn("w-5 h-5", cfg.color)} />
                          <p className={cn("font-bold text-sm", cfg.color)}>{cfg.label}</p>
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.section>

              {/* Portfolio */}
              {provider.profile?.portfolioImages && provider.profile.portfolioImages.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.03)]"
                  style={{ borderRadius: "28px" }}
                >
                  <SectionTitle icon={Briefcase} title={t("portfolio")} />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {provider.profile.portfolioImages.map((img: string, i: number) => (
                      <div key={i} className="relative group overflow-hidden rounded-2xl">
                        <img
                          src={getImageUrl(img)}
                          className="w-full h-44 object-cover transition-transform duration-500 group-hover:scale-110"
                          alt={`Portfolio ${i + 1}`}
                        />
                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-cyan-500/15" />
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Reviews */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.03)]"
                style={{ borderRadius: "28px" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <SectionTitle icon={Star} title={t("reviewsAndRatings")} />
                  {rating && (
                    <div className="flex items-center gap-2">
                      <StarRating rating={Math.round(rating)} />
                      <span className="font-bold text-sm text-zinc-900 dark:text-white">{rating} <span className="font-normal text-zinc-400">({reviewCount})</span></span>
                    </div>
                  )}
                </div>

                {/* Write review */}
                {user && user.id !== provider.id && (
                  hasReviewed ? (
                    <div className="mb-6 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-emerald-800 dark:text-emerald-400">
                          {language === "ar" ? "لقد قيّمت هذا الحرفي" : language === "fr" ? "Vous avez déjà évalué ce prestataire" : "You've already reviewed this provider"}
                        </p>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-0.5">
                          {language === "ar" ? "شكراً على تقييمك!" : language === "fr" ? "Merci pour votre avis !" : "Thank you for your feedback!"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 p-5 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30">
                      <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-4">{t("writeReview")}</h3>
                      <div className="flex items-center gap-1.5 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star className={cn("w-7 h-7 transition-colors", star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-zinc-200 fill-zinc-200 dark:text-zinc-700 dark:fill-zinc-700")} />
                          </button>
                        ))}
                      </div>
                      <Textarea
                        placeholder={language === "ar" ? "شارك تجربتك مع هذا الحرفي..." : language === "fr" ? "Partagez votre expérience..." : "Share your experience with this provider..."}
                        value={reviewComment}
                        onValueChange={(value) => setReviewComment(value)}
                        className="mb-4 rounded-xl border-zinc-200 dark:border-zinc-700 resize-none min-h-[90px] bg-white dark:bg-zinc-900"
                      />
                      <button
                        onClick={handleReviewSubmit}
                        disabled={createReview.isPending}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-sm font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
                      >
                        {createReview.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t("submitReview")}
                      </button>
                    </div>
                  )
                )}

                {/* Reviews list */}
                <div className="space-y-4">
                  {reviews && (reviews as any[]).length > 0 ? (
                    (reviews as any[]).map((review: any) => (
                      <div key={review.id} className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 transition-shadow hover:shadow-md">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={review.client.fullName}
                              showFallback
                              fallback={
                                <span className="text-sm font-bold text-white flex items-center justify-center w-full h-full" style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}>
                                  {review.client.fullName[0]}
                                </span>
                              }
                              className="w-10 h-10"
                            />
                            <div>
                              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{review.client.fullName}</h4>
                              <p className="text-xs text-zinc-400">{new Date(review.createdAt).toLocaleDateString(language === "ar" ? "ar-MA" : language === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                            </div>
                          </div>
                          <StarRating rating={review.rating} />
                        </div>
                        {review.comment && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{review.comment}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-2xl mx-auto mb-3 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center">
                        <Star className="w-7 h-7 text-zinc-300 dark:text-zinc-600" />
                      </div>
                      <p className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">
                        {t("noReviews")}
                      </p>
                    </div>
                  )}
                </div>
              </motion.section>
            </div>

            {/* ── Right sidebar ── */}
            <div className="md:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky top-24 space-y-5"
              >
                {/* Availability card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)]" style={{ borderRadius: "28px" }}>
                  <SectionTitle icon={Calendar} title={language === "ar" ? "أوقات العمل" : language === "fr" ? "Disponibilité" : "Availability"} />
                  <div className="space-y-1 text-sm">
                    {provider.profile?.workingHours ? (
                      ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                        const hours = (provider.profile?.workingHours as any)[day];
                        if (!hours) return null;
                        const dayLabels: Record<string, Record<string, string>> = {
                          monday: { ar: "الإثنين", fr: "Lundi", en: "Monday" },
                          tuesday: { ar: "الثلاثاء", fr: "Mardi", en: "Tuesday" },
                          wednesday: { ar: "الأربعاء", fr: "Mercredi", en: "Wednesday" },
                          thursday: { ar: "الخميس", fr: "Jeudi", en: "Thursday" },
                          friday: { ar: "الجمعة", fr: "Vendredi", en: "Friday" },
                          saturday: { ar: "السبت", fr: "Samedi", en: "Saturday" },
                          sunday: { ar: "الأحد", fr: "Dimanche", en: "Sunday" },
                        };
                        const dayLabel = dayLabels[day]?.[language] ?? day;
                        return (
                          <div key={day} className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                            <span className="text-zinc-500 dark:text-zinc-400 font-medium">{dayLabel}</span>
                            {hours.active ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{hours.start} – {hours.end}</span>
                            ) : (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500">{language === "ar" ? "مغلق" : language === "fr" ? "Fermé" : "Closed"}</span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-zinc-400 dark:text-zinc-500 text-sm italic">{language === "ar" ? "لا يوجد جدول مواعيد." : language === "fr" ? "Aucun horaire disponible." : "No schedule available."}</p>
                    )}
                  </div>
                </div>

                {/* Quick book CTA */}
                {user && user.id !== provider.id && (
                  <button
                    onClick={() => { if (!user) { setLocation("/login"); return; } setBookingOpen(true); }}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-sm"
                  >
                    <Calendar className="w-4 h-4" />
                    {language === "ar" ? "احجز الآن" : language === "fr" ? "Réserver maintenant" : "Book Now"}
                  </button>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Booking Modal ─── */}
      <Modal isOpen={bookingOpen} onOpenChange={setBookingOpen} placement="center" size="sm">
        <ModalContent className="p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-zinc-900" style={{ borderRadius: "28px" }}>
          {/* Header */}
          <div className="relative px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-4">
              <Avatar
                src={profileImageUrl}
                name={provider.fullName}
                showFallback
                fallback={
                  <span className="text-xl font-bold text-white rounded-2xl flex items-center justify-center w-full h-full" style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}>
                    {provider.fullName[0]}
                  </span>
                }
                className="w-14 h-14 border-2 shadow-md rounded-2xl flex-shrink-0"
                style={{ borderColor: "rgba(0,188,212,0.25)" }}
              />
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-0.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-500" />
                  {t("book")}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  {provider.fullName} • {provider.profile?.serviceCategory}
                </p>
              </div>
            </div>
          </div>

          {/* Form body */}
          <form onSubmit={handleBookingSubmit} className="px-6 py-5 space-y-5">
            <div className="space-y-2">
              <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-500" />
                {t("date")}
              </p>
              <input
                id="booking-date"
                type="datetime-local"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white px-4 py-3 text-sm transition-all focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10"
                required
              />
              {bookingDate && !isProviderAvailable(bookingDate) && (
                <p className="text-red-500 text-sm font-medium flex items-center gap-1">
                  {language === "ar" ? "الحرفي مغلق في هذا اليوم." : language === "fr" ? "L'artisan est fermé ce jour-là." : "The provider is closed on this day."}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-cyan-500" />
                {t("description")}
              </p>
              <Textarea
                id="booking-desc"
                placeholder={language === "ar" ? "مثال: أحتاج إصلاح حنفية ماء..." : language === "fr" ? "Exemple : Je dois réparer un robinet..." : "e.g. I need to fix a leaky faucet..."}
                value={bookingDescription}
                onValueChange={(value) => setBookingDescription(value)}
                className="min-h-[100px] resize-none rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white px-4 py-3 text-sm focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={bookingMutation.isPending || (!!bookingDate && !isProviderAvailable(bookingDate))}
              className="w-full h-12 text-base font-bold text-white rounded-xl flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
            >
              {bookingMutation.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin" />{language === "ar" ? "جاري الإرسال..." : "Sending..."}</>
              ) : (
                <><CheckCircle2 className="w-5 h-5" />{t("confirm")}</>
              )}
            </button>
          </form>
        </ModalContent>
      </Modal>
    </Layout>
  );
}