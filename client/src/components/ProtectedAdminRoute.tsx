import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedAdminRouteProps {
    children: React.ReactNode;
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
    const [_, setLocation] = useLocation();

    const { isLoading, isError, error } = useQuery({
        queryKey: ["/api/admin/me"],
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Verifying secure access...</p>
                </div>
            </div>
        );
    }

    if (isError) {
        // Redirect to admin login if not authenticated or not authorized
        setLocation("/k-admin-portal-secure/login");
        return null;
    }

    return <>{children}</>;
}
