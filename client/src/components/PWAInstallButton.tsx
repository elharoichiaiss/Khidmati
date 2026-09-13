import { Button } from "@heroui/react";
import { Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useLanguage } from "@/hooks/use-language";

type Variant = "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost";

interface Props {
  className?: string;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  label?: string;
  alwaysShow?: boolean;
}

export function PWAInstallButton({ className, variant = "flat", size = "md", label, alwaysShow = false }: Props) {
  const { isInstallable, installApp, isIOS, isStandalone, isInstalled } = usePWAInstall();
  const { language } = useLanguage();

  if (isStandalone || isInstalled) return null;
  if (!alwaysShow && !isInstallable && !isIOS) return null;

  return (
    <Button
      onPress={() => {
        installApp();
      }}
      variant={variant}
      className={`gap-2 ${className}`}
      size={size}
      startContent={<Download className="w-4 h-4" />}
    >
      {label || (language === "ar" ? "تثبيت التطبيق" : language === "fr" ? "Installer l'application" : "Install App")}
    </Button>
  );
}