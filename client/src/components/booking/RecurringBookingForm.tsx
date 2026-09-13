import { useState } from "react";
import { Button, Input, Textarea, Switch, Select, SelectItem, Modal, ModalContent, Avatar } from "@heroui/react";
import { Calendar, Briefcase, Loader2, CheckCircle2, Repeat } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

interface RecurringBookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: {
    id: number;
    fullName: string;
    profileImage?: string | null;
    profile?: {
      serviceCategory?: string;
    } | null;
  };
}

export function RecurringBookingForm({ open, onOpenChange, provider }: RecurringBookingFormProps) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("weekly");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/recurring-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create recurring booking");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: language === "ar" ? "تم إنشاء الحجز المتكرر بنجاح" : language === "fr" ? "Réservation récurrente créée avec succès" : "Recurring booking created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-bookings"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: language === "ar" ? "خطأ" : language === "fr" ? "Erreur" : "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setIsRecurring(false);
    setFrequency("weekly");
    setDayOfWeek("1");
    setDayOfMonth("1");
    setStartDate("");
    setEndDate("");
    setTime("");
    setDescription("");
    setPrice("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      providerId: provider.id,
      serviceCategory: provider.profile?.serviceCategory || "",
      description: description || null,
      startDate: new Date(startDate).toISOString(),
      time,
      price: price ? parseInt(price) : 0,
    };

    if (isRecurring) {
      payload.frequency = frequency;
      if (frequency === "weekly" || frequency === "biweekly") {
        payload.dayOfWeek = parseInt(dayOfWeek);
      }
      if (frequency === "monthly") {
        payload.dayOfMonth = parseInt(dayOfMonth);
      }
      if (endDate) {
        payload.endDate = new Date(endDate).toISOString();
      }
    } else {
      payload.frequency = "weekly";
      payload.dayOfWeek = new Date(startDate).getDay();
      payload.endDate = new Date(startDate).toISOString();
    }

    createMutation.mutate(payload);
  };

  const frequencyLabels: Record<string, string> = {
    daily: "يومي",
    weekly: "أسبوعي",
    biweekly: "كل أسبوعين",
    monthly: "شهري",
  };

  const frequencyLabelsFr: Record<string, string> = {
    daily: "Quotidien",
    weekly: "Hebdomadaire",
    biweekly: "Toutes les 2 semaines",
    monthly: "Mensuel",
  };

  const frequencyLabelsEn: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Every 2 weeks",
    monthly: "Monthly",
  };

  const dayLabels: Record<string, string> = {
    "0": "الأحد",
    "1": "الإثنين",
    "2": "الثلاثاء",
    "3": "الأربعاء",
    "4": "الخميس",
    "5": "الجمعة",
    "6": "السبت",
  };

  const dayLabelsFr: Record<string, string> = {
    "0": "Dimanche",
    "1": "Lundi",
    "2": "Mardi",
    "3": "Mercredi",
    "4": "Jeudi",
    "5": "Vendredi",
    "6": "Samedi",
  };

  const dayLabelsEn: Record<string, string> = {
    "0": "Sunday",
    "1": "Monday",
    "2": "Tuesday",
    "3": "Wednesday",
    "4": "Thursday",
    "5": "Friday",
    "6": "Saturday",
  };

  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return path;
    return `/uploads/${path}`;
  };

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange} placement="center" className="rounded-2xl">
      <ModalContent className="sm:max-w-[440px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl [&>button]:text-white [&>button]:hover:bg-white/30">
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-6 pt-8 pb-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10 flex items-center gap-4">
            <Avatar src={getImageUrl(provider.profileImage)} name={provider.fullName} showFallback fallback={<span className="text-xl">{provider.fullName[0]}</span>} className="w-14 h-14 border-2 border-white/30 shadow-lg" />
            <div>
              <p className="text-xl font-bold text-white mb-1">{language === "ar" ? "حجز خدمة" : language === "fr" ? "Réserver un service" : "Book a Service"}</p>
              <p className="text-white/80 text-sm">
                {provider.fullName} • {provider.profile?.serviceCategory}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Repeat className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">{language === "ar" ? "حجز متكرر" : language === "fr" ? "Réservation récurrente" : "Recurring Booking"}</p>
                <p className="text-xs text-muted-foreground">{language === "ar" ? "إنشاء جدول مواعيد متكررة" : language === "fr" ? "Créer un calendrier de rendez-vous récurrents" : "Create a recurring schedule"}</p>
              </div>
            </div>
            <Switch isSelected={isRecurring} onValueChange={setIsRecurring} />
          </div>

          {isRecurring && (
            <>
              <div className="space-y-2.5">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-primary" />
                  {language === "ar" ? "التكرار" : language === "fr" ? "Fréquence" : "Frequency"}
                </p>
                <Select
                  selectedKeys={[frequency]}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    if (value) setFrequency(value);
                  }}
                  label={language === "ar" ? "التكرار" : language === "fr" ? "Fréquence" : "Frequency"}
                  placeholder={language === "ar" ? "اختر التكرار" : language === "fr" ? "Choisir la fréquence" : "Choose frequency"}
                  className="w-full"
                >
                  {Object.entries(language === "ar" ? frequencyLabels : language === "fr" ? frequencyLabelsFr : frequencyLabelsEn).map(([key, label]) => (
                    <SelectItem key={key}>{label}</SelectItem>
                  ))}
                </Select>
              </div>

              {(frequency === "weekly" || frequency === "biweekly") && (
                <div className="space-y-2.5">
                  <p className="font-semibold text-sm">{language === "ar" ? "يوم الأسبوع" : language === "fr" ? "Jour de la semaine" : "Day of week"}</p>
                  <Select
                    selectedKeys={[dayOfWeek]}
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0] as string;
                      if (value) setDayOfWeek(value);
                    }}
                    label={language === "ar" ? "يوم الأسبوع" : language === "fr" ? "Jour de la semaine" : "Day of week"}
                    placeholder={language === "ar" ? "اختر اليوم" : language === "fr" ? "Choisir le jour" : "Choose day"}
                    className="w-full"
                  >
                    {Object.entries(language === "ar" ? dayLabels : language === "fr" ? dayLabelsFr : dayLabelsEn).map(([key, label]) => (
                      <SelectItem key={key}>{label}</SelectItem>
                    ))}
                  </Select>
                </div>
              )}

              {frequency === "monthly" && (
                <div className="space-y-2.5">
                  <p className="font-semibold text-sm">{language === "ar" ? "يوم من الشهر" : language === "fr" ? "Jour du mois" : "Day of month"}</p>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onValueChange={setDayOfMonth}
                    className="rounded-xl border-2 border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-2.5">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              {language === "ar" ? (isRecurring ? "تاريخ البداية" : "التاريخ والوقت") : language === "fr" ? (isRecurring ? "Date de début" : "Date et heure") : (isRecurring ? "Start date" : "Date & Time")}
            </p>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white hover:border-slate-300"
              required
            />
          </div>

          <div className="space-y-2.5">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              {language === "ar" ? "الوقت" : language === "fr" ? "Heure" : "Time"}
            </p>
            <input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white hover:border-slate-300"
              required
            />
          </div>

          {isRecurring && (
            <div className="space-y-2.5">
              <p className="font-semibold text-sm">
                {language === "ar" ? "تاريخ الانتهاء (اختياري)" : language === "fr" ? "Date de fin (optionnelle)" : "End date (optional)"}
              </p>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white hover:border-slate-300"
              />
            </div>
          )}

          <div className="space-y-2.5">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              {language === "ar" ? "السعر (اختياري)" : language === "fr" ? "Prix (optionnel)" : "Price (optional)"}
            </p>
            <Input
              type="number"
              value={price}
              onValueChange={setPrice}
              placeholder={language === "ar" ? "أدخل السعر..." : language === "fr" ? "Entrez le prix..." : "Enter price..."}
              className="rounded-xl border-2 border-slate-200 px-4 py-3 text-sm"
            />
          </div>

          <div className="space-y-2.5">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              {language === "ar" ? "وصف الخدمة" : language === "fr" ? "Description du service" : "Service description"}
            </p>
            <Textarea
              id="recurring-desc"
              placeholder={language === "ar" ? "مثال: أحتاج تنظيف المكتب كل أسبوع..." : language === "fr" ? "Exemple : J'ai besoin d'un nettoyage de bureau chaque semaine..." : "e.g. I need office cleaning every week..."}
              value={description}
              onValueChange={setDescription}
              className="min-h-[90px] resize-none rounded-xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white hover:border-slate-300"
            />
          </div>

          <div className="pt-1 pb-1">
            <Button
              type="submit"
              isLoading={createMutation.isPending}
              className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {language === "ar" ? (isRecurring ? "تأكيد الحجز المتكرر" : "تأكيد الحجز") : language === "fr" ? (isRecurring ? "Confirmer la réservation récurrente" : "Confirmer la réservation") : (isRecurring ? "Confirm Recurring Booking" : "Confirm Booking")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
