import { useState, FormEvent } from "react";
import { useLocation } from "wouter";
import { Button, Input } from "@heroui/react";
import { ArrowLeft, Mail, CheckCircle2, Shield } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export default function ForgotPassword() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const isRTL = language === "ar";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(language === "ar" ? "البريد الإلكتروني مطلوب" : language === "fr" ? "L'email est requis" : "Email is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t("error"));
      } else {
        setSuccess(true);
      }
    } catch {
      setError(t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-gray-950 relative overflow-hidden p-6"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none opacity-40"
        style={{ background: "radial-gradient(circle, #e0f7fa 0%, transparent 70%)", filter: "blur(40px)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none opacity-30"
        style={{ background: "radial-gradient(circle, #e0f2fe 0%, transparent 70%)", filter: "blur(40px)" }}
      />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-xl object-cover" />
              <span className="font-bold text-gray-900 dark:text-white">Khidmati</span>
            </div>
          </div>

          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">
                {t("passwordResetSuccess")}
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                {language === "ar" ? "إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور" : language === "fr" ? "Si l'email est enregistré, vous recevrez un lien de réinitialisation" : "If the email is registered, you will receive a password reset link"}
              </p>
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
                style={{ color: "#00bcd4" }}
              >
                <ArrowLeft className="w-4 h-4" />
                  {language === "ar" ? "العودة إلى تسجيل الدخول" : language === "fr" ? "Retour à la connexion" : "Back to login"}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {t("forgotPassword")}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {language === "ar" ? "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين" : language === "fr" ? "Entrez votre email et nous vous enverrons un lien de réinitialisation" : "Enter your email and we'll send you a reset link"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === "ar" ? "البريد الإلكتروني" : language === "fr" ? "Email" : "Email"}
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onValueChange={setEmail}
                    placeholder="you@example.com"
                    startContent={<Mail className="w-4 h-4 text-gray-400" />}
                    className="h-12 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all text-base shadow-sm"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm font-medium p-3.5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                    <Shield className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="w-full h-12 text-base rounded-xl font-bold text-white transition-all duration-200 hover:scale-[1.015] active:scale-[0.99]"
                  style={{
                    background: "linear-gradient(135deg, #00bcd4, #0ea5e9)",
                    boxShadow: "0 4px 20px rgba(0,188,212,0.35)",
                  }}
                >
                  {t("sendResetLink")}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
                  style={{ color: "#00bcd4" }}
                >
                  <ArrowLeft className="w-4 h-4" />
                {language === "ar" ? "العودة إلى تسجيل الدخول" : language === "fr" ? "Retour à la connexion" : "Back to login"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
