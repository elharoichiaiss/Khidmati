import { useState, FormEvent, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button, Input } from "@heroui/react";
import { Eye, EyeOff, CheckCircle2, Shield, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export default function ResetPassword() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const params = new URLSearchParams(search);
  const token = params.get("token");

  const isRTL = language === "ar";

  useEffect(() => {
    if (!token) {
      setError(language === "ar" ? "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" : language === "fr" ? "Lien de réinitialisation invalide ou expiré" : "Reset link is invalid or expired");
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(language === "ar" ? "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" : language === "fr" ? "Lien de réinitialisation invalide ou expiré" : "Reset link is invalid or expired");
      return;
    }

    if (password.length < 6) {
      setError(language === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : language === "fr" ? "Le mot de passe doit contenir au moins 6 caractères" : "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError(language === "ar" ? "كلمة المرور غير متطابقة" : language === "fr" ? "Les mots de passe ne correspondent pas" : "Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t("error"));
      } else {
        setSuccess(true);
        setTimeout(() => setLocation("/login"), 3000);
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
                {language === "ar" ? "يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة" : language === "fr" ? "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe" : "You can now log in with your new password"}
              </p>
                <Button
                  type="button"
                  onPress={() => setLocation("/login")}
                  className="h-11 px-6 rounded-xl font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #00bcd4, #0ea5e9)",
                    boxShadow: "0 4px 20px rgba(0,188,212,0.35)",
                  }}
                >
                  {language === "ar" ? "العودة إلى تسجيل الدخول" : language === "fr" ? "Retour à la connexion" : "Back to login"}
                </Button>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {t("resetPassword")}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {language === "ar" ? "أدخل كلمة المرور الجديدة" : language === "fr" ? "Entrez votre nouveau mot de passe" : "Enter your new password"}
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm font-medium p-3.5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 mb-4">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {!token && !error && (
                <div className="flex items-center gap-2 text-amber-600 text-sm font-medium p-3.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800 mb-4">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {language === "ar" ? "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" : language === "fr" ? "Lien de réinitialisation invalide ou expiré" : "Reset link is invalid or expired"}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t("newPassword")}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onValueChange={setPassword}
                      placeholder="••••••••"
                      className="h-12 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all text-base pr-12 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3.5 flex items-center text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t("confirmPassword")}
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onValueChange={setConfirmPassword}
                      placeholder="••••••••"
                      className="h-12 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all text-base pr-12 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-3.5 flex items-center text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  isDisabled={!token}
                  className="w-full h-12 text-base rounded-xl font-bold text-white transition-all duration-200 hover:scale-[1.015] active:scale-[0.99] mt-2"
                  style={{
                    background: "linear-gradient(135deg, #00bcd4, #0ea5e9)",
                    boxShadow: "0 4px 20px rgba(0,188,212,0.35)",
                  }}
                >
                  {language === "ar" ? "إعادة تعيين" : language === "fr" ? "Réinitialiser" : "Reset"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
                  style={{ color: "#00bcd4" }}
                >
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
