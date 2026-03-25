import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // email or phone can be username
  password: text("password").notNull(),
  role: text("role", { enum: ["client", "provider", "admin"] }).notNull().default("client"),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  city: text("city"),
  profileImage: text("profile_image"),
  language: text("language", { enum: ["ar", "fr", "en"] }).default("ar"),
  isBanned: boolean("is_banned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const providerProfiles = pgTable("provider_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  serviceCategory: text("service_category").notNull(),
  bio: text("bio"),
  yearsOfExperience: integer("years_of_experience").default(0),
  citiesServed: text("cities_served").array(), // PG array of strings
  profileImage: text("profile_image"), // object storage path
  portfolioImages: text("portfolio_images").array(), // PG array of object paths
  latitude: real("latitude"),
  longitude: real("longitude"),
  isAvailable: boolean("is_available").default(true),
  workingHours: jsonb("working_hours").$type<Record<string, { active: boolean; start: string; end: string }>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1Id: integer("participant1_id").notNull().references(() => users.id),
  participant2Id: integer("participant2_id").notNull().references(() => users.id),
  lastMessage: text("last_message"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  type: text("type", { enum: ["text", "image", "location", "voice"] }).default("text").notNull(),
  locationData: jsonb("location_data").$type<{ lat: number; lng: number }>(), // Nullable
  fileUrl: text("file_url"), // For voice notes
  duration: integer("duration"), // Voice note duration in seconds
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  providerId: integer("provider_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["pending", "confirmed", "rejected", "completed"] }).notNull().default("pending"),
  price: integer("price").default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["booking_update", "new_message", "system"] }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["open", "closed", "resolved"] }).notNull().default("open"),
  priority: text("priority", { enum: ["low", "normal", "high"] }).notNull().default("normal"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  providerId: integer("provider_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({ id: true, createdAt: true });

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
export type Ticket = typeof tickets.$inferSelect;
export type TicketMessage = typeof ticketMessages.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProviderProfile = z.infer<typeof insertProviderProfileSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;

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

