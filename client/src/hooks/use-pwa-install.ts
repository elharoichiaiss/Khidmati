import { useState, useEffect } from "react";

interface IBeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
    interface Window {
        _pwaPrompt?: IBeforeInstallPromptEvent | null;
    }
}

// Global listener to capture beforeinstallprompt before React mounts
if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        window._pwaPrompt = e as IBeforeInstallPromptEvent;
    });
}

function detectIOS(): boolean {
    if (typeof navigator === "undefined") return false;
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return true;
    if (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1) return true;
    return false;
}

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<IBeforeInstallPromptEvent | null>(() => {
        return typeof window !== "undefined" ? window._pwaPrompt || null : null;
    });
    const [isInstallable, setIsInstallable] = useState<boolean>(() => {
        return typeof window !== "undefined" ? !!window._pwaPrompt : false;
    });
    const [isInstalled, setIsInstalled] = useState<boolean>(
        typeof window !== "undefined" &&
        (window.matchMedia("(display-mode: standalone)").matches ||
            (navigator as any).standalone === true)
    );

    const isIOS = detectIOS();
    const isStandalone =
        typeof window !== "undefined" &&
        (window.matchMedia("(display-mode: standalone)").matches ||
            (navigator as any).standalone === true);

    useEffect(() => {
        // Sync with global event if captured early
        if (window._pwaPrompt) {
            setDeferredPrompt(window._pwaPrompt);
            setIsInstallable(true);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as IBeforeInstallPromptEvent;
            window._pwaPrompt = promptEvent;
            setDeferredPrompt(promptEvent);
            setIsInstallable(true);
        };

        const installed = () => {
            window._pwaPrompt = null;
            setDeferredPrompt(null);
            setIsInstallable(false);
            setIsInstalled(true);
        };

        window.addEventListener("beforeinstallprompt", handler);
        window.addEventListener("appinstalled", installed);

        const nav = navigator as any;
        if (typeof nav.getInstalledRelatedApps === "function") {
            nav.getInstalledRelatedApps()
                .then((apps: any[]) => {
                    if (Array.isArray(apps) && apps.length > 0) {
                        window._pwaPrompt = null;
                        setDeferredPrompt(null);
                        setIsInstallable(false);
                        setIsInstalled(true);
                    }
                })
                .catch(() => {});
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            window.removeEventListener("appinstalled", installed);
        };
    }, []);

    const installApp = async (): Promise<boolean> => {
        const activePrompt = deferredPrompt || window._pwaPrompt;

        if (!activePrompt) {
            console.warn("PWA install prompt not ready or not supported on this browser/origin.");
            return false;
        }

        try {
            await activePrompt.prompt();
            const { outcome } = await activePrompt.userChoice;

            window._pwaPrompt = null;
            setDeferredPrompt(null);
            setIsInstallable(false);

            if (outcome === "accepted") {
                setIsInstalled(true);
                return true;
            }
            return false;
        } catch (err) {
            console.error("Error triggering native PWA install prompt:", err);
            return false;
        }
    };

    return { isInstallable, installApp, isIOS, isStandalone, isInstalled, hasNativePrompt: !!(deferredPrompt || window._pwaPrompt) };
}