import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Loader2, ArrowRight, ArrowLeft, Check, X, Eye, EyeOff, User, Briefcase, Mail, AtSign, Lock, Phone, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MOROCCAN_CITIES } from "@shared/constants";

// ──────────────── Translations ────────────────
const tr = {
  ar: {
    step1: "المعلومات الشخصية",
    step2: "الموقع ورقم الهاتف",
    completeTitle: "أكمل معلوماتك",
    fullName: "الاسم الكامل",
    username: "اسم المستخدم",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    confirm: "تأكيد كلمة المرور",
    role: "أريد أن",
    hire: "أوظّف حرفياً",
    work: "أعمل كحرفي",
    phone: "رقم الهاتف (اختياري)",
    city: "المدينة",
    category: "التخصص",
    next: "التالي",
    back: "رجوع",
    create: "إنشاء الحساب",
    finish: "إكمال الحساب",
    usernameTaken: "اسم المستخدم مستخدم بالفعل",
    usernameAvailable: "اسم المستخدم متاح",
    phonePlaceholder: "+212 6XX XXX XXX",
    selectCity: "اختر مدينتك",
    selectCategory: "اختر تخصصك",
    strengthWeak: "ضعيف",
    strengthFair: "مقبول",
    strengthGood: "جيد",
    strengthStrong: "قوي",
    strengthVStrong: "قوي جداً",
    strengthLabel: "قوة كلمة المرور:",
    categories: ["سباكة", "كهرباء", "تنظيف", "تجميل", "نقل الأثاث", "نجارة", "دهان", "تكييف", "حدادة", "أخرى"],
    nameTooShort: "الاسم قصير جداً",
    usernameTooShort: "يجب أن يكون 3 أحرف على الأقل",
    usernameTooLong: "الحد الأقصى 20 حرفاً",
    invalidEmail: "أدخل بريداً إلكترونياً صحيحاً",
    passwordTooShort: "يجب أن تكون 6 أحرف على الأقل",
    passwordsMustMatch: "كلمتا المرور غير متطابقتين",
  },
  fr: {
    step1: "Informations personnelles",
    step2: "Localisation et téléphone",
    completeTitle: "Complétez vos informations",
    fullName: "Nom complet",
    username: "Nom d'utilisateur",
    email: "Adresse e-mail",
    password: "Mot de passe",
    confirm: "Confirmer le mot de passe",
    role: "Je veux",
    hire: "Embaucher un artisan",
    work: "Travailler comme artisan",
    phone: "Téléphone (optionnel)",
    city: "Ville",
    category: "Spécialité",
    next: "Suivant",
    back: "Retour",
    create: "Créer le compte",
    finish: "Terminer le compte",
    usernameTaken: "Ce nom d'utilisateur est déjà pris",
    usernameAvailable: "Nom d'utilisateur disponible",
    phonePlaceholder: "+212 6XX XXX XXX",
    selectCity: "Choisir votre ville",
    selectCategory: "Choisir votre spécialité",
    strengthWeak: "Faible",
    strengthFair: "Acceptable",
    strengthGood: "Bien",
    strengthStrong: "Fort",
    strengthVStrong: "Très fort",
    strengthLabel: "Force du mot de passe:",
    categories: ["Plomberie", "Électricité", "Nettoyage", "Beauté", "Déménagement", "Menuiserie", "Peinture", "Climatisation", "Ferronnerie", "Autre"],
    nameTooShort: "Le nom est trop court",
    usernameTooShort: "Au moins 3 caractères",
    usernameTooLong: "Maximum 20 caractères",
    invalidEmail: "Entrez un e-mail valide",
    passwordTooShort: "Au moins 6 caractères",
    passwordsMustMatch: "Les mots de passe ne correspondent pas",
  },
  en: {
    step1: "Personal Information",
    step2: "Location & Phone",
    completeTitle: "Complete your information",
    fullName: "Full Name",
    username: "Username",
    email: "Email Address",
    password: "Password",
    confirm: "Confirm Password",
    role: "I want to",
    hire: "Hire a craftsman",
    work: "Work as a craftsman",
    phone: "Phone (optional)",
    city: "City",
    category: "Specialty",
    next: "Next",
    back: "Back",
    create: "Create Account",
    finish: "Finish",
    usernameTaken: "Username is already taken",
    usernameAvailable: "Username is available",
    phonePlaceholder: "+212 6XX XXX XXX",
    selectCity: "Select your city",
    selectCategory: "Select your specialty",
    strengthWeak: "Weak",
    strengthFair: "Fair",
    strengthGood: "Good",
    strengthStrong: "Strong",
    strengthVStrong: "Very Strong",
    strengthLabel: "Password strength:",
    categories: ["Plumbing", "Electrical", "Cleaning", "Beauty", "Moving", "Carpentry", "Painting", "AC Repair", "Metalwork", "Other"],
    nameTooShort: "Name is too short",
    usernameTooShort: "At least 3 characters",
    usernameTooLong: "Max 20 characters",
    invalidEmail: "Enter a valid email",
    passwordTooShort: "At least 6 characters",
    passwordsMustMatch: "Passwords must match",
  },
};

// ──────────────── Password Strength ────────────────
function PasswordStrength({ password, lang }: { password: string; lang: "ar" | "fr" | "en" }) {
  const l = tr[lang];
  const getStrength = (p: string) => {
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const labels = [l.strengthWeak, l.strengthFair, l.strengthGood, l.strengthStrong, l.strengthVStrong];
    const colors = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-500"];
    const textColors = ["text-red-500", "text-orange-400", "text-yellow-500", "text-emerald-500", "text-emerald-600"];
    return { score: Math.min(score, 4), label: labels[Math.min(score, 4)], color: colors[Math.min(score, 4)], textColor: textColors[Math.min(score, 4)] };
  };
  const { score, label, color, textColor } = getStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : "bg-gray-200 dark:bg-gray-700"}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {l.strengthLabel} <span className={`font-semibold ${textColor}`}>{label}</span>
      </p>
    </div>
  );
}

// ──────────────── Schemas ────────────────
const getStep1Schema = (l: any) => z.object({
  fullName: z.string().min(3, l.nameTooShort || "Name is too short"),
  username: z.string().min(3, l.usernameTooShort || "At least 3 characters").max(20, l.usernameTooLong || "Max 20 characters"),
  email: z.string().email(l.invalidEmail || "Enter a valid email"),
  password: z.string().min(6, l.passwordTooShort || "At least 6 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: l.passwordsMustMatch || "Passwords must match",
  path: ["confirmPassword"],
});

const getStep1CompleteSchema = (l: any) => z.object({
  fullName: z.string().min(3, l.nameTooShort || "Name is too short"),
  username: z.string().min(3, l.usernameTooShort || "At least 3 characters").max(20, l.usernameTooLong || "Max 20 characters"),
  email: z.string().email(l.invalidEmail || "Enter a valid email").optional().or(z.literal('')),
});

const getStep2Schema = (l: any) => z.object({
  phone: z.string().optional(),
  city: z.string().min(1, l.selectCity || "Select your city"),
});

// ──────────────── Component ────────────────
interface RegisterWizardProps {
  onSuccess: () => void;
  lang?: "ar" | "fr" | "en";
  completeMode?: boolean;
}

export function RegisterWizard({ onSuccess, lang = "ar", completeMode = false }: RegisterWizardProps) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { user, register: registerUser, isRegistering, completeProfile, isCompleting } = useAuth();
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const l = tr[lang];
  const isRTL = lang === "ar";

  const step1Schema = completeMode ? getStep1CompleteSchema(l) : getStep1Schema(l);
  const step2Schema = getStep2Schema(l);

  const form = useForm({
    resolver: async (values, context, options) => {
      const schema = step === 1 ? step1Schema : step2Schema;
      return zodResolver(schema)(values as any, context as any, options as any);
    },
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      city: "",
    },
    mode: "onChange",
  });

  const watchedUsername = form.watch("username");
  const watchedPassword = form.watch("password");

  // Prefill existing user data when completing a profile
  useEffect(() => {
    if (completeMode && user) {
      const prefix = (user.email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");
      form.setValue("username", user.username && !user.username.includes("@") ? user.username : (prefix.length >= 3 ? prefix : `user_${user.id}`));
      form.setValue("fullName", user.fullName || "");
      form.setValue("email", user.email || "");
      form.setValue("phone", user.phone || "");
      form.setValue("city", user.city || "");
    }
  }, [completeMode, user]);

  // Debounced username check
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const val = watchedUsername?.trim().toLowerCase();
    if (!val || val.length < 3) { setUsernameStatus("idle"); return; }
    const usernameField = form.getFieldState("username");
    if (usernameField?.error) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    timerRef.current = setTimeout(async () => {
      try {
        const current = completeMode ? user?.username || "" : "";
        const res = await fetch(`/api/check-username?username=${encodeURIComponent(val)}${current ? `&current=${encodeURIComponent(current)}` : ""}`);
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [watchedUsername]);

  const nextStep = async () => {
    const valid = await form.trigger();
    if (usernameStatus === "taken") return;
    if (valid) setStep(2);
  };

  const prevStep = () => setStep(1);

  const onSubmit = async (data: any) => {
    try {
      const formValues = form.getValues();
      if (completeMode) {
        await completeProfile({
          role: "client",
          fullName: formValues.fullName,
          username: formValues.username.trim().toLowerCase(),
          phone: formValues.phone || null,
          city: formValues.city,
        });
        onSuccess();
        return;
      }
      const payload: any = {
        username: formValues.username.trim().toLowerCase(),
        fullName: formValues.fullName,
        email: formValues.email,
        password: formValues.password,
        role: "client",
        phone: formValues.phone || null,
        city: formValues.city,
        language: lang,
      };
      await registerUser(payload);
      onSuccess();
    } catch (e: any) {
      form.setError("root", { message: e.message });
    }
  };

  return (
    <div className="w-full" dir={isRTL ? "rtl" : "ltr"}>
      {/* ── Progress Steps ── */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step > s
                  ? "bg-emerald-500 text-white"
                  : step === s
                  ? "text-white shadow-lg"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400"
              }`}
              style={step >= s ? { background: step > s ? undefined : "linear-gradient(135deg, hsl(183,100%,35%), hsl(200,90%,40%))" } : {}}
            >
              {step > s ? <Check className="w-3.5 h-3.5" /> : s}
            </div>
            {s < 2 && (
              <div
                className={`w-10 h-0.5 rounded-full transition-all duration-500 ${
                  step > s ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step label */}
      <p className="text-center text-xs text-gray-500 mb-5 font-medium">
        {step === 1 ? l.step1 : l.step2}
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <AnimatePresence mode="wait">
            {/* ── STEP 1 ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Full Name */}
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.fullName}</p>
                      <FormControl>
                        <Input
                          id="reg-fullname"
                          placeholder={isRTL ? "محمد أمين" : "Jean Dupont"}
                          startContent={<User className="w-4 h-4 text-gray-400" />}
                          value={field.value}
                          onValueChange={(val) => field.onChange(val)}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Username */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.username}</p>
                      <FormControl>
                        <Input
                          id="reg-username"
                          placeholder="khidmati_user"
                          startContent={<AtSign className="w-4 h-4 text-gray-400" />}
                          endContent={
                            <div className="flex items-center">
                              {usernameStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                              {usernameStatus === "available" && <Check className="w-4 h-4 text-emerald-500" />}
                              {usernameStatus === "taken" && <X className="w-4 h-4 text-red-500" />}
                            </div>
                          }
                          value={field.value}
                          onValueChange={(val) => field.onChange(val)}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        />
                      </FormControl>
                      {usernameStatus === "taken" && (
                        <p className="text-xs text-red-500 mt-1">{l.usernameTaken}</p>
                      )}
                      {usernameStatus === "available" && (
                        <p className="text-xs text-emerald-500 mt-1">{l.usernameAvailable}</p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.email}</p>
                        {completeMode && (
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-500" />
                            {isRTL ? "مُؤكّد من Google" : lang === "fr" ? "Vérifié par Google" : "Google Verified"}
                          </span>
                        )}
                      </div>
                      <FormControl>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="you@example.com"
                          isDisabled={completeMode}
                          startContent={<Mail className="w-4 h-4 text-gray-400" />}
                          value={field.value}
                          onValueChange={(val) => field.onChange(val)}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Password fields - hidden in completeMode */}
                {!completeMode && (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.password}</p>
                          <FormControl>
                            <Input
                              id="reg-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••"
                              startContent={<Lock className="w-4 h-4 text-gray-400" />}
                              endContent={
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              }
                              value={field.value}
                              onValueChange={(val) => field.onChange(val)}
                              isInvalid={!!fieldState.error}
                              errorMessage={fieldState.error?.message}
                            />
                          </FormControl>
                          <PasswordStrength password={field.value || ""} lang={lang} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.confirm}</p>
                          <FormControl>
                            <Input
                              id="reg-confirm"
                              type={showConfirm ? "text" : "password"}
                              placeholder="••••••"
                              startContent={<Lock className="w-4 h-4 text-gray-400" />}
                              endContent={
                                <button
                                  type="button"
                                  onClick={() => setShowConfirm(!showConfirm)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              }
                              value={field.value}
                              onValueChange={(val) => field.onChange(val)}
                              isInvalid={!!fieldState.error}
                              errorMessage={fieldState.error?.message}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <Button
                  id="reg-next"
                  type="button"
                  className="w-full h-11 rounded-xl font-semibold text-sm"
                  style={{ background: "linear-gradient(135deg, hsl(183,100%,35%), hsl(200,90%,40%))" }}
                  onPress={nextStep}
                >
                  {l.next}
                  {isRTL ? <ArrowLeft className="w-4 h-4 mr-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </motion.div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.phone}</p>
                      <FormControl>
                        <Input
                          id="reg-phone"
                          type="tel"
                          placeholder={l.phonePlaceholder}
                          startContent={<Phone className="w-4 h-4 text-gray-400" />}
                          value={field.value}
                          onValueChange={(val) => field.onChange(val)}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* City */}
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.city}</p>
                      <FormControl>
                        <Select
                          id="reg-city"
                          placeholder={l.selectCity}
                          startContent={<MapPin className="w-4 h-4 text-gray-400" />}
                          selectedKeys={field.value ? [field.value] : []}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0] as string;
                            if (value) field.onChange(value);
                          }}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        >
                          {MOROCCAN_CITIES.map((c) => (
                            <SelectItem key={c}>{c}</SelectItem>
                          ))}
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm font-medium p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800"
                  >
                    {form.formState.errors.root.message}
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <Button
                    id="reg-back"
                    type="button"
                    variant="bordered"
                    className="flex-1 h-11 rounded-xl"
                    onPress={prevStep}
                  >
                    {isRTL ? <ArrowRight className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
                    {l.back}
                  </Button>
                  <Button
                    id="reg-submit"
                    type="submit"
                    className="flex-1 h-11 rounded-xl font-semibold"
                    style={{ background: "linear-gradient(135deg, hsl(183,100%,35%), hsl(200,90%,40%))" }}
                    isDisabled={completeMode ? isCompleting : isRegistering}
                    isLoading={completeMode ? isCompleting : isRegistering}
                  >
                    {isRegistering || isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : (completeMode ? l.finish : l.create)}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Form>
    </div>
  );
}
