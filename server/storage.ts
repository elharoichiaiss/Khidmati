import {
  users, providerProfiles, reviews, conversations, messages,
  type User, type InsertUser, type ProviderProfile, type InsertProviderProfile,
  type Review, type InsertReview, type Conversation, type Message, type InsertMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, or, and, desc, like, ilike, sql } from "drizzle-orm";
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

  // Admin
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  toggleUserBan(id: number): Promise<User>;
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

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
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
      const [msg] = await tx.insert(messages).values(message).returning();

      await tx.update(conversations)
        .set({
          lastMessage: message.content,
          updatedAt: new Date()
        })
        .where(eq(conversations.id, message.conversationId));

      return msg;
    });
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async deleteUser(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Delete Provider Profile
      await tx.delete(providerProfiles).where(eq(providerProfiles.userId, id));

      // 2. Delete Reviews (Given and Received)
      await tx.delete(reviews).where(or(
        eq(reviews.providerId, id),
        eq(reviews.clientId, id)
      ));

      // 3. Delete Messages (Sent)
      await tx.delete(messages).where(eq(messages.senderId, id));

      // 4. Delete Conversations (Participant)
      // Note: This will delete conversations for the other user too, which is usually expected behavior 
      // when a user is hard-deleted.
      await tx.delete(conversations).where(or(
        eq(conversations.participant1Id, id),
        eq(conversations.participant2Id, id)
      ));

      // 5. Finally, Delete User
      await tx.delete(users).where(eq(users.id, id));
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
}

export const storage = new DatabaseStorage();
