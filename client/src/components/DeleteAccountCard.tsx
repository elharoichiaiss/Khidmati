import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Modal, ModalContent, Input, Button } from "@heroui/react";
import {
  TriangleAlert,
  Trash2,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  UserRound,
  CalendarX2,
  MessageSquareX,
  FileX2,
  Star,
  HeartOff,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

const REASON_KEYS = [
  "deleteReasonNotUseful",
  "deleteReasonAlternative",
  "deleteReasonPrivacy",
  "deleteReasonNotifications",
  "deleteReasonOther",
];

const LOSES_KEYS = [
  { key: "deleteAccountData", icon: UserRound },
  { key: "deleteAccountBookings", icon: CalendarX2 },
  { key: "deleteAccountMessages", icon: MessageSquareX },
  { key: "deleteAccountInvoices", icon: FileX2 },
  { key: "deleteAccountReviews", icon: Star },
  { key: "deleteAccountFavorites", icon: HeartOff },
];

// Case / spacing / diacritics-insensitive matching works across en / fr / ar.
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase()
    .replace(/\s+/g, "");

interface DeleteAccountCardProps {
  user: any;
}

export function DeleteAccountCard({ user }: DeleteAccountCardProps) {
  const { t, language } = useLanguage();
  const { deleteAccount, isDeleting } = useAuth();
  const [_, setLocation] = useLocation();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState("");
  const [phrase, setPhrase] = useState("");
  const [understand, setUnderstand] = useState(false);
  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState(false);

  const isRTL = language === "ar";
  // Localized deletion phrase, shown visibly so the user can copy it.
  const deletionPhrase = language === "ar" ? "احذف" : language === "fr" ? "SUPPRIMER" : "DELETE";

  useEffect(() => {
    if (open) {
      setStep(0);
      setReason("");
      setPhrase("");
      setUnderstand(false);
      setError("");
      setDeleted(false);
    }
  }, [open]);

  const handleDelete = async () => {
    setError("");
    try {
      await deleteAccount({ reason: reason || undefined });
      setDeleted(true);
      setStep(3);
      // Give a short moment to show the success screen, then drop the
      // cached user + navigate home so the account visibly disappears.
      window.setTimeout(() => {
        queryClient.removeQueries({ queryKey: [api.auth.me.path] });
        setLocation("/");
      }, 1800);
    } catch (e: any) {
      setError(e.message || t("operationFailed"));
    }
  };

  const goHome = () => {
    queryClient.removeQueries({ queryKey: [api.auth.me.path] });
    setLocation("/");
  };

  const phraseMatched = normalize(phrase) === normalize(deletionPhrase);
  const canSubmit = phraseMatched && understand;

  const StepDots = () => (
    <div className="flex items-center justify-center gap-2 mb-5">
      {[0, 1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              step >= s ? "bg-red-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
            }`}
          >
            {step > s ? <Check className="w-3.5 h-3.5" /> : s + 1}
          </div>
          {s < 2 && (
            <div className={`w-10 h-0.5 rounded-full transition-all duration-500 ${step > s ? "bg-red-500" : "bg-zinc-200 dark:bg-zinc-700"}`} />
          )}
        </div>
      ))}
    </div>
  );

  const FooterButtons = ({
    showBack,
    onBack,
    primaryLabel,
    primaryOnPress,
    primaryDisabled = false,
    primaryLoading = false,
  }: {
    showBack: boolean;
    onBack?: () => void;
    primaryLabel: string;
    primaryOnPress?: () => void;
    primaryDisabled?: boolean;
    primaryLoading?: boolean;
  }) => (
    <div className="flex gap-3 pt-2">
      {showBack && (
        <Button variant="bordered" className="flex-1 h-11 rounded-xl font-semibold" onPress={onBack} isDisabled={primaryLoading}>
          {isRTL ? <ArrowRight className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
          {t("back")}
        </Button>
      )}
      <Button
        className={`${showBack ? "flex-1" : "w-full"} h-11 rounded-xl font-bold`}
        style={{ background: "linear-gradient(135deg, hsl(0,84%,60%), hsl(0,72%,51%))" }}
        onPress={primaryOnPress}
        isDisabled={primaryDisabled}
        isLoading={primaryLoading}
      >
        {primaryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : primaryLabel}
      </Button>
    </div>
  );

  return (
    <>
      <div className="bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 shadow-[0_10px_30px_rgba(0,0,0,0.03)] mb-4" style={{ borderRadius: "28px" }}>
        <div className="px-6 py-4 border-b border-red-100 dark:border-red-900/40">
          <h3 className="text-lg font-extrabold flex items-center gap-2 text-red-600 dark:text-red-400">
            <div className="p-2 bg-red-100 dark:bg-red-950/40 rounded-2xl text-red-600 dark:text-red-400">
              <TriangleAlert className="w-5 h-5" />
            </div>
            {t("deleteAccountDanger")}
          </h3>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <div className="space-y-1">
            <p className="font-bold text-zinc-900 dark:text-white">{t("deleteAccount")}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">{t("deleteAccountCardDesc")}</p>
          </div>
          <Button
            variant="bordered"
            className="shrink-0 h-12 rounded-xl font-bold text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30"
            startContent={<Trash2 className="w-4 h-4" />}
            onPress={() => setOpen(true)}
          >
            {t("deleteAccount")}
          </Button>
        </div>
      </div>

      <Modal isOpen={open} onOpenChange={(v) => !deleted && !isDeleting && setOpen(v)} placement="center" className="max-w-[480px]">
        <ModalContent className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-2xl" style={{ borderRadius: "28px" }}>
          {deleted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 text-center space-y-5"
              dir={isRTL ? "rtl" : "ltr"}
            >
              <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/30">
                <ShieldCheck className="w-11 h-11 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{t("deleteAccountSuccessTitle")}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">{t("deleteAccountSuccessDesc")}</p>
              <Button
                className="mt-2 h-11 rounded-xl font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                style={{ borderRadius: "16px" }}
                onPress={goHome}
              >
                {t("deleteAccountBackHome")}
              </Button>
            </motion.div>
          ) : (
            <div dir={isRTL ? "rtl" : "ltr"} className="p-7 sm:p-8">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-100 dark:bg-red-950/40 rounded-2xl text-red-600 dark:text-red-400">
                    <TriangleAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-white">{t("deleteAccountModalTitle")}</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("deleteAccountModalSub")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <StepDots />

              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="s0"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-sm font-bold text-zinc-900 dark:text-white mb-3">{t("deleteAccountWhatLoses")}</p>
                    <div className="space-y-2 mb-5">
                      {LOSES_KEYS.map(({ key, icon: Icon }) => (
                        <div key={key} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl">
                          <div className="p-1.5 rounded-xl bg-white dark:bg-zinc-900 text-red-500 dark:text-red-400">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t(key)}</span>
                        </div>
                      ))}
                    </div>
                    <FooterButtons
                      showBack={false}
                      primaryLabel={t("continueBtn")}
                      primaryOnPress={() => setStep(1)}
                    />
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="s1"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{t("deleteAccountReasonTitle")}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">{t("deleteAccountReasonSub")}</p>
                    <div className="space-y-2 mb-5">
                      {REASON_KEYS.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setReason(key)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 text-sm font-bold transition-all ${
                            reason === key
                              ? "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                              : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          <span>{t(key)}</span>
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${reason === key ? "border-red-500" : "border-zinc-300 dark:border-zinc-600"}`}>
                            {reason === key && <span className="w-2 h-2 rounded-full bg-red-500" />}
                          </span>
                        </button>
                      ))}
                    </div>
                    <FooterButtons
                      showBack
                      onBack={() => setStep(0)}
                      primaryLabel={t("continueBtn")}
                      primaryOnPress={() => setStep(2)}
                    />
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="s2"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-4 rounded-2xl border-2 border-dashed border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 mb-4">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">{t("deleteAccountTypePhrase")}</p>
                      <p
                        className={`text-center text-2xl font-black text-red-600 dark:text-red-400 tracking-widest leading-relaxed ${
                          isRTL ? "font-arabic" : "font-mono"
                        }`}
                        style={{ wordSpacing: "0.35em" }}
                      >
                        {deletionPhrase}
                      </p>
                    </div>

                    <div className="space-y-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t("deleteAccountTypePlaceholder")}</p>
                        <Input
                          placeholder={deletionPhrase}
                          startContent={<UserRound className="w-4 h-4 text-zinc-400" />}
                          endContent={phraseMatched ? (
                            <span className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            </span>
                          ) : undefined}
                          value={phrase}
                          onValueChange={(v) => { setPhrase(v); setError(""); }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setUnderstand(!understand)}
                        className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border-2 text-sm transition-all ${
                          understand
                            ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                            : "border-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${understand ? "bg-red-500 border-red-500 text-white" : "border-zinc-300 dark:border-zinc-600"}`}>
                          {understand && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 text-left">{t("deleteAccountUnderstand")}</span>
                      </button>
                    </div>

                    {error && (
                      <div className="text-red-500 text-sm font-medium p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 mb-4">
                        {error}
                      </div>
                    )}

                    <FooterButtons
                      showBack
                      onBack={() => setStep(1)}
                      primaryLabel={t("deleteAccountAction")}
                      primaryOnPress={handleDelete}
                      primaryDisabled={!canSubmit}
                      primaryLoading={isDeleting}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}