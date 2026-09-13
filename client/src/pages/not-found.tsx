import { Link } from "wouter";
import { motion } from "framer-motion";
import { Home, Search, ArrowLeft } from "lucide-react";
import { Button } from "@heroui/react";
import { useLanguage } from "@/hooks/use-language";

export default function NotFound() {
  const { t, language, isRTL } = useLanguage();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(150deg, #0a1628 0%, #0d2137 40%, #0b3040 70%, #083a3a 100%)" }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Background dots */}
      <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #00bcd4, transparent)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #0ea5e9, transparent)" }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-lg relative z-10"
      >
        {/* 404 number */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[120px] md:text-[160px] font-extrabold leading-none mb-4 select-none"
          style={{
            background: "linear-gradient(135deg, #00bcd4, #0ea5e9, #00bcd4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            backgroundSize: "200% auto",
          }}
        >
          404
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl md:text-3xl font-bold text-white mb-3"
        >
          {t("pageNotFound")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white/50 text-sm md:text-base mb-10 leading-relaxed"
        >
          {t("pageNotFoundDesc")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link href="/">
            <Button
              className="font-bold gap-2 text-white"
              style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
              size="lg"
            >
              <Home className="w-4 h-4" />
              {t("goHome")}
            </Button>
          </Link>
          <Link href="/search">
            <Button
              variant="bordered"
              size="lg"
              className="font-bold gap-2 border-white/20 text-white hover:bg-white/5"
            >
              <Search className="w-4 h-4" />
              {t("searchServices")}
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

