import { useState } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function AdminLogin() {
    const { login, isLoggingIn } = useAdminAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login({ username, password });
        } catch (error) {
            // Error handled by hook toast
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-foreground">
            <Card className="w-full max-w-md border-gray-200 bg-white shadow-xl">
                <CardHeader className="text-center space-y-4 pb-8">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit border border-primary/20">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold tracking-tight">Admin Portal</CardTitle>
                        <CardDescription className="text-muted-foreground">Authorized personnel only.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Username</label>
                            <Input
                                type="text"
                                placeholder="Admin Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-white border-gray-200 placeholder:text-muted-foreground focus-visible:ring-primary"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Password</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-white border-gray-200 placeholder:text-muted-foreground focus-visible:ring-primary"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 shadow-lg shadow-primary/20 transition-all"
                            disabled={isLoggingIn}
                        >
                            {isLoggingIn ? "Authenticating..." : "Access Dashboard"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="absolute bottom-8 text-center text-xs text-muted-foreground">
                Khidmati Secure Admin Environment v1.0
            </div>
        </div>
    );
}
