import { Layout } from "@/components/Layout";
import { LocationPickerDialog } from "@/components/LocationPickerDialog";
import { useConversations, useConversation, useSendMessage, useDeleteMessage, useMarkConversationRead, useCreateInvoice, useUpdateInvoiceStatus } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useLocation, Link } from "wouter";
import { Avatar, Input, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea } from "@heroui/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, MessageSquare, Image as ImageIcon, Trash2, X, Loader2, MapPin,
  ExternalLink, Mic, Play, Pause, ArrowLeft, Bell, Search, Info, Mail, Phone, User, ReceiptText
} from "lucide-react";
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { usePush } from "@/hooks/use-push";
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { motion, AnimatePresence } from "framer-motion";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { VoiceBubble } from "@/components/messages/VoiceBubble";

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return then.toLocaleDateString();
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getDateLabel(dateStr: string, t: (key: string) => string, language: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t("today");
  if (diffDays === 1) return t("yesterday");
  return d.toLocaleDateString(language === 'ar' ? 'ar-MA' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function groupMessagesByDate(messages: any[]): { date: string; msgs: any[] }[] {
  const groups: { date: string; msgs: any[] }[] = [];
  for (const msg of messages) {
    const dateKey = msg.createdAt ? new Date(msg.createdAt).toDateString() : 'unknown';
    const last = groups[groups.length - 1];
    if (last && last.date === dateKey) {
      last.msgs.push(msg);
    } else {
      groups.push({ date: dateKey, msgs: [msg] });
    }
  }
  return groups;
}

const LocationBubble = ({ lat, lng }: { lat: number, lng: number }) => {
  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-48 w-64 md:w-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md relative z-0 group mb-2 hover:opacity-95 transition-opacity"
    >
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} />
      </MapContainer>

      {/* Overlay to ensure clicks trigger the link */}
      <div className="absolute inset-0 z-10 cursor-pointer" />

      <div className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full shadow-lg z-20 group-hover:bg-white transition-colors">
        <ExternalLink className="w-4 h-4 text-primary" />
      </div>
    </a>
  );
};

const AudioVisualizer = ({ stream }: { stream: MediaStream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const contextRef = useRef<AudioContext>();

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    if (!contextRef.current) {
      contextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = contextRef.current;
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d")!;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        // Draw bars with gradient or solid color
        canvasCtx.fillStyle = `rgb(6, 182, 212)`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (contextRef.current && contextRef.current.state !== 'closed') {
        contextRef.current.close();
        contextRef.current = undefined;
      }
    };
  }, [stream]);

  return <canvas ref={canvasRef} width={200} height={40} className="rounded-lg opacity-80" />;
};

export default function Messages() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { subscribe, isSubscribing } = usePush();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialId = searchParams.get("id") ? parseInt(searchParams.get("id")!) : null;

  const [activeId, setActiveId] = useState<number | null>(initialId);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: conversations, isLoading: loadingList } = useConversations();
  const { data: activeConversation } = useConversation(activeId || 0);
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const markRead = useMarkConversationRead();
  const createInvoice = useCreateInvoice();
  const updateInvoiceStatus = useUpdateInvoiceStatus();

  const [showInfoPanel, setShowInfoPanel] = useState(window.innerWidth > 1024);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceDesc, setInvoiceDesc] = useState("");
  const [invoicePrice, setInvoicePrice] = useState("");

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (activeId && activeConversation?.messages && user?.id) {
      const hasUnread = activeConversation.messages.some((m: any) => !m.read && m.senderId !== user.id);
      if (hasUnread && !markRead.isPending) {
        markRead.mutate(activeId);
      }
    }
  }, [activeId, activeConversation?.messages, user?.id]);

  const [msgContent, setMsgContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [contextMenuMsg, setContextMenuMsg] = useState<number | null>(null);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRTL = language === "ar";

  // Scroll to bottom on new messages
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages, activeId]);

  // Handle conversation switch without page reload
  const switchConversation = useCallback((convId: number) => {
    setActiveId(convId);
    setContextMenuMsg(null);
    const url = new URL(window.location.href);
    url.searchParams.set("id", convId.toString());
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Image selection handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t("onlyImagesAllowed"), variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("imageTooLarge"), variant: "destructive" });
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!msgContent.trim() && !selectedImage) || !activeId) return;

    try {
      await sendMessage.mutateAsync({
        conversationId: activeId,
        content: msgContent.trim() || undefined,
        image: selectedImage || undefined,
        type: "text",
      });
      setMsgContent("");
      clearImage();
    } catch {
      toast({ title: t("failedToSend"), variant: "destructive" });
    }
  };

  const handleCreateInvoice = async () => {
    if (!activeId || !invoiceDesc || !invoicePrice) return;
    try {
      await createInvoice.mutateAsync({
        conversationId: activeId,
        description: invoiceDesc,
        agreedPrice: Number(invoicePrice)
      });
      setIsInvoiceModalOpen(false);
      setInvoiceDesc("");
      setInvoicePrice("");
      toast({ title: "Invoice sent successfully" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to send invoice", variant: "destructive" });
    }
  };

  const handleInvoiceAction = async (invoiceId: number, currentStatus: string, actionRole: 'client' | 'provider', isReject = false) => {
    let nextStatus = "";
    if (isReject) {
      nextStatus = "rejected";
    } else {
      if (currentStatus === "pending_agreement" && actionRole === "client") nextStatus = "agreed";
      else if (currentStatus === "agreed" && actionRole === "provider") nextStatus = "awaiting_confirmation";
      else if (currentStatus === "awaiting_confirmation" && actionRole === "client") nextStatus = "completed";
    }
    
    if (!nextStatus) return;
    
    try {
      await updateInvoiceStatus.mutateAsync({ invoiceId, status: nextStatus });
    } catch (err: any) {
      toast({ title: err.message || "Action failed", variant: "destructive" });
    }
  };

  const handleSendLocation = () => {
    if (!activeId) return;
    setIsLocationPickerOpen(true);
  };

  const onLocationSelected = (location: { lat: number; lng: number }) => {
    sendMessage.mutate({
      conversationId: activeId!,
      content: "📍 Shared a location",
      type: "location",
      locationData: location
    });
  };

  const startRecording = async () => {
    if (!activeId) return;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const voiceFile = new File([audioBlob], "voice-note.webm", { type: 'audio/webm' });

        const formData = new FormData();
        formData.append("voice", voiceFile);

        try {
          const uploadRes = await fetch('/api/upload/voice', {
            method: 'POST',
            body: formData
          });

          if (!uploadRes.ok) throw new Error("Upload failed");
          const { url } = await uploadRes.json();

          sendMessage.mutate({
            conversationId: activeId,
            content: "🎤 Voice Message",
            type: "voice",
            fileUrl: url,
            duration: recordingDuration
          });
        } catch (err) {
          console.error("Voice upload failed", err);
          toast({ title: "Failed to send voice note", variant: "destructive" });
        }

        audioStream.getTracks().forEach(track => track.stop());
        setStream(null);
        setRecordingDuration(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied", err);
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());

      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingDuration(0);
      setStream(null);
    }
  };

  const handleDelete = async (messageId: number) => {
    try {
      await deleteMessage.mutateAsync({ messageId });
      setContextMenuMsg(null);
      toast({ title: t("messageDeleted") });
    } catch (err: any) {
      toast({ title: err.message || t("failedToDelete"), variant: "destructive" });
    }
  };

  useEffect(() => {
    const handler = () => setContextMenuMsg(null);
    if (contextMenuMsg !== null) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [contextMenuMsg]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [showEmojiPicker]);

  const emojis = ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","🥰","😘","😜","😤","😢","😭","😮","😱","👍","👎","👌","✌️","💪","🙏","🔥","⭐","❤️","💔","💀","✅","❌","🎉","🎊","📞","📍","🏠","💰","⏰","🚗","✈️"];

  if (!user) {
    return (
      <Layout>
        <div className="p-12 text-center text-muted-foreground">{t("pleaseLogin")}</div>
      </Layout>
    );
  }

  const activeConv = conversations?.find((c) => c.id === activeId);
  const otherUser = activeConv?.otherUser;
  const otherName = otherUser?.fullName || "...";

  // Filter conversations
  const filteredConversations = conversations?.filter((conv) => {
    return conv.otherUser.fullName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Layout>
      <div className="flex flex-col h-[100dvh] overflow-hidden bg-zinc-50 dark:bg-black overscroll-none touch-none" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex-1 flex flex-col md:container md:mx-auto md:px-4 md:py-6 overflow-hidden overscroll-none">
          <div className="flex flex-col md:flex-row flex-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl md:rounded-[32px] md:border md:border-zinc-200/80 dark:md:border-zinc-800/80 md:shadow-[0_20px_60px_rgba(0,0,0,0.04)] overflow-hidden relative">
            
            {/* Sidebar - Conversation List */}
            <div className={cn(
              "w-full md:w-96 flex flex-col border-e border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40",
              activeId ? "hidden md:flex" : "flex"
            )}>
              <div className="p-4 border-b bg-white dark:bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href="/" className="group">
                    <div className="p-1 rounded-xl transition-all duration-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/20">
                      <img
                        src="/logo.png"
                        alt="Logo"
                        className="w-9 h-9 rounded-xl shadow-md transition-transform group-hover:scale-105 object-cover"
                      />
                    </div>
                  </Link>
                  <h2 className="font-extrabold text-xl bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">{t("messages")}</h2>
                </div>
                <Button
                  variant="light"
                  isIconOnly
                  onPress={subscribe}
                  isDisabled={isSubscribing}
                  title={t("enableNotifications")}
                  className="h-9 w-9 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-950/20 text-cyan-600"
                >
                  {isSubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-5 w-5" />}
                </Button>
              </div>

              {/* Search Bar */}
              <div className="px-4 py-2 border-b bg-white dark:bg-slate-900">
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground start-3" />
                  <Input
                    placeholder={t("searchConversations")}
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    className="h-10 ps-9 pe-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-none text-sm"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {loadingList ? (
                    <div className="p-8 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : filteredConversations?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      {t("noConversations")}
                    </div>
                  ) : (
                    filteredConversations?.map((conv) => {
                      const isActive = activeId === conv.id;
                      const hasUnread = conv.unreadCount > 0;
                      return (
                        <div
                          key={conv.id}
                          onClick={() => switchConversation(conv.id)}
                          className={cn(
                            "p-3 rounded-2xl cursor-pointer transition-all duration-200 flex items-center gap-3 relative overflow-hidden group",
                            isActive 
                              ? "bg-cyan-50 dark:bg-cyan-950/20 text-cyan-950 dark:text-cyan-50"
                              : "hover:bg-slate-100/70 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                          )}
                        >
                          {isActive && (
                            <div className="absolute top-0 bottom-0 w-1 bg-primary start-0 rounded-full" />
                          )}
                          <div className="relative">
                            <Avatar
                              src={conv.otherUser.profileImage || undefined}
                              name={conv.otherUser.fullName}
                              showFallback
                              className="w-12 h-12 border-2 border-background shadow-md"
                              classNames={{ fallback: "bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-bold text-base" }}
                            />
                            <span className="absolute bottom-0 end-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                          </div>

                          <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className={cn("truncate text-sm font-bold", hasUnread ? "text-slate-950 dark:text-white" : "text-slate-800 dark:text-slate-200")}>
                                  {conv.otherUser.fullName}
                                </h4>
                                {conv.otherUser.role === 'provider' ? (
                                  <span className="text-[9px] font-semibold bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 px-1.5 py-0.5 rounded-full">
                                    {t("pro")}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                                    {t("client")}
                                  </span>
                                )}
                              </div>
                              <p className={cn(
                                "text-xs truncate mt-1",
                                hasUnread ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                              )}>
                                {conv.lastMessage || "Start chatting..."}
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {conv.updatedAt && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {timeAgo(conv.updatedAt)}
                                </span>
                              )}
                              {hasUnread && (
                                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-primary rounded-full animate-pulse">
                                  {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Main Chat Window */}
            <div className={cn(
              "flex-1 flex flex-col min-w-0 h-full bg-white dark:bg-slate-900",
              !activeId ? "hidden md:flex" : "flex"
            )}>
              {activeId && activeConversation ? (
                <div className="flex-1 flex flex-row overflow-hidden h-full relative">
                  
                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col min-w-0 h-full relative">
                    
                    {/* Chat Header */}
                    <div className="flex-none p-4 border-b flex items-center justify-between bg-white dark:bg-slate-900 shadow-sm z-10">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="light"
                          isIconOnly
                          className="md:hidden mr-1"
                          onPress={() => setActiveId(null)}
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </Button>

                        <div className="relative">
                          <Avatar
                            src={otherUser?.profileImage || undefined}
                            name={otherName}
                            showFallback
                            className="w-10 h-10 border-2 border-primary/20"
                            classNames={{ fallback: "bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-bold text-sm" }}
                          />
                          <span className="absolute bottom-0 end-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                            {otherName}
                            {otherUser?.role === 'provider' ? (
                              <span className="text-[9px] font-semibold bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 px-1.5 py-0.5 rounded-full">
                                {t("pro")}
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                                {t("client")}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {activeConversation.messages?.length || 0} {t("messages")}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="light"
                          isIconOnly
                          onPress={() => setShowInfoPanel(!showInfoPanel)}
                          className={cn("h-9 w-9 rounded-xl transition-colors", showInfoPanel ? "text-primary bg-primary/10" : "text-slate-500")}
                          title={t("contactDetails")}
                        >
                          <Info className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="light"
                          isIconOnly
                          onPress={subscribe}
                          isDisabled={isSubscribing}
                          title={t("enableNotifications")}
                          className="h-9 w-9 rounded-xl text-cyan-600"
                        >
                          {isSubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-5 w-5" />}
                        </Button>
                      </div>
                    </div>

                    {/* Messages List Area */}
                    <div
                      className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/40 dark:bg-slate-950/10 touch-pan-y overscroll-contain"
                      ref={scrollRef}
                      style={{ backgroundImage: "radial-gradient(#e2e8f0 1.2px, transparent 1.2px)", backgroundSize: "24px 24px" }}
                    >
                      <div className="text-center mb-2">
                        <span className="inline-block text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-100 dark:border-amber-900/25 font-semibold">
                          ⏳ {t("messagesAutoDelete")}
                        </span>
                      </div>

                      {groupMessagesByDate(activeConversation.messages || []).map((group) => (
                        <div key={group.date} className="space-y-4">
                          <div className="flex justify-center my-3">
                            <span className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-sm text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full font-bold">
                              {getDateLabel(group.msgs[0].createdAt, t, language)}
                            </span>
                          </div>
                          {group.msgs.map((msg: any) => {
                            const isMe = msg.senderId === user.id;
                            return (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn("flex group", isMe ? "justify-end" : "justify-start")}
                              >
                                <div className="relative max-w-[85%] sm:max-w-[70%]">
                                  {isMe && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setContextMenuMsg(contextMenuMsg === msg.id ? null : msg.id);
                                      }}
                                      className="absolute -start-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 transition-colors" />
                                    </button>
                                  )}

                                  {contextMenuMsg === msg.id && (
                                    <div className="absolute -start-32 top-0 bg-white dark:bg-slate-800 border rounded-xl shadow-xl p-1 z-20 min-w-[120px] animate-in fade-in zoom-in-95 duration-100">
                                      <button
                                        onClick={() => handleDelete(msg.id)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors font-bold"
                                        disabled={deleteMessage.isPending}
                                      >
                                        {deleteMessage.isPending ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                        {t("delete")}
                                      </button>
                                    </div>
                                  )}

                                  <div
                                    className={cn(
                                      "px-4 py-2.5 rounded-2xl text-[14px] shadow-sm leading-relaxed",
                                      isMe
                                        ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-te-none"
                                        : "bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-ts-none text-slate-800 dark:text-slate-100"
                                    )}
                                  >
                                    {msg.type === 'location' && msg.locationData && (
                                      <LocationBubble lat={msg.locationData.lat as number} lng={msg.locationData.lng as number} />
                                    )}

                                    {msg.type === 'voice' && msg.fileUrl && (
                                      <VoiceBubble fileUrl={msg.fileUrl} duration={msg.duration} />
                                    )}

                                    {msg.type === 'invoice' && msg.invoice && (
                                      <div className="mt-2 w-[280px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-4 shadow-sm text-slate-800 dark:text-slate-200 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                                        <div className="font-extrabold border-b border-slate-100 dark:border-slate-800 pb-3 mb-3 text-primary flex items-center gap-2">
                                          <ReceiptText className="w-5 h-5" />
                                          {t("cashInvoice")}
                                        </div>
                                        <div className="text-sm space-y-2 relative z-10">
                                          <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">{t("description")}</p>
                                            <p className="font-semibold">{msg.invoice.description}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">{t("agreedPrice")}</p>
                                            <p className="text-xl font-extrabold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">{msg.invoice.agreedPrice} MAD</p>
                                          </div>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 relative z-10">
                                          {msg.invoice.status === 'pending_agreement' && (
                                            <>
                                              <p className="text-xs text-amber-500 font-semibold mb-2">{t("pendingClientAgreement")}</p>
                                              {user.id === msg.invoice.clientId && (
                                                <div className="flex gap-2 w-full">
                                                  <Button size="sm" className="flex-1 bg-primary text-white font-bold rounded-xl" onPress={() => handleInvoiceAction(msg.invoice.id, 'pending_agreement', 'client')} isLoading={updateInvoiceStatus.isPending}>
                                                    {t("agree")}
                                                  </Button>
                                                  <Button size="sm" variant="flat" color="danger" className="flex-1 font-bold rounded-xl" onPress={() => handleInvoiceAction(msg.invoice.id, 'pending_agreement', 'client', true)} isLoading={updateInvoiceStatus.isPending}>
                                                    {t("disagree")}
                                                  </Button>
                                                </div>
                                              )}
                                            </>
                                          )}
                                          {msg.invoice.status === 'agreed' && (
                                            <>
                                              <p className="text-xs text-blue-500 font-semibold mb-2">{t("agreedAwaitingCash")}</p>
                                              {user.id === msg.invoice.providerId && (
                                                <div className="flex gap-2 w-full">
                                                  <Button size="sm" className="flex-1 bg-blue-500 text-white font-bold rounded-xl" onPress={() => handleInvoiceAction(msg.invoice.id, 'agreed', 'provider')} isLoading={updateInvoiceStatus.isPending}>
                                                    {t("cashReceived")}
                                                  </Button>
                                                  <Button size="sm" variant="flat" color="danger" className="flex-1 font-bold rounded-xl" onPress={() => handleInvoiceAction(msg.invoice.id, 'agreed', 'provider', true)} isLoading={updateInvoiceStatus.isPending}>
                                                    {t("didNotReceiveCash")}
                                                  </Button>
                                                </div>
                                              )}
                                            </>
                                          )}
                                          {msg.invoice.status === 'awaiting_confirmation' && (
                                            <>
                                              <p className="text-xs text-purple-500 font-semibold mb-2">{t("awaitingClientConfirmation")}</p>
                                              {user.id === msg.invoice.clientId && (
                                                <Button size="sm" className="w-full bg-purple-500 text-white font-bold rounded-xl" onPress={() => handleInvoiceAction(msg.invoice.id, 'awaiting_confirmation', 'client')} isLoading={updateInvoiceStatus.isPending}>
                                                  {t("confirmCashPaid")}
                                                </Button>
                                              )}
                                            </>
                                          )}
                                          {msg.invoice.status === 'completed' && (
                                            <>
                                              <div className="flex items-center justify-center gap-2 text-emerald-500 font-bold mb-3 bg-emerald-50 dark:bg-emerald-950/30 py-1.5 rounded-lg">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                {t("paymentCompleted")}
                                              </div>
                                              <Link href={`/invoice/${msg.invoice.id}/print`} target="_blank">
                                                <Button size="sm" variant="flat" className="w-full text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 font-bold rounded-xl">
                                                  {t("downloadPdf")}
                                                </Button>
                                              </Link>
                                            </>
                                          )}
                                          {msg.invoice.status === 'rejected' && (
                                            <>
                                              <div className="flex items-center justify-center gap-2 text-red-500 font-bold mb-3 bg-red-50 dark:bg-red-950/30 py-1.5 rounded-lg">
                                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                                {t("priceRejectedByClient")}
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {msg.imageUrl && (
                                      <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="block mb-2 overflow-hidden rounded-xl border border-black/5">
                                        <img
                                          src={msg.imageUrl}
                                          alt="Shared image"
                                          className="max-w-full max-h-72 object-cover hover:scale-[1.02] transition-transform duration-200 cursor-zoom-in"
                                        />
                                      </a>
                                    )}

                                    {msg.content &&
                                      !(msg.type === 'location' && msg.content === "📍 Shared a location") &&
                                      !(msg.type === 'voice' && msg.content === "🎤 Voice Message") &&
                                      msg.content !== "📷 Image" && (
                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                      )}

                                    <div
                                      className={cn(
                                        "text-[10px] mt-1.5 font-medium flex items-center gap-1",
                                        isMe ? "justify-end text-white/70" : "justify-end text-slate-400 dark:text-slate-500"
                                      )}
                                    >
                                      {msg.createdAt ? formatTime(msg.createdAt) : ""}
                                      {isMe && msg.read && (
                                        <span className="text-[11px] text-cyan-200 font-bold" title="Read">✓✓</span>
                                      )}
                                      {isMe && !msg.read && (
                                        <span className="text-[11px] opacity-60" title="Sent">✓</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Chat Input Bar */}
                    <div className="flex-none bg-white dark:bg-slate-900 border-t z-20">
                      {imagePreview && (
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border-b flex items-center gap-3 animate-in slide-in-from-bottom-2">
                          <div className="relative group">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-16 h-16 object-cover rounded-xl border-2 border-primary/20 shadow-md"
                            />
                            <button
                              onClick={clearImage}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{selectedImage?.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-mono">{Math.round((selectedImage?.size || 0) / 1024)} KB</p>
                          </div>
                        </div>
                      )}

                      {isRecording ? (
                        <div className="p-3 flex items-center gap-2 bg-slate-50 dark:bg-slate-950/10 animate-in slide-in-from-bottom-2 duration-300">
                          <Button
                            type="button"
                            variant="light"
                            isIconOnly
                            className="text-red-500 rounded-xl"
                            onPress={cancelRecording}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>

                          <div className="flex-1 flex items-center gap-3 bg-white dark:bg-slate-950 px-4 py-2 rounded-2xl border shadow-inner">
                            <div className="flex items-center gap-2 min-w-[70px]">
                              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-sm" />
                              <span className="text-sm font-mono font-bold tabular-nums">
                                {formatDuration(recordingDuration)}
                              </span>
                            </div>
                            <div className="flex-1 flex justify-center overflow-hidden h-[40px]">
                              {stream && <AudioVisualizer stream={stream} />}
                            </div>
                          </div>

                          <Button
                            type="button"
                            isIconOnly
                            className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg w-10 h-10 shrink-0"
                            onPress={stopRecording}
                          >
                            <Send className="w-5 h-5 ml-0.5" />
                          </Button>
                        </div>
                      ) : (
                        <form onSubmit={handleSend} className="p-3 flex items-center gap-2 bg-white dark:bg-slate-900">
                          <div className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="light"
                              isIconOnly
                              className="text-slate-400 rounded-xl"
                              onPress={handleSendLocation}
                            >
                              <MapPin className="w-5 h-5" />
                            </Button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleImageSelect}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="light"
                              isIconOnly
                              className="text-slate-400 rounded-xl"
                              onPress={() => fileInputRef.current?.click()}
                            >
                              <ImageIcon className="w-5 h-5" />
                            </Button>
                            {user.role === 'provider' && (
                              <Button
                                type="button"
                                variant="light"
                                isIconOnly
                                className="text-slate-400 rounded-xl"
                                onPress={() => setIsInvoiceModalOpen(true)}
                                title={t("createInvoice")}
                              >
                                <ReceiptText className="w-5 h-5" />
                              </Button>
                            )}
                            <div className="relative" ref={emojiRef}>
                              <Button
                                type="button"
                                variant="light"
                                isIconOnly
                                className="text-slate-400 rounded-xl"
                                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                              >
                                <span className="text-lg leading-none">😊</span>
                              </Button>
                              {showEmojiPicker && (
                                <div className="absolute bottom-12 start-0 w-[270px] p-3 bg-white dark:bg-slate-800 border rounded-2xl shadow-2xl z-30 grid grid-cols-8 gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                                  {emojis.map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      className="hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-1.5 text-lg leading-none transition-colors"
                                      onClick={() => {
                                        setMsgContent(prev => prev + emoji);
                                        setShowEmojiPicker(false);
                                      }}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <Input
                            placeholder={t("typeMessage")}
                            value={msgContent}
                            onValueChange={setMsgContent}
                            className="flex-1 rounded-2xl bg-slate-50 dark:bg-slate-950/60 h-11 text-sm"
                          />

                          {msgContent.trim() || selectedImage ? (
                            <Button
                              type="submit"
                              isIconOnly
                              className="rounded-full bg-primary hover:bg-primary/95 text-white shadow-md w-10 h-10 shrink-0"
                              isDisabled={sendMessage.isPending}
                            >
                              {sendMessage.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Send className="w-5 h-5 ml-0.5" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="light"
                              isIconOnly
                              className="text-slate-400 rounded-full w-10 h-10 shrink-0"
                              onPress={startRecording}
                            >
                              <Mic className="w-5 h-5" />
                            </Button>
                          )}
                        </form>
                      )}
                    </div>

                    <LocationPickerDialog
                      open={isLocationPickerOpen}
                      onOpenChange={setIsLocationPickerOpen}
                      onSelectLocation={onLocationSelected}
                    />

                    <Modal isOpen={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen} placement="center">
                      <ModalContent>
                        {(onClose) => (
                          <>
                            <ModalHeader className="font-extrabold text-xl text-slate-800 dark:text-white">
                              {t("createCashInvoice")}
                            </ModalHeader>
                            <ModalBody>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                                    {t("serviceDescription")}
                                  </label>
                                  <Textarea
                                    placeholder={t("serviceDescriptionPlaceholder")}
                                    value={invoiceDesc}
                                    onValueChange={setInvoiceDesc}
                                    className="bg-slate-50"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                                    {t("agreedPriceMAD")}
                                  </label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={invoicePrice}
                                    onValueChange={setInvoicePrice}
                                    className="bg-slate-50"
                                    startContent={<span className="text-slate-400 font-bold text-sm">MAD</span>}
                                  />
                                </div>
                                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-semibold">
                                  {t("cashInvoiceNote")}
                                </div>
                              </div>
                            </ModalBody>
                            <ModalFooter>
                              <Button variant="flat" onPress={onClose} className="rounded-xl font-bold">
                                {t("cancel")}
                              </Button>
                              <Button 
                                color="primary" 
                                className="rounded-xl font-bold shadow-md" 
                                onPress={handleCreateInvoice}
                                isLoading={createInvoice.isPending}
                                isDisabled={!invoiceDesc || !invoicePrice}
                              >
                                {t("sendInvoice")}
                              </Button>
                            </ModalFooter>
                          </>
                        )}
                      </ModalContent>
                    </Modal>

                  </div>

                  {/* Sidebar Panel - Contact Info */}
                  <AnimatePresence>
                    {showInfoPanel && otherUser && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: window.innerWidth > 768 ? 320 : "100%", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className={cn(
                          "border-s bg-slate-50/50 dark:bg-slate-900/20 flex flex-col h-full overflow-hidden absolute md:relative z-30 inset-y-0 end-0",
                          window.innerWidth < 768 && "w-full bg-white dark:bg-slate-900"
                        )}
                      >
                        <div className="p-4 border-b flex items-center justify-between bg-white dark:bg-slate-900">
                          <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                            {t("contactDetails")}
                          </h3>
                          <Button
                            variant="light"
                            isIconOnly
                            onPress={() => setShowInfoPanel(false)}
                            className="rounded-xl h-8 w-8 text-slate-500"
                          >
                            <X className="h-4.5 w-4.5" />
                          </Button>
                        </div>

                        <ScrollArea className="flex-1 p-5 overflow-y-auto">
                          <div className="flex flex-col items-center text-center space-y-4 mb-6">
                            <Avatar
                              src={otherUser.profileImage || undefined}
                              name={otherName}
                              showFallback
                              className="w-24 h-24 border-4 border-white dark:border-slate-800 shadow-xl"
                              classNames={{ fallback: "bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-extrabold text-3xl" }}
                            />
                            <div>
                              <h4 className="font-extrabold text-lg text-slate-800 dark:text-white">{otherName}</h4>
                              <div className="mt-1 flex items-center justify-center">
                                {otherUser.role === 'provider' ? (
                                  <span className="text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 px-2.5 py-0.5 rounded-full">
                                    {t("proSpecialist")}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full">
                                    {t("clientProfile")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/40 dark:border-slate-800/40">
                            {otherUser.city && (
                              <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                                <div className="text-start">
                                  <p className="text-[10px] text-slate-400 font-semibold uppercase">{t("city")}</p>
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{otherUser.city}</p>
                                </div>
                              </div>
                            )}
                            {otherUser.email && (
                              <div className="flex items-start gap-3">
                                <Mail className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                                <div className="text-start">
                                  <p className="text-[10px] text-slate-400 font-semibold uppercase">{t("emailLabel")}</p>
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{otherUser.email}</p>
                                </div>
                              </div>
                            )}
                            {otherUser.phone && (
                              <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                                <div className="text-start">
                                  <p className="text-[10px] text-slate-400 font-semibold uppercase">{t("phoneNumber")}</p>
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{otherUser.phone}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {otherUser.role === 'provider' && (
                            <div className="mt-6">
                              <Link href={`/providers/${otherUser.id}`}>
                                <Button className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-2.5 shadow-md">
                                  {t("viewPublicProfile")}
                                </Button>
                              </Link>
                            </div>
                          )}
                        </ScrollArea>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground bg-slate-50/20 dark:bg-slate-950/20">
                  <div className="w-24 h-24 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-slate-850 dark:to-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-100 dark:border-slate-800">
                    <MessageSquare className="w-11 h-11 text-cyan-500/40" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-xl">{t("selectConversation")}</h3>
                  <p className="text-sm mt-2 text-slate-400 max-w-xs text-center leading-relaxed">
                    {t("chooseFromSidebar")}
                  </p>
                  <Link href="/search" className="mt-6">
                    <Button variant="bordered" className="rounded-xl font-bold gap-2">
                      <Search className="w-4 h-4" />
                      {t("exploreServices")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
