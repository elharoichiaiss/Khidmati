import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Authentication
  setupAuth(app);
  
  // Setup Object Storage Routes
  registerObjectStorageRoutes(app);

  // Auth Routes
  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(input);
      
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join('.'),
        });
      }
      next(err);
    }
  });

  app.post(api.auth.login.path, (req, res, next) => {
    // Using passport.authenticate middleware logic inside the route handler for custom response
    const authMiddleware = require("passport").authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(200).json(user);
      });
    });
    authMiddleware(req, res, next);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as any;
    // Fetch detailed profile if provider
    if (user.role === "provider") {
      const profile = await storage.getProviderProfile(user.id);
      return res.json({ ...user, providerProfile: profile || null });
    }
    res.json(user);
  });

  // Providers Routes
  app.get(api.providers.list.path, async (req, res) => {
    const params = {
      city: req.query.city as string,
      category: req.query.category as string,
      search: req.query.search as string,
    };
    const providers = await storage.listProviders(params);
    res.json(providers);
  });

  app.get(api.providers.get.path, async (req, res) => {
    const profile = await storage.getProviderProfile(Number(req.params.id));
    if (!profile) return res.status(404).json({ message: "Provider not found" });
    res.json(profile);
  });

  app.put(api.providers.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.role !== "provider") return res.status(403).json({ message: "Only providers can update profile" });

    try {
      const input = api.providers.update.input.parse(req.body);
      const updated = await storage.updateProviderProfile(user.id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
         return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join('.'),
         });
      }
      throw err;
    }
  });

  // Reviews Routes
  app.get(api.reviews.list.path, async (req, res) => {
    const reviews = await storage.getReviews(Number(req.params.id));
    res.json(reviews);
  });

  app.post(api.reviews.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const providerId = Number(req.params.id);
    
    // Validate inputs
    try {
      const input = api.reviews.create.input.parse(req.body);
      
      const review = await storage.createReview({
        ...input,
        providerId,
        clientId: user.id
      });
      res.status(201).json(review);
    } catch (err) {
      if (err instanceof z.ZodError) {
         return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join('.'),
         });
      }
      throw err;
    }
  });

  // Conversation Routes
  app.get(api.conversations.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const conversations = await storage.getConversations(user.id);
    res.json(conversations);
  });
  
  app.post(api.conversations.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { targetUserId } = req.body;
    
    const conversation = await storage.createConversation(user.id, targetUserId);
    res.status(201).json(conversation);
  });

  app.get(api.conversations.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const conversation = await storage.getConversation(Number(req.params.id));
    if (!conversation) return res.sendStatus(404);
    
    // Security check: must be participant
    const user = req.user as any;
    if (conversation.participant1Id !== user.id && conversation.participant2Id !== user.id) {
        return res.sendStatus(403);
    }
    
    res.json(conversation);
  });

  app.post(api.messages.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const conversationId = Number(req.params.id);
    
    try {
        const { content } = api.messages.create.input.parse(req.body);
        const message = await storage.createMessage({
            conversationId,
            senderId: user.id,
            content,
        });
        res.status(201).json(message);
    } catch (err) {
        throw err;
    }
  });
  
  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingUser = await storage.getUserByUsername("provider1");
  if (!existingUser) {
    console.log("Seeding database...");
    
    // Create a Provider
    const provider = await storage.createUser({
      username: "provider1",
      password: "password123",
      fullName: "Ahmed Electrician",
      role: "provider",
      city: "Casablanca",
      email: "ahmed@test.com",
      phone: "0600000001",
      language: "ar",
      providerProfile: {
        serviceCategory: "Electrician",
        bio: "Expert electrician with 10 years experience. Available for emergencies.",
        yearsOfExperience: 10,
        citiesServed: ["Casablanca", "Mohammedia"],
        isAvailable: true,
      }
    });

    // Create a Client
    const client = await storage.createUser({
        username: "client1",
        password: "password123",
        fullName: "Karim Client",
        role: "client",
        city: "Casablanca",
        email: "karim@test.com",
        phone: "0600000002",
        language: "fr"
    });
    
    // Create a Review
    await storage.createReview({
        providerId: provider.id,
        clientId: client.id,
        rating: 5,
        comment: "Excellent service, very professional!"
    });

    console.log("Seeding complete.");
  }
}
