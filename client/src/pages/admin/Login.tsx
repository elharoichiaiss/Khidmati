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
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
            <Card className="w-full max-w-md border-slate-800 bg-slate-900 shadow-2xl">
                <CardHeader className="text-center space-y-4 pb-8">
                    <div className="mx-auto bg-slate-800 p-3 rounded-full w-fit border border-slate-700">
                        <Lock className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-white tracking-tight">Admin Portal</CardTitle>
                        <CardDescription className="text-slate-400">Restricted Access. Authorized personnel only.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Username</label>
                            <Input
                                type="text"
                                placeholder="Admin Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Password</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6"
                            disabled={isLoggingIn}
                        >
                            {isLoggingIn ? "Authenticating..." : "Access Dashboard"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="absolute bottom-8 text-center text-xs text-slate-600">
                Khidmati Secure Admin Environment v1.0
            </div>
        </div>
    );
}
