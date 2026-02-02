import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard } from "lucide-react";
import { Link } from "wouter";

export function AdminReturnButton() {
    const { user } = useAuth();

    // Only show for admins
    if (user?.role !== "admin") return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Link href="/k-admin-portal-secure" onClick={() => sessionStorage.removeItem('admin_browsing_mode')}>
                <Button
                    size="lg"
                    className="rounded-full shadow-2xl bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-700 gap-2 h-14 px-6"
                >
                    <LayoutDashboard className="w-5 h-5" />
                    Back to Dashboard
                </Button>
            </Link>
        </div>
    );
}
