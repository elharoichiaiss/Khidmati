import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Textarea, Select, SelectItem } from "@heroui/react";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Loader2, ArrowRight, ArrowLeft, Check, X, User, Phone, MapPin, Briefcase, MessageSquare, Star, MessageCircle, Eye, EyeOff, Mail, AtSign, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MOROCCAN_CITIES } from "@shared/constants";
import { useLanguage } from "@/hooks/use-language";

const SERVICE_TYPES_TRANSLATED: Record<"ar" | "fr" | "en", string[]> = {
  ar: [
    "سباكة", "كهرباء", "تنظيف", "دهانات", "تكييف", "تصليح",
    "دروس خصوصية", "نقل عفش", "نجارة", "حدادة", "تبليط", "جبس",
    "حدائق", "مكافحة حشرات", "صيانة", "أخرى",
  ],
  fr: [
    "Plomberie", "Électricité", "Nettoyage", "Peinture", "Climatisation", "Réparation",
    "Tutoring", "Déménagement", "Menuiserie", "Ferronnerie", "Carrelage", "Plâtre",
    "Jardinage", "Anti-nuisibles", "Maintenance", "Autre",
  ],
  en: [
    "Plumbing", "Electrical", "Cleaning", "Painting", "AC & HVAC", "Repairs",
    "Tutoring", "Moving Services", "Carpentry", "Metalwork", "Tiling", "Plastering",
    "Gardening", "Pest Control", "Maintenance", "Other",
  ]
};

const tr = {
  ar: {
    step1: "المعلومات الأساسية",
    step2: "تفاصيل العمل",
    step3: "الخبرات",
    fullName: "الاسم الكامل",
    username: "اسم المستخدم",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    password: "كلمة المرور",
    confirm: "تأكيد كلمة المرور",
    city: "المدينة",
    category: "التخصص",
    bio: "نبذة عنك وخبراتك السابقة",
    yearsOfExperience: "سنوات الخبرة",
    fullNamePlaceholder: "محمد الفاسي",
    phonePlaceholder: "+212 6XX XXX XXX",
    selectCity: "اختر مدينتك",
    selectCategory: "اختر تخصصك",
    bioPlaceholder: "أخبرنا عن خبراتك في هذا المجال، وأي شهادات أو دورات حصلت عليها...",
    experiencePlaceholder: "مثال: 5",
    next: "التالي",
    back: "رجوع",
    submit: "تسجيل كحرفي",
    finish: "إكمال الحساب",
    backToLogin: "العودة لتسجيل الدخول",
    successTitle: "تم إرسال طلب التسجيل",
    successDesc: "حسابك قيد المراجعة. يرجى التواصل مع الإدارة عبر واتساب لإرسال صورة البطاقة الوطنية وتفعيل الحساب.",
    whatsappContact: "مراسلة الإدارة عبر واتساب",
    whatsappText: "مرحباً، أريد تفعيل حسابي في Khidmati. اسم المستخدم: {username}، البريد الإلكتروني: {email}، رقم الهاتف: {phone}",
    usernameLabel: "اسم المستخدم: ",
    emailLabel: "البريد الإلكتروني: ",
    passwordLabel: "كلمة المرور: ",
    yourPhone: "رقم هاتفك: ",
    usernameTaken: "اسم المستخدم مستخدم بالفعل",
    usernameAvailable: "اسم المستخدم متاح",
    strengthWeak: "ضعيف",
    strengthFair: "مقبول",
    strengthGood: "جيد",
    strengthStrong: "قوي",
    strengthVStrong: "قوي جداً",
    strengthLabel: "قوة كلمة المرور:",
    // validations
    nameTooShort: "الاسم قصير جداً",
    nameTooLong: "الاسم طويل جداً",
    usernameTooShort: "اسم المستخدم قصير جداً",
    usernameTooLong: "اسم المستخدم طويل جداً",
    invalidEmail: "أدخل بريداً إلكترونياً صحيحاً",
    invalidPhone: "رقم الهاتف غير صحيح",
    passwordTooShort: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    passwordsMustMatch: "كلمتا المرور غير متطابقتين",
    bioTooShort: "اكتب وصفاً مختصراً عن خبراتك (10 أحرف على الأقل)",
    bioTooLong: "الوصف طويل جداً (500 حرف كحد أقصى)",
    experienceMin: "سنوات الخبرة يجب أن تكون 0 أو أكثر",
    experienceMax: "يرجى إدخال قيمة صحيحة",
  },
  fr: {
    step1: "Informations de base",
    step2: "Détails du travail",
    step3: "Expériences",
    fullName: "Nom complet",
    username: "Nom d'utilisateur",
    email: "Adresse e-mail",
    phone: "Téléphone",
    password: "Mot de passe",
    confirm: "Confirmer le mot de passe",
    city: "Ville",
    category: "Spécialité",
    bio: "À propos de vous et votre expérience",
    yearsOfExperience: "Années d'expérience",
    fullNamePlaceholder: "Jean Dupont",
    phonePlaceholder: "+212 6XX XXX XXX",
    selectCity: "Choisissez votre ville",
    selectCategory: "Choisissez votre spécialité",
    bioPlaceholder: "Parlez-nous de votre expérience, certificats ou cours suivis...",
    experiencePlaceholder: "Exemple: 5",
    next: "Suivant",
    back: "Retour",
    submit: "S'inscrire comme artisan",
    finish: "Terminer le compte",
    backToLogin: "Retour à la connexion",
    successTitle: "Demande d'inscription envoyée",
    successDesc: "Votre compte est en cours d'examen. Veuillez contacter l'administration via WhatsApp pour envoyer une photo de votre CIN afin d'activer votre compte.",
    whatsappContact: "Contacter l'admin via WhatsApp",
    whatsappText: "Bonjour, je souhaite activer mon compte Khidmati. Nom d'utilisateur: {username}, E-mail: {email}, Téléphone: {phone}",
    usernameLabel: "Nom d'utilisateur : ",
    emailLabel: "E-mail : ",
    passwordLabel: "Mot de passe : ",
    yourPhone: "Votre téléphone : ",
    usernameTaken: "Ce nom d'utilisateur est déjà pris",
    usernameAvailable: "Nom d'utilisateur disponible",
    strengthWeak: "Faible",
    strengthFair: "Acceptable",
    strengthGood: "Bien",
    strengthStrong: "Fort",
    strengthVStrong: "Très fort",
    strengthLabel: "Force du mot de passe:",
    // validations
    nameTooShort: "Le nom est trop court",
    nameTooLong: "Le nom est trop long",
    usernameTooShort: "Le nom d'utilisateur est trop court",
    usernameTooLong: "Le nom d'utilisateur est trop long",
    invalidEmail: "Entrez un e-mail valide",
    invalidPhone: "Numéro de téléphone invalide",
    passwordTooShort: "Le mot de passe doit comporter au moins 6 caractères",
    passwordsMustMatch: "Les mots de passe ne correspondent pas",
    bioTooShort: "Écrivez une brève description de vos expériences (au moins 10 caractères)",
    bioTooLong: "Description trop longue (500 caractères maximum)",
    experienceMin: "Les années d'expérience doivent être supérieures ou égales à 0",
    experienceMax: "Veuillez entrer une valeur valide",
  },
  en: {
    step1: "Basic Information",
    step2: "Work Details",
    step3: "Experience",
    fullName: "Full Name",
    username: "Username",
    email: "Email Address",
    phone: "Phone Number",
    password: "Password",
    confirm: "Confirm Password",
    city: "City",
    category: "Specialty",
    bio: "About you & past experience",
    yearsOfExperience: "Years of Experience",
    fullNamePlaceholder: "John Doe",
    phonePlaceholder: "+212 6XX XXX XXX",
    selectCity: "Select your city",
    selectCategory: "Select your specialty",
    bioPlaceholder: "Tell us about your experience in this field, any certificates or courses...",
    experiencePlaceholder: "Example: 5",
    next: "Next",
    back: "Back",
    submit: "Register as Craftsman",
    finish: "Finish",
    backToLogin: "Back to Login",
    successTitle: "Registration Request Sent",
    successDesc: "Your account is under review. Please contact administration via WhatsApp to send a photo of your national ID and activate the account.",
    whatsappContact: "Message admin on WhatsApp",
    whatsappText: "Hello, I want to activate my Khidmati account. Username: {username}, Email: {email}, Phone: {phone}",
    usernameLabel: "Username: ",
    emailLabel: "Email: ",
    passwordLabel: "Password: ",
    yourPhone: "Your phone: ",
    usernameTaken: "Username is already taken",
    usernameAvailable: "Username is available",
    strengthWeak: "Weak",
    strengthFair: "Fair",
    strengthGood: "Good",
    strengthStrong: "Strong",
    strengthVStrong: "Very Strong",
    strengthLabel: "Password strength:",
    // validations
    nameTooShort: "Name is too short",
    nameTooLong: "Name is too long",
    usernameTooShort: "Username is too short",
    usernameTooLong: "Username is too long",
    invalidEmail: "Enter a valid email",
    invalidPhone: "Invalid phone number",
    passwordTooShort: "Password must be at least 6 characters",
    passwordsMustMatch: "Passwords must match",
    bioTooShort: "Write a short description of your experience (at least 10 characters)",
    bioTooLong: "Description is too long (max 500 characters)",
    experienceMin: "Years of experience must be 0 or more",
    experienceMax: "Please enter a valid value",
  }
};

const getStep1Schema = (l: any) => z.object({
  fullName: z.string().min(3, l.nameTooShort).max(50, l.nameTooLong),
  username: z.string().min(3, l.usernameTooShort).max(20, l.usernameTooLong),
  email: z.string().email(l.invalidEmail).optional().or(z.literal('')),
  phone: z.string().min(8, l.invalidPhone).regex(/^[0-9+\-\s]+$/, l.invalidPhone),
  password: z.string().min(6, l.passwordTooShort),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: l.passwordsMustMatch,
  path: ["confirmPassword"],
});

const getStep1CompleteSchema = (l: any) => z.object({
  username: z.string().min(3, l.usernameTooShort).max(20, l.usernameTooLong),
  phone: z.string().regex(/^[0-9+\-\s]*$/, l.invalidPhone).optional(),
});

const getStep2Schema = (l: any) => z.object({
  city: z.string().min(1, l.selectCity),
  serviceCategory: z.string().min(1, l.selectCategory),
});

const getStep3Schema = (l: any) => z.object({
  bio: z.string().min(10, l.bioTooShort).max(500, l.bioTooLong),
  yearsOfExperience: z.coerce.number().min(0, l.experienceMin).max(70, l.experienceMax),
});

// ──────────────── Password Strength ────────────────
function PasswordStrength({ password, lang }: { password: string; lang: "ar" | "fr" | "en" }) {
  const l = tr[lang];
  const getStrength = (password: string) => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
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

interface ProviderRegisterWizardProps {
  onSuccess: () => void;
  lang?: "ar" | "fr" | "en";
  completeMode?: boolean;
}

export function ProviderRegisterWizard({ onSuccess, lang = "ar", completeMode = false }: ProviderRegisterWizardProps) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { user, register: registerUser, isRegistering, completeProfile, isCompleting } = useAuth();
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const l = tr[lang];
  const isRTL = lang === "ar";
  const stepRef = useRef(step);
  stepRef.current = step;

  const form = useForm({
    resolver: async (values, context, options) => {
      if (stepRef.current === 1) {
        if (completeMode) return zodResolver(getStep1CompleteSchema(l))(values as any, context as any, options as any);
        return zodResolver(getStep1Schema(l))(values as any, context as any, options as any);
      }
      if (stepRef.current === 2) return zodResolver(getStep2Schema(l))(values as any, context as any, options as any);
      if (stepRef.current === 3) return zodResolver(getStep3Schema(l))(values as any, context as any, options as any);
      return zodResolver(z.object({}))(values as any, context as any, options as any);
    },
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      city: "",
      serviceCategory: "",
      bio: "",
      yearsOfExperience: 0,
    },
    mode: "onChange",
  });

  const watchedUsername = form.watch("username");

  // Prefill existing user data when completing a profile
  useEffect(() => {
    if (completeMode && user) {
      const prefix = (user.email || "").split("@")[0].toLowerCase();
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

  const getStepLabel = (s: number) => {
    switch (s) {
      case 1: return l.step1;
      case 2: return l.step2;
      case 3: return l.step3;
      default: return "";
    }
  };

  const nextStep = async () => {
    const valid = await form.trigger();
    if (step === 1 && usernameStatus === "taken") return;
    if (valid) setStep(s => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onSubmit = async (data: any) => {
    try {
      const formValues = form.getValues();
      if (completeMode) {
        await completeProfile({
          role: "provider",
          username: formValues.username.trim().toLowerCase(),
          phone: formValues.phone || null,
          city: formValues.city,
          serviceCategory: formValues.serviceCategory,
          yearsOfExperience: Number(formValues.yearsOfExperience),
          bio: formValues.bio,
        });
        onSuccess();
        return;
      }
      console.log("Form data on submit:", formValues);
      const payload = {
        username: formValues.username,
        email: formValues.email || "",
        fullName: formValues.fullName,
        password: formValues.password,
        role: "provider" as const,
        phone: formValues.phone,
        city: formValues.city,
        language: lang,
        serviceCategory: formValues.serviceCategory,
        providerProfile: {
          serviceCategory: formValues.serviceCategory,
          bio: formValues.bio,
          yearsOfExperience: Number(formValues.yearsOfExperience),
          citiesServed: [formValues.city],
        },
      };
      console.log("Payload being sent:", JSON.stringify(payload));
      await registerUser(payload);
      setSubmitted(true);
    } catch (e: any) {
      form.setError("root", { message: e.message || "حدث خطأ أثناء التسجيل" });
    }
  };

  if (submitted) {
    const phoneVal = form.getValues("phone");
    const usernameVal = form.getValues("username");
    const emailVal = form.getValues("email");
    const adminPhone = import.meta.env.VITE_ADMIN_WHATSAPP || "212627065830";
    
    const rawTemplate = l.whatsappText;
    const waMessage = rawTemplate
      .replace("{username}", usernameVal)
      .replace("{email}", emailVal || "-")
      .replace("{phone}", phoneVal);
      
    const waLink = `https://wa.me/${adminPhone}?text=${encodeURIComponent(waMessage)}`;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8 space-y-6"
      >
        <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center bg-emerald-100">
          <Check className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">{l.successTitle}</h2>
        <p className="text-gray-500 leading-relaxed max-w-sm mx-auto">
          {l.successDesc}
        </p>
        <div className={`bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-1 text-sm ${isRTL ? "text-right" : "text-left"}`}>
          <p className="text-gray-500">{l.usernameLabel}<span className="font-mono font-bold text-gray-900 dark:text-white" dir="ltr">{usernameVal}</span></p>
          <p className="text-gray-500">{l.emailLabel}<span className="text-gray-900 dark:text-white">{emailVal || "-"}</span></p>
          <p className="text-gray-500">{l.passwordLabel}<span className="text-gray-400">(••••••)</span></p>
        </div>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-base transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
        >
          <MessageCircle className="w-5 h-5" />
          {l.whatsappContact}
        </a>
        <p className="text-xs text-gray-400">
          {l.yourPhone}{phoneVal}
        </p>
        <div className="pt-4">
          <Button
            variant="bordered"
            className="rounded-xl"
            onPress={onSuccess}
          >
            {l.backToLogin}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full" dir={isRTL ? "rtl" : "ltr"}>
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
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
            {s < 3 && (
              <div
                className={`w-10 h-0.5 rounded-full transition-all duration-500 ${
                  step > s ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-500 mb-5 font-medium">
        {getStepLabel(step)}
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {!completeMode && (
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.fullName}</p>
                      <FormControl>
                        <Input
                          placeholder={l.fullNamePlaceholder}
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
                )}

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.username}</p>
                      <FormControl>
                        <Input
                          placeholder="mohamed_fassi"
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

                {!completeMode && (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.email}</p>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="mohamed@example.com"
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
                )}

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.phone}</p>
                      <FormControl>
                        <Input
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

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.city}</p>
                      <FormControl>
                        <Select
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

                <FormField
                  control={form.control}
                  name="serviceCategory"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.category}</p>
                      <FormControl>
                        <Select
                          placeholder={l.selectCategory}
                          startContent={<Briefcase className="w-4 h-4 text-gray-400" />}
                          selectedKeys={field.value ? [field.value] : []}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0] as string;
                            if (value) field.onChange(value);
                          }}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        >
                          {(SERVICE_TYPES_TRANSLATED[lang] || SERVICE_TYPES_TRANSLATED.ar).map((c, idx) => (
                            <SelectItem key={c}>{c}</SelectItem>
                          ))}
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <div className="text-red-500 text-sm font-medium p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="bordered"
                    className="flex-1 h-11 rounded-xl"
                    onPress={prevStep}
                  >
                    {isRTL ? <ArrowRight className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
                    {l.back}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 h-11 rounded-xl font-semibold"
                    style={{ background: "linear-gradient(135deg, hsl(183,100%,35%), hsl(200,90%,40%))" }}
                    onPress={nextStep}
                  >
                    {l.next}
                    {isRTL ? <ArrowLeft className="w-4 h-4 mr-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.bio}</p>
                      <FormControl>
                        <Textarea
                          placeholder={l.bioPlaceholder}
                          startContent={<MessageSquare className="w-4 h-4 text-gray-400 mt-3" />}
                          value={field.value}
                          onValueChange={(val) => field.onChange(val)}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        />
                      </FormControl>
                      <p className="text-xs text-gray-400 mt-1">{field.value?.length || 0}/500</p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearsOfExperience"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.yearsOfExperience}</p>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={70}
                          placeholder={l.experiencePlaceholder}
                          startContent={<Star className="w-4 h-4 text-gray-400" />}
                          value={field.value}
                          onValueChange={(val) => field.onChange(val)}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <div className="text-red-500 text-sm font-medium p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="bordered"
                    className="flex-1 h-11 rounded-xl"
                    onPress={prevStep}
                  >
                    {isRTL ? <ArrowRight className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
                    {l.back}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11 rounded-xl font-semibold"
                    style={{ background: "linear-gradient(135deg, hsl(183,100%,35%), hsl(200,90%,40%))" }}
                    isDisabled={completeMode ? isCompleting : isRegistering}
                    isLoading={completeMode ? isCompleting : isRegistering}
                  >
                    {isRegistering || isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : (completeMode ? l.finish : l.submit)}
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
