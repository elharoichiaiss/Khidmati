import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { ReactNode, useEffect } from "react";

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const [_, setLocation] = useLocation();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                // Not logged in -> Redirect to auth
                // For admin routes, we might want to redirect to admin login, but simpler to keep generic auth
                setLocation("/login");
            } else if (allowedRoles && !allowedRoles.includes(user.role)) {
                // Logged in but wrong role -> Redirect to home or 403
                // If trying to access admin and not admin, go to home
                setLocation("/");
            }
        }
    }, [user, isLoading, allowedRoles, setLocation]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Verifying access...</p>
                </div>
            </div>
        );
    }

    // If we have a user and (no roles check OR roles check passed), verify rendered content
    // Note: The useEffect handles the redirect, but whilst redirecting we should render nothing or null
    // to avoid flash of content.
    if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
        return null;
    }

    return <>{children}</>;
}
