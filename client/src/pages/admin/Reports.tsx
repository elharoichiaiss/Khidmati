import { useLanguage } from "@/hooks/use-language";
import { Users, CalendarRange, LifeBuoy, BarChart3, FileText, FileSpreadsheet, File, PieChart } from "lucide-react";
import { Button } from "@heroui/react";

export default function AdminReportsPage() {
    const { t } = useLanguage();

    const download = (type: string, format: string) => {
        window.location.href = `/api/admin/reports/${type}?format=${format}`;
    };

    const reportItems = [
        { type: "users", icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40", titleKey: "usersReport", descKey: "usersReportDesc" },
        { type: "bookings", icon: CalendarRange, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40", titleKey: "bookingsReport", descKey: "bookingsReportDesc" },
        { type: "tickets", icon: LifeBuoy, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", titleKey: "ticketsReport", descKey: "ticketsReportDesc" },
        { type: "summary", icon: BarChart3, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40", titleKey: "summaryReport", descKey: "summaryReportDesc" },
    ];

    return (
        <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
            <div className="container mx-auto px-4 max-w-5xl pb-24">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-600 dark:text-indigo-400">
                        <PieChart className="w-7 h-7" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("reports")}</h1>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    {reportItems.map((report) => {
                        const Icon = report.icon;
                        return (
                            <div key={report.type} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-6 hover:scale-[1.01] transition-transform" style={{ borderRadius: "28px" }}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-3 rounded-2xl ${report.bg}`}>
                                        <Icon className={`h-6 w-6 ${report.color}`} />
                                    </div>
                                </div>
                                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white mb-1">{t(report.titleKey)}</h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">{t(report.descKey)}</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        variant="bordered"
                                        size="sm"
                                        className="gap-1.5 font-bold rounded-2xl"
                                        onPress={() => download(report.type, "csv")}
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        {t("csv")}
                                    </Button>
                                    <Button
                                        variant="bordered"
                                        size="sm"
                                        className="gap-1.5 font-bold rounded-2xl text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                        onPress={() => download(report.type, "xlsx")}
                                    >
                                        <FileSpreadsheet className="w-3.5 h-3.5" />
                                        {t("excel")}
                                    </Button>
                                    <Button
                                        variant="bordered"
                                        size="sm"
                                        className="gap-1.5 font-bold rounded-2xl text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                                        onPress={() => download(report.type, "pdf")}
                                    >
                                        <File className="w-3.5 h-3.5" />
                                        {t("pdf")}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-6" style={{ borderRadius: "28px" }}>
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl shrink-0">
                            <FileText className="w-8 h-8 text-zinc-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base mb-1 text-zinc-900 dark:text-white">{t("aboutReports")}</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                <strong>CSV</strong> — {t("csvDesc")}
                                <br />
                                <strong>Excel (.xlsx)</strong> — {t("excelDesc")}
                                <br />
                                <strong>PDF</strong> — {t("pdfDesc")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
