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
import { eq, or, and, desc, ilike, sql, lt, inArray, ne } from "drizzle-orm";
import { hash } from "bcryptjs";

export interface IStorage {
  // Users & Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUser(id: number, updates: Partial<Pick<User, 'fullName' | 'profileImage' | 'city' | 'phone' | 'email' | 'googleId' | 'latitude' | 'longitude'>>): Promise<User>;
  createUser(user: InsertUser & { providerProfile?: Omit<InsertProviderProfile, "userId"> }): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  toggleUserBan(id: number): Promise<User>;

  // Providers
  getProviderProfile(userId: number): Promise<(ProviderProfile & { user: User }) | undefined>;
  updateProviderProfile(userId: number, updates: Partial<InsertProviderProfile>): Promise<ProviderProfile>;
  listProviders(params?: { city?: string; category?: string; search?: string }): Promise<(ProviderProfile & { user: User })[]>;
  searchProviders(query: string, city?: string, category?: string): Promise<(User & { profile: ProviderProfile | null } & { rating: number, reviewCount: number })[]>;
  getProvider(id: number): Promise<User & { profile: ProviderProfile | null } & { rating: number, reviewCount: number, reviews: (Review & { client: User })[] } | undefined>;

  // Reviews
  getReviews(providerId: number): Promise<(Review & { client: User })[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Messaging
  getConversations(userId: number): Promise<(Conversation & { otherUser: User; unreadCount: number; lastMessage?: string })[]>;
  getConversation(id: number): Promise<(Conversation & { messages: Message[] }) | undefined>;
  createConversation(userId1: number, userId2: number): Promise<Conversation>;
  createMessage(message: InsertMessage): Promise<Message>;
  getUnreadMessageCount(userId: number): Promise<number>;
  markConversationAsRead(conversationId: number, userId: number): Promise<void>;
  deleteMessage(messageId: number, userId: number): Promise<void>;
  cleanupOldMessages(): Promise<number>;

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
  private sanitizeUser(user: any): User {
    if (!user) return user;
    const { password, ...safeUser } = user;
    return safeUser as User;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return this.sanitizeUser(user);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return this.sanitizeUser(user);
  }

  async createUser(insertUser: InsertUser & { providerProfile?: Omit<InsertProviderProfile, "userId"> }): Promise<User> {
    const hashedPassword = insertUser.password ? await hash(insertUser.password, 10) : null;

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

      return this.sanitizeUser(user);
    });
  }

  async updateUser(id: number, updates: Partial<Pick<User, 'fullName' | 'profileImage' | 'city' | 'phone' | 'email' | 'googleId' | 'latitude' | 'longitude'>>): Promise<User> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return this.sanitizeUser(updated);
  }

  async getAllUsers(): Promise<User[]> {
    const usersList = await db.select().from(users).orderBy(desc(users.createdAt));
    return usersList.map(u => this.sanitizeUser(u));
  }

  async deleteUser(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(notifications).where(eq(notifications.userId, id));
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, id));
      await tx.delete(favorites).where(or(eq(favorites.userId, id), eq(favorites.providerId, id)));
      await tx.delete(reviews).where(or(eq(reviews.providerId, id), eq(reviews.clientId, id)));
      await tx.delete(bookings).where(or(eq(bookings.clientId, id), eq(bookings.providerId, id)));

      const userConvs = await tx.select({ id: conversations.id }).from(conversations).where(or(eq(conversations.participant1Id, id), eq(conversations.participant2Id, id)));
      const convIds = userConvs.map(c => c.id);
      if (convIds.length > 0) {
        await tx.delete(messages).where(inArray(messages.conversationId, convIds));
        await tx.delete(conversations).where(inArray(conversations.id, convIds));
      }

      await tx.delete(providerProfiles).where(eq(providerProfiles.userId, id));
      await tx.delete(users).where(eq(users.id, id));
    });
  }

  async toggleUserBan(id: number): Promise<User> {
    const user = await db.select().from(users).where(eq(users.id, id)).then(r => r[0]);
    if (!user) throw new Error("User not found");
    const [updatedUser] = await db.update(users).set({ isBanned: !user.isBanned }).where(eq(users.id, id)).returning();
    return this.sanitizeUser(updatedUser);
  }

  async getProviderProfile(userId: number): Promise<(ProviderProfile & { user: User }) | undefined> {
    const result = await db.select().from(providerProfiles).innerJoin(users, eq(providerProfiles.userId, users.id)).where(eq(providerProfiles.userId, userId));
    if (result.length === 0) return undefined;
    return { ...result[0].provider_profiles, user: this.sanitizeUser(result[0].users) };
  }

  async updateProviderProfile(userId: number, updates: Partial<InsertProviderProfile>): Promise<ProviderProfile> {
    const [updated] = await db.update(providerProfiles).set(updates).where(eq(providerProfiles.userId, userId)).returning();
    if (!updated) {
      const [created] = await db.insert(providerProfiles).values({ ...updates, userId } as any).returning();
      return created;
    }
    return updated;
  }

  async listProviders(params?: { city?: string; category?: string; search?: string }): Promise<(ProviderProfile & { user: User })[]> {
    let query = db.select().from(providerProfiles).innerJoin(users, eq(providerProfiles.userId, users.id));
    const conditions = [];
    if (params?.city) conditions.push(sql`${params.city} = ANY(${providerProfiles.citiesServed})`);
    if (params?.category) conditions.push(eq(providerProfiles.serviceCategory, params.category));
    if (params?.search) conditions.push(or(ilike(users.fullName, `%${params.search}%`), ilike(providerProfiles.bio, `%${params.search}%`)));

    query.where(and(...conditions, eq(users.isBanned, false)));
    const results = await query;
    return results.map(row => ({ ...row.provider_profiles, user: this.sanitizeUser(row.users) }));
  }

  async getReviews(providerId: number): Promise<(Review & { client: User })[]> {
    const results = await db.select().from(reviews).innerJoin(users, eq(reviews.clientId, users.id)).where(eq(reviews.providerId, providerId)).orderBy(desc(reviews.createdAt));
    return results.map(row => ({ ...row.reviews, client: this.sanitizeUser(row.users) }));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async getConversations(userId: number): Promise<(Conversation & { otherUser: User; unreadCount: number; lastMessage?: string })[]> {
    const myConversations = await db.query.conversations.findMany({
      where: or(eq(conversations.participant1Id, userId), eq(conversations.participant2Id, userId)),
      with: {
        participant1: true,
        participant2: true,
        messages: {
          where: (messages, { and, eq, ne }) => and(eq(messages.read, false), ne(messages.senderId, userId))
        }
      },
      orderBy: desc(conversations.updatedAt),
    });

    return myConversations.map(c => {
      const otherUser = c.participant1Id === userId ? c.participant2 : c.participant1;
      const unreadCount = c.messages ? c.messages.length : 0;
      const { messages, participant1, participant2, ...convData } = c;
      return {
        ...convData,
        otherUser: this.sanitizeUser(otherUser),
        unreadCount,
        lastMessage: convData.lastMessage
      } as Conversation & { otherUser: User; unreadCount: number; lastMessage?: string };
    });
  }

  async getConversation(id: number): Promise<(Conversation & { messages: Message[] }) | undefined> {
    return await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      with: { messages: { orderBy: (messages, { asc }) => [asc(messages.createdAt)] } }
    });
  }

  async createConversation(userId1: number, userId2: number): Promise<Conversation> {
    const [existing] = await db.select().from(conversations).where(or(
      and(eq(conversations.participant1Id, userId1), eq(conversations.participant2Id, userId2)),
      and(eq(conversations.participant1Id, userId2), eq(conversations.participant2Id, userId1))
    ));
    if (existing) return existing;
    const [newConv] = await db.insert(conversations).values({ participant1Id: userId1, participant2Id: userId2 }).returning();
    return newConv;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    return await db.transaction(async (tx) => {
      const [msg] = await tx.insert(messages).values({ ...message, type: message.type || "text" }).returning();
      await tx.update(conversations).set({ lastMessage: message.content, updatedAt: new Date() }).where(eq(conversations.id, message.conversationId));
      return msg;
    });
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(messages.read, false), ne(messages.senderId, userId), or(eq(conversations.participant1Id, userId), eq(conversations.participant2Id, userId))));
    return Number(result[0]?.count || 0);
  }

  async markConversationAsRead(conversationId: number, userId: number): Promise<void> {
    await db.update(messages).set({ read: true }).where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, userId), eq(messages.read, false)));
  }

  async deleteMessage(messageId: number, userId: number): Promise<void> {
    const [msg] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!msg || msg.senderId !== userId) throw new Error("Unauthorized");
    await db.delete(messages).where(eq(messages.id, messageId));
  }

  async cleanupOldMessages(): Promise<number> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const deleted = await db.delete(messages).where(lt(messages.createdAt, oneWeekAgo)).returning();
    return deleted.length;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async getBookingsForUser(userId: number): Promise<(Booking & { client: User; provider: User })[]> {
    const allBookings = await db.select().from(bookings).innerJoin(users, eq(bookings.clientId, users.id)).where(or(eq(bookings.clientId, userId), eq(bookings.providerId, userId))).orderBy(desc(bookings.createdAt));
    const results = [];
    for (const row of allBookings) {
      const providerUser = await db.select().from(users).where(eq(users.id, row.bookings.providerId)).then(r => r[0]);
      if (providerUser) results.push({ ...row.bookings, client: this.sanitizeUser(row.users), provider: this.sanitizeUser(providerUser) });
    }
    return results;
  }

  async updateBookingStatus(bookingId: number, status: any): Promise<Booking> {
    const [updated] = await db.update(bookings).set({ status }).where(eq(bookings.id, bookingId)).returning();
    return updated;
  }

  async getProviderStats(providerId: number): Promise<any> {
    const allBookings = await db.select().from(bookings).where(eq(bookings.providerId, providerId));
    const totalEarnings = allBookings.filter(b => b.status === "completed").reduce((acc, b) => acc + (b.price || 0), 0);
    const providerReviews = await db.select().from(reviews).where(eq(reviews.providerId, providerId));
    const avgRating = providerReviews.length > 0 ? providerReviews.reduce((acc, r) => acc + r.rating, 0) / providerReviews.length : 0;

    return { totalEarnings, totalBookings: allBookings.length, pendingRequests: allBookings.filter(b => b.status === "pending").length, averageRating: Number(avgRating.toFixed(1)), chartData: [] };
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    return db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false))).orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(notificationId: number): Promise<Notification> {
    const [updated] = await db.update(notifications).set({ read: true }).where(eq(notifications.id, notificationId)).returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }

  async toggleFavorite(userId: number, providerId: number): Promise<{ favorited: boolean }> {
    const [existing] = await db.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.providerId, providerId)));
    if (existing) {
      await db.delete(favorites).where(eq(favorites.id, existing.id));
      return { favorited: false };
    }
    await db.insert(favorites).values({ userId, providerId });
    return { favorited: true };
  }

  async getFavorites(userId: number): Promise<any> {
    const results = await db.select().from(favorites).innerJoin(users, eq(favorites.providerId, users.id)).where(eq(favorites.userId, userId));
    return results.map(r => ({ ...r.favorites, provider: this.sanitizeUser(r.users) }));
  }

  async checkFavorite(userId: number, providerId: number): Promise<boolean> {
    const [existing] = await db.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.providerId, providerId)));
    return !!existing;
  }

  async upsertPushSubscription(userId: number, subscription: any): Promise<PushSubscription> {
    const [existing] = await db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, subscription.endpoint)));
    if (existing) {
      const [updated] = await db.update(pushSubscriptions).set(subscription).where(eq(pushSubscriptions.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(pushSubscriptions).values({ userId, ...subscription }).returning();
    return created;
  }

  async getPushSubscriptionsForUser(userId: number): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(id: number): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
  }

  async searchProviders(query: string, city?: string, category?: string): Promise<any> {
    const conditions = [eq(users.role, "provider"), eq(users.isBanned, false)];
    if (query) conditions.push(or(ilike(users.fullName, `%${query}%`), ilike(providerProfiles.bio, `%${query}%`)) as any);
    if (category && category !== "all") conditions.push(eq(providerProfiles.serviceCategory, category));

    const results = await db.select({ user: users, profile: providerProfiles }).from(users).leftJoin(providerProfiles, eq(users.id, providerProfiles.userId)).where(and(...conditions));
    return results.map(r => ({ ...this.sanitizeUser(r.user), profile: r.profile }));
  }

  async getProvider(id: number): Promise<any> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    const [profile] = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, id));
    return { ...this.sanitizeUser(user), profile: profile || null, reviews: [] };
  }

  async getTicketsForUser(userId: number): Promise<Ticket[]> {
    return db.select().from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.createdAt));
  }

  async getAllTickets(): Promise<any> {
    const results = await db.select({ ticket: tickets, user: users }).from(tickets).innerJoin(users, eq(tickets.userId, users.id)).orderBy(desc(tickets.createdAt));
    return results.map(r => ({ ...r.ticket, user: this.sanitizeUser(r.user) }));
  }

  async getTicket(id: number): Promise<any> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) return undefined;
    const messages = await db.select().from(ticketMessages).innerJoin(users, eq(ticketMessages.senderId, users.id)).where(eq(ticketMessages.ticketId, id));
    return { ...ticket, messages: messages.map(m => ({ ...m.ticket_messages, sender: this.sanitizeUser(m.users) })) };
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [created] = await db.insert(tickets).values(ticket).returning();
    return created;
  }

  async createTicketMessage(message: InsertTicketMessage): Promise<TicketMessage> {
    const [created] = await db.insert(ticketMessages).values(message).returning();
    await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, message.ticketId));
    return created;
  }

  async updateTicketStatus(id: number, status: any): Promise<Ticket> {
    const [updated] = await db.update(tickets).set({ status, updatedAt: new Date() }).where(eq(tickets.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
