import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useConversations() {
  return useQuery({
    queryKey: [api.conversations.list.path],
    queryFn: async () => {
      const res = await fetch(api.conversations.list.path, { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return api.conversations.list.responses[200].parse(await res.json());
    },
    refetchInterval: 10000, // Auto-poll every 10s for new conversations
  });
}

export function useConversation(id: number) {
  return useQuery({
    queryKey: [api.conversations.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.conversations.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return api.conversations.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    refetchInterval: 3000, // Poll for new messages every 3s
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: number) => {
      const res = await fetch(api.conversations.create.path, {
        method: api.conversations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to start conversation");
      return api.conversations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content, image, type, locationData, fileUrl, duration }: {
      conversationId: number;
      content?: string;
      image?: File;
      type?: "text" | "image" | "location" | "voice";
      locationData?: { lat: number; lng: number };
      fileUrl?: string;
      duration?: number;
    }) => {
      const url = buildUrl(api.messages.create.path, { id: conversationId });

      if (image) {
        // Upload image first to get a permanent URL
        const uploadFormData = new FormData();
        uploadFormData.append("file", image);

        const uploadRes = await fetch('/api/uploads', {
          method: "POST",
          body: uploadFormData,
          credentials: "include",
        });

        if (!uploadRes.ok) throw new Error("Failed to upload image");
        const uploadData = await uploadRes.json();
        
        // Then send the message with the returned URL
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            content: content || "", 
            type: "image",
            imageUrl: uploadData.url 
          }),
          credentials: "include",
        });
        
        if (!res.ok) throw new Error("Failed to send message");
        return res.json();
      } else {
        // Send as JSON for text, location, or voice
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, type, locationData, fileUrl, duration }),
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to send message");
        return res.json();
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId }: { messageId: number }) => {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete message");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all conversation queries to refresh
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: number) => {
      const res = await fetch(`/api/conversations/${conversationId}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark read");
      return res.json();
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });
}
