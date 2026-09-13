import { Layout } from "@/components/Layout";
import { useLanguage } from "@/hooks/use-language";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  const { t, language, isRTL } = useLanguage();

  const isAr = language === "ar";
  const isFr = language === "fr";

  const privacySections = [
    {
      title: isAr ? "١. المعلومات التي نجمعها" : isFr ? "1. Informations collectées" : "1. Information We Collect",
      body: isAr
        ? "نجمع المعلومات التي تقدمها لنا مباشرةً عند إنشاء حساب، مثل: الاسم الكامل، البريد الإلكتروني، رقم الهاتف، والصورة الشخصية. كما نجمع بيانات الاستخدام مثل الحجوزات والرسائل وتفضيلاتك."
        : isFr
        ? "Nous collectons les informations que vous nous fournissez directement lors de la création d'un compte, comme : nom complet, adresse e-mail, numéro de téléphone et photo de profil."
        : "We collect information you provide directly when creating an account, such as: full name, email address, phone number, and profile photo. We also collect usage data like bookings, messages, and your preferences.",
    },
    {
      title: isAr ? "٢. كيفية استخدام المعلومات" : isFr ? "2. Utilisation des données" : "2. How We Use Your Information",
      body: isAr
        ? "نستخدم معلوماتك لتقديم وتحسين خدماتنا، وإدارة حسابك، ومعالجة الحجوزات، وإرسال الإشعارات ذات الصلة، وضمان أمان المنصة."
        : isFr
        ? "Nous utilisons vos informations pour fournir et améliorer nos services, gérer votre compte, traiter les réservations et envoyer des notifications pertinentes."
        : "We use your information to provide and improve our services, manage your account, process bookings, send relevant notifications, and ensure platform security.",
    },
    {
      title: isAr ? "٣. مشاركة المعلومات" : isFr ? "3. Partage des données" : "3. Information Sharing",
      body: isAr
        ? "لا نبيع معلوماتك الشخصية لأي طرف ثالث. نشارك فقط البيانات اللازمة بين العملاء والحرفيين لإتمام الخدمات المطلوبة."
        : isFr
        ? "Nous ne vendons pas vos données personnelles à des tiers. Nous partageons uniquement les données nécessaires entre clients et prestataires pour réaliser les services demandés."
        : "We do not sell your personal information to third parties. We only share the necessary data between clients and providers to complete requested services.",
    },
    {
      title: isAr ? "٤. أمان البيانات" : isFr ? "4. Sécurité des données" : "4. Data Security",
      body: isAr
        ? "نستخدم تشفير SSL وتقنيات أمان حديثة لحماية بياناتك. كلمات المرور مشفرة ولا يمكن لأحد الاطلاع عليها، بما فيهم فريقنا."
        : isFr
        ? "Nous utilisons le chiffrement SSL et des technologies de sécurité modernes pour protéger vos données. Les mots de passe sont cryptés et inaccessibles même à notre équipe."
        : "We use SSL encryption and modern security technologies to protect your data. Passwords are hashed and cannot be accessed by anyone, including our team.",
    },
    {
      title: isAr ? "٥. حقوقك" : isFr ? "5. Vos droits" : "5. Your Rights",
      body: isAr
        ? "يحق لك في أي وقت: الاطلاع على بياناتك، تصحيحها، طلب حذفها، أو تصدير نسخة منها. تواصل معنا على support@khidmati.ma."
        : isFr
        ? "Vous avez le droit à tout moment de : consulter vos données, les corriger, demander leur suppression ou exporter une copie. Contactez-nous à support@khidmati.ma."
        : "You have the right at any time to: access your data, correct it, request deletion, or export a copy. Contact us at support@khidmati.ma.",
    },
  ];

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
                <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white mb-3">
                {isAr ? "سياسة الخصوصية" : isFr ? "Politique de confidentialité" : "Privacy Policy"}
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
            className="prose prose-slate dark:prose-invert max-w-none space-y-8"
          >
            {privacySections.map((section, i) => (
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
