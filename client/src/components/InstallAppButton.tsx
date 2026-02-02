import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useLanguage } from "@/hooks/use-language";

export function InstallAppButton({ className, variant = "outline" }: { className?: string, variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" }) {
    const { isInstallable, installApp } = usePWAInstall();
    const { language } = useLanguage();

    if (!isInstallable) return null;

    return (
        <Button
            onClick={installApp}
            variant={variant}
            className={`gap-2 ${className}`}
            size="sm"
        >
            <Download className="w-4 h-4" />
            {language === 'ar' ? "تثبيت التطبيق" : "Install App"}
        </Button>
    );
}
