import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Tabs, Tab } from "@heroui/react";
import { Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { RegisterWizard } from "@/components/auth/RegisterWizard";
import { ProviderRegisterWizard } from "@/components/auth/ProviderRegisterWizard";

const t = {
  ar: {
    appName: "Khidmati",
    welcome: "أكمل ملفك الشخصي",
    sub: "بضع خطوات قصيرة لإكمال حسابك",
    clientRegisterTab: "إنشاء حساب عميل",
    providerRegisterTab: "التسجيل كحرفي",
  },
  fr: {
    appName: "Khidmati",
    welcome: "Complétez votre profil",
    sub: "Quelques étapes rapides pour terminer votre compte",
    clientRegisterTab: "Compte Client",
    providerRegisterTab: "Compte Artisan",
  },
  en: {
    appName: "Khidmati",
    welcome: "Complete your profile",
    sub: "A few quick steps to finish your account",
    clientRegisterTab: "Client Account",
    providerRegisterTab: "Craftsman Account",
  },
};

export default function CompleteProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [registerMode, setRegisterMode] = useState<"client" | "provider">("client");
  const [_, setLocation] = useLocation();

  const [isAuthProcessing, setIsAuthProcessing] = useState(() => {
    return (
      typeof window !== "undefined" &&
      (window.location.hash.includes("access_token") ||
        window.location.hash.includes("refresh_token") ||
        window.location.search.includes("code"))
    );
  });

  const tr = t[language] || t.ar;
  const isRTL = language === "ar";

  useEffect(() => {
    if (isAuthProcessing) {
      const timer = setTimeout(() => {
        setIsAuthProcessing(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isAuthProcessing]);

  useEffect(() => {
    if (isLoading || isAuthProcessing) return;
    if (!user) {
      setLocation("/login");
    } else if (user.role === "admin") {
      setLocation("/k-admin-portal-secure");
    } else if (user.city) {
      if (user.role === "provider") setLocation("/provider/dashboard");
      else setLocation("/");
    }
  }, [isLoading, isAuthProcessing, user, setLocation]);

  if (isLoading || isAuthProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {isRTL ? "جاري التحقق من حساب Google..." : language === "fr" ? "Vérification du compte Google..." : "Verifying Google account..."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex bg-zinc-50 dark:bg-black"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ fontFamily: isRTL ? "'IBM Plex Sans Arabic', sans-serif" : "'DM Sans', sans-serif" }}
    >
      <div className="flex-1 relative overflow-hidden">
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
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-bold text-gray-900 dark:text-white text-lg">{tr.appName}</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => logout()}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isRTL ? "تسجيل الخروج" : language === "fr" ? "Déconnexion" : "Sign Out"}</span>
            </button>

            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-100 dark:border-gray-700">
              {(["ar", "fr", "en"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    language === lang
                      ? "text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  }`}
                  style={language === lang ? { background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" } : {}}
                >
                  {lang === "ar" ? "ع" : lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form container */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 min-h-[calc(100vh-80px)]">
          <div className="w-full max-w-[480px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/50 p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.04)]" style={{ borderRadius: "32px" }}>
            <div className="mb-7">
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">{tr.welcome}</h2>
              <p className="text-sm text-gray-400 mt-1">{tr.sub}</p>
            </div>

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
              <RegisterWizard
                completeMode
                lang={language}
                onSuccess={() => setLocation("/")}
              />
            ) : (
              <ProviderRegisterWizard
                completeMode
                lang={language}
                onSuccess={() => setLocation("/provider/dashboard")}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}