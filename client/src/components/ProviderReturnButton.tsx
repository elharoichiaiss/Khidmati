import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "wouter";

export function ProviderReturnButton() {
    const { user } = useAuth();
    const [location] = useLocation();

    // Only show for providers
    if (user?.role !== "provider") return null;

    // Don't show if already on dashboard
    if (location.startsWith("/provider/dashboard")) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Link href="/provider/dashboard">
                <Button
                    size="lg"
                    className="rounded-full shadow-2xl bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-500 gap-2 h-14 px-6"
                >
                    <LayoutDashboard className="w-5 h-5" />
                    Back to Dashboard
                </Button>
            </Link>
        </div>
    );
}
