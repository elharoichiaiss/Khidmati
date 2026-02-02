import { useAdminAuth } from "@/hooks/use-admin-auth";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const { admin, isLoading } = useAdminAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Stealth Mode: If not admin, show 404 Not Found instead of redirecting to login
    // This hides the admin panel's existence from regular users
    if (!admin) {
        return <NotFound />;
    }

    return <>{children}</>;
}
