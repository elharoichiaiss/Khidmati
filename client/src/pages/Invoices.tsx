import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Calendar, CheckCircle, Clock, ExternalLink, Search, Filter } from "lucide-react";
import { Card, CardBody, CardHeader, Chip, Button, Divider, Input, Tabs, Tab } from "@heroui/react";
import { Layout } from "@/components/Layout";
import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth, resolveCurrentNumericUserId } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export default function Invoices() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["/api/invoices", user?.id],
    queryFn: async () => {
      // 1. Try Express API on localhost
      if (isLocalhost) {
        try {
          const res = await fetch("/api/invoices", { credentials: "include" });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            return await res.json();
          }
        } catch (e) {}
      }

      // 2. Direct Supabase query
      const currentUserId = await resolveCurrentNumericUserId(user);
      if (!currentUserId) return [];

      const { data: invRows, error } = await supabase
        .from("invoices")
        .select("*")
        .or(`provider_id.eq.${currentUserId},client_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      if (error || !Array.isArray(invRows)) return [];

      return invRows.map((inv: any) => ({
        id: inv.id,
        conversationId: inv.conversation_id,
        providerId: inv.provider_id,
        clientId: inv.client_id,
        clientName: inv.client_name || "عميل",
        clientPhone: inv.client_phone || "",
        serviceType: inv.service_type || "خدمات عامة",
        description: inv.description,
        agreedPrice: Number(inv.agreed_price) || 0,
        status: inv.status,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
      }));
    },
    refetchInterval: () => document.hidden ? false : 5000,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
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
      case "completed": return t("completedPaid") || "مكتملة ومسددة";
      case "agreed": return t("agreed") || "تم الاتفاق";
      case "pending_agreement": return t("pendingAgreement") || "قيد موافقة العميل";
      case "awaiting_confirmation": return t("awaitingPayment") || "في انتظار تأكيد الدفع";
      case "rejected": return language === "ar" ? "مرفوضة" : language === "fr" ? "Refusée" : "Rejected";
      default: return status;
    }
  };

  const allInvoices = invoices || [];
  
  const statusFiltered = allInvoices.filter((invoice: any) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "completed") return invoice.status === "completed";
    if (statusFilter === "pending") return invoice.status === "pending_agreement" || invoice.status === "agreed" || invoice.status === "awaiting_confirmation";
    if (statusFilter === "rejected") return invoice.status === "rejected";
    return true;
  });

  const filteredInvoices = statusFiltered.filter((invoice: any) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    const invoiceId = `INV-${invoice.id.toString().padStart(6, '0')}`.toLowerCase();
    const clientName = (invoice.clientName || "").toLowerCase();
    const serviceType = (invoice.serviceType || "").toLowerCase();
    const desc = (invoice.description || "").toLowerCase();
    
    return clientName.includes(lowerQuery) || serviceType.includes(lowerQuery) || invoiceId.includes(lowerQuery) || desc.includes(lowerQuery);
  });

  return (
    <Layout>
      <div className="bg-zinc-50 dark:bg-black min-h-screen py-10">
        <div className="container mx-auto px-4 max-w-5xl pb-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3.5 bg-white dark:bg-zinc-900 border border-[#00bcd4]/40 text-[#00bcd4] shadow-[0_4px_14px_rgba(0,188,212,0.12)] rounded-2xl">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">{t("myInvoices")}</h1>
                <p className="text-xs text-zinc-500 font-bold mt-0.5">
                  {allInvoices.length} {language === "ar" ? "فاتورة إجمالية" : "total invoices"}
                </p>
              </div>
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

          {/* Status Filter Tabs */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {[
              { key: "all", label: language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All", count: allInvoices.length },
              { key: "pending", label: language === "ar" ? "قيد المعالجة" : language === "fr" ? "En cours" : "Pending", count: allInvoices.filter((i: any) => i.status !== "completed" && i.status !== "rejected").length },
              { key: "completed", label: language === "ar" ? "مكتملة ومسددة" : language === "fr" ? "Payées" : "Completed", count: allInvoices.filter((i: any) => i.status === "completed").length },
              { key: "rejected", label: language === "ar" ? "مرفوضة" : language === "fr" ? "Refusées" : "Rejected", count: allInvoices.filter((i: any) => i.status === "rejected").length },
            ].map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                variant={statusFilter === tab.key ? "solid" : "bordered"}
                color={statusFilter === tab.key ? "primary" : "default"}
                className={`font-bold rounded-xl px-4 h-9 ${statusFilter === tab.key ? "bg-[#00bcd4] text-white" : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"}`}
                onPress={() => setStatusFilter(tab.key)}
              >
                {tab.label} ({tab.count})
              </Button>
            ))}
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
                      <div className="w-14 h-14 rounded-2xl bg-[#00bcd4]/10 flex items-center justify-center text-[#00bcd4] shrink-0">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-[#00bcd4] tracking-wider">
                            INV-{invoice.id.toString().padStart(6, '0')}
                          </span>
                          <Chip color={getStatusColor(invoice.status)} variant="flat" size="sm" className="font-bold">
                            {getStatusText(invoice.status)}
                          </Chip>
                        </div>
                        <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">{invoice.serviceType}</h3>
                        {invoice.description && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium mt-0.5 line-clamp-1">{invoice.description}</p>
                        )}
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
