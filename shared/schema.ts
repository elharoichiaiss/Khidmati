import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // email or phone can be username
  password: text("password"), // Nullable for OAuth users
  googleId: text("google_id").unique(), // For Google OAuth
  role: text("role", { enum: ["client", "provider", "admin"] }).notNull().default("client"),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  city: text("city"),
  profileImage: text("profile_image"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  language: text("language", { enum: ["ar", "fr", "en"] }).default("ar"),
  status: text("status", { enum: ["active", "pending", "rejected"] }).notNull().default("active"),
  isBanned: boolean("is_banned").default(false),
  lastSeen: timestamp("last_seen"),
  notificationPrefs: jsonb("notification_prefs").$type<{
    bookingUpdates: boolean;
    newMessages: boolean;
    promotions: boolean;
    weeklyReport: boolean;
    emailNotifications: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const providerProfiles = pgTable("provider_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  serviceCategory: text("service_category").notNull(),
  bio: text("bio"),
  yearsOfExperience: integer("years_of_experience").default(0),
  citiesServed: text("cities_served").array(),
  profileImage: text("profile_image"),
  portfolioImages: text("portfolio_images").array(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  isAvailable: boolean("is_available").default(true),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  completedBookings: integer("completed_bookings").default(0),
  responseTime: integer("response_time").default(0),
  workingHours: jsonb("working_hours").$type<Record<string, { active: boolean; start: string; end: string }>>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_provider_profiles_user_id").on(table.userId),
]);

export const verificationRequests = pgTable("verification_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  idDocument: text("id_document"),
  professionalLicense: text("professional_license"),
  additionalDocs: text("additional_docs").array(),
  notes: text("notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_verification_requests_user_id").on(table.userId),
]);

export const providerBadges = pgTable("provider_badges", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => users.id),
  badgeType: text("badge_type", { enum: ["verified", "top_rated", "fast_response", "experienced", "popular"] }).notNull(),
  awardedAt: timestamp("awarded_at").defaultNow(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameFr: text("name_fr").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionFr: text("description_fr"),
  descriptionEn: text("description_en"),
  price: integer("price").notNull(),
  duration: integer("duration").notNull(),
  features: text("features").array(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const providerSubscriptions = pgTable("provider_subscriptions", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => users.id),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status", { enum: ["active", "expired", "cancelled"] }).notNull().default("active"),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["cash_plus", "cmi", "card", "cash"] }).notNull(),
  label: text("label"),
  details: jsonb("details").$type<Record<string, string>>(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  amount: integer("amount").notNull(),
  method: text("method", { enum: ["cash_plus", "cmi", "card", "cash"] }).notNull(),
  status: text("status", { enum: ["pending", "completed", "failed", "refunded"] }).notNull().default("pending"),
  transactionId: text("transaction_id"),
  phoneNumber: text("phone_number"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_reviews_provider_id").on(table.providerId),
  index("idx_reviews_client_id").on(table.clientId),
]);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1Id: integer("participant1_id").notNull().references(() => users.id),
  participant2Id: integer("participant2_id").notNull().references(() => users.id),
  lastMessage: text("last_message"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_conversations_participant1").on(table.participant1Id),
  index("idx_conversations_participant2").on(table.participant2Id),
]);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  type: text("type", { enum: ["text", "image", "location", "voice", "invoice"] }).default("text").notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  locationData: jsonb("location_data").$type<{ lat: number; lng: number }>(),
  fileUrl: text("file_url"),
  duration: integer("duration"),
  read: boolean("read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_messages_conversation_id").on(table.conversationId),
  index("idx_messages_sender_id").on(table.senderId),
]);

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  providerId: integer("provider_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["pending", "confirmed", "rejected", "completed"] }).notNull().default("pending"),
  price: integer("price").default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_bookings_client_id").on(table.clientId),
  index("idx_bookings_provider_id").on(table.providerId),
]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["booking_update", "new_message", "system"] }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
]);

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["open", "closed", "resolved"] }).notNull().default("open"),
  priority: text("priority", { enum: ["low", "normal", "high"] }).notNull().default("normal"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastReadAt: timestamp("last_read_at"),
}, (table) => [
  index("idx_tickets_user_id").on(table.userId),
]);

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ticket_messages_ticket_id").on(table.ticketId),
]);

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  providerId: integer("provider_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_favorites_user_provider").on(table.userId, table.providerId),
]);

export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
}, (table) => [
  index("idx_session_expire").on(table.expire),
]);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_push_subscriptions_user_id").on(table.userId),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameFr: text("name_fr").notNull(),
  nameEn: text("name_en").notNull(),
  icon: text("icon").default("Wrench"),
  color: text("color").default("#0ea5e9"),
  basePrice: integer("base_price").default(0),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  providerId: integer("provider_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  serviceType: text("service_type").notNull(),
  description: text("description").notNull(),
  agreedPrice: integer("agreed_price").notNull(),
  status: text("status", { enum: ["pending_agreement", "agreed", "awaiting_confirmation", "completed", "rejected"] }).notNull().default("pending_agreement"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_invoices_conversation_id").on(table.conversationId),
  index("idx_invoices_provider_id").on(table.providerId),
  index("idx_invoices_client_id").on(table.clientId),
]);

export const accountDeletions = pgTable("account_deletions", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  reason: text("reason").notNull(),
  deletedBy: integer("deleted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_account_deletions_username").on(table.username),
  index("idx_account_deletions_email").on(table.email),
]);

// === RELATIONS ===

export const usersRelations = relations(users, ({ one, many }) => ({
  providerProfile: one(providerProfiles, {
    fields: [users.id],
    references: [providerProfiles.userId],
  }),
  reviewsReceived: many(reviews, { relationName: "providerReviews" }),
  reviewsGiven: many(reviews, { relationName: "clientReviews" }),
  sentMessages: many(messages),
}));

export const providerProfilesRelations = relations(providerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [providerProfiles.userId],
    references: [users.id],
  }),
}));

export const verificationRequestsRelations = relations(verificationRequests, ({ one }) => ({
  user: one(users, {
    fields: [verificationRequests.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [verificationRequests.reviewedBy],
    references: [users.id],
  }),
}));

export const providerBadgesRelations = relations(providerBadges, ({ one }) => ({
  provider: one(users, {
    fields: [providerBadges.providerId],
    references: [users.id],
  }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(providerSubscriptions),
}));

export const providerSubscriptionsRelations = relations(providerSubscriptions, ({ one }) => ({
  provider: one(users, {
    fields: [providerSubscriptions.providerId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [providerSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  provider: one(users, {
    fields: [reviews.providerId],
    references: [users.id],
    relationName: "providerReviews",
  }),
  client: one(users, {
    fields: [reviews.clientId],
    references: [users.id],
    relationName: "clientReviews",
  }),
}));

export const conversationsRelations = relations(conversations, ({ many, one }) => ({
  messages: many(messages),
  participant1: one(users, {
    fields: [conversations.participant1Id],
    references: [users.id],
  }),
  participant2: one(users, {
    fields: [conversations.participant2Id],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  client: one(users, {
    fields: [bookings.clientId],
    references: [users.id],
    relationName: "clientBookings",
  }),
  provider: one(users, {
    fields: [bookings.providerId],
    references: [users.id],
    relationName: "providerBookings",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
    relationName: "userFavorites",
  }),
  provider: one(users, {
    fields: [favorites.providerId],
    references: [users.id],
    relationName: "favoritedProviders",
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketMessages.ticketId],
    references: [tickets.id],
  }),
  sender: one(users, {
    fields: [ticketMessages.senderId],
    references: [users.id],
  }),
}));

export const recurringBookings = pgTable("recurring_bookings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  providerId: integer("provider_id").notNull().references(() => users.id),
  serviceCategory: text("service_category").notNull(),
  description: text("description"),
  frequency: text("frequency", { enum: ["daily", "weekly", "biweekly", "monthly"] }).notNull(),
  dayOfWeek: integer("day_of_week"),
  dayOfMonth: integer("day_of_month"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  time: text("time").notNull(),
  price: integer("price").default(0),
  status: text("status", { enum: ["active", "paused", "cancelled"] }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_recurring_bookings_client_id").on(table.clientId),
  index("idx_recurring_bookings_provider_id").on(table.providerId),
]);

export const recurringBookingsRelations = relations(recurringBookings, ({ one }) => ({
  client: one(users, {
    fields: [recurringBookings.clientId],
    references: [users.id],
  }),
  provider: one(users, {
    fields: [recurringBookings.providerId],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [invoices.conversationId],
    references: [conversations.id],
  }),
  provider: one(users, {
    fields: [invoices.providerId],
    references: [users.id],
  }),
  client: one(users, {
    fields: [invoices.clientId],
    references: [users.id],
  }),
  messages: many(messages),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

export const workingHoursSchema = z.record(z.string(), z.object({
  active: z.boolean(),
  start: z.string(),
  end: z.string()
}));

export const insertProviderProfileSchema = createInsertSchema(providerProfiles, {
  workingHours: workingHoursSchema.optional()
}).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, read: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, read: true });
export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({ id: true, createdAt: true });
export const insertVerificationRequestSchema = createInsertSchema(verificationRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderBadgeSchema = createInsertSchema(providerBadges).omit({ id: true, awardedAt: true });
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true });
export const insertProviderSubscriptionSchema = createInsertSchema(providerSubscriptions).omit({ id: true, createdAt: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertRecurringBookingSchema = createInsertSchema(recurringBookings).omit({ id: true, createdAt: true });
export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type ProviderProfile = typeof providerProfiles.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type RecurringBooking = typeof recurringBookings.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type AccountDeletion = typeof accountDeletions.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProviderProfile = z.infer<typeof insertProviderProfileSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type ProviderBadge = typeof providerBadges.$inferSelect;
export type InsertVerificationRequest = z.infer<typeof insertVerificationRequestSchema>;
export type InsertProviderBadge = z.infer<typeof insertProviderBadgeSchema>;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertRecurringBooking = z.infer<typeof insertRecurringBookingSchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// Request types
export type LoginRequest = {
  username: string;
  password: string; // Plain text password from client
};

// Response types with joined data
export type UserResponse = User & { providerProfile?: ProviderProfile | null };
export type ProviderWithUser = ProviderProfile & { user: User };
export type ReviewWithClient = Review & { client: User };

export type ConversationWithParticipants = Conversation & {
  participant1: User;
  participant2: User;
};

// Search params
export interface ProviderSearchParams {
  city?: string;
  category?: string;
  search?: string;
}

