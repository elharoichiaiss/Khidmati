import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Shield, Server, Globe, Bell, CheckCircle2, XCircle, Settings } from "lucide-react";

export default function AdminSettingsPage() {
    const { t } = useLanguage();
    const { data: envInfo } = useQuery<{
        adminUsername: string;
        nodeEnv: string;
        vapidConfigured: boolean;
        googleOAuthConfigured: boolean;
    }>({
        queryKey: ["/api/admin/env"],
    });

    return (
        <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
            <div className="container mx-auto px-4 max-w-5xl pb-24">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3.5 bg-zinc-900 dark:bg-white rounded-2xl text-white dark:text-zinc-900">
                        <Settings className="w-7 h-7" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("settings")}</h1>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    {/* Admin Account Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-6" style={{ borderRadius: "28px" }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl">
                                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900 dark:text-white">{t("adminAccount")}</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t("currentCredentials")}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">{t("username")}</span>
                                <span className="text-sm font-mono font-medium text-zinc-900 dark:text-white">{envInfo?.adminUsername || "admin"}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">{t("password")}</span>
                                <span className="text-sm text-zinc-400 dark:text-zinc-500">•••••••• ({t("setInEnv")})</span>
                            </div>
                        </div>
                    </div>

                    {/* Environment Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-6" style={{ borderRadius: "28px" }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl">
                                <Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900 dark:text-white">{t("environment")}</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t("serverRuntime")}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">{t("nodeEnvironment")}</span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-bold ${
                                    envInfo?.nodeEnv === "production"
                                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                                        : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                                }`}>
                                    {envInfo?.nodeEnv || "development"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">{t("apiVersion")}</span>
                                <span className="text-sm font-mono text-zinc-900 dark:text-white">v1.0</span>
                            </div>
                        </div>
                    </div>

                    {/* Integrations Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-6" style={{ borderRadius: "28px" }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl">
                                <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900 dark:text-white">{t("integrations")}</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t("thirdPartyStatus")}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">{t("googleOAuth")}</span>
                                {envInfo?.googleOAuthConfigured ? (
                                    <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {t("configured")}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500">
                                        <XCircle className="w-4 h-4" />
                                        {t("notConfigured")}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">{t("webPushVAPID")}</span>
                                {envInfo?.vapidConfigured ? (
                                    <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {t("configured")}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500">
                                        <XCircle className="w-4 h-4" />
                                        {t("notConfigured")}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notifications Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-6" style={{ borderRadius: "28px" }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl">
                                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900 dark:text-white">{t("notifications")}</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t("broadcastNotifications")}</p>
                            </div>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {t("sendAnnouncements")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
