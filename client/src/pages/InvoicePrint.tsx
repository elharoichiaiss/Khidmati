import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2, Printer, MapPin, Phone, Mail, Download } from "lucide-react";
import { Button } from "@heroui/react";
import { useLanguage } from "@/hooks/use-language";

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();

  const { data: invoice, isLoading } = useQuery({
    queryKey: [`/api/invoices/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Invoice not found");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: provider } = useQuery({
    queryKey: [`/api/users/${invoice?.providerId}`],
    queryFn: async () => {
      if (!invoice?.providerId) return null;
      const res = await fetch(`/api/users/${invoice.providerId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Provider not found");
      return res.json();
    },
    enabled: !!invoice?.providerId,
  });

  useEffect(() => {
    // Attempt to automatically print once data is loaded and rendered
    if (invoice && provider) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [invoice, provider]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-xl font-bold text-red-500">{t("invoiceNotFound")}</p>
      </div>
    );
  }

  if (invoice.status !== "completed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <p className="text-xl font-bold text-amber-600">{t("invoiceNotReady")}</p>
        <p className="text-sm text-slate-500">{t("invoiceMustBeCompleted")}</p>
      </div>
    );
  }

  const handleDownloadPdf = () => {
    // نستخدم نافذة الطباعة لأنها الطريقة الوحيدة التي تضمن ظهور الخط العربي والتصميم بشكل مثالي بنسبة 100%
    window.print();
  };

  const invoiceDate = new Date(invoice.updatedAt || invoice.createdAt).toLocaleDateString("en-GB");

  return (
    <div className="min-h-screen bg-slate-100 font-sans p-4 sm:p-8 print:p-0 print:bg-white flex flex-col items-center">
      
      {/* Print Controls (hidden in print mode) */}
      <div className="w-full max-w-[210mm] mb-6 flex justify-end gap-3 print:hidden">
        <Button 
          color="secondary" 
          variant="flat"
          onPress={handleDownloadPdf} 
          startContent={<Download className="w-5 h-5" />}
          className="rounded-full font-bold px-6"
          size="lg"
        >
          {t("downloadPDF")}
        </Button>
        <Button 
          color="primary" 
          onPress={() => window.print()} 
          startContent={<Printer className="w-5 h-5" />}
          className="rounded-full font-bold shadow-md px-6"
          size="lg"
        >
          {t("print")}
        </Button>
      </div>

      {/* A4 Paper Container - 210mm width is exact A4 size width */}
      <div 
        id="invoice-container"
        className="w-full max-w-[210mm] bg-white shadow-2xl print:shadow-none print:border-none relative overflow-hidden flex flex-col" 
        dir="rtl"
      >
        {/* Top Decorative Header */}
        <div className="h-4 w-full bg-primary print:bg-primary" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
        <div className="h-1 w-full bg-gradient-to-r from-primary/80 to-cyan-400 print:from-primary/80 print:to-cyan-400" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />

        <div className="p-10 sm:p-14 flex-grow flex flex-col">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-14">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.png" alt="Khidmati Logo" className="w-14 h-14 object-cover rounded-xl shadow-sm" />
                <div>
                  <h1 className="text-4xl font-black tracking-tight text-slate-900" dir="ltr">Khidmati</h1>
                  <p className="text-primary font-bold tracking-widest text-sm uppercase" dir="ltr">Platform</p>
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium max-w-[250px]">{t("platformSlogan")}</p>
            </div>
            
            <div className="text-left flex flex-col items-end">
              <h2 className="text-5xl font-black text-slate-200 tracking-tighter uppercase mb-2" dir="ltr">INVOICE</h2>
              <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1" dir="ltr">{t("invoiceNumberLabel")}</p>
                <p className="text-slate-800 font-black text-lg" dir="ltr"># INV-{invoice.id.toString().padStart(6, '0')}</p>
              </div>
              <p className="text-slate-500 text-sm font-semibold mt-3" dir="ltr">{t("dateLabel")} <span className="text-slate-800">{invoiceDate}</span></p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            {/* Provider Info */}
            <div className="flex flex-col relative">
              <div className="w-12 h-1 bg-primary mb-4 rounded-full" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t("providerLabel")}</h3>
              <p className="text-xl font-bold text-slate-900 mb-1">{provider?.fullName}</p>
              <p className="text-primary font-bold text-sm mb-4">{invoice.serviceType}</p>
              
              <div className="space-y-2 text-sm text-slate-600 font-medium">
                {provider?.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"><Phone className="w-3 h-3 text-slate-500" /></div>
                    <span dir="ltr">{provider.phone}</span>
                  </div>
                )}
                {provider?.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"><Mail className="w-3 h-3 text-slate-500" /></div>
                    <span dir="ltr">{provider.email}</span>
                  </div>
                )}
                {provider?.city && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"><MapPin className="w-3 h-3 text-slate-500" /></div>
                    <span>{provider.city}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Client Info */}
            <div className="flex flex-col bg-slate-50 p-6 rounded-2xl border border-slate-100" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t("billedTo")}</h3>
              <p className="text-xl font-bold text-slate-900 mb-4">{invoice.clientName}</p>
              <div className="space-y-2 text-sm text-slate-600 font-medium">
                {invoice.clientPhone && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center"><Phone className="w-3 h-3 text-slate-500" /></div>
                    <span dir="ltr">{invoice.clientPhone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Details Table */}
          <div className="mb-10 rounded-2xl overflow-hidden border border-slate-200">
            <table className="w-full text-right">
              <thead className="bg-slate-900 text-white" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                <tr>
                  <th className="py-4 px-6 font-bold w-2/3">{t("descriptionLabel")}</th>
                  <th className="py-4 px-6 font-bold text-left">{t("amountLabel")}</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr>
                  <td className="py-8 px-6 text-slate-700 font-medium align-top whitespace-pre-wrap leading-relaxed">
                    {invoice.description}
                  </td>
                  <td className="py-8 px-6 text-slate-900 font-black text-left align-top text-lg" dir="ltr">
                    {invoice.agreedPrice.toFixed(2)} MAD
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals & Status Section */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-8 mb-12">
            {/* Status Badge */}
            <div className="w-full sm:w-1/2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 w-full" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                <div className="text-emerald-800 font-black flex items-center gap-2 mb-2">
                  <div className="relative flex h-3 w-3">
                    <div className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></div>
                  </div>
                  <span>{t("paidLabel")}</span>
                </div>
                <div className="text-emerald-600 text-sm font-medium leading-relaxed">
                  {t("invoiceNote")}
                </div>
              </div>
            </div>

            {/* Totals Box */}
            <div className="w-full sm:w-1/2 bg-slate-50 p-6 rounded-2xl border border-slate-100" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
              <div className="flex justify-between items-center py-2 border-b border-slate-200/60 mb-2">
                <span className="text-slate-500 font-bold">{t("subtotal")}</span>
                <span className="font-bold text-slate-700" dir="ltr">{invoice.agreedPrice.toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-bold">{t("tax")}</span>
                <span className="font-bold text-slate-700" dir="ltr">0.00 MAD</span>
              </div>
              <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-slate-800">
                <span className="font-black text-slate-900 text-xl">{t("total")}</span>
                <span className="font-black text-primary text-2xl" dir="ltr">{invoice.agreedPrice.toFixed(2)} MAD</span>
              </div>
            </div>
          </div>

          {/* Footer - Pushed to bottom naturally without absolute positioning */}
          <div className="mt-auto pt-8 border-t border-slate-200 flex flex-col items-center justify-center text-center">
            <p className="text-slate-600 font-bold mb-1">{t("thankYou")}</p>
            <p className="text-slate-400 text-xs font-medium" dir="ltr">
              {t("generatedBy")} &bull; Document ID: {invoice.id}-{Date.now().toString().slice(-6)}
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          @page {
            size: A4;
            margin: 0;
          }
          /* Hide scrollbars when printing */
          ::-webkit-scrollbar {
            display: none;
          }
        }
      `}} />
    </div>
  );
}
