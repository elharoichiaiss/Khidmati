import { useLanguage } from "@/hooks/use-language";
import { PWAInstallButton } from "@/components/PWAInstallButton";

export function InstallAppButton({ className, variant = "bordered" }: { className?: string, variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost" }) {
    const { language } = useLanguage();
    return (
        <PWAInstallButton
            className={className}
            variant={variant}
            size="sm"
            alwaysShow
            label={language === "ar" ? "تثبيت التطبيق" : "Install App"}
        />
    );
}