import { Layout } from "@/components/Layout";
import { LocationPickerDialog } from "@/components/LocationPickerDialog";
import { useConversations, useConversation, useSendMessage, useDeleteMessage, useMarkConversationRead } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useLocation, Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, Image as ImageIcon, Trash2, X, Loader2, MapPin, ExternalLink, Mic, Square, Play, Pause, ArrowLeft, Home, Bell, BellOff } from "lucide-react";
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { usePush } from "@/hooks/use-push";
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const LocationBubble = ({ lat, lng }: { lat: number, lng: number }) => {
  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-48 w-64 md:w-80 rounded-lg overflow-hidden border shadow-sm relative z-0 group mb-2 hover:opacity-95 transition-opacity"
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

      <div className="absolute bottom-2 right-2 bg-white/90 p-1.5 rounded-full shadow-md z-20 group-hover:bg-white transition-colors">
        <ExternalLink className="w-4 h-4 text-primary" />
      </div>
    </a>
  );
};

import { VoiceBubble } from "@/components/messages/VoiceBubble";

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
        canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
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

  return <canvas ref={canvasRef} width={200} height={40} className="rounded" />;
};

export default function Messages() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { subscribe, isSubscribing } = usePush();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialId = searchParams.get("id") ? parseInt(searchParams.get("id")!) : null;

  const [activeId, setActiveId] = useState<number | null>(initialId);
  const { data: conversations, isLoading: loadingList } = useConversations();
  const { data: activeConversation } = useConversation(activeId || 0);
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const markRead = useMarkConversationRead();

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (activeId && activeConversation?.messages && user?.id) {
      const hasUnread = activeConversation.messages.some(m => !m.read && m.senderId !== user.id);
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSendLocation = () => {
    console.log("handleSendLocation called");
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
      setStream(audioStream); // Store stream for visualizer
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

        // Upload voice
        const formData = new FormData();
        formData.append("voice", voiceFile);

        try {
          // Upload first
          const uploadRes = await fetch('/api/upload/voice', {
            method: 'POST',
            body: formData
          });

          if (!uploadRes.ok) throw new Error("Upload failed");
          const { url } = await uploadRes.json();

          // Then send message
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

        // Cleanup
        audioStream.getTracks().forEach(track => track.stop());
        setStream(null); // Clear stream
        setRecordingDuration(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Timer
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
      // Stop but don't define onstop (or just ignore result)
      // easiest way is to reassign onstop to null before stopping
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());

      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingDuration(0);
      setStream(null); // Clear stream
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

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setContextMenuMsg(null);
    if (contextMenuMsg !== null) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [contextMenuMsg]);

  if (!user) {
    return (
      <Layout>
        <div className="p-12 text-center text-muted-foreground">{t("pleaseLogin")}</div>
      </Layout>
    );
  }

  const activeConv = conversations?.find((c) => c.id === activeId);
  const otherName = activeConv?.otherUser?.fullName || "...";

  return (
    <Layout>
      <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-50 dark:bg-slate-950 overscroll-none touch-none">
        <div className="flex-1 flex flex-col md:container md:mx-auto md:px-4 md:py-6 overflow-hidden overscroll-none">
          <div className="flex flex-col md:flex-row flex-1 bg-card md:rounded-2xl md:border md:shadow-sm overflow-hidden">
            {/* Sidebar List */}
            <div className={cn(
              "w-full md:w-80 flex flex-col border-r bg-muted/30",
              activeId ? "hidden md:flex" : "flex"
            )}>
              <div className="p-4 border-b bg-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link href="/" className="group">
                    <div className="p-0.5 rounded-lg transition-colors hover:bg-primary/5">
                      <img
                        src="/logo.png"
                        alt="Logo"
                        className="w-8 h-8 rounded-lg shadow-lg shadow-primary/25 transition-transform group-hover:scale-105 object-cover"
                      />
                    </div>
                  </Link>
                  <h2 className="font-semibold text-lg">{t("messages")}</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={subscribe}
                  disabled={isSubscribing}
                  title={language === 'ar' ? 'تفعيل التنبيهات' : 'Enable Notifications'}
                  className="h-8 w-8"
                >
                  {isSubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4 text-primary" />}
                </Button>
              </div>
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="divide-y">
                  {loadingList ? (
                    <div className="p-8 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : conversations?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      {t("noConversations")}
                    </div>
                  ) : (
                    conversations?.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => switchConversation(conv.id)}
                        className={cn(
                          "p-4 cursor-pointer hover:bg-secondary/50 transition-all flex items-center gap-3 group",
                          activeId === conv.id && "bg-primary/10 border-l-4 border-l-primary"
                        )}
                      >
                        <Avatar className="w-11 h-11 border-2 border-background shadow-sm">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {conv.otherUser.fullName[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold truncate text-sm">{conv.otherUser.fullName}</h4>
                            <p className={cn(
                              "text-xs truncate mt-0.5",
                              conv.unreadCount > 0 ? "font-bold text-foreground" : "text-muted-foreground"
                            )}>
                              {conv.lastMessage || "Start chatting..."}
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {conv.updatedAt && (
                              <span className="text-[10px] text-muted-foreground">
                                {timeAgo(conv.updatedAt)}
                              </span>
                            )}
                            {conv.unreadCount > 0 && (
                              <span className="flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-bold text-white bg-primary rounded-full animate-in zoom-in">
                                {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Window */}
            <div className={cn(
              "flex-1 flex flex-col min-w-0 h-full",
              !activeId ? "hidden md:flex" : "flex"
            )}>
              {activeId && activeConversation ? (
                <>
                  {/* Chat Header - Sticky */}
                  <div className="flex-none p-4 border-b flex items-center gap-3 bg-card/80 backdrop-blur-sm z-10 shadow-sm overscroll-none touch-none">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="md:hidden mr-1"
                          onClick={() => setActiveId(null)}
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </Button>

                        <Avatar className="w-9 h-9 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                            {otherName[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-sm">{otherName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {activeConversation.messages?.length || 0} messages
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={subscribe}
                        disabled={isSubscribing}
                        title={language === 'ar' ? 'تفعيل التنبيهات' : 'Enable Notifications'}
                        className="h-9 w-9 text-primary"
                      >
                        {isSubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-5 w-5" />}
                      </Button>
                      <Link href="/" className="group">
                        <div className="p-1 rounded-xl transition-colors hover:bg-primary/5">
                          <img
                            src="/logo.png"
                            alt="Logo"
                            className="w-8 h-8 rounded-lg shadow-lg shadow-primary/25 transition-transform group-hover:scale-105 object-cover"
                          />
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* Messages Area - Scrollable */}
                  <div
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/30 touch-pan-y overscroll-contain"
                    ref={scrollRef}
                  >
                    <div className="text-center mb-4">
                      <span className="inline-block text-[10px] bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full font-medium">
                        ⏳ {t("messagesAutoDelete")}
                      </span>
                    </div>

                    {activeConversation.messages?.map((msg: any) => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn("flex group", isMe ? "justify-end" : "justify-start")}
                        >
                          <div className="relative max-w-[85%] sm:max-w-[75%]">
                            {isMe && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContextMenuMsg(contextMenuMsg === msg.id ? null : msg.id);
                                }}
                                className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500 transition-colors" />
                              </button>
                            )}

                            {contextMenuMsg === msg.id && (
                              <div className="absolute -left-32 top-0 bg-background border rounded-lg shadow-xl p-1 z-20 min-w-[120px] animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={() => handleDelete(msg.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors font-medium"
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
                                "px-4 py-2.5 rounded-2xl text-[15px] shadow-sm leading-relaxed",
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-none"
                                  : "bg-white dark:bg-slate-800 border rounded-bl-none border-slate-200 dark:border-slate-700"
                              )}
                            >
                              {msg.type === 'location' && msg.locationData && (
                                <LocationBubble lat={msg.locationData.lat as number} lng={msg.locationData.lng as number} />
                              )}

                              {msg.type === 'voice' && msg.fileUrl && (
                                <VoiceBubble fileUrl={msg.fileUrl} duration={msg.duration} />
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
                                  "text-[10px] mt-1 text-right font-medium",
                                  isMe ? "text-primary-foreground/60" : "text-muted-foreground/60"
                                )}
                              >
                                {msg.createdAt ? formatTime(msg.createdAt) : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Input Area - Fixed at Bottom */}
                  <div className="flex-none bg-background border-t z-20 overscroll-none touch-none">
                    {imagePreview && (
                      <div className="px-4 py-3 bg-card flex items-center gap-3 animate-in slide-in-from-bottom-2">
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
                          <p className="text-[10px] text-muted-foreground uppercase">{Math.round((selectedImage?.size || 0) / 1024)} KB</p>
                        </div>
                      </div>
                    )}

                    {isRecording ? (
                      <div className="p-3 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={cancelRecording}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>

                        <div className="flex-1 flex items-center gap-3 bg-secondary/30 px-4 py-2.5 rounded-full border border-border shadow-inner">
                          <div className="flex items-center gap-2 min-w-[70px]">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-sm" />
                            <span className="text-sm font-mono font-bold tabular-nums">
                              {formatDuration(recordingDuration)}
                            </span>
                          </div>
                          <div className="flex-1 flex justify-center overflow-hidden">
                            {stream && <AudioVisualizer stream={stream} />}
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="icon"
                          className="rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg w-10 h-10 shrink-0"
                          onClick={stopRecording}
                        >
                          <Send className="w-5 h-5 ml-0.5" />
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSend} className="p-3 flex items-center gap-2">
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary shrink-0"
                            onClick={handleSendLocation}
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
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary shrink-0"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <ImageIcon className="w-5 h-5" />
                          </Button>
                        </div>

                        <Input
                          placeholder={t("typeMessage")}
                          value={msgContent}
                          onChange={(e) => setMsgContent(e.target.value)}
                          className="flex-1 rounded-2xl bg-secondary/40 border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-primary/30 h-11"
                        />

                        {msgContent.trim() || selectedImage ? (
                          <Button
                            type="submit"
                            size="icon"
                            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md w-10 h-10 shrink-0 transition-transform active:scale-95"
                            disabled={sendMessage.isPending}
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
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:bg-secondary/50 rounded-full w-10 h-10 shrink-0"
                            onClick={startRecording}
                          >
                            <Mic className="w-6 h-6" />
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
                </>
              ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground bg-slate-50/30">
                  <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-4 border shadow-inner">
                    <MessageSquare className="w-10 h-10 opacity-20" />
                  </div>
                  <p className="font-bold text-lg">{t("selectConversation")}</p>
                  <p className="text-sm mt-1 opacity-70">{t("chooseFromSidebar")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
