import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { supabase } from "@/lib/supabase";
import { useAuth, resolveCurrentNumericUserId } from "@/hooks/use-auth";

const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [api.conversations.list.path, user?.id],
    queryFn: async () => {
      // 1. Try Express backend API only on localhost
      if (isLocalhost) {
        try {
          const res = await fetch(api.conversations.list.path, { credentials: "include" });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            const data = await res.json();
            return api.conversations.list.responses[200].parse(data);
          }
        } catch (e) {}
      }

      // 2. Supabase DB direct fallback
      const currentUserId = await resolveCurrentNumericUserId(user);
      if (!currentUserId) return [];

      const { data: convs, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant1_id.eq.${currentUserId},participant2_id.eq.${currentUserId}`)
        .order("updated_at", { ascending: false });

      if (error || !Array.isArray(convs)) return [];

      // Find all unique other user IDs
      const otherUserIds = Array.from(new Set(
        convs.map((c: any) => c.participant1_id === currentUserId ? c.participant2_id : c.participant1_id)
      ));

      let usersMap = new Map<number, any>();
      if (otherUserIds.length > 0) {
        const { data: otherUsers } = await supabase
          .from("users")
          .select("*")
          .in("id", otherUserIds);
        if (Array.isArray(otherUsers)) {
          otherUsers.forEach((u: any) => usersMap.set(u.id, u));
        }
      }

      // Query unread message counts
      const convIds = convs.map((c: any) => c.id);
      let unreadCountsMap = new Map<number, number>();
      if (convIds.length > 0) {
        const { data: unreadMsgs } = await supabase
          .from("messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .eq("read", false)
          .neq("sender_id", currentUserId);

        if (Array.isArray(unreadMsgs)) {
          unreadMsgs.forEach((m: any) => {
            unreadCountsMap.set(m.conversation_id, (unreadCountsMap.get(m.conversation_id) || 0) + 1);
          });
        }
      }

      return convs.map((c: any) => {
        const otherUserId = c.participant1_id === currentUserId ? c.participant2_id : c.participant1_id;
        const u = usersMap.get(otherUserId) || {};
        return {
          id: c.id,
          participant1Id: c.participant1_id,
          participant2Id: c.participant2_id,
          lastMessage: c.last_message,
          updatedAt: c.updated_at,
          unreadCount: unreadCountsMap.get(c.id) || 0,
          otherUser: {
            id: u.id || otherUserId,
            fullName: u.full_name || u.fullName || u.username || "مستخدم",
            username: u.username || "user",
            email: u.email || "",
            role: u.role || "client",
            city: u.city || "",
            phone: u.phone || "",
            profileImage: u.profile_image || u.avatar || null,
          },
        };
      });
    },
    refetchInterval: () => document.hidden ? false : 5000,
  });
}

export function useConversation(id: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [api.conversations.get.path, id],
    queryFn: async () => {
      const convId = Number(id);
      if (!convId) return null;

      // 1. Try Express backend API only on localhost
      if (isLocalhost) {
        try {
          const url = buildUrl(api.conversations.get.path, { id: convId });
          const res = await fetch(url, { credentials: "include" });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            const data = await res.json();
            return api.conversations.get.responses[200].parse(data);
          }
        } catch (e) {}
      }

      // 2. Supabase DB direct fallback
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", convId)
        .maybeSingle();

      if (convErr || !conv) return null;

      const currentUserId = await resolveCurrentNumericUserId(user);
      const otherUserId = conv.participant1_id === currentUserId ? conv.participant2_id : conv.participant1_id;

      // Fetch other user row
      const { data: otherUserRow } = await supabase
        .from("users")
        .select("*")
        .eq("id", otherUserId)
        .maybeSingle();

      // Fetch messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      // Fetch related invoices if any
      const invoiceIds = (msgs || [])
        .filter((m: any) => m.type === "invoice" && m.invoice_id)
        .map((m: any) => m.invoice_id);

      let invoicesMap = new Map<number, any>();
      if (invoiceIds.length > 0) {
        const { data: invRows } = await supabase.from("invoices").select("*").in("id", invoiceIds);
        if (Array.isArray(invRows)) {
          invRows.forEach((inv: any) => {
            const mapped = {
              id: inv.id,
              conversationId: inv.conversation_id,
              conversation_id: inv.conversation_id,
              providerId: inv.provider_id,
              provider_id: inv.provider_id,
              clientId: inv.client_id,
              client_id: inv.client_id,
              clientName: inv.client_name,
              client_name: inv.client_name,
              clientPhone: inv.client_phone,
              client_phone: inv.client_phone,
              serviceType: inv.service_type,
              service_type: inv.service_type,
              description: inv.description,
              agreedPrice: Number(inv.agreed_price) || 0,
              agreed_price: Number(inv.agreed_price) || 0,
              status: inv.status,
              createdAt: inv.created_at,
              updatedAt: inv.updated_at,
            };
            invoicesMap.set(inv.id, mapped);
          });
        }
      }

      const formattedMessages = (msgs || []).map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        content: m.content,
        type: m.type || "text",
        imageUrl: m.image_url,
        fileUrl: m.file_url,
        duration: m.duration,
        locationData: m.location_data,
        invoiceId: m.invoice_id,
        invoice: m.invoice_id ? invoicesMap.get(m.invoice_id) : null,
        read: Boolean(m.read),
        readAt: m.read_at,
        createdAt: m.created_at,
      }));

      const otherUser = {
        id: otherUserRow?.id || otherUserId,
        fullName: otherUserRow?.full_name || otherUserRow?.fullName || otherUserRow?.username || "مستخدم",
        username: otherUserRow?.username || "user",
        email: otherUserRow?.email || "",
        role: otherUserRow?.role || "client",
        city: otherUserRow?.city || "",
        phone: otherUserRow?.phone || "",
        profileImage: otherUserRow?.profile_image || otherUserRow?.avatar || null,
      };

      return {
        id: conv.id,
        participant1Id: conv.participant1_id,
        participant2Id: conv.participant2_id,
        lastMessage: conv.last_message,
        updatedAt: conv.updated_at,
        otherUser,
        messages: formattedMessages,
      };
    },
    enabled: !!id,
    refetchInterval: () => document.hidden ? false : 4000,
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: number) => {
      const targetNumericId = Number(targetUserId);

      // 1. Try Express backend API only on localhost
      if (isLocalhost) {
        try {
          const res = await fetch(api.conversations.create.path, {
            method: api.conversations.create.method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId: targetNumericId }),
            credentials: "include",
          });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            return api.conversations.create.responses[201].parse(await res.json());
          }
        } catch (e) {}
      }

      // 2. Supabase DB direct fallback
      const currentUserId = await resolveCurrentNumericUserId(user);

      // Check existing conversation
      const { data: existingList } = await supabase
        .from("conversations")
        .select("*")
        .or(`and(participant1_id.eq.${currentUserId},participant2_id.eq.${targetNumericId}),and(participant1_id.eq.${targetNumericId},participant2_id.eq.${currentUserId})`);

      if (existingList && existingList.length > 0) {
        const existing = existingList[0];
        return {
          id: existing.id,
          participant1Id: existing.participant1_id,
          participant2Id: existing.participant2_id,
          lastMessage: existing.last_message,
          updatedAt: existing.updated_at,
        };
      }

      // Create new conversation
      const { data: created, error: createErr } = await supabase
        .from("conversations")
        .insert({
          participant1_id: currentUserId,
          participant2_id: targetNumericId,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createErr) {
        console.error("Supabase create conversation error:", createErr);
        throw new Error(createErr.message || "Failed to start conversation");
      }

      return {
        id: created.id,
        participant1Id: created.participant1_id,
        participant2Id: created.participant2_id,
        lastMessage: created.last_message,
        updatedAt: created.updated_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      const convId = Number(conversationId);
      const url = buildUrl(api.messages.create.path, { id: convId });

      // 1. Try Express backend API only on localhost
      if (isLocalhost) {
        try {
          if (image) {
            const uploadFormData = new FormData();
            uploadFormData.append("image", image);
            const uploadRes = await fetch('/api/upload/image', {
              method: "POST",
              body: uploadFormData,
              credentials: "include",
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
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
              const contentType = res.headers.get("content-type") || "";
              if (res.ok && contentType.includes("application/json")) {
                return await res.json();
              }
            }
          } else {
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content, type, locationData, fileUrl, duration }),
              credentials: "include",
            });
            const contentType = res.headers.get("content-type") || "";
            if (res.ok && contentType.includes("application/json")) {
              return await res.json();
            }
          }
        } catch (e) {}
      }

      // 2. Supabase DB direct execution
      const senderId = await resolveCurrentNumericUserId(user);
      let uploadedImageUrl: string | null = null;

      if (image) {
        try {
          const ext = image.name.split(".").pop() || "jpg";
          const fileName = `chat_${convId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("portfolio")
            .upload(fileName, image, { cacheControl: "3600", upsert: true });

          if (!uploadErr && uploadData?.path) {
            const { data: publicUrlData } = supabase.storage.from("portfolio").getPublicUrl(uploadData.path);
            uploadedImageUrl = publicUrlData.publicUrl;
          }
        } catch (storageErr) {
          console.warn("Storage upload fallback error:", storageErr);
        }

        if (!uploadedImageUrl) {
          uploadedImageUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(image);
          });
        }
      }

      const messageContent = content || (image ? "📷 صورة" : (type === "voice" ? "🎤 رسالة صوتية" : "📍 موقع"));

      const messagePayload = {
        conversation_id: convId,
        sender_id: senderId,
        content: messageContent,
        type: image ? "image" : (type || "text"),
        image_url: uploadedImageUrl,
        location_data: locationData || null,
        file_url: fileUrl || null,
        duration: duration || null,
        read: false,
        created_at: new Date().toISOString(),
      };

      const { data: newMsg, error: msgErr } = await supabase
        .from("messages")
        .insert(messagePayload)
        .select()
        .single();

      if (msgErr) {
        console.error("Supabase sendMessage error:", msgErr);
        throw new Error(msgErr.message || "Failed to send message");
      }

      // Update conversation last_message and updated_at
      await supabase
        .from("conversations")
        .update({
          last_message: messageContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", convId);

      return {
        id: newMsg.id,
        conversationId: newMsg.conversation_id,
        senderId: newMsg.sender_id,
        content: newMsg.content,
        type: newMsg.type,
        imageUrl: newMsg.image_url,
        fileUrl: newMsg.file_url,
        duration: newMsg.duration,
        locationData: newMsg.location_data,
        read: newMsg.read,
        createdAt: newMsg.created_at,
      };
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
      if (isLocalhost) {
        try {
          const res = await fetch(`/api/messages/${messageId}`, {
            method: "DELETE",
            credentials: "include",
          });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            return await res.json();
          }
        } catch (e) {}
      }

      // Supabase fallback
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw new Error(error.message);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: number) => {
      if (isLocalhost) {
        try {
          const res = await fetch(`/api/conversations/${conversationId}/read`, {
            method: "PATCH",
            credentials: "include",
          });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            return await res.json();
          }
        } catch (e) {}
      }

      // Supabase fallback
      const currentUserId = await resolveCurrentNumericUserId(user);
      await supabase
        .from("messages")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId)
        .eq("read", false);

      return { success: true };
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, description, agreedPrice }: { conversationId: number; description: string; agreedPrice: number }) => {
      // 1. Try Express API on localhost
      if (isLocalhost) {
        try {
          const res = await fetch(`/api/conversations/${conversationId}/invoices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description, agreedPrice }),
            credentials: "include",
          });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            return await res.json();
          }
        } catch (e) {}
      }

      // 2. Supabase direct DB insertion
      const currentUserId = await resolveCurrentNumericUserId(user);
      
      // Look up conversation to determine other participant (client)
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();

      const clientId = conv
        ? (conv.participant1_id === currentUserId ? conv.participant2_id : conv.participant1_id)
        : null;

      // Look up client user info for required columns
      let clientName = "عميل";
      let clientPhone = "";
      if (clientId) {
        const { data: clientUser } = await supabase
          .from("users")
          .select("full_name, phone, username")
          .eq("id", clientId)
          .maybeSingle();
        if (clientUser) {
          clientName = clientUser.full_name || clientUser.username || clientName;
          clientPhone = clientUser.phone || "";
        }
      }

      const invPayload = {
        conversation_id: conversationId,
        provider_id: currentUserId,
        client_id: clientId,
        client_name: clientName,
        client_phone: clientPhone,
        service_type: "خدمات عامة",
        description: description || "خدمة مهنية",
        agreed_price: Number(agreedPrice) || 0,
        status: "pending_agreement",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert(invPayload)
        .select()
        .single();

      if (invErr) {
        console.error("Supabase create invoice error:", invErr);
        throw new Error(invErr.message || "Failed to create invoice");
      }

      // Insert message notifying both parties
      const msgContent = `فاتورة جديدة بمبلغ ${agreedPrice} درهم`;
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: msgContent,
        type: "invoice",
        invoice_id: inv.id,
        read: false,
        created_at: new Date().toISOString(),
      });

      // Update conversation last message
      await supabase
        .from("conversations")
        .update({
          last_message: msgContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      return {
        id: inv.id,
        conversationId: inv.conversation_id,
        providerId: inv.provider_id,
        clientId: inv.client_id,
        clientName: inv.client_name,
        serviceType: inv.service_type,
        description: inv.description,
        agreedPrice: Number(inv.agreed_price),
        status: inv.status,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: number; status: string }) => {
      // 1. Try Express API on localhost
      if (isLocalhost) {
        try {
          const res = await fetch(`/api/invoices/${invoiceId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
            credentials: "include",
          });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            return await res.json();
          }
        } catch (e) {}
      }

      // 2. Supabase fallback
      const { data: inv, error } = await supabase
        .from("invoices")
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { 
        ...inv, 
        id: inv.id,
        conversationId: inv.conversation_id,
        providerId: inv.provider_id,
        clientId: inv.client_id,
        agreedPrice: Number(inv.agreed_price),
        status: inv.status,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, data.conversationId] });
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      if (data.status === "completed") {
        queryClient.invalidateQueries({ queryKey: ["/api/provider/stats"] });
      }
    },
  });
}

export function useMessagesRealtime(conversationId?: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("khidmati-chat-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
          if (conversationId) {
            queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, conversationId] });
          } else {
            queryClient.invalidateQueries({ queryKey: [api.conversations.get.path] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => {
          queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
          queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
          if (conversationId) {
            queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, conversationId] });
          } else {
            queryClient.invalidateQueries({ queryKey: [api.conversations.get.path] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
}
