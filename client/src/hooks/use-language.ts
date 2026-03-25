import { useState, useEffect, useCallback } from "react";

type Language = "en" | "fr" | "ar";

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Navigation & Auth
    login: "Login",
    register: "Register",
    logout: "Logout",
    profile: "Profile",
    messages: "Messages",
    dashboard: "Dashboard",
    favorites: "Favorites",
    notifications: "Notifications",
    noNotifications: "No new notifications",
    settings: "Settings",
    findService: "Find a Service",
    joinProvider: "Join as Provider",

    // Home Page
    heroTitle1: "Find the",
    heroTitle2: "Perfect Pro",
    heroTitle3: "for Every Job",
    heroSubtitle: "From home repairs to beauty services, connect with trusted professionals in your city today.",
    installApp: "Install App",
    whatServiceNeed: "What service do you need?",
    search: "Search",
    popular: "Popular:",
    serviceProviders: "Service Providers",
    viewAll: "View All",
    noProvidersYet: "No providers registered yet. Try the search page or register as a provider.",
    exploreCategories: "Explore Categories",
    exploreCategoriesDesc: "Everything you need, right at your fingertips.",
    verifiedPros: "Verified Pros",
    verifiedProsDesc: "Every professional is vetted and verified for your peace of mind and safety.",
    fastBooking: "Fast Booking",
    fastBookingDesc: "Connect and book services instantly. No more waiting for callbacks.",
    communityRated: "Community Rated",
    communityRatedDesc: "Read real reviews from neighbors to pick the best person for the job.",
    areYouPro: "Are you a Professional?",
    joinProDesc: "Join thousands of providers growing their business with Khidmati. Get access to more clients and manage your work easily.",
    joinAsProvider: "Join as Provider",

    // Categories
    homeRepair: "Home Repair",
    beautySpa: "Beauty & Spa",
    cleaning: "Cleaning",
    moving: "Moving",
    electrician: "Electrician",
    plumbing: "Plumbing",
    tutoring: "Tutoring",
    techSupport: "Tech Support",

    // Search Page
    findServices: "Find Services",
    searchByName: "Search by name or keyword...",
    allCategories: "All Categories",
    allCities: "All Cities",
    city: "City",
    category: "Category",
    list: "List",
    map: "Map",
    noResults: "No results found",
    tryAdjusting: "Try adjusting your filters or search terms.",
    showingProfessionals: "Showing {count} professionals",

    // Messages
    typeMessage: "Type a message...",
    selectConversation: "Select a conversation",
    chooseFromSidebar: "Choose from the sidebar to start messaging",
    noConversations: "No conversations yet.",
    messagesAutoDelete: "Messages auto-delete after 7 days",
    delete: "Delete",
    messageDeleted: "Message deleted",
    failedToSend: "Failed to send message",
    failedToDelete: "Failed to delete",
    onlyImagesAllowed: "Only images are allowed",
    imageTooLarge: "Image must be under 5MB",

    // Provider
    book: "Book Now",
    contact: "Contact",
    reviews: "Reviews",
    yearsExp: "years experience",
    available: "Available",
    unavailable: "Unavailable",
    bio: "About",
    citiesServed: "Cities Served",
    portfolio: "Portfolio",
    writeReview: "Write a Review",
    submitReview: "Submit Review",
    rating: "Rating",
    comment: "Comment",
    noReviews: "No reviews yet",
    loginToReview: "Login to write a review",
    professional: "Professional",
    new: "New",
    noBio: "No bio available.",
    remote: "Remote",

    // Favorites
    myFavorites: "My Favorites",
    noFavorites: "No favorites yet",
    noFavoritesDesc: "Start exploring and save your favorite providers!",
    browseProviders: "Browse Providers",

    // Common
    loading: "Loading...",
    error: "Something went wrong",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    welcome: "Find the best professionals for your needs",
    pleaseLogin: "Please login to view this page.",
  },

  fr: {
    // Navigation & Auth
    login: "Connexion",
    register: "S'inscrire",
    logout: "Déconnexion",
    profile: "Profil",
    messages: "Messages",
    dashboard: "Tableau de bord",
    favorites: "Favoris",
    notifications: "Notifications",
    noNotifications: "Aucune nouvelle notification",
    settings: "Paramètres",
    findService: "Trouver un Service",
    joinProvider: "Devenir Prestataire",

    // Home Page
    heroTitle1: "Trouvez le",
    heroTitle2: "Pro Parfait",
    heroTitle3: "pour Chaque Travail",
    heroSubtitle: "Des réparations à domicile aux services de beauté, connectez-vous avec des professionnels de confiance dans votre ville.",
    installApp: "Installer l'App",
    whatServiceNeed: "De quel service avez-vous besoin ?",
    search: "Rechercher",
    popular: "Populaires :",
    serviceProviders: "Prestataires de Services",
    viewAll: "Voir Tout",
    noProvidersYet: "Aucun prestataire inscrit pour le moment. Essayez la page de recherche ou inscrivez-vous en tant que prestataire.",
    exploreCategories: "Explorer les Catégories",
    exploreCategoriesDesc: "Tout ce dont vous avez besoin, à portée de main.",
    verifiedPros: "Pros Vérifiés",
    verifiedProsDesc: "Chaque professionnel est vérifié pour votre tranquillité d'esprit et votre sécurité.",
    fastBooking: "Réservation Rapide",
    fastBookingDesc: "Connectez-vous et réservez instantanément. Plus besoin d'attendre.",
    communityRated: "Notés par la Communauté",
    communityRatedDesc: "Lisez les vrais avis de vos voisins pour choisir le meilleur professionnel.",
    areYouPro: "Êtes-vous un Professionnel ?",
    joinProDesc: "Rejoignez des milliers de prestataires qui développent leur activité avec Khidmati. Accédez à plus de clients et gérez votre travail facilement.",
    joinAsProvider: "Devenir Prestataire",

    // Categories
    homeRepair: "Réparation",
    beautySpa: "Beauté & Spa",
    cleaning: "Nettoyage",
    moving: "Déménagement",
    electrician: "Électricien",
    plumbing: "Plomberie",
    tutoring: "Tutorat",
    techSupport: "Support Tech",

    // Search Page
    findServices: "Trouver des Services",
    searchByName: "Rechercher par nom ou mot-clé...",
    allCategories: "Toutes les Catégories",
    allCities: "Toutes les Villes",
    city: "Ville",
    category: "Catégorie",
    list: "Liste",
    map: "Carte",
    noResults: "Aucun résultat trouvé",
    tryAdjusting: "Essayez d'ajuster vos filtres ou termes de recherche.",
    showingProfessionals: "{count} professionnels trouvés",

    // Messages
    typeMessage: "Écrivez un message...",
    selectConversation: "Sélectionnez une conversation",
    chooseFromSidebar: "Choisissez dans la barre latérale pour commencer",
    noConversations: "Aucune conversation pour le moment.",
    messagesAutoDelete: "Les messages sont supprimés après 7 jours",
    delete: "Supprimer",
    messageDeleted: "Message supprimé",
    failedToSend: "Échec de l'envoi du message",
    failedToDelete: "Échec de la suppression",
    onlyImagesAllowed: "Seules les images sont autorisées",
    imageTooLarge: "L'image doit être inférieure à 5 Mo",

    // Provider
    book: "Réserver",
    contact: "Contacter",
    reviews: "Avis",
    yearsExp: "ans d'expérience",
    available: "Disponible",
    unavailable: "Indisponible",
    bio: "À propos",
    citiesServed: "Villes desservies",
    portfolio: "Portfolio",
    writeReview: "Écrire un Avis",
    submitReview: "Soumettre l'Avis",
    rating: "Note",
    comment: "Commentaire",
    noReviews: "Aucun avis pour le moment",
    loginToReview: "Connectez-vous pour écrire un avis",
    professional: "Professionnel",
    new: "Nouveau",
    noBio: "Aucune bio disponible.",
    remote: "À distance",

    // Favorites
    myFavorites: "Mes Favoris",
    noFavorites: "Aucun favori pour le moment",
    noFavoritesDesc: "Commencez à explorer et sauvegardez vos prestataires préférés !",
    browseProviders: "Parcourir les Prestataires",

    // Common
    loading: "Chargement...",
    error: "Une erreur est survenue",
    save: "Enregistrer",
    cancel: "Annuler",
    confirm: "Confirmer",
    back: "Retour",
    next: "Suivant",
    welcome: "Trouvez les meilleurs professionnels pour vos besoins",
    pleaseLogin: "Veuillez vous connecter pour voir cette page.",
  },

  ar: {
    // Navigation & Auth
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    logout: "خروج",
    profile: "الملف الشخصي",
    messages: "الرسائل",
    dashboard: "لوحة التحكم",
    favorites: "المفضلة",
    notifications: "الإشعارات",
    noNotifications: "لا توجد إشعارات جديدة",
    settings: "الإعدادات",
    findService: "ابحث عن خدمة",
    joinProvider: "انضم كمقدم خدمة",

    // Home Page
    heroTitle1: "اعثر على",
    heroTitle2: "المحترف المثالي",
    heroTitle3: "لكل مهمة",
    heroSubtitle: "من إصلاحات المنزل إلى خدمات التجميل، تواصل مع محترفين موثوقين في مدينتك اليوم.",
    installApp: "تحميل التطبيق",
    whatServiceNeed: "ما الخدمة التي تحتاجها؟",
    search: "بحث",
    popular: "الأكثر طلباً:",
    serviceProviders: "مزودو الخدمة",
    viewAll: "عرض الكل",
    noProvidersYet: "لا يوجد مزودون مسجلون حالياً. جرّب صفحة البحث أو سجّل كمزود خدمة.",
    exploreCategories: "استكشف الفئات",
    exploreCategoriesDesc: "كل ما تحتاجه في متناول يدك.",
    verifiedPros: "محترفون موثوقون",
    verifiedProsDesc: "كل محترف يتم التحقق منه لضمان راحتك وسلامتك.",
    fastBooking: "حجز سريع",
    fastBookingDesc: "تواصل واحجز خدماتك فوراً. لا مزيد من الانتظار.",
    communityRated: "تقييم المجتمع",
    communityRatedDesc: "اقرأ تقييمات حقيقية من جيرانك لاختيار أفضل محترف.",
    areYouPro: "هل أنت محترف؟",
    joinProDesc: "انضم لآلاف مقدمي الخدمات الذين ينمّون أعمالهم مع خدماتي. احصل على عملاء أكثر وأدر عملك بسهولة.",
    joinAsProvider: "انضم كمقدم خدمة",

    // Categories
    homeRepair: "إصلاح المنزل",
    beautySpa: "تجميل وسبا",
    cleaning: "تنظيف",
    moving: "نقل",
    electrician: "كهربائي",
    plumbing: "سباكة",
    tutoring: "دروس خصوصية",
    techSupport: "دعم تقني",

    // Search Page
    findServices: "ابحث عن خدمات",
    searchByName: "ابحث بالاسم أو الكلمة...",
    allCategories: "جميع الفئات",
    allCities: "جميع المدن",
    city: "المدينة",
    category: "الفئة",
    list: "قائمة",
    map: "خريطة",
    noResults: "لا توجد نتائج",
    tryAdjusting: "حاول تعديل الفلاتر أو كلمات البحث.",
    showingProfessionals: "عرض {count} محترف",

    // Messages
    typeMessage: "اكتب رسالة...",
    selectConversation: "اختر محادثة",
    chooseFromSidebar: "اختر من القائمة الجانبية لبدء المراسلة",
    noConversations: "لا توجد محادثات بعد.",
    messagesAutoDelete: "تُحذف الرسائل تلقائياً بعد 7 أيام",
    delete: "حذف",
    messageDeleted: "تم حذف الرسالة",
    failedToSend: "فشل إرسال الرسالة",
    failedToDelete: "فشل الحذف",
    onlyImagesAllowed: "الصور فقط مسموح بها",
    imageTooLarge: "حجم الصورة يجب أن يكون أقل من 5 ميجا",

    // Provider
    book: "احجز الآن",
    contact: "تواصل",
    reviews: "التقييمات",
    yearsExp: "سنوات خبرة",
    available: "متاح",
    unavailable: "غير متاح",
    bio: "نبذة",
    citiesServed: "المدن المخدومة",
    portfolio: "أعمال سابقة",
    writeReview: "اكتب تقييم",
    submitReview: "إرسال التقييم",
    rating: "التقييم",
    comment: "التعليق",
    noReviews: "لا توجد تقييمات بعد",
    loginToReview: "سجّل دخولك لكتابة تقييم",
    professional: "محترف",
    new: "جديد",
    noBio: "لا توجد نبذة.",
    remote: "عن بُعد",

    // Favorites
    myFavorites: "المفضلة",
    noFavorites: "لا توجد مفضلات بعد",
    noFavoritesDesc: "ابدأ بالاستكشاف واحفظ مزودي الخدمة المفضلين لديك!",
    browseProviders: "تصفح المزودين",

    // Common
    loading: "جاري التحميل...",
    error: "حدث خطأ ما",
    save: "حفظ",
    cancel: "إلغاء",
    confirm: "تأكيد",
    back: "رجوع",
    next: "التالي",
    welcome: "اعثر على أفضل المحترفين لاحتياجاتك",
    pleaseLogin: "يرجى تسجيل الدخول لعرض هذه الصفحة.",
  },
};

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("khidmati-lang");
    return (saved as Language) || "ar";
  });

  useEffect(() => {
    localStorage.setItem("khidmati-lang", language);
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let text = TRANSLATIONS[language][key] || TRANSLATIONS["en"][key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [language]
  );

  return {
    language,
    setLanguage,
    t,
    isRTL: language === "ar",
  };
}
