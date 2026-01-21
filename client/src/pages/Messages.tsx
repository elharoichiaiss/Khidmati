import { Layout } from "@/components/Layout";
import { useConversations, useConversation, useSendMessage } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export default function Messages() {
  const { user } = useAuth();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const activeId = searchParams.get("id") ? parseInt(searchParams.get("id")!) : null;

  const { data: conversations, isLoading: loadingList } = useConversations();
  const { data: activeConversation } = useConversation(activeId || 0);
  const sendMessage = useSendMessage();
  const [msgContent, setMsgContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgContent.trim() || !activeId) return;

    await sendMessage.mutateAsync({
      conversationId: activeId,
      content: msgContent
    });
    setMsgContent("");
  };

  if (!user) {
    return (
      <Layout>
        <div className="p-12 text-center">Please login to view messages.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 h-[calc(100vh-64px)]">
        <div className="grid md:grid-cols-3 gap-6 h-full bg-card rounded-2xl border shadow-sm overflow-hidden">
          {/* Sidebar List */}
          <div className="border-r flex flex-col h-full bg-secondary/10">
            <div className="p-4 border-b font-bold text-lg">Messages</div>
            <ScrollArea className="flex-1">
              <div className="divide-y">
                {conversations?.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set("id", conv.id.toString());
                      window.history.pushState({}, "", url.toString());
                      // Force re-render or use a router push that updates state
                      window.location.reload(); // Simple hack for now, wouter usually handles this better
                    }}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-secondary/50 transition-colors flex items-center gap-3",
                      activeId === conv.id && "bg-secondary/80"
                    )}
                  >
                    <Avatar>
                      <AvatarFallback>{conv.otherUser.fullName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{conv.otherUser.fullName}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage || "Start chatting..."}
                      </div>
                    </div>
                  </div>
                ))}
                {conversations?.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No conversations yet.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Window */}
          <div className="md:col-span-2 flex flex-col h-full">
            {activeId && activeConversation ? (
              <>
                <div className="p-4 border-b flex items-center gap-3 bg-card z-10">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>{activeConversation.participant1Id === user.id ? activeConversation.participant2.fullName[0] : activeConversation.participant1.fullName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="font-bold">
                    {activeConversation.participant1Id === user.id ? activeConversation.participant2.fullName : activeConversation.participant1.fullName}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50" ref={scrollRef}>
                  {activeConversation.messages?.map((msg) => {
                    const isMe = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm",
                          isMe 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-white dark:bg-slate-800 border rounded-tl-none"
                        )}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleSend} className="p-4 border-t bg-card flex gap-2">
                  <Input 
                    placeholder="Type a message..." 
                    value={msgContent}
                    onChange={(e) => setMsgContent(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!msgContent.trim() || sendMessage.isPending}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 opacity-50" />
                </div>
                <p>Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
