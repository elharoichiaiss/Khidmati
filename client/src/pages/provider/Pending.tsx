import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Loader2, Clock, MessageCircle, RefreshCw, LogOut } from "lucide-react";
import { Button, Card, CardBody } from "@heroui/react";
import { useLanguage } from "@/hooks/use-language";

export default function PendingApproval() {
  const { user, isLoading, logout } = useAuth();
  const [_, setLocation] = useLocation();
  const { t } = useLanguage();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role !== "provider") {
        setLocation("/");
      } else if (user.status === "active") {
        setLocation("/provider/dashboard");
      }
    }
  }, [user, isLoading, setLocation]);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/user", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "active") {
          window.location.reload();
          return;
        }
      }
    } catch {}
    setChecking(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const adminPhone = import.meta.env.VITE_ADMIN_WHATSAPP || "212627065830";
  const waLink = `https://wa.me/${adminPhone}?text=${encodeURIComponent("مرحباً، أريد تفعيل حسابي في Khidmati. رقم هاتفي هو: " + (user?.phone || ""))}`;

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-gray-200 shadow-lg">
          <CardBody className="pt-8 pb-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center bg-amber-100">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-gray-900">{t("accountUnderReviewShort")}</h1>
              <p className="text-gray-500 leading-relaxed text-sm">
                {t("pendingReviewDesc")}
              </p>
            </div>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl text-white font-bold text-base transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
            >
              <MessageCircle className="w-5 h-5" />
              {t("contactAdmin")}
            </a>

            {user?.phone && (
              <p className="text-xs text-gray-400">
                {t("phoneNumber")} {user.phone}
              </p>
            )}

            <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
              <Button
                variant="bordered"
                className="rounded-xl gap-2"
                onPress={checkStatus}
                isDisabled={checking}
              >
                <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
                {t("checkAccountStatus")}
              </Button>
              <Button
                variant="light"
                className="rounded-xl gap-2 text-gray-400"
                onPress={() => logout()}
              >
                <LogOut className="w-4 h-4" />
                {t("logout")}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
}
