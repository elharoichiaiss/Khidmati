import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Ban, Trash2, CheckCircle, Search, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useState } from "react";

export default function AdminUsersPage() {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");

    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ["/api/admin/users"],
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/admin/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({
                title: "User deleted",
                description: "The user has been successfully deleted.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to delete user.",
                variant: "destructive",
            });
        },
    });

    const banMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("POST", `/api/admin/users/${id}/ban`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({
                title: "Status updated",
                description: "User ban status has been updated.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to update ban status.",
                variant: "destructive",
            });
        },
    });

    const filteredUsers = users?.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Users Management</h2>
                    <p className="text-muted-foreground mt-1">Manage users, roles, and access.</p>
                </div>
                <div className="bg-white p-2 rounded-md shadow-sm border border-gray-200 w-64 flex items-center">
                    <Search className="h-4 w-4 text-gray-400 mr-2" />
                    <Input
                        placeholder="Search users..."
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
                                <TableHead className="w-[60px]">ID</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No users found matching your search.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers?.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium text-xs text-gray-500">{user.id}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{user.fullName}</span>
                                                <span className="text-xs text-gray-500">@{user.username}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === 'admin' ? 'default' : user.role === 'provider' ? 'secondary' : 'outline'}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">{user.email || "-"}</TableCell>
                                        <TableCell>
                                            {user.isBanned ? (
                                                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                                    Banned
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    Active
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {new Date(user.createdAt || "").toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {user.role !== "admin" && (
                                                <div className="flex justify-end gap-2">
                                                    {user.role === "provider" && (
                                                        <Link href={`/providers/${user.id}`} target="_blank">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                title="View Portfolio"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                    )}

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={user.isBanned ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}
                                                        onClick={() => banMutation.mutate(user.id)}
                                                        title={user.isBanned ? "Unban User" : "Ban User"}
                                                    >
                                                        {user.isBanned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => {
                                                            if (confirm(`Are you sure you want to delete ${user.username}?`)) {
                                                                deleteMutation.mutate(user.id);
                                                            }
                                                        }}
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
