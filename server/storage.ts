import {
  users, providerProfiles, reviews, conversations, messages, bookings, notifications, favorites, pushSubscriptions,
  tickets, ticketMessages,
  type User, type InsertUser, type ProviderProfile, type InsertProviderProfile,
  type Review, type InsertReview, type Conversation, type Message, type InsertMessage,
  type Booking, type InsertBooking, type Notification, type InsertNotification, type Favorite,
  type PushSubscription, type InsertPushSubscription,
  type Ticket, type InsertTicket, type TicketMessage, type InsertTicketMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, or, and, desc, like, ilike, sql, lt, inArray } from "drizzle-orm";
import { hash } from "bcryptjs";

export interface IStorage {
  // Users & Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { providerProfile?: Omit<InsertProviderProfile, "userId"> }): Promise<User>;

  // Providers
  getProviderProfile(userId: number): Promise<(ProviderProfile & { user: User }) | undefined>;
  updateProviderProfile(userId: number, updates: Partial<InsertProviderProfile>): Promise<ProviderProfile>;
  listProviders(params?: { city?: string; category?: string; search?: string }): Promise<(ProviderProfile & { user: User })[]>;

  // Reviews
  getReviews(providerId: number): Promise<(Review & { client: User })[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Messaging
  getConversations(userId: number): Promise<(Conversation & { otherUser: User })[]>;
  getConversation(id: number): Promise<(Conversation & { messages: Message[] }) | undefined>;
  createConversation(userId1: number, userId2: number): Promise<Conversation>;
  createMessage(message: InsertMessage): Promise<Message>;
  getUnreadMessageCount(userId: number): Promise<number>;

  // Admin
  getAllUsers(): Promise<User[]>;
  createReview(review: InsertReview): Promise<Review>;
  searchProviders(query: string, city?: string, category?: string): Promise<(User & { profile: ProviderProfile | null } & { rating: number, reviewCount: number })[]>;
  getProvider(id: number): Promise<User & { profile: ProviderProfile | null } & { rating: number, reviewCount: number, reviews: (Review & { client: User })[] } | undefined>;
  deleteUser(id: number): Promise<void>;
  toggleUserBan(id: number): Promise<User>;

  // Bookings
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingsForUser(userId: number): Promise<(Booking & { client: User; provider: User })[]>;
  updateBookingStatus(bookingId: number, status: "pending" | "confirmed" | "rejected" | "completed"): Promise<Booking>;
  getProviderStats(providerId: number): Promise<{
    totalEarnings: number;
    totalBookings: number;
    pendingRequests: number;
    averageRating: number;
    chartData: { name: string; income: number }[];
  }>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUnreadNotifications(userId: number): Promise<Notification[]>;
  markNotificationRead(notificationId: number): Promise<Notification>;
  markAllNotificationsAsRead(userId: number): Promise<void>;

  // Favorites
  toggleFavorite(userId: number, providerId: number): Promise<{ favorited: boolean }>;
  getFavorites(userId: number): Promise<(Favorite & { provider: User & { profile: ProviderProfile } })[]>;
  checkFavorite(userId: number, providerId: number): Promise<boolean>;

  // Message Management
  deleteMessage(messageId: number, userId: number): Promise<void>;
  cleanupOldMessages(): Promise<number>;
  // Push Subscriptions
  upsertPushSubscription(userId: number, subscription: { endpoint: string, p256dh: string, auth: string }): Promise<PushSubscription>;
  getPushSubscriptionsForUser(userId: number): Promise<PushSubscription[]>;
  deletePushSubscription(id: number): Promise<void>;

  // Support Tickets
  getTicketsForUser(userId: number): Promise<Ticket[]>;
  getAllTickets(): Promise<(Ticket & { user: User })[]>;
  getTicket(id: number): Promise<(Ticket & { messages: (TicketMessage & { sender: User })[], user: User }) | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  createTicketMessage(message: InsertTicketMessage): Promise<TicketMessage>;
  updateTicketStatus(id: number, status: "open" | "closed" | "resolved"): Promise<Ticket>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser & { providerProfile?: Omit<InsertProviderProfile, "userId"> }): Promise<User> {
    const hashedPassword = await hash(insertUser.password, 10);

    // Transaction to ensure user and profile are created together
    return await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        ...insertUser,
        password: hashedPassword,
      }).returning();

      if (insertUser.role === "provider" && insertUser.providerProfile) {
        await tx.insert(providerProfiles).values({
          ...insertUser.providerProfile,
          userId: user.id,
        });
      }

      return user;
    });
  }

  async getProviderProfile(userId: number): Promise<(ProviderProfile & { user: User }) | undefined> {
    const result = await db.select()
      .from(providerProfiles)
      .innerJoin(users, eq(providerProfiles.userId, users.id))
      .where(eq(providerProfiles.userId, userId));

    if (result.length === 0) return undefined;

    return {
      ...result[0].provider_profiles,
      user: result[0].users
    };
  }

  async updateProviderProfile(userId: number, updates: Partial<InsertProviderProfile>): Promise<ProviderProfile> {
    const [updated] = await db.update(providerProfiles)
      .set(updates)
      .where(eq(providerProfiles.userId, userId))
      .returning();

    if (!updated) {
      // Create if not exists (handling edge case)
      const [created] = await db.insert(providerProfiles)
        .values({ ...updates, userId } as any)
        .returning();
      return created;
    }
    return updated;
  }

  async listProviders(params?: { city?: string; category?: string; search?: string }): Promise<(ProviderProfile & { user: User })[]> {
    let query = db.select()
      .from(providerProfiles)
      .innerJoin(users, eq(providerProfiles.userId, users.id));

    const conditions = [];

    // Filter by city (if provided) - check users table for city or providerProfiles.citiesServed
    if (params?.city) {
      // Logic: User's city OR One of the served cities
      // We'll stick to citiesServed array in profile as primary availability filter
      conditions.push(sql`${params.city} = ANY(${providerProfiles.citiesServed})`);
    }

    if (params?.category) {
      conditions.push(eq(providerProfiles.serviceCategory, params.category));
    }

    if (params?.search) {
      conditions.push(or(
        ilike(users.fullName, `%${params.search}%`),
        ilike(providerProfiles.bio, `%${params.search}%`)
      ));
    }

    if (conditions.length > 0) {
      query.where(and(...conditions, eq(users.isBanned, false)));
    } else {
      query.where(eq(users.isBanned, false));
    }

    const results = await query;
    return results.map(row => ({
      ...row.provider_profiles,
      user: row.users
    }));
  }

  async getReviews(providerId: number): Promise<(Review & { client: User })[]> {
    const results = await db.select()
      .from(reviews)
      .innerJoin(users, eq(reviews.clientId, users.id))
      .where(eq(reviews.providerId, providerId))
      .orderBy(desc(reviews.createdAt));

    return results.map(row => ({
      ...row.reviews,
      client: row.users
    }));
  }

  async getConversations(userId: number): Promise<(Conversation & { otherUser: User })[]> {
    const results = await db.select()
      .from(conversations)
      .innerJoin(users, sql`
        CASE 
          WHEN ${conversations.participant1Id} = ${userId} THEN ${conversations.participant2Id} = ${users.id}
          ELSE ${conversations.participant1Id} = ${users.id}
        END
      `)
      .where(or(
        eq(conversations.participant1Id, userId),
        eq(conversations.participant2Id, userId)
      ))
      .orderBy(desc(conversations.updatedAt));

    // Drizzle join logic might need adjustment for the "otherUser" selection
    // Simplification: Select all conversations, then map other user
    // A raw query or multiple queries might be safer, but let's try strict join

    // Alternative approach:
    const myConversations = await db.query.conversations.findMany({
      where: or(
        eq(conversations.participant1Id, userId),
        eq(conversations.participant2Id, userId)
      ),
      with: {
        participant1: true,
        participant2: true,
      },
      orderBy: desc(conversations.updatedAt),
    });

    return myConversations.map(c => {
      const otherUser = c.participant1Id === userId ? c.participant2 : c.participant1;
      return {
        ...c,
        otherUser
      };
    });
  }

  async getConversation(id: number): Promise<(Conversation & { messages: Message[] }) | undefined> {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      with: {
        messages: {
          orderBy: (messages, { asc }) => [asc(messages.createdAt)]
        }
      }
    });
    return conversation;
  }

  async createConversation(userId1: number, userId2: number): Promise<Conversation> {
    // Check if exists
    const [existing] = await db.select().from(conversations).where(or(
      and(eq(conversations.participant1Id, userId1), eq(conversations.participant2Id, userId2)),
      and(eq(conversations.participant1Id, userId2), eq(conversations.participant2Id, userId1))
    ));

    if (existing) return existing;

    const [newConv] = await db.insert(conversations).values({
      participant1Id: userId1,
      participant2Id: userId2,
    }).returning();

    return newConv;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    return await db.transaction(async (tx) => {
      const [msg] = await tx.insert(messages).values({
        ...message,
        type: message.type || "text",
        locationData: message.locationData || null,
        fileUrl: message.fileUrl || null,
        duration: message.duration || null,
      }).returning();

      await tx.update(conversations)
        .set({
          lastMessage: message.content, // Location messages will have content like "📍 Shared a location"
          updatedAt: new Date()
        })
        .where(eq(conversations.id, message.conversationId));

      return msg;
    });
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(
        eq(messages.read, false),
        sql`${messages.senderId} != ${userId}`,
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId)
        )
      ));
    return Number(result[0]?.count || 0);
  }

  async getAllUsers(): Promise<User[]> {
    const usersList = await db.select().from(users).orderBy(desc(users.createdAt));
    return usersList.map(u => {
      const { password, ...safeUser } = u;
      return safeUser as User;
    });
  }

  async deleteUser(id: number): Promise<void> {
    console.log(`[Storage] Starting transaction to delete user ${id}`);
    await db.transaction(async (tx) => {
      // 1. Delete Notifications
      console.log(`[Storage] Deleting notifications for user ${id}`);
      await tx.delete(notifications).where(eq(notifications.userId, id));

      // 2. Delete Push Subscriptions
      console.log(`[Storage] Deleting push subscriptions for user ${id}`);
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, id));

      // 3. Delete Favorites (where user is hunter OR prey)
      console.log(`[Storage] Deleting favorites for user ${id}`);
      await tx.delete(favorites).where(or(
        eq(favorites.userId, id),
        eq(favorites.providerId, id)
      ));

      // 4. Delete Reviews (Given and Received)
      console.log(`[Storage] Deleting reviews for user ${id}`);
      await tx.delete(reviews).where(or(
        eq(reviews.providerId, id),
        eq(reviews.clientId, id)
      ));

      // 5. Delete Bookings (As Client or Provider)
      console.log(`[Storage] Deleting bookings for user ${id}`);
      await tx.delete(bookings).where(or(
        eq(bookings.clientId, id),
        eq(bookings.providerId, id)
      ));

      // 6. Delete Messages and Conversations
      console.log(`[Storage] Fetching coversations for user ${id}`);
      const userConvs = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(or(
          eq(conversations.participant1Id, id),
          eq(conversations.participant2Id, id)
        ));

      const convIds = userConvs.map(c => c.id);

      if (convIds.length > 0) {
        console.log(`[Storage] Deleting messages in conversations: ${convIds.join(',')}`);
        // Delete ALL messages in these conversations (to avoid FK errors)
        await tx.delete(messages).where(inArray(messages.conversationId, convIds));

        console.log(`[Storage] Deleting conversations: ${convIds.join(',')}`);
        // Delete the conversations themselves
        await tx.delete(conversations).where(inArray(conversations.id, convIds));
      }

      // 7. Delete Provider Profile
      console.log(`[Storage] Deleting provider profile for user ${id}`);
      await tx.delete(providerProfiles).where(eq(providerProfiles.userId, id));

      // 8. Finally, Delete User
      console.log(`[Storage] Deleting user record for id ${id}`);
      await tx.delete(users).where(eq(users.id, id));
      console.log(`[Storage] Transaction complete for user ${id}`);
    });
  }

  async toggleUserBan(id: number): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const [updatedUser] = await db
      .update(users)
      .set({ isBanned: !user.isBanned })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // === BOOKINGS ===

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async getBookingsForUser(userId: number): Promise<(Booking & { client: User; provider: User })[]> {
    const allBookings = await db.select()
      .from(bookings)
      .innerJoin(users, eq(bookings.clientId, users.id))
      .where(or(
        eq(bookings.clientId, userId),
        eq(bookings.providerId, userId)
      ))
      .orderBy(desc(bookings.createdAt));

    // We need both client and provider user data
    const results: (Booking & { client: User; provider: User })[] = [];
    for (const row of allBookings) {
      const clientUser = row.users; // from the join on clientId
      const providerUser = await this.getUser(row.bookings.providerId);
      if (providerUser) {
        results.push({
          ...row.bookings,
          client: clientUser,
          provider: providerUser,
        });
      }
    }
    return results;
  }

  async updateBookingStatus(bookingId: number, status: "pending" | "confirmed" | "rejected" | "completed"): Promise<Booking> {
    const [updated] = await db.update(bookings)
      .set({ status })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updated;
  }

  async getProviderStats(providerId: number): Promise<{
    totalEarnings: number;
    totalBookings: number;
    pendingRequests: number;
    averageRating: number;
    chartData: { name: string; income: number }[];
  }> {
    const allBookings = await db.select().from(bookings).where(eq(bookings.providerId, providerId));

    const totalEarnings = allBookings
      .filter(b => b.status === 'completed')
      .reduce((acc, b) => acc + (b.price || 0), 0);

    const totalBookings = allBookings.length;
    const pendingRequests = allBookings.filter(b => b.status === 'pending').length;

    const providerReviews = await db.select().from(reviews).where(eq(reviews.providerId, providerId));
    const totalRating = providerReviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = providerReviews.length > 0 ? totalRating / providerReviews.length : 0;

    // Last 7 days chart data
    const chartData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];

      const dayIncome = allBookings
        .filter(b => {
          if (b.status !== 'completed' || !b.createdAt) return false;
          const bDate = new Date(b.createdAt);
          return bDate.toDateString() === d.toDateString();
        })
        .reduce((acc, b) => acc + (b.price || 0), 0);

      chartData.push({ name: dayName, income: dayIncome });
    }

    return {
      totalEarnings,
      totalBookings,
      pendingRequests,
      averageRating: Number(averageRating.toFixed(1)),
      chartData
    };
  }

  // === NOTIFICATIONS ===

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(notificationId: number): Promise<Notification> {
    const [updated] = await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId))
      .returning();
    return updated;
  }

  // === FAVORITES ===

  async toggleFavorite(userId: number, providerId: number): Promise<{ favorited: boolean }> {
    const [existing] = await db.select().from(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.providerId, providerId)
      ));

    if (existing) {
      await db.delete(favorites).where(eq(favorites.id, existing.id));
      return { favorited: false };
    } else {
      await db.insert(favorites).values({ userId, providerId });
      return { favorited: true };
    }
  }

  async checkFavorite(userId: number, providerId: number): Promise<boolean> {
    const [existing] = await db.select().from(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.providerId, providerId)
      ));
    return !!existing;
  }

  async getFavorites(userId: number): Promise<(Favorite & { provider: User & { profile: ProviderProfile } })[]> {
    const results = await db.select({
      favorite: favorites,
      user: users,
      profile: providerProfiles,
    })
      .from(favorites)
      .innerJoin(users, eq(favorites.providerId, users.id))
      .leftJoin(providerProfiles, eq(users.id, providerProfiles.userId))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    return results.map((r: any) => ({
      ...r.favorite,
      provider: {
        ...r.user,
        profile: r.profile!
      }
    }));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async searchProviders(query: string, city?: string, category?: string): Promise<(User & { profile: ProviderProfile | null } & { rating: number, reviewCount: number })[]> {
    const conditions = [eq(users.role, "provider")];

    if (query) {
      conditions.push(or(
        ilike(users.fullName, `%${query}%`),
        ilike(users.username, `%${query}%`),
        ilike(providerProfiles.bio, `%${query}%`)
      )!);
    }

    if (category && category !== "all") {
      conditions.push(eq(providerProfiles.serviceCategory, category));
    }

    const providers = await db.select({
      user: users,
      profile: providerProfiles,
    })
      .from(users)
      .leftJoin(providerProfiles, eq(users.id, providerProfiles.userId))
      .where(and(...conditions));

    const providersWithRatings = await Promise.all(providers.map(async (p) => {
      const providerReviews = await db.select().from(reviews).where(eq(reviews.providerId, p.user.id));
      const total = providerReviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = providerReviews.length > 0 ? total / providerReviews.length : 0;

      return {
        ...p.user,
        profile: p.profile,
        rating: Number(avg.toFixed(1)),
        reviewCount: providerReviews.length
      };
    }));

    return providersWithRatings;
  }

  async getProvider(id: number): Promise<User & { profile: ProviderProfile | null } & { rating: number, reviewCount: number, reviews: (Review & { client: User })[] } | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;

    const [profile] = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, id));

    const providerReviews = await db.select({
      review: reviews,
      client: users
    })
      .from(reviews)
      .innerJoin(users, eq(reviews.clientId, users.id))
      .where(eq(reviews.providerId, id))
      .orderBy(desc(reviews.createdAt));

    const total = providerReviews.reduce((acc, r) => acc + r.review.rating, 0);
    const avg = providerReviews.length > 0 ? total / providerReviews.length : 0;

    return {
      ...user,
      profile: profile || null,
      rating: Number(avg.toFixed(1)),
      reviewCount: providerReviews.length,
      reviews: providerReviews.map(pr => ({ ...pr.review, client: pr.client }))
    };
  }

  async deleteMessage(messageId: number, userId: number): Promise<void> {
    const [msg] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!msg) throw new Error("Message not found");
    if (msg.senderId !== userId) throw new Error("You can only delete your own messages");
    await db.delete(messages).where(eq(messages.id, messageId));
  }

  async cleanupOldMessages(): Promise<number> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const deleted = await db.delete(messages).where(lt(messages.createdAt, oneWeekAgo)).returning();
    return deleted.length;
  }

  async upsertPushSubscription(userId: number, subscription: { endpoint: string, p256dh: string, auth: string }): Promise<PushSubscription> {
    const [existing] = await db.select().from(pushSubscriptions).where(and(
      eq(pushSubscriptions.userId, userId),
      eq(pushSubscriptions.endpoint, subscription.endpoint)
    ));

    if (existing) {
      const [updated] = await db.update(pushSubscriptions)
        .set({ ...subscription })
        .where(eq(pushSubscriptions.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(pushSubscriptions)
      .values({ userId, ...subscription })
      .returning();
    return created;
  }

  async getPushSubscriptionsForUser(userId: number): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(id: number): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }

  // --- TICKETS ---
  async getTicketsForUser(userId: number): Promise<Ticket[]> {
    return db.select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
  }

  async getAllTickets(): Promise<(Ticket & { user: User })[]> {
    const results = await db.select({
      ticket: tickets,
      user: users
    })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .orderBy(desc(tickets.createdAt));

    return results.map(r => ({ ...r.ticket, user: r.user }));
  }

  async getTicket(id: number): Promise<(Ticket & { messages: (TicketMessage & { sender: User })[], user: User }) | undefined> {
    const ticketResults = await db.select({
      ticket: tickets,
      user: users
    })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .where(eq(tickets.id, id));

    if (ticketResults.length === 0) return undefined;
    const ticketData = ticketResults[0];

    // Get messages with sender info
    const messagesResults = await db.select({
      msg: ticketMessages,
      sender: users
    })
      .from(ticketMessages)
      .innerJoin(users, eq(ticketMessages.senderId, users.id))
      .where(eq(ticketMessages.ticketId, id))
      .orderBy(ticketMessages.createdAt);

    return {
      ...ticketData.ticket,
      user: ticketData.user,
      messages: messagesResults.map(m => ({ ...m.msg, sender: m.sender }))
    };
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [created] = await db.insert(tickets).values(ticket).returning();
    return created;
  }

  async createTicketMessage(message: InsertTicketMessage): Promise<TicketMessage> {
    const [created] = await db.insert(ticketMessages).values(message).returning();
    // Also update ticket updatedAt
    await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, message.ticketId));
    return created;
  }

  async updateTicketStatus(id: number, status: "open" | "closed" | "resolved"): Promise<Ticket> {
    const [updated] = await db.update(tickets)
      .set({ status, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
