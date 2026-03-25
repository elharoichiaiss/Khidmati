import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Ticket } from "@shared/schema";
import { LifeBuoy, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function SupportPage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("normal");

    const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
        queryKey: ["/api/tickets"],
        enabled: !!user,
    });

    const createTicket = useMutation({
        mutationFn: async (data: { subject: string, description: string, priority: string }) => {
            const res = await fetch("/api/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.text();
                throw new Error(err || "Failed to create ticket");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
            setIsDialogOpen(false);
            setSubject("");
            setDescription("");
            setPriority("normal");
            toast({ title: language === 'ar' ? "تم إرسال التذكرة بنجاح" : "Ticket submitted successfully" });
        },
        onError: (error: any) => {
            console.error("Ticket creation error:", error);
            toast({ title: language === 'ar' ? "فشل إرسال التذكرة" : "Failed to submit ticket", variant: "destructive" });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject || !description) return;
        createTicket.mutate({ subject, description, priority });
    };

    const statusLabels: Record<string, { ar: string; en: string }> = {
        open: { ar: 'مفتوحة', en: 'Open' },
        resolved: { ar: 'محلولة', en: 'Resolved' },
        closed: { ar: 'مغلقة', en: 'Closed' },
    };
    const priorityLabels: Record<string, { ar: string; en: string }> = {
        high: { ar: 'عالية', en: 'High' },
        normal: { ar: 'عادية', en: 'Normal' },
        low: { ar: 'منخفضة', en: 'Low' },
    };

    const getStatusBadge = (status: string) => {
        const label = statusLabels[status]?.[language === 'ar' ? 'ar' : 'en'] || status;
        switch (status) {
            case 'open': return <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">{label}</Badge>;
            case 'resolved': return <Badge variant="default" className="bg-green-500 hover:bg-green-600">{label}</Badge>;
            case 'closed': return <Badge variant="secondary">{label}</Badge>;
            default: return <Badge variant="outline">{label}</Badge>;
        }
    };

    const getPriorityBadge = (p: string) => {
        const label = priorityLabels[p]?.[language === 'ar' ? 'ar' : 'en'] || p;
        switch (p) {
            case 'high': return <Badge variant="destructive">{label}</Badge>;
            case 'normal': return <Badge variant="secondary">{label}</Badge>;
            case 'low': return <Badge variant="outline">{label}</Badge>;
            default: return null;
        }
    };

    if (!user) {
        setLocation("/login");
        return null;
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                            <LifeBuoy className="w-8 h-8 text-primary" />
                            {language === 'ar' ? "تذاكر الدعم" : "Support Tickets"}
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            {language === 'ar'
                                ? "تواصل مع فريق الدعم لحل المشاكل أو الاستفسار"
                                : "Contact our support team for help and inquiries"}
                        </p>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                {language === 'ar' ? "تذكرة جديدة" : "New Ticket"}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[550px] p-6 rounded-xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">{language === 'ar' ? "إنشاء تذكرة دعم جديدة" : "Create a new support ticket"}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-5 mt-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">{language === 'ar' ? "الموضوع" : "Subject"}</label>
                                    <Input
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        placeholder={language === 'ar' ? "مثال: مشكلة في الحجز..." : "E.g., Issue with booking..."}
                                        required
                                        className="focus-visible:ring-primary/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">{language === 'ar' ? "التفاصيل" : "Description"}</label>
                                    <Textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder={language === 'ar' ? "اشرح المشكلة بالتفصيل..." : "Explain your issue in detail..."}
                                        rows={6}
                                        required
                                        className="resize-none focus-visible:ring-primary/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">{language === 'ar' ? "الأولوية" : "Priority"}</label>
                                    <Select value={priority} onValueChange={setPriority} dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                        <SelectTrigger className="focus:ring-primary/50 text-start">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">{language === 'ar' ? "منخفضة" : "Low"}</SelectItem>
                                            <SelectItem value="normal">{language === 'ar' ? "عادية" : "Normal"}</SelectItem>
                                            <SelectItem value="high">{language === 'ar' ? "عالية" : "High"}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="pt-4 flex justify-end gap-3 border-t mt-6 pt-6">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        {language === 'ar' ? "إلغاء" : "Cancel"}
                                    </Button>
                                    <Button type="submit" disabled={createTicket.isPending}>
                                        {createTicket.isPending ? "..." : (language === 'ar' ? "إرسال" : "Submit")}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
                            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">{language === 'ar' ? "ليس لديك تذاكر سابقة" : "You have no support tickets"}</p>
                            <p className="text-sm opacity-70 mt-1">{language === 'ar' ? "انقر على زر תذكرة جديدة للبدء" : "Click 'New Ticket' to create one"}</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {tickets.map(ticket => (
                                <Link key={ticket.id} href={`/support/${ticket.id}`}>
                                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors cursor-pointer block">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                                                {getStatusBadge(ticket.status)}
                                                {getPriorityBadge(ticket.priority)}
                                            </div>
                                            <p className="text-muted-foreground text-sm line-clamp-1">{ticket.description}</p>
                                        </div>
                                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                                            {new Date(ticket.createdAt!).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'en-US', {
                                                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
