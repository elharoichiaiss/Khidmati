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
  read: boolean("read").default(false),
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

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProviderProfileSchema = createInsertSchema(providerProfiles).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, read: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type ProviderProfile = typeof providerProfiles.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProviderProfile = z.infer<typeof insertProviderProfileSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

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

