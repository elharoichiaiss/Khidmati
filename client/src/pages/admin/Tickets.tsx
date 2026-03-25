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
import { Search, Eye } from "lucide-react";
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
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Support Tickets</h2>
                    <p className="text-muted-foreground mt-1">Manage and resolve user issues.</p>
                </div>
                <div className="bg-white p-2 rounded-md shadow-sm border border-gray-200 w-64 flex items-center">
                    <Search className="h-4 w-4 text-gray-400 mr-2" />
                    <Input
                        placeholder="Search tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border-0 p-0 h-auto focus-visible:ring-0"
                    />
                </div>
            </div>

            <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : filteredTickets?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No tickets found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTickets?.map((ticket) => (
                                    <TableRow key={ticket.id}>
                                        <TableCell className="font-medium text-xs text-gray-500">#{ticket.id}</TableCell>
                                        <TableCell>
                                            <span className="font-medium">{ticket.subject}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{ticket.user.fullName}</span>
                                                <span className="text-xs text-gray-500">@{ticket.user.username}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(ticket.status)}
                                        </TableCell>
                                        <TableCell>
                                            {getPriorityBadge(ticket.priority)}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {new Date(ticket.createdAt || "").toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/k-admin-portal-secure/tickets/${ticket.id}`}>
                                                <Button variant="ghost" size="sm" className="gap-2">
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent >
            </Card >
        </div>
    );
}
