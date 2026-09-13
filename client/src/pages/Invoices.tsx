import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Calendar, CheckCircle, Clock, ExternalLink, Search } from "lucide-react";
import { Card, CardBody, CardHeader, Chip, Button, Divider, Input } from "@heroui/react";
import { Layout } from "@/components/Layout";
import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";

export default function Invoices() {
  const { t, language } = useLanguage();
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
  });
  const [searchQuery, setSearchQuery] = useState("");

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "agreed": return "primary";
      case "pending_agreement": return "warning";
      case "awaiting_confirmation": return "secondary";
      case "rejected": return "danger";
      default: return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return t("completedPaid");
      case "agreed": return t("agreed");
      case "pending_agreement": return t("pendingAgreement");
      case "awaiting_confirmation": return t("awaitingPayment");
      case "rejected": return language === "ar" ? "مرفوضة" : language === "fr" ? "Refusée" : "Rejected";
      default: return status;
    }
  };

  const completedInvoices = invoices?.filter((invoice: any) => invoice.status === "completed") || [];
  
  const filteredInvoices = completedInvoices.filter((invoice: any) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    const invoiceId = `INV-${invoice.id.toString().padStart(6, '0')}`.toLowerCase();
    
    return (
      invoice.clientName.toLowerCase().includes(lowerQuery) ||
      invoice.serviceType.toLowerCase().includes(lowerQuery) ||
      invoiceId.includes(lowerQuery)
    );
  });

  return (
    <Layout>
      <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
        <div className="container mx-auto px-4 max-w-5xl pb-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-600 dark:text-indigo-400">
                <FileText className="w-7 h-7" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("myInvoices")}</h1>
            </div>
            
            <Input
              className="w-full sm:max-w-xs"
              placeholder={t("searchInvoices")}
              startContent={<Search className="w-4 h-4 text-zinc-400" />}
              value={searchQuery}
              onValueChange={setSearchQuery}
              variant="bordered"
              radius="lg"
              size="md"
              classNames={{
                inputWrapper: "h-12 rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-sm",
                input: "text-sm font-medium"
              }}
            />
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-zinc-400" />
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2">{t("noInvoices")}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                {searchQuery ? t("noInvoicesDesc") : t("noInvoicesDescFull")}
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredInvoices.map((invoice: any) => {
              const date = new Date(invoice.updatedAt || invoice.createdAt).toLocaleDateString("en-GB");
              return (
                <div key={invoice.id} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:scale-[1.01] transition-transform" style={{ borderRadius: "28px" }}>
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                          INV-{invoice.id.toString().padStart(6, '0')}
                        </span>
                        <Chip color={getStatusColor(invoice.status)} variant="flat" size="sm" className="font-bold">
                          {getStatusText(invoice.status)}
                        </Chip>
                      </div>
                      <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">{invoice.serviceType}</h3>
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
                        <span>{t("client")}: {invoice.clientName}</span>
                        <span>•</span>
                        <span>{date}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                    <div className="text-right">
                      <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500">{t("totalAmount")}</p>
                      <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{invoice.agreedPrice ? invoice.agreedPrice.toFixed(2) : "0.00"} MAD</p>
                    </div>
                    <Link href={`/invoice/${invoice.id}/print`}>
                      <Button
                        className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-5 h-12 shadow-sm"
                        style={{ borderRadius: "16px" }}
                        endContent={<ExternalLink className="w-4 h-4" />}
                      >
                        {t("view")}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </Layout>
  );
}
