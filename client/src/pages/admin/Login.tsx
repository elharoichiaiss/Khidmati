import { useState } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useLanguage } from "@/hooks/use-language";
import { Lock } from "lucide-react";
import { Button, Card, CardBody, Input } from "@heroui/react";

export default function AdminLogin() {
    const { login, isLoggingIn } = useAdminAuth();
    const { t } = useLanguage();
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
                <CardBody className="p-8">
                    <div className="text-center space-y-4 pb-4">
                        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit border border-primary/20">
                            <Lock className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">{t("adminPortal")}</h2>
                            <p className="text-muted-foreground text-sm">{t("authorizedPersonnelOnly")}</p>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">{t("username")}</label>
                            <Input
                                type="text"
                                placeholder={t("username")}
                                value={username}
                                onValueChange={setUsername}
                                variant="bordered"
                                size="lg"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">{t("password")}</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onValueChange={setPassword}
                                variant="bordered"
                                size="lg"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            color="primary"
                            size="lg"
                            className="w-full font-semibold"
                            isDisabled={isLoggingIn}
                            isLoading={isLoggingIn}
                        >
                            {isLoggingIn ? t("authenticating") : t("accessDashboard")}
                        </Button>
                    </form>
                </CardBody>
            </Card>

            <div className="absolute bottom-8 text-center text-xs text-muted-foreground">
                {t("secureAdminEnv")}
            </div>
        </div>
    );
}
