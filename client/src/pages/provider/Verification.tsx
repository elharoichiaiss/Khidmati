import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardBody, Button, Input, Chip } from "@heroui/react";
import { Loader2, BadgeCheck, Clock, XCircle, Upload, FileText, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";

export default function ProviderVerification() {
  const { user, isLoading: authLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const [idDocument, setIdDocument] = useState("");
  const [professionalLicense, setProfessionalLicense] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "provider")) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  const { data: verificationStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/verification/status"],
    enabled: !!user && user.role === "provider",
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { idDocument?: string; professionalLicense?: string }) => {
      const res = await fetch("/api/verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "فشل تقديم الطلب");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("submitVerificationRequest") });
      refetchStatus();
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate({ idDocument, professionalLicense });
  };

  const status = (verificationStatus as any)?.status || "none";

  const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
    none: {
      label: t("notVerified"),
      color: "text-gray-500", bg: "bg-gray-100", icon: XCircle,
    },
    pending: {
      label: t("pendingReview"),
      color: "text-amber-600", bg: "bg-amber-100", icon: Clock,
    },
    approved: {
      label: t("verified"),
      color: "text-emerald-600", bg: "bg-emerald-100", icon: BadgeCheck,
    },
    rejected: {
      label: t("rejectedVerification"),
      color: "text-red-600", bg: "bg-red-100", icon: XCircle,
    },
  };

  const cfg = statusConfig[status];

  if (authLoading || statusLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" className="mb-4 gap-2" onPress={() => setLocation("/provider/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </Button>

        <Card className="border-gray-200 shadow-lg mb-6">
          <CardBody>
            <div className="flex items-center gap-3 text-xl font-bold mb-6">
              <BadgeCheck className="w-6 h-6 text-blue-500" />
              {t("accountVerification")}
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border">
              <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                <cfg.icon className={`w-6 h-6 ${cfg.color}`} />
              </div>
              <div>
                <p className="font-bold text-sm">{t("verificationStatus")}</p>
                <Chip color={status === "approved" ? "success" : status === "pending" ? "warning" : status === "rejected" ? "danger" : "default"} variant="flat" className="mt-1">{cfg.label}</Chip>
                {status === "rejected" && (verificationStatus as any)?.notes && (
                  <p className="text-sm text-red-500 mt-2">{t("verificationNotes")} {(verificationStatus as any).notes}</p>
                )}
              </div>
            </div>

            {status === "none" || status === "rejected" ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <p className="flex items-center gap-2 font-semibold">
                    <Upload className="w-4 h-4" />
                    {t("idCard")}
                  </p>
                  <Input
                    placeholder={language === "ar" ? "أدخل رابط الصورة" : language === "fr" ? "Entrez l'URL de l'image" : "Enter image URL"}
                    value={idDocument}
                    onValueChange={setIdDocument}
                  />
                </div>
                <div className="space-y-2">
                  <p className="flex items-center gap-2 font-semibold">
                    <FileText className="w-4 h-4" />
                    {t("businessLicense")}
                  </p>
                  <Input
                    placeholder={language === "ar" ? "أدخل رابط الرخصة" : language === "fr" ? "Entrez l'URL de la licence" : "Enter license URL"}
                    value={professionalLicense}
                    onValueChange={setProfessionalLicense}
                  />
                </div>
                <Button type="submit" className="w-full gap-2" isLoading={submitMutation.isPending}>
                  <BadgeCheck className="w-4 h-4" />
                  {t("submitVerificationRequest")}
                </Button>
              </form>
            ) : null}

            {status === "pending" && (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">
                  {t("verificationPending")}
                </p>
              </div>
            )}

            {status === "approved" && (
              <div className="text-center py-4">
                <BadgeCheck className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <p className="font-bold text-lg text-emerald-600">
                  {t("verificationApproved")}
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  {language === "ar" ? "يمكنك الآن الاستفادة من شارة التوثيق على ملفك الشخصي." : language === "fr" ? "Vous pouvez maintenant profiter du badge de vérification sur votre profil." : "You can now enjoy the verification badge on your profile."}
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
}