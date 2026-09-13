import {
  users, providerProfiles, reviews, conversations, messages, bookings, notifications, favorites, pushSubscriptions,
  passwordResetTokens,
  tickets, ticketMessages,
  invoices,
  verificationRequests, providerBadges, providerSubscriptions, paymentMethods, payments, recurringBookings, accountDeletions,
  type User, type InsertUser, type ProviderProfile, type InsertProviderProfile,
  type Review, type InsertReview, type Conversation, type Message, type InsertMessage,
  type Booking, type InsertBooking, type Notification, type InsertNotification, type Favorite,
  type PushSubscription, type InsertPushSubscription,
  type PasswordResetToken,
  type Ticket, type InsertTicket, type TicketMessage, type InsertTicketMessage,
  type Invoice, type InsertInvoice, type AccountDeletion
} from "@shared/schema";
import { db } from "./db";
import { eq, or, and, desc, ilike, sql, lt, inArray, ne, gt, count } from "drizzle-orm";
import { hash } from "bcryptjs";
import crypto from "crypto";

export interface IStorage {
  // Users & Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByUsernameWithPassword(username: string): Promise<User | undefined>;
  updateUser(id: number, updates: Partial<Pick<User, 'fullName' | 'profileImage' | 'city' | 'phone' | 'email' | 'googleId' | 'latitude' | 'longitude'>>): Promise<User>;
  createUser(user: InsertUser & { providerProfile?: Omit<InsertProviderProfile, "userId"> }): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  recordAccountDeletion(info: { username: string; email?: string | null; fullName?: string | null; reason: string; deletedBy?: number | null }): Promise<void>;
  getAccountDeletion(identifier: string): Promise<AccountDeletion | undefined>;
  toggleUserBan(id: number): Promise<User>;
  updateUserStatus(id: number, status: "active" | "pending" | "rejected"): Promise<User>;

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

  // Invoices
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice>;
  getInvoicesForUser(userId: number): Promise<Invoice[]>;

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
    todayEarnings: number;
    todayBookingsCount: number;
    weeklyData: { name: string; income: number }[];
    monthlyData: { name: string; income: number }[];
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
  getTicketsForUser(userId: number): Promise<any[]>;
  getAllTickets(): Promise<(Ticket & { user: User })[]>;
  getTicket(id: number): Promise<(Ticket & { messages: (TicketMessage & { sender: User })[], user: User }) | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  createTicketMessage(message: InsertTicketMessage): Promise<TicketMessage>;
  updateTicketStatus(id: number, status: "open" | "closed" | "resolved"): Promise<Ticket>;
  markTicketRead(id: number): Promise<void>;

  // Password Reset
  createPasswordResetToken(userId: number): Promise<{ token: string }>;
  validatePasswordResetToken(token: string): Promise<number | undefined>;
  updateUserPassword(userId: number, password: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
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

  async getUserByUsernameWithPassword(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser & { providerProfile?: Omit<InsertProviderProfile, "userId"> }): Promise<User> {
    const hashedPassword = insertUser.password ? await hash(insertUser.password, 10) : null;

    return await db.transaction(async (tx) => {
      const isProvider = insertUser.role === "provider";
      const [user] = await tx.insert(users).values({
        ...insertUser,
        password: hashedPassword,
        status: isProvider ? "pending" : "active",
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
      // Simple child rows
      await tx.delete(notifications).where(eq(notifications.userId, id));
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, id));
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
      await tx.delete(paymentMethods).where(eq(paymentMethods.userId, id));
      await tx.delete(favorites).where(or(eq(favorites.userId, id), eq(favorites.providerId, id)));
      await tx.delete(reviews).where(or(eq(reviews.providerId, id), eq(reviews.clientId, id)));

      // Tickets + their messages
      const userTickets = await tx.select({ id: tickets.id }).from(tickets).where(eq(tickets.userId, id));
      const ticketIds = userTickets.map(t => t.id);
      if (ticketIds.length > 0) {
        await tx.delete(ticketMessages).where(inArray(ticketMessages.ticketId, ticketIds));
        await tx.delete(tickets).where(inArray(tickets.id, ticketIds));
      }
      await tx.delete(ticketMessages).where(eq(ticketMessages.senderId, id));

      // Bookings + their payments
      const userBookings = await tx.select({ id: bookings.id }).from(bookings).where(or(eq(bookings.clientId, id), eq(bookings.providerId, id)));
      const bookingIds = userBookings.map(b => b.id);
      if (bookingIds.length > 0) {
        await tx.delete(payments).where(inArray(payments.bookingId, bookingIds));
        await tx.delete(bookings).where(inArray(bookings.id, bookingIds));
      }

      // Conversations, messages, invoices
      const userConvs = await tx.select({ id: conversations.id }).from(conversations).where(or(eq(conversations.participant1Id, id), eq(conversations.participant2Id, id)));
      const convIds = userConvs.map(c => c.id);
      if (convIds.length > 0) {
        await tx.delete(messages).where(inArray(messages.conversationId, convIds));
        await tx.delete(invoices).where(inArray(invoices.conversationId, convIds));
        await tx.delete(conversations).where(inArray(conversations.id, convIds));
      }

      // Provider-related rows
      await tx.delete(verificationRequests).where(or(eq(verificationRequests.userId, id), eq(verificationRequests.reviewedBy, id)));
      await tx.delete(providerBadges).where(eq(providerBadges.providerId, id));
      await tx.delete(providerSubscriptions).where(eq(providerSubscriptions.providerId, id));
      await tx.delete(recurringBookings).where(or(eq(recurringBookings.clientId, id), eq(recurringBookings.providerId, id)));

      await tx.delete(providerProfiles).where(eq(providerProfiles.userId, id));
      await tx.delete(accountDeletions).where(eq(accountDeletions.deletedBy, id));
      await tx.delete(users).where(eq(users.id, id));
    });
  }

  async recordAccountDeletion(info: { username: string; email?: string | null; fullName?: string | null; reason: string; deletedBy?: number | null }): Promise<void> {
    await db.insert(accountDeletions).values({
      username: info.username.trim().toLowerCase(),
      email: info.email ? info.email.trim().toLowerCase() : null,
      fullName: info.fullName ?? null,
      reason: info.reason,
      deletedBy: info.deletedBy ?? null,
    });
  }

  async getAccountDeletion(identifier: string): Promise<AccountDeletion | undefined> {
    const normalized = identifier.trim().toLowerCase();
    const items = await db
      .select()
      .from(accountDeletions)
      .where(or(eq(accountDeletions.username, normalized), eq(accountDeletions.email, normalized)))
      .orderBy(desc(accountDeletions.createdAt))
      .limit(1);
    return items[0];
  }

  async toggleUserBan(id: number): Promise<User> {
    const user = await db.select().from(users).where(eq(users.id, id)).then(r => r[0]);
    if (!user) throw new Error("User not found");
    const [updatedUser] = await db.update(users).set({ isBanned: !user.isBanned }).where(eq(users.id, id)).returning();
    return this.sanitizeUser(updatedUser);
  }

  async updateUserStatus(id: number, status: "active" | "pending" | "rejected"): Promise<User> {
    const [updated] = await db.update(users).set({ status }).where(eq(users.id, id)).returning();
    if (!updated) throw new Error("User not found");
    return this.sanitizeUser(updated);
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

    query.where(and(...conditions, eq(users.isBanned, false), eq(users.status, "active")));
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
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      with: { messages: { orderBy: (messages, { asc }) => [asc(messages.createdAt)] } }
    });
    
    if (conv && conv.messages) {
      // Also fetch invoices for any invoice messages
      const invoiceIds = conv.messages.filter(m => m.type === 'invoice' && m.invoiceId).map(m => m.invoiceId!);
      if (invoiceIds.length > 0) {
        const relatedInvoices = await db.select().from(invoices).where(inArray(invoices.id, invoiceIds));
        const invoiceMap = new Map(relatedInvoices.map(i => [i.id, i]));
        
        conv.messages = conv.messages.map(m => {
          if (m.type === 'invoice' && m.invoiceId && invoiceMap.has(m.invoiceId)) {
            return { ...m, invoice: invoiceMap.get(m.invoiceId) } as any;
          }
          return m;
        });
      }
    }
    
    return conv as any;
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
    
    // حذف فقط الرسائل القديمة (> 7 أيام) من المحادثات التي أُغلقت
    // لا نحذف رسائل المحادثات النشطة
    const deleted = await db.delete(messages)
      .where(and(
        lt(messages.createdAt, oneWeekAgo),
        // فقط من المحادثات التي لها فاتورة مكتملة أو مرفوضة
        inArray(messages.conversationId,
          db.select({ id: invoices.conversationId })
            .from(invoices)
            .where(or(
              eq(invoices.status, "completed"),
              eq(invoices.status, "rejected")
            ))
        )
      ))
      .returning();
      
    return deleted.length;
  }

  // Invoice methods
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async updateInvoiceStatus(id: number, status: any): Promise<Invoice> {
    const [updated] = await db.update(invoices).set({ status, updatedAt: new Date() }).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async getInvoicesForUser(userId: number): Promise<Invoice[]> {
    return db.select().from(invoices).where(or(eq(invoices.providerId, userId), eq(invoices.clientId, userId))).orderBy(desc(invoices.createdAt));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async getBookingsForUser(userId: number): Promise<(Booking & { client: User; provider: User })[]> {
    const allBookings = await db.select({
      booking: bookings,
      client: users,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.clientId, users.id))
    .where(or(eq(bookings.clientId, userId), eq(bookings.providerId, userId)))
    .orderBy(desc(bookings.createdAt));

    const providerIds = Array.from(new Set(allBookings.map(r => r.booking.providerId)));
    const providerUsers = providerIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, providerIds))
      : [];
    const providerMap = new Map(providerUsers.map(u => [u.id, u]));

    return allBookings.map(row => ({
      ...row.booking,
      client: this.sanitizeUser(row.client),
      provider: this.sanitizeUser(providerMap.get(row.booking.providerId)!),
    }));
  }

  async updateBookingStatus(bookingId: number, status: any): Promise<Booking> {
    const [updated] = await db.update(bookings).set({ status }).where(eq(bookings.id, bookingId)).returning();
    return updated;
  }

  async getProviderStats(providerId: number): Promise<any> {
    const allBookings = await db.select().from(bookings).where(eq(bookings.providerId, providerId));
    const completed = allBookings.filter(b => b.status === "completed");
    
    // Also fetch completed invoices
    const allInvoices = await db.select().from(invoices).where(eq(invoices.providerId, providerId));
    const completedInvoices = allInvoices.filter(i => i.status === "completed");
    
    const totalEarnings = completed.reduce((acc, b) => acc + (b.price || 0), 0) + 
                          completedInvoices.reduce((acc, i) => acc + i.agreedPrice, 0);
                          
    const providerReviews = await db.select().from(reviews).where(eq(reviews.providerId, providerId));
    const avgRating = providerReviews.length > 0
      ? providerReviews.reduce((acc, r) => acc + r.rating, 0) / providerReviews.length
      : 0;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todayCompleted = completed.filter(b => {
      const d = new Date(b.date);
      return d >= todayStart && d < todayEnd;
    });
    const todayCompletedInvoices = completedInvoices.filter(i => {
      const d = new Date(i.updatedAt || i.createdAt!);
      return d >= todayStart && d < todayEnd;
    });
    
    const todayEarnings = todayCompleted.reduce((acc, b) => acc + (b.price || 0), 0) +
                          todayCompletedInvoices.reduce((acc, i) => acc + i.agreedPrice, 0);
                          
    const todayBookingsCount = allBookings.filter(b => {
      const d = new Date(b.date);
      return d >= todayStart && d < todayEnd;
    }).length;

    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const chartData: { name: string; income: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(todayStart);
      day.setDate(day.getDate() - i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const dayIncome = completed
        .filter(b => { const d = new Date(b.date); return d >= day && d < nextDay; })
        .reduce((acc, b) => acc + (b.price || 0), 0) +
        completedInvoices
        .filter(i => { const d = new Date(i.updatedAt || i.createdAt!); return d >= day && d < nextDay; })
        .reduce((acc, i) => acc + i.agreedPrice, 0);
      chartData.push({ name: dayNames[day.getDay()], income: dayIncome });
    }

    const weeklyData: { name: string; income: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (w * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekIncome = completed
        .filter(b => { const d = new Date(b.date); return d >= weekStart && d < weekEnd; })
        .reduce((acc, b) => acc + (b.price || 0), 0) +
        completedInvoices
        .filter(i => { const d = new Date(i.updatedAt || i.createdAt!); return d >= weekStart && d < weekEnd; })
        .reduce((acc, i) => acc + i.agreedPrice, 0);
      weeklyData.push({ name: `W${4 - w}`, income: weekIncome });
    }

    const monthlyData: { name: string; income: number }[] = [];
    for (let m = 5; m >= 0; m--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      const monthIncome = completed
        .filter(b => { const d = new Date(b.date); return d >= monthStart && d < monthEnd; })
        .reduce((acc, b) => acc + (b.price || 0), 0) +
        completedInvoices
        .filter(i => { const d = new Date(i.updatedAt || i.createdAt!); return d >= monthStart && d < monthEnd; })
        .reduce((acc, i) => acc + i.agreedPrice, 0);
      monthlyData.push({ name: monthNames[monthStart.getMonth()], income: monthIncome });
    }

    return {
      totalEarnings,
      totalBookings: allBookings.length,
      pendingRequests: allBookings.filter(b => b.status === "pending").length,
      averageRating: Number(avgRating.toFixed(1)),
      chartData,
      todayEarnings,
      todayBookingsCount,
      weeklyData,
      monthlyData,
    };
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
    const conditions = [eq(users.role, "provider"), eq(users.isBanned, false), eq(users.status, "active")];
    
    if (city && city !== "all") {
      conditions.push(eq(users.city, city));
    }

    if (query) {
      const serviceTypesAr = [
        "سباكة", "كهرباء", "تنظيف", "دهانات", "تكييف", "تصليح",
        "دروس خصوصية", "نقل عفش", "نجارة", "حدادة", "تبليط", "جبس",
        "حدائق", "مكافحة حشرات", "صيانة", "أخرى"
      ];
      const serviceTypesFr = [
        "Plomberie", "Électricité", "Nettoyage", "Peinture", "Climatisation", "Réparation",
        "Tutoring", "Déménagement", "Menuiserie", "Ferronnerie", "Carrelage", "Plâtre",
        "Jardinage", "Anti-nuisibles", "Maintenance", "Autre"
      ];
      const serviceTypesEn = [
        "Plumbing", "Electrical", "Cleaning", "Painting", "AC & HVAC", "Repairs",
        "Tutoring", "Moving Services", "Carpentry", "Metalwork", "Tiling", "Plastering",
        "Gardening", "Pest Control", "Maintenance", "Other"
      ];

      // Stems / root words for better matching
      const stems = [
        { ar: ["سباك", "سباكة"], fr: ["plomb"], en: ["plumb"] }, // سباكة
        { ar: ["كهرب", "ترسين"], fr: ["élec", "elec"], en: ["electr"] }, // كهرباء
        { ar: ["تنظيف", "نظاف"], fr: ["nettoy", "menag"], en: ["clean", "maid"] }, // تنظيف
        { ar: ["دهان", "صباغ", "بوية"], fr: ["peint"], en: ["paint"] }, // دهانات
        { ar: ["تكييف", "مكيف"], fr: ["clim"], en: ["ac ", "hvac", "air con"] }, // تكييف
        { ar: ["تصليح", "صلح"], fr: ["répar", "repar"], en: ["repair", "fix"] }, // تصليح
        { ar: ["درس", "أستاذ", "معلم"], fr: ["cour", "prof"], en: ["tutor", "teach"] }, // دروس خصوصية
        { ar: ["نقل", "رحيل"], fr: ["déménag", "demenag", "transp"], en: ["mov", "carri"] }, // نقل عفش
        { ar: ["نجار"], fr: ["menuis"], en: ["carpent"] }, // نجارة
        { ar: ["حداد"], fr: ["ferron", "forge"], en: ["metal", "weld"] }, // حدادة
        { ar: ["تبليط", "جلاي"], fr: ["carr"], en: ["tile", "tiling"] }, // تبليط
        { ar: ["جبس", "جباص"], fr: ["plât", "plat"], en: ["plaster"] }, // جبس
        { ar: ["حدائ", "جنان"], fr: ["jard"], en: ["garden"] }, // حدائق
        { ar: ["حشر", "مبيد"], fr: ["nuis", "insect"], en: ["pest", "bug"] }, // مكافحة حشرات
        { ar: ["صيانة"], fr: ["maint"], en: ["maint"] }, // صيانة
      ];

      const matchingCategories: string[] = [];
      const lowerQuery = query.toLowerCase();

      for (let i = 0; i < serviceTypesAr.length; i++) {
        const arMatch = serviceTypesAr[i].includes(query) || query.includes(serviceTypesAr[i]);
        const frMatch = serviceTypesFr[i]?.toLowerCase().includes(lowerQuery) || lowerQuery.includes(serviceTypesFr[i]?.toLowerCase());
        const enMatch = serviceTypesEn[i]?.toLowerCase().includes(lowerQuery) || lowerQuery.includes(serviceTypesEn[i]?.toLowerCase());
        
        let stemMatch = false;
        const stem = stems[i];
        if (stem) {
          const arStem = stem.ar.some(s => lowerQuery.includes(s) || s.includes(lowerQuery));
          const frStem = stem.fr.some(s => lowerQuery.includes(s));
          const enStem = stem.en.some(s => lowerQuery.includes(s));
          stemMatch = arStem || frStem || enStem;
        }

        if (arMatch || frMatch || enMatch || stemMatch) {
          matchingCategories.push(serviceTypesAr[i]);
        }
      }

      const orConditions = [
        ilike(users.fullName, `%${query}%`),
        ilike(providerProfiles.bio, `%${query}%`),
        ilike(providerProfiles.serviceCategory, `%${query}%`)
      ];

      if (matchingCategories.length > 0) {
        matchingCategories.forEach(cat => {
          orConditions.push(eq(providerProfiles.serviceCategory, cat));
        });
      }

      conditions.push(or(...orConditions) as any);
    }

    if (category && category !== "all") {
      // Map category (which can be in English/French from Search dropdown value/label) to the Arabic database representation
      const categoryMapping: Record<string, string> = {
        // English to Arabic
        "Plumbing": "سباكة",
        "Electrician": "كهرباء",
        "Electrical": "كهرباء",
        "Cleaning": "تنظيف",
        "Beauty": "جمال وسبا",
        "Painting": "دهانات",
        "AC": "تكييف",
        "Moving": "نقل عفش",
        "Tutoring": "دروس خصوصية",

        // French to Arabic
        "Plomberie": "سباكة",
        "Électricité": "كهرباء",
        "Nettoyage": "تنظيف",
        "Beauté": "جمال وسبا",
        "Peinture": "دهانات",
        "Climatisation": "تكييف",
        "Déménagement": "نقل عفش",
        "Cours": "دروس خصوصية",
      };
      const dbCategory = categoryMapping[category] || category;
      conditions.push(eq(providerProfiles.serviceCategory, dbCategory));
    }

    const results = await db.select({ user: users, profile: providerProfiles }).from(users).leftJoin(providerProfiles, eq(users.id, providerProfiles.userId)).where(and(...conditions));
    return results.map(r => ({ ...this.sanitizeUser(r.user), profile: r.profile }));
  }

  async getProvider(id: number): Promise<any> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    const [profile] = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, id));
    return { ...this.sanitizeUser(user), profile: profile || null, reviews: [] };
  }

  async getTicketsForUser(userId: number): Promise<any[]> {
    return db.select({
      id: tickets.id,
      userId: tickets.userId,
      subject: tickets.subject,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      lastReadAt: tickets.lastReadAt,
      replies: count(ticketMessages.id),
      adminReplies: sql<number>`COUNT(CASE WHEN ${ticketMessages.senderId} IN (SELECT id FROM users WHERE role = 'admin') THEN 1 END)`,
    })
      .from(tickets)
      .leftJoin(ticketMessages, eq(ticketMessages.ticketId, tickets.id))
      .where(eq(tickets.userId, userId))
      .groupBy(tickets.id)
      .orderBy(desc(tickets.createdAt));
  }

  async getAllTickets(): Promise<any> {
    const results = await db.select({ ticket: tickets, user: users }).from(tickets).innerJoin(users, eq(tickets.userId, users.id)).orderBy(desc(tickets.createdAt));
    return results.map(r => ({ ...r.ticket, user: this.sanitizeUser(r.user) }));
  }

  async getTicket(id: number): Promise<any> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) return undefined;
    const messages = await db.select().from(ticketMessages).innerJoin(users, eq(ticketMessages.senderId, users.id)).where(eq(ticketMessages.ticketId, id));
    const [owner] = await db.select().from(users).where(eq(users.id, ticket.userId));
    return {
      ...ticket,
      user: owner ? this.sanitizeUser(owner) : undefined,
      messages: messages.map(m => ({ ...m.ticket_messages, sender: this.sanitizeUser(m.users) })),
    };
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

  async markTicketRead(id: number): Promise<void> {
    await db.update(tickets).set({ lastReadAt: new Date() }).where(eq(tickets.id, id));
  }

  async createPasswordResetToken(userId: number): Promise<{ token: string }> {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
    return { token };
  }

  async validatePasswordResetToken(token: string): Promise<number | undefined> {
    const [record] = await db.select().from(passwordResetTokens).where(
      and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.used, false), gt(passwordResetTokens.expiresAt, new Date()))
    );
    if (!record) return undefined;
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, record.id));
    return record.userId;
  }

  async updateUserPassword(userId: number, password: string): Promise<User> {
    const hashedPassword = await hash(password, 10);
    const [updated] = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId)).returning();
    return this.sanitizeUser(updated);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return this.sanitizeUser(user);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return this.sanitizeUser(user);
  }
}

export const storage = new DatabaseStorage();
