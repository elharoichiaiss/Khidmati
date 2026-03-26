import { useQuery } from "@tanstack/react-query";
import type { Ticket, User } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type AdminTicket = Ticket & { user: User };

export default function AdminTicketsPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const { data: tickets, isLoading } = useQuery<AdminTicket[]>({
        queryKey: ["/api/admin/tickets"],
    });

    const filteredTickets = tickets?.filter(ticket =>
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return <Badge className="bg-amber-500">{status}</Badge>;
            case 'resolved': return <Badge className="bg-green-500">{status}</Badge>;
            case 'closed': return <Badge variant="secondary">{status}</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPriorityBadge = (p: string) => {
        switch (p) {
            case 'high': return <Badge variant="destructive">{p}</Badge>;
            case 'normal': return <Badge variant="secondary">{p}</Badge>;
            case 'low': return <Badge variant="outline">{p}</Badge>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">Support Tickets</h2>
                    <p className="text-muted-foreground mt-1 text-sm">Manage and resolve user issues.</p>
                </div>
                <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 w-full sm:w-64 flex items-center focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <Search className="h-4 w-4 text-gray-400 ml-2" />
                    <Input
                        placeholder="Search tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border-0 p-0 h-8 focus-visible:ring-0 text-sm bg-transparent"
                    />
                </div>
            </div>

            {/* Desktop Table View */}
            <Card className="hidden md:block border-gray-100 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="w-[80px] pl-6">ID</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <div className="flex justify-center"><Clock className="w-6 h-6 animate-pulse text-muted-foreground" /></div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredTickets?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        No tickets found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTickets?.map((ticket) => (
                                    <TableRow key={ticket.id} className="hover:bg-slate-50/30 transition-colors">
                                        <TableCell className="font-medium text-xs text-muted-foreground pl-6">#{ticket.id}</TableCell>
                                        <TableCell className="font-semibold">{ticket.subject}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                    {ticket.user.fullName[0].toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{ticket.user.fullName}</span>
                                                    <span className="text-[10px] text-muted-foreground">@{ticket.user.username}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                                        <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Link href={`/k-admin-portal-secure/tickets/${ticket.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {isLoading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : filteredTickets?.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No tickets found.</div>
                ) : (
                    filteredTickets?.map((ticket) => (
                        <Card key={ticket.id} className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-medium text-muted-foreground">#{ticket.id}</span>
                                    {getStatusBadge(ticket.status)}
                                </div>
                                <h3 className="font-bold text-base mb-1 line-clamp-1">{ticket.subject}</h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                                        {ticket.user.fullName[0].toUpperCase()}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{ticket.user.fullName}</span>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t">
                                    {getPriorityBadge(ticket.priority)}
                                    <Link href={`/k-admin-portal-secure/tickets/${ticket.id}`}>
                                        <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1.5 rounded-lg border-primary/20 text-primary hover:bg-primary/5">
                                            <Eye className="w-3.5 h-3.5" />
                                            View Ticket
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
