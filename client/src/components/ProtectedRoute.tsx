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
                setLocation("/login");
            } else if (!user.city) {
                // Profile incomplete -> Redirect to complete-profile
                setLocation("/complete-profile");
            } else if (allowedRoles && !allowedRoles.includes(user.role)) {
                // Logged in but wrong role -> Redirect to home
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

    if (!user || !user.city || (allowedRoles && !allowedRoles.includes(user.role))) {
        return null;
    }

    return <>{children}</>;
}
