import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Ticket,
  Send,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  ShieldX,
  Sparkles,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Chip,
  Badge,
} from "@heroui/react";

interface TicketMessage {
  id: number;
  ticketId: number;
  senderId: number;
  content: string;
  createdAt: string;
}

interface SupportTicket {
  id: number;
  userId: number;
  subject: string;
  description: string;
  status: "open" | "closed" | "resolved";
  priority: "low" | "normal" | "high";
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}

export function BannedAccountPage() {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const isAr = language === "ar";
  const isFr = language === "fr";

  // Fetch user tickets
  const { data: tickets = [], isLoading: isLoadingTickets } = useQuery<SupportTicket[]>({
    queryKey: ["/api/tickets"],
    queryFn: async () => {
      const res = await fetch("/api/tickets");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch selected ticket details with messages
  const { data: selectedTicket } = useQuery<SupportTicket>({
    queryKey: ["/api/tickets", selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const res = await fetch(`/api/tickets/${selectedTicketId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedTicketId,
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async () => {
      // Ensure subject is tagged for Admin Ban Appeals tab
      const finalSubject = subject.startsWith("[اعتراض حظر]")
        ? subject
        : `[اعتراض حظر] ${subject.trim()}`;

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: finalSubject,
          description: description.trim(),
          priority: "high",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit ticket");
      }
      return res.json();
    },
    onSuccess: (newTicket) => {
      toast({
        title: isAr ? "تم إرسال الاعتراض بنجاح" : "Demande d'appel envoyée",
        description: isAr
          ? "تم إرسال تيكيت الاعتراض للإدارة وسيرد عليك الفريق المختص قريباً."
          : "Votre ticket d'appel a été transmis à l'administration.",
      });
      setSubject("");
      setDescription("");
      setSelectedTicketId(newTicket.id);
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (err: any) => {
      toast({
        title: isAr ? "خطأ في الإرسال" : "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicketId || !replyMessage.trim()) return;
      const res = await fetch(`/api/tickets/${selectedTicketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyMessage.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (err: any) => {
      toast({
        title: isAr ? "خطأ" : "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
            <Clock className="w-3.5 h-3.5" />
            {isAr ? "قيد المعالجة" : isFr ? "En cours" : "Open"}
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isAr ? "تم الحل والرد" : isFr ? "Résolu" : "Resolved"}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {isAr ? "مغلق" : "Closed"}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 py-12 px-4 font-sans text-zinc-900 dark:text-zinc-100 dir-rtl">
      <div className="container mx-auto max-w-5xl space-y-8">

        {/* Hero Banner with Khidmati Cyan Accent */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-8 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
          style={{ borderRadius: "32px" }}
        >
          {/* Subtle Ambient Background Gradient */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-rose-500/10 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/40 shadow-sm">
                <ShieldX className="w-9 h-9" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    {isAr ? "تنبيه الحساب" : "Alerte Compte"}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {isAr ? "حسابك ممتنع مؤقتاً عن الخدمة" : isFr ? "Compte temporairement suspendu" : "Account Suspended"}
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 font-medium">
                  {isAr
                    ? `أهلاً ${user?.fullName || user?.username}، تم تقييد حسابك مؤقتاً بسبب مراجعة الإدارة.`
                    : `Bonjour ${user?.fullName}, votre compte est temporairement suspendu.`}
                </p>
              </div>
            </div>

            <Button
              onPress={() => logout()}
              variant="flat"
              className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold px-6 h-11 rounded-2xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors"
              startContent={<LogOut className="w-4 h-4" />}
            >
              {isAr ? "تسجيل الخروج" : "Déconnexion"}
            </Button>
          </div>
        </motion.div>

        {/* Notice Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-gradient-to-r from-cyan-50/70 via-white to-indigo-50/70 dark:from-cyan-950/20 dark:via-zinc-900 dark:to-indigo-950/20 p-6 border border-cyan-100/80 dark:border-cyan-900/40 rounded-[28px] shadow-sm flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#00B3BC]/10 text-[#00B3BC] flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-sm leading-relaxed">
            <h3 className="font-extrabold text-zinc-900 dark:text-white text-base">
              {isAr ? "كيف تتواصل مع الإدارة لرفع الحظر؟" : "Comment contacter l'administration ?"}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-300 font-medium">
              {isAr
                ? "يمكنك كتابة تيكيت اعتراض أو استفسار موجه لمسؤولي منصة خدماتي من خلال النموذج أسفله. سيقوم الفريق المختص بمراجعة تظلمك والرد عليك داخل هذه الصفحة."
                : "Vous pouvez soumettre un ticket d'appel directement ci-dessous. L'équipe d'administration examinera votre demande dans les plus brefs délais."}
            </p>
          </div>
        </motion.div>

        {/* Main Grid: Form + Tickets List */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

          {/* Left Column: Create Ticket Form & Chat Room (Col 7) */}
          <div className="md:col-span-7 space-y-6">

            {/* Create Ticket Box */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-7 shadow-[0_10px_30px_rgba(0,0,0,0.03)]"
              style={{ borderRadius: "28px" }}
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-lg text-zinc-900 dark:text-white">
                    {isAr ? "تقديم تيكيت اعتراض جديد" : "Créer un nouveau ticket"}
                  </h2>
                  <p className="text-xs text-zinc-400 font-medium">
                    {isAr ? "سيصل طلبك مباشرة لقسم إدارة الحسابات في خدماتي" : "Envoyé directement aux administrateurs Khidmati"}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">
                    {isAr ? "موضوع التيكيت / الاعتراض" : "Sujet de la demande"}
                  </label>
                  <Input
                    placeholder={isAr ? "مثال: اعتراض على حظر الحساب وطلب المراجعة" : "ex: Appel concernant la suspension"}
                    value={subject}
                    onValueChange={setSubject}
                    variant="bordered"
                    radius="lg"
                    classNames={{
                      inputWrapper: "h-12 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white",
                      input: "text-sm font-medium"
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">
                    {isAr ? "شرح الأسباب والتفاصيل للإدارة" : "Détails et explications"}
                  </label>
                  <Textarea
                    placeholder={
                      isAr
                        ? "يرجى كتابة تفاصيل استفسارك أو التوضيحات والمعلومات التي ترغب في تقديمها للإدارة..."
                        : "Expliquez les détails de votre demande ici..."
                    }
                    value={description}
                    onValueChange={setDescription}
                    variant="bordered"
                    minRows={4}
                    classNames={{
                      inputWrapper: "rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white p-3",
                      input: "text-sm font-medium"
                    }}
                  />
                </div>

                <Button
                  isLoading={createTicketMutation.isPending}
                  isDisabled={!subject.trim() || !description.trim()}
                  onPress={() => createTicketMutation.mutate()}
                  className="w-full h-12 font-bold text-white bg-[#00B3BC] hover:bg-[#00B3BC]/90 shadow-md shadow-[#00B3BC]/20 rounded-2xl text-sm gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isAr ? "إرسال تيكيت الاعتراض" : "Envoyer le ticket d'appel"}
                </Button>
              </div>
            </motion.div>

            {/* Selected Ticket Conversation Room */}
            {selectedTicket && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-zinc-900 border border-[#00B3BC]/30 dark:border-[#00B3BC]/20 p-6 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
                style={{ borderRadius: "28px" }}
              >
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <span className="text-xs font-bold text-zinc-400">#Ticket {selectedTicket.id}</span>
                    <h3 className="font-extrabold text-base text-zinc-900 dark:text-white line-clamp-1">
                      {selectedTicket.subject}
                    </h3>
                  </div>
                  {getStatusBadge(selectedTicket.status)}
                </div>

                {/* Original Complaint Content */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-xs mb-4">
                  <p className="font-bold text-[#00B3BC] mb-1">{isAr ? "نص رسالتك الأصلية:" : "Votre message initial :"}</p>
                  <p className="text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">{selectedTicket.description}</p>
                </div>

                {/* Message Threads */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto p-1 mb-4">
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? "items-start" : "items-end"}`}
                        >
                          <div
                            className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed font-medium ${
                              isMe
                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-tr-none"
                                : "bg-[#00B3BC] text-white rounded-tl-none shadow-sm"
                            }`}
                          >
                            <span className="block text-[10px] font-bold opacity-75 mb-1">
                              {isMe ? (isAr ? "أنت" : "Vous") : (isAr ? "فريق الإدارة (Admin)" : "Administration Khidmati")}
                            </span>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-zinc-400 mt-1 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-xs text-zinc-400 font-medium">
                      {isAr ? "في انتظار رد فريق الإدارة على هذا التيكيت..." : "En attente de la réponse d'administration..."}
                    </div>
                  )}
                </div>

                {/* Reply Box */}
                {selectedTicket.status !== "closed" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Input
                      placeholder={isAr ? "اكتب رداً إضافياً للإدارة..." : "Écrire une réponse..."}
                      value={replyMessage}
                      onValueChange={setReplyMessage}
                      variant="bordered"
                      radius="lg"
                      classNames={{
                        inputWrapper: "h-11 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white",
                        input: "text-xs font-medium"
                      }}
                    />
                    <Button
                      isLoading={sendReplyMutation.isPending}
                      isDisabled={!replyMessage.trim()}
                      onPress={() => sendReplyMutation.mutate()}
                      className="bg-[#00B3BC] text-white font-bold h-11 px-5 rounded-2xl shrink-0 text-xs"
                    >
                      {isAr ? "إرسال" : "Envoyer"}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

          </div>

          {/* Right Column: Submitted Tickets List (Col 5) */}
          <div className="md:col-span-5 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)]"
              style={{ borderRadius: "28px" }}
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-[#00B3BC] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                    {isAr ? "تيكيتات الاعتراض السابقة" : "Mes demandes d'appel"}
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {tickets.length}
                </span>
              </div>

              <div className="space-y-3">
                {isLoadingTickets ? (
                  <div className="text-center py-8 text-xs text-zinc-400 font-medium">
                    {isAr ? "جاري تحميل التيكيتات..." : "Chargement..."}
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto text-zinc-300">
                      <HelpCircle className="w-7 h-7" />
                    </div>
                    <p className="text-xs text-zinc-400 font-medium max-w-xs mx-auto">
                      {isAr
                        ? "لم تقم بتقديم أي تيكيت اعتراض بعد. قم بملء النموذج لإرسال استفسارك للإدارة."
                        : "Vous n'avez soumis aucun ticket d'appel."}
                    </p>
                  </div>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        selectedTicketId === t.id
                          ? "border-[#00B3BC] bg-[#00B3BC]/5 dark:bg-[#00B3BC]/10 shadow-sm"
                          : "border-zinc-100 dark:border-zinc-800/60 hover:border-zinc-200 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400">#{t.id}</span>
                        {getStatusBadge(t.status)}
                      </div>

                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white line-clamp-1">
                        {t.subject}
                      </h4>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 font-medium">
                        {t.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-100/60 dark:border-zinc-800/60">
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                        <span className="text-[#00B3BC] font-bold flex items-center gap-1">
                          {isAr ? "فتح المحادثة" : "Ouvrir"} <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

        </div>

      </div>
    </div>
  );
}
