import { Layout } from "@/components/Layout";
import { useLanguage } from "@/hooks/use-language";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

export default function TermsPage() {
  const { language, isRTL } = useLanguage();

  const isAr = language === "ar";
  const isFr = language === "fr";

  return (
    <Layout>
      <div dir={isRTL ? "rtl" : "ltr"}>
        {/* Hero */}
        <div className="bg-zinc-50 dark:bg-black border-b border-zinc-200/50 dark:border-zinc-800/50 relative overflow-hidden py-16">
          <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 bg-indigo-50 dark:bg-indigo-950/40">
                <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white mb-3">
                {isAr ? "الشروط والأحكام" : isFr ? "Conditions d'utilisation" : "Terms of Service"}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                {isAr ? "آخر تحديث: يونيو 2025" : isFr ? "Dernière mise à jour : Juin 2025" : "Last updated: June 2025"}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-14 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {[
              {
                title: isAr ? "١. قبول الشروط" : isFr ? "1. Acceptation des conditions" : "1. Acceptance of Terms",
                body: isAr
                  ? "باستخدامك لمنصة Khidmati، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يرجى عدم استخدام المنصة."
                  : isFr
                  ? "En utilisant la plateforme Khidmati, vous acceptez d'être lié par ces conditions. Si vous n'acceptez pas une partie de ces conditions, veuillez ne pas utiliser la plateforme."
                  : "By using the Khidmati platform, you agree to be bound by these Terms of Service. If you disagree with any part, please do not use the platform.",
              },
              {
                title: isAr ? "٢. الحسابات والمسؤولية" : isFr ? "2. Comptes et responsabilités" : "2. Accounts & Responsibility",
                body: isAr
                  ? "أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة المرور. يجب عليك إخطارنا فوراً بأي استخدام غير مصرح به لحسابك."
                  : isFr
                  ? "Vous êtes responsable de la confidentialité de vos informations de compte. Vous devez nous informer immédiatement de toute utilisation non autorisée."
                  : "You are responsible for maintaining the confidentiality of your account information and password. You must notify us immediately of any unauthorized use of your account.",
              },
              {
                title: isAr ? "٣. قواعد الاستخدام" : isFr ? "3. Règles d'utilisation" : "3. Usage Rules",
                body: isAr
                  ? "يُحظر استخدام المنصة لأغراض غير قانونية، أو نشر محتوى مسيء، أو التحرش بالمستخدمين الآخرين. يحق لنا تعليق أي حساب ينتهك هذه القواعد."
                  : isFr
                  ? "Il est interdit d'utiliser la plateforme à des fins illégales, de publier du contenu offensant ou de harceler d'autres utilisateurs. Nous nous réservons le droit de suspendre tout compte en violation."
                  : "Using the platform for illegal purposes, posting offensive content, or harassing other users is prohibited. We reserve the right to suspend any account that violates these rules.",
              },
              {
                title: isAr ? "٤. الحجوزات والخدمات" : isFr ? "4. Réservations et services" : "4. Bookings & Services",
                body: isAr
                  ? "Khidmati هي منصة وسيطة تربط العملاء بمزودي الخدمات. لسنا مسؤولين عن جودة الخدمات المقدمة، لكننا نضمن مراجعة جميع مزودي الخدمات قبل قبولهم."
                  : isFr
                  ? "Khidmati est une plateforme intermédiaire reliant les clients aux prestataires. Nous ne sommes pas responsables de la qualité des services, mais nous garantissons la vérification de tous les prestataires."
                  : "Khidmati is an intermediary platform connecting clients with service providers. We are not responsible for the quality of services, but we ensure all providers are reviewed before acceptance.",
              },
              {
                title: isAr ? "٥. التعديلات على الشروط" : isFr ? "5. Modifications des conditions" : "5. Modifications to Terms",
                body: isAr
                  ? "نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار داخل التطبيق."
                  : isFr
                  ? "Nous nous réservons le droit de modifier ces conditions à tout moment. Vous serez notifié de tout changement important par e-mail ou notification dans l'application."
                  : "We reserve the right to modify these terms at any time. You will be notified of any material changes via email or in-app notification.",
              },
            ].map((section, i) => (
              <motion.section
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 0.3 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <h2 className="text-lg font-bold text-foreground mb-3">{section.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{section.body}</p>
              </motion.section>
            ))}

            <div className="text-center pt-6">
              <p className="text-muted-foreground text-sm">
                {isAr ? "لأي استفسار:" : isFr ? "Pour toute question :" : "For any questions:"}{" "}
                <a href="mailto:support@khidmati.ma" className="text-cyan-600 font-semibold hover:underline">
                  support@khidmati.ma
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
