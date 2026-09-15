import { useState } from "react";
import { Button } from "@heroui/react";
import { BarChart3, CalendarRange, Star, FileText, FileSpreadsheet, File, PieChart, Loader2, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth, resolveCurrentNumericUserId } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

export default function ProviderReportsPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const isRtl = language === "ar";

  const reports = [
    {
      title: t("performanceReport") || (language === "ar" ? "تقرير الأداء الشامل" : "Performance Summary"),
      description: t("performanceDesc") || (language === "ar" ? "إحصائيات إجمالي الحجوزات، الإيرادات المحققة، ومتوسط التقييمات" : "Comprehensive performance metrics and earnings"),
      icon: BarChart3,
      color: "text-[#00bcd4]",
      bg: "bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)]",
      type: "summary",
    },
    {
      title: t("bookingsReport") || (language === "ar" ? "تقرير الحجوزات" : "Bookings Report"),
      description: t("bookingsReportDesc") || (language === "ar" ? "سجل جميع الطلبات والحجوزات وتفاصيل العملاء وحالة الخدمة" : "Detailed breakdown of all client bookings"),
      icon: CalendarRange,
      color: "text-[#00bcd4]",
      bg: "bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)]",
      type: "bookings",
    },
    {
      title: t("myReviewsReport") || (language === "ar" ? "تقرير التقييمات" : "Reviews Report"),
      description: t("myReviewsDesc") || (language === "ar" ? "تفاصيل تقييمات العملاء وآرائهم حول جودة الخدمات المقدمة" : "Customer feedback, ratings and comments"),
      icon: Star,
      color: "text-[#00bcd4]",
      bg: "bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)]",
      type: "reviews",
    },
  ];

  const fetchReportData = async (type: string) => {
    const currentUserId = await resolveCurrentNumericUserId(user);
    if (!currentUserId) throw new Error(language === "ar" ? "يرجى تسجيل الدخول أولاً" : "Please log in first");

    let title = "";
    let headers: string[] = [];
    let rows: string[][] = [];

    if (type === "summary") {
      title = language === "ar" ? "ملخص الأداء والإيرادات" : language === "fr" ? "Résumé des performances" : "Performance Summary";
      
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("provider_id", currentUserId);

      const { data: reviews } = await supabase
        .from("reviews")
        .select("*")
        .eq("provider_id", currentUserId);

      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("provider_id", currentUserId);

      const totalBookings = bookings?.length || 0;
      const pendingBookings = bookings?.filter((b: any) => b.status === "pending" || b.status === "pending_agreement").length || 0;
      const completedBookings = bookings?.filter((b: any) => b.status === "completed").length || 0;
      const completedInvoices = invoices?.filter((i: any) => i.status === "completed") || [];
      
      const invoiceEarnings = completedInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.agreed_price) || 0), 0);
      const bookingEarnings = (bookings?.filter((b: any) => b.status === "completed") || []).reduce((sum: number, b: any) => sum + (Number(b.price) || 0), 0);
      const totalEarnings = Math.max(invoiceEarnings, bookingEarnings, invoiceEarnings + bookingEarnings);

      const totalReviews = reviews?.length || 0;
      const avgRating = totalReviews > 0 
        ? (reviews.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0) / totalReviews).toFixed(1)
        : "5.0";

      headers = [
        language === "ar" ? "المؤشر" : "Metric",
        language === "ar" ? "القيمة" : "Value"
      ];

      rows = [
        [language === "ar" ? "إجمالي الحجوزات" : "Total Bookings", String(totalBookings)],
        [language === "ar" ? "الطلبات قيد المعالجة" : "Pending Requests", String(pendingBookings)],
        [language === "ar" ? "الخدمات المكتملة" : "Completed Services", String(completedBookings)],
        [language === "ar" ? "إجمالي الأرباح" : "Total Earnings", `${totalEarnings.toFixed(2)} MAD`],
        [language === "ar" ? "إجمالي الفواتير الصادرة" : "Total Invoices", String(invoices?.length || 0)],
        [language === "ar" ? "متوسط التقييم" : "Average Rating", `${avgRating} / 5.0`],
        [language === "ar" ? "إجمالي آراء العملاء" : "Total Customer Reviews", String(totalReviews)],
        [language === "ar" ? "تاريخ إصدار التقرير" : "Report Generated At", new Date().toLocaleDateString("en-GB")],
      ];
    } else if (type === "bookings") {
      title = language === "ar" ? "تقرير الحجوزات المفصل" : language === "fr" ? "Rapport des Réservations" : "Bookings Report";
      
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("provider_id", currentUserId)
        .order("created_at", { ascending: false });

      const clientIds = Array.from(new Set((bookings || []).map((b: any) => b.client_id).filter(Boolean)));
      let clientsMap = new Map<number, any>();
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from("users")
          .select("id, full_name, phone")
          .in("id", clientIds);
        (clients || []).forEach((c: any) => clientsMap.set(c.id, c));
      }

      headers = [
        language === "ar" ? "رقم الحجز" : "ID",
        language === "ar" ? "العميل" : "Client",
        language === "ar" ? "الهاتف" : "Phone",
        language === "ar" ? "التاريخ" : "Date",
        language === "ar" ? "الحالة" : "Status",
        language === "ar" ? "السعر (درهم)" : "Price (MAD)",
        language === "ar" ? "الوصف" : "Description",
      ];

      rows = (bookings || []).map((b: any) => {
        const cl = clientsMap.get(b.client_id) || {};
        let statusAr = b.status;
        if (b.status === "completed") statusAr = "مكتمل";
        else if (b.status === "pending") statusAr = "قيد الانتظار";
        else if (b.status === "accepted") statusAr = "مقبول";
        else if (b.status === "cancelled") statusAr = "ملغى";

        return [
          `#${b.id}`,
          cl.full_name || "عميل",
          cl.phone || "-",
          b.date ? new Date(b.date).toLocaleDateString("en-GB") : (b.created_at ? new Date(b.created_at).toLocaleDateString("en-GB") : "-"),
          language === "ar" ? statusAr : b.status,
          `${Number(b.price) || 0} MAD`,
          b.description || "-",
        ];
      });

      if (rows.length === 0) {
        rows.push([
          "-",
          language === "ar" ? "لا توجد حجوزات مسجلة بعد" : "No bookings recorded yet",
          "-",
          "-",
          "-",
          "0.00 MAD",
          "-",
        ]);
      }
    } else if (type === "reviews") {
      title = language === "ar" ? "تقرير التقييمات والآراء" : language === "fr" ? "Rapport des Avis" : "Reviews Report";

      const { data: reviews } = await supabase
        .from("reviews")
        .select("*")
        .eq("provider_id", currentUserId)
        .order("created_at", { ascending: false });

      const clientIds = Array.from(new Set((reviews || []).map((r: any) => r.client_id).filter(Boolean)));
      let clientsMap = new Map<number, any>();
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from("users")
          .select("id, full_name")
          .in("id", clientIds);
        (clients || []).forEach((c: any) => clientsMap.set(c.id, c));
      }

      headers = [
        language === "ar" ? "المعرف" : "ID",
        language === "ar" ? "العميل" : "Client",
        language === "ar" ? "التقييم" : "Rating",
        language === "ar" ? "التعليق" : "Comment",
        language === "ar" ? "التاريخ" : "Date",
      ];

      rows = (reviews || []).map((r: any) => {
        const cl = clientsMap.get(r.client_id) || {};
        return [
          `#${r.id}`,
          cl.full_name || "عميل",
          `${r.rating} / 5 ★`,
          r.comment || "-",
          r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "-",
        ];
      });

      if (rows.length === 0) {
        rows.push([
          "-",
          language === "ar" ? "لا توجد تقييمات مسجلة بعد" : "No reviews recorded yet",
          "5.0 ★",
          "-",
          "-",
        ]);
      }
    }

    return { title, headers, rows };
  };

  const download = async (type: string, format: string) => {
    const key = `${type}-${format}`;
    setDownloadingKey(key);

    try {
      const { title, headers, rows } = await fetchReportData(type);
      const today = new Date().toISOString().split("T")[0];
      const providerName = (user?.fullName || "Khidmati_Provider").replace(/\s+/g, "_");
      const filename = `${providerName}_${type}_${today}`;

      if (format === "csv") {
        const csvLines = [
          headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
          ...rows.map((r) => r.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")),
        ];
        const csvContent = "\uFEFF" + csvLines.join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: language === "ar" ? "تم تحميل التقرير (CSV) بنجاح" : "Report downloaded (CSV)",
          description: `${filename}.csv`,
        });
      } else if (format === "xlsx") {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const colWidths = headers.map((h, i) => {
          let maxLen = h.length;
          rows.forEach((r) => {
            if (r[i] && r[i].length > maxLen) maxLen = r[i].length;
          });
          return { wch: Math.min(Math.max(maxLen + 4, 14), 45) };
        });
        ws["!cols"] = colWidths;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
        XLSX.writeFile(wb, `${filename}.xlsx`);

        toast({
          title: language === "ar" ? "تم تصدير ملف Excel بنجاح" : "Excel exported successfully",
          description: `${filename}.xlsx`,
        });
      } else if (format === "pdf") {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${language}">
            <head>
              <meta charset="utf-8">
              <title>${title} - ${user?.fullName || 'Khidmati'}</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
                body {
                  font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  padding: 40px;
                  color: #18181b;
                  background: #fff;
                  direction: ${isRtl ? 'rtl' : 'ltr'};
                }
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 2px solid #e4e4e7;
                  padding-bottom: 24px;
                  margin-bottom: 30px;
                }
                .brand {
                  font-size: 26px;
                  font-weight: 900;
                  color: #00bcd4;
                  letter-spacing: -0.5px;
                }
                .subtitle {
                  font-size: 12px;
                  color: #71717a;
                  margin-top: 4px;
                  font-weight: 600;
                }
                .meta-box {
                  text-align: ${isRtl ? 'left' : 'right'};
                  font-size: 13px;
                  color: #52525b;
                  line-height: 1.6;
                }
                .report-title-box {
                  margin-bottom: 24px;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                }
                .report-title {
                  font-size: 20px;
                  font-weight: 800;
                  color: #09090b;
                }
                .badge {
                  display: inline-block;
                  padding: 4px 14px;
                  background: #e0f7fa;
                  color: #00838f;
                  border-radius: 9999px;
                  font-size: 12px;
                  font-weight: 800;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 10px;
                  border-radius: 12px;
                  overflow: hidden;
                  border: 1px solid #e4e4e7;
                }
                th {
                  background: #f4f4f5;
                  color: #18181b;
                  font-weight: 800;
                  font-size: 13px;
                  padding: 12px 16px;
                  text-align: ${isRtl ? 'right' : 'left'};
                  border-bottom: 2px solid #e4e4e7;
                }
                td {
                  padding: 12px 16px;
                  border-bottom: 1px solid #f4f4f5;
                  font-size: 13px;
                  color: #3f3f46;
                  text-align: ${isRtl ? 'right' : 'left'};
                }
                tr:nth-child(even) td {
                  background: #fafafa;
                }
                .footer {
                  margin-top: 50px;
                  padding-top: 20px;
                  border-top: 1px solid #e4e4e7;
                  display: flex;
                  justify-content: space-between;
                  font-size: 11px;
                  color: #a1a1aa;
                  font-weight: 600;
                }
                @media print {
                  body { padding: 20px; }
                  @page { margin: 15mm; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div>
                  <div class="brand">خدماتي | KHIDMATI</div>
                  <div class="subtitle">منصة الخدمات المنزلية والمهنية بالمغرب</div>
                </div>
                <div class="meta-box">
                  <p><strong>المزود:</strong> ${user?.fullName || 'مزود الخدمة'}</p>
                  <p><strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString("en-GB")}</p>
                </div>
              </div>
              
              <div class="report-title-box">
                <span class="report-title">${title}</span>
                <span class="badge">${rows.length} ${isRtl ? 'عنصر' : 'items'}</span>
              </div>

              <table>
                <thead>
                  <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                  ${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>

              <div class="footer">
                <span>تم إنشاء هذا التقرير مباشرة عبر منصة خدماتي الرسمية</span>
                <span>khidmati-ma.web.app</span>
              </div>

              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 400);
                };
              </script>
            </body>
            </html>
          `);
          printWindow.document.close();
        }

        toast({
          title: language === "ar" ? "تم فتح التقرير للطباعة وحفظ PDF" : "Report opened for Print / PDF",
        });
      }
    } catch (err: any) {
      console.error("Report download error:", err);
      toast({
        title: language === "ar" ? "تعذر إنشاء التقرير" : "Failed to generate report",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
      <div className="container mx-auto px-4 max-w-5xl pb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3.5 bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl">
            <PieChart className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">
              {t("reports") || (language === "ar" ? "التقارير والإحصائيات" : "Reports")}
            </h1>
            <p className="text-xs text-zinc-500 font-bold mt-1">
              {language === "ar" ? "تصدير فوري للتقارير والبيانات بدون أي قيود بصيغ CSV و Excel و PDF" : "Direct export to CSV, Excel, and PDF"}
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <div
              key={report.type}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-6 hover:scale-[1.01] transition-transform"
              style={{ borderRadius: "28px" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-2xl ${report.bg}`}>
                  <report.icon className={`h-6 w-6 ${report.color}`} />
                </div>
              </div>
              <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white mb-1">{report.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 min-h-[40px]">{report.description}</p>
              
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="bordered"
                  size="sm"
                  className="gap-1.5 font-bold rounded-2xl h-10 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  isLoading={downloadingKey === `${report.type}-csv`}
                  onPress={() => download(report.type, "csv")}
                >
                  {downloadingKey !== `${report.type}-csv` && <FileText className="w-3.5 h-3.5 text-zinc-500" />}
                  CSV
                </Button>
                <Button
                  variant="bordered"
                  size="sm"
                  className="gap-1.5 font-bold rounded-2xl h-10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  isLoading={downloadingKey === `${report.type}-xlsx`}
                  onPress={() => download(report.type, "xlsx")}
                >
                  {downloadingKey !== `${report.type}-xlsx` && <FileSpreadsheet className="w-3.5 h-3.5" />}
                  Excel
                </Button>
                <Button
                  variant="bordered"
                  size="sm"
                  className="gap-1.5 font-bold rounded-2xl h-10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30"
                  isLoading={downloadingKey === `${report.type}-pdf`}
                  onPress={() => download(report.type, "pdf")}
                >
                  {downloadingKey !== `${report.type}-pdf` && <File className="w-3.5 h-3.5" />}
                  PDF
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-6"
          style={{ borderRadius: "28px" }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-[#00bcd4]/10 rounded-2xl shrink-0 text-[#00bcd4]">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-base mb-2 text-zinc-900 dark:text-white">
                {t("aboutReports") || (language === "ar" ? "حول صيغ التقارير المتاحة" : "About Report Formats")}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed space-y-1">
                <strong>CSV</strong> — {t("csvDesc") || (language === "ar" ? "ملف بيانات خفيف متوافق مع كافة البرامج وجداول البيانات مع دعم كامل للغة العربية (UTF-8 BOM)." : "Lightweight data format compatible with all spreadsheet apps.")}
                <br />
                <strong>Excel (.xlsx)</strong> — {t("excelDesc") || (language === "ar" ? "جدول بيانات منسق جاهز للاستخدام في Microsoft Excel مع عرض الأعمدة تلقائياً." : "Pre-formatted spreadsheet ready for Microsoft Excel.")}
                <br />
                <strong>PDF</strong> — {t("pdfDesc") || (language === "ar" ? "مستند رسمي منسق بختم خدماتي للطباعة الفورية وحفظ المستندات الرسمية." : "Official formatted document ready for print and archiving.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
