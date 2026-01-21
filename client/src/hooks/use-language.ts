import { useState, useEffect } from "react";

type Language = "en" | "fr" | "ar";

const TRANSLATIONS = {
  en: {
    findService: "Find a Service",
    joinProvider: "Join as Provider",
    search: "Search",
    city: "City",
    category: "Category",
    login: "Login",
    register: "Register",
    logout: "Logout",
    dashboard: "Dashboard",
    messages: "Messages",
    profile: "Profile",
    reviews: "Reviews",
    contact: "Contact",
    book: "Book Now",
    loading: "Loading...",
    noResults: "No results found",
    welcome: "Find the best professionals for your needs",
  },
  fr: {
    findService: "Trouver un Service",
    joinProvider: "Devenir Prestataire",
    search: "Rechercher",
    city: "Ville",
    category: "Catégorie",
    login: "Connexion",
    register: "S'inscrire",
    logout: "Déconnexion",
    dashboard: "Tableau de bord",
    messages: "Messages",
    profile: "Profil",
    reviews: "Avis",
    contact: "Contacter",
    book: "Réserver",
    loading: "Chargement...",
    noResults: "Aucun résultat trouvé",
    welcome: "Trouvez les meilleurs professionnels pour vos besoins",
  },
  ar: {
    findService: "ابحث عن خدمة",
    joinProvider: "انضم كمقدم خدمة",
    search: "بحث",
    city: "المدينة",
    category: "الفئة",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    logout: "خروج",
    dashboard: "لوحة التحكم",
    messages: "الرسائل",
    profile: "الملف الشخصي",
    reviews: "التقييمات",
    contact: "اتصل",
    book: "احجز الآن",
    loading: "جاري التحميل...",
    noResults: "لا توجد نتائج",
    welcome: "اعثر على أفضل المحترفين لاحتياجاتك",
  },
};

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("khidmati-lang");
    return (saved as Language) || "en";
  });

  useEffect(() => {
    localStorage.setItem("khidmati-lang", language);
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  return {
    language,
    setLanguage,
    t: (key: keyof typeof TRANSLATIONS["en"]) => TRANSLATIONS[language][key] || key,
    isRTL: language === "ar",
  };
}
