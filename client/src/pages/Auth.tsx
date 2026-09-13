import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { Loader2, Eye, EyeOff, Shield, ShieldX } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RegisterWizard } from "@/components/auth/RegisterWizard";
import { ProviderRegisterWizard } from "@/components/auth/ProviderRegisterWizard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Tabs, Tab, Input as HeroInput, Button as HeroButton } from "@heroui/react";

const loginSchema = z.object({
  username: z.string().min(1, "أدخل بريدك الإلكتروني أو اسم المستخدم"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

const t = {
  ar: {
    welcome: "مرحباً بك في",
    appName: "Khidmati",
    subtitle: "المنصة الأولى للخدمات المنزلية في المغرب",
    heroTitle: "أفضل الحرفيين،\nفي خدمتك",
    heroDesc: "نربطك بآلاف الحرفيين الموثوقين في مدينتك — بسرعة، بأمان، وبأفضل الأسعار.",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    username: "البريد الإلكتروني أو اسم المستخدم",
    password: "كلمة المرور",
    forgotPassword: "نسيت كلمة المرور؟",
    signIn: "دخول",
    orContinueWith: "أو تسجيل الدخول بواسطة",
    noAccount: "ليس لديك حساب؟",
    haveAccount: "لديك حساب بالفعل؟",
    signUpNow: "سجّل الآن",
    signInNow: "سجّل دخولك",
    googleBtn: "المتابعة بواسطة Google",
    loginWelcome: "أهلاً بعودتك",
    loginSub: "سجّل دخولك للوصول إلى حسابك",
    registerWelcome: "انضم إلينا اليوم",
    registerSub: "أنشئ حسابك مجاناً في أقل من دقيقة",
    clientRegisterTab: "إنشاء حساب عميل",
    providerRegisterTab: "التسجيل كحرفي",
    deletedByAdmin: "تم حذف حسابك من طرف الإدارة",
    deletedByAdminReason: "السبب",
    deletedByAdminHint: "إذا كانت لديك أي استفسارات، يرجى التواصل مع فريق الدعم.",
  },
  fr: {
    welcome: "Bienvenue sur",
    appName: "Khidmati",
    subtitle: "La 1ère plateforme de services à domicile au Maroc",
    heroTitle: "Les meilleurs artisans,\nà votre service",
    heroDesc: "Connectez-vous à des milliers d'artisans de confiance dans votre ville — rapidement, en toute sécurité.",
    login: "Connexion",
    register: "Créer un compte",
    username: "Email ou nom d'utilisateur",
    password: "Mot de passe",
    forgotPassword: "Mot de passe oublié ?",
    signIn: "Se connecter",
    orContinueWith: "Ou continuer avec",
    noAccount: "Pas encore de compte ?",
    haveAccount: "Vous avez déjà un compte ?",
    signUpNow: "S'inscrire",
    signInNow: "Se connecter",
    googleBtn: "Continuer avec Google",
    loginWelcome: "Content de vous revoir",
    loginSub: "Connectez-vous pour accéder à votre compte",
    registerWelcome: "Rejoignez-nous",
    registerSub: "Créez votre compte gratuitement en moins d'une minute",
    clientRegisterTab: "Compte Client",
    providerRegisterTab: "Compte Artisan",
    deletedByAdmin: "Votre compte a été supprimé par l'administration",
    deletedByAdminReason: "Raison",
    deletedByAdminHint: "Si vous avez des questions, veuillez contacter l'équipe d'assistance.",
  },
  en: {
    welcome: "Welcome to",
    appName: "Khidmati",
    subtitle: "Morocco's #1 Home Services Platform",
    heroTitle: "Top-rated craftsmen,\nat your doorstep",
    heroDesc: "Connect with thousands of trusted professionals in your city — fast, safe, and affordable.",
    login: "Sign In",
    register: "Create Account",
    username: "Email or username",
    password: "Password",
    forgotPassword: "Forgot password?",
    signIn: "Sign In",
    orContinueWith: "Or continue with",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    signUpNow: "Sign Up",
    signInNow: "Sign In",
    googleBtn: "Continue with Google",
    loginWelcome: "Welcome back",
    loginSub: "Sign in to access your account",
    registerWelcome: "Join us today",
    registerSub: "Create your free account in under a minute",
    clientRegisterTab: "Client Account",
    providerRegisterTab: "Craftsman Account",
    deletedByAdmin: "Your account was deleted by an administrator",
    deletedByAdminReason: "Reason",
    deletedByAdminHint: "If you have any questions, please contact the support team.",
  },
};

/* ── Floating animated orb ───────────────────────────────────────── */
function Orb({
  size, top, left, color, delay = 0,
}: {
  size: number; top: string; left: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: size, height: size, top, left, background: color, filter: "blur(60px)", opacity: 0.25 }}
      animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
      transition={{ repeat: Infinity, duration: 6 + delay, ease: "easeInOut", delay }}
    />
  );
}

/* ── Geometric dots pattern ─────────────────────────────────────── */
function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />
  );
}

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [registerMode, setRegisterMode] = useState<"client" | "provider">("client");
  const [showPassword, setShowPassword] = useState(false);
  const [deletedInfo, setDeletedInfo] = useState<string | null>(null);
  const { user, login, isLoggingIn } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [location, setLocation] = useLocation();

  const tr = t[language];
  const isRTL = language === "ar";

  useEffect(() => {
    if (user) {
      if (user.role === "provider") setLocation("/provider/dashboard");
      else if (user.role === "admin") setLocation("/k-admin-portal-secure");
      else if (!user.city) setLocation("/complete-profile");
      else setLocation("/");
    }
  }, [user, setLocation]);

  useEffect(() => {
    if (location.includes("register") && activeTab !== "register") {
      setActiveTab("register");
    }
  }, [location]);

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onLogin = async (data: any) => {
    loginForm.clearErrors("root");
    setDeletedInfo(null);
    try {
      await login(data);
    } catch (e: any) {
      if (e.deleted) {
        setDeletedInfo(e.reason || "");
        return;
      }
      loginForm.setError("root", { message: e.message });
    }
  };

  return (
    <div
      className="min-h-screen flex"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ fontFamily: isRTL ? "'IBM Plex Sans Arabic', sans-serif" : "'DM Sans', sans-serif" }}
    >
      {/* ═══════════════════════════════════════════════════
          CENTERED PREMIUM CARD
      ═══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-black min-h-screen relative overflow-hidden">
        {/* Subtle geometric or glow bg */}
        <div className="absolute inset-0 dot-grid pointer-events-none opacity-50" />
        <div
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none opacity-40"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none opacity-30"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)", filter: "blur(60px)" }}
        />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-7 pt-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-9 h-9 rounded-xl object-cover"
            />
            <span className="font-bold text-gray-900 dark:text-white text-lg">{tr.appName}</span>
          </div>

          {/* Language switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 ml-auto shadow-sm border border-gray-100 dark:border-gray-700">
            {(["ar", "fr", "en"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  language === lang
                    ? "text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }`}
                style={
                  language === lang
                    ? { background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }
                    : {}
                }
              >
                {lang === "ar" ? "ع" : lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Form container */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-[480px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/50 p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.04)]" style={{ borderRadius: "32px" }}>

            {/* Tab switcher */}
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key: any) => setActiveTab(key as "login" | "register")}
              variant="solid"
              size="lg"
              fullWidth
              classNames={{
                tabList: "bg-zinc-100/50 dark:bg-zinc-800/50 rounded-[20px] p-1.5 border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm mb-8",
                cursor: "bg-white dark:bg-zinc-700 shadow-sm rounded-2xl",
                tab: "h-11",
                tabContent: "group-data-[selected=true]:text-zinc-900 dark:group-data-[selected=true]:text-white text-zinc-500 font-bold"
              }}
            >
              <Tab key="login" title={tr.login} />
              <Tab key="register" title={tr.register} />
            </Tabs>

            {/* Animated form panels */}
            <AnimatePresence mode="wait">
              {activeTab === "login" ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: isRTL ? -24 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? 24 : -24 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  {/* Header */}
                  <div className="mb-7">
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                      {tr.loginWelcome}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {tr.loginSub}
                    </p>
                    <p className="text-sm text-gray-500 mt-1.5">
                      {tr.noAccount}{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("register")}
                        className="font-bold hover:underline text-indigo-600 dark:text-indigo-400"
                      >
                        {tr.signUpNow}
                      </button>
                    </p>
                  </div>

                  {/* Google */}
                  <GoogleButton label={tr.googleBtn} className="mb-5" />

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-[11px] text-gray-400 font-medium px-1">{tr.orContinueWith}</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>

                  {/* Form */}
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {tr.username}
                            </FormLabel>
                            <FormControl>
                              <HeroInput
                                id="login-username"
                                placeholder="you@example.com"
                                variant="bordered"
                                radius="lg"
                                classNames={{
                                  inputWrapper: "h-14 rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 focus-within:border-indigo-500/30 focus-within:ring-indigo-500/10 shadow-inner",
                                  input: "text-base font-medium text-zinc-900 dark:text-white"
                                }}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {tr.password}
                              </FormLabel>
                              <button
                                type="button"
                                onClick={() => setLocation("/forgot-password")}
                                className="text-xs font-bold hover:underline text-indigo-600 dark:text-indigo-400"
                              >
                                {tr.forgotPassword}
                              </button>
                            </div>
                            <FormControl>
                              <HeroInput
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                variant="bordered"
                                radius="lg"
                                classNames={{
                                  inputWrapper: "h-14 rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 focus-within:border-indigo-500/30 focus-within:ring-indigo-500/10 shadow-inner",
                                  input: "text-base font-medium text-zinc-900 dark:text-white"
                                }}
                                endContent={
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-gray-300 hover:text-gray-500 transition-colors focus:outline-none"
                                  >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                }
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {deletedInfo !== null && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-3 text-red-600 text-sm font-medium p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800"
                        >
                          <ShieldX className="w-5 h-5 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold">{tr.deletedByAdmin}</p>
                            <p className="text-red-700/90 dark:text-red-300/90 font-semibold">
                              {tr.deletedByAdminReason}: {deletedInfo}
                            </p>
                            <p className="text-xs text-red-500/80 dark:text-red-400/80 font-medium">{tr.deletedByAdminHint}</p>
                          </div>
                        </motion.div>
                      )}

                      {loginForm.formState.errors.root && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-red-600 text-sm font-medium p-3.5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800"
                        >
                          <Shield className="w-4 h-4 shrink-0" />
                          {loginForm.formState.errors.root.message}
                        </motion.div>
                      )}

                      <HeroButton
                        id="login-submit"
                        type="submit"
                        className="w-full h-14 text-base font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 mt-2 shadow-lg hover:scale-[1.02] transition-transform"
                        style={{ borderRadius: "16px" }}
                        isLoading={isLoggingIn}
                      >
                        {tr.signIn}
                      </HeroButton>
                    </form>
                  </Form>
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: isRTL ? -24 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? 24 : -24 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  {/* Header */}
                  <div className="mb-7">
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                      {tr.registerWelcome}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {tr.registerSub}
                    </p>
                    <p className="text-sm text-gray-500 mt-1.5">
                      {tr.haveAccount}{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("login")}
                        className="font-semibold hover:underline"
                        style={{ color: "#00bcd4" }}
                      >
                        {tr.signInNow}
                      </button>
                    </p>
                  </div>

                  {/* Google */}
                  <GoogleButton label={tr.googleBtn} className="mb-5" />

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-[11px] text-gray-400 font-medium px-1">{tr.orContinueWith}</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>

                  {/* Register mode toggle */}
                  <Tabs
                    selectedKey={registerMode}
                    onSelectionChange={(key: any) => setRegisterMode(key as "client" | "provider")}
                    variant="solid"
                    size="md"
                    fullWidth
                    classNames={{
                      tabList: "bg-zinc-100/50 dark:bg-zinc-800/50 rounded-[16px] p-1.5 border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm mb-6",
                      cursor: "bg-white dark:bg-zinc-700 shadow-sm rounded-xl",
                      tab: "h-10",
                      tabContent: "group-data-[selected=true]:text-zinc-900 dark:group-data-[selected=true]:text-white text-zinc-500 font-bold text-sm"
                    }}
                  >
                    <Tab key="client" title={tr.clientRegisterTab} />
                    <Tab key="provider" title={tr.providerRegisterTab} />
                  </Tabs>

                  {registerMode === "client" ? (
                    <RegisterWizard onSuccess={() => setActiveTab("login")} lang={language} />
                  ) : (
                    <ProviderRegisterWizard onSuccess={() => setActiveTab("login")} lang={language} />
                  )}
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          </div>

        {/* Footer */}
        <div className="relative z-10 px-6 pb-6 text-center">
          <p className="text-[11px] text-gray-300 dark:text-gray-600">
            © {new Date().getFullYear()} Khidmati · جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
}
