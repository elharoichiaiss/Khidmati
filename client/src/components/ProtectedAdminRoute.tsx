import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedAdminRouteProps {
    children: React.ReactNode;
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
    const { admin, isLoading } = useAdminAuth();
    const [_, setLocation] = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    if (!admin) {
        // Redirect to admin login if not authenticated
        // Use setTimeout to avoid render-cycle updates if needed, but wouter is usually safe
        setLocation("/k-admin-portal-secure/login");
        return null;
    }

    return <>{children}</>;
}
