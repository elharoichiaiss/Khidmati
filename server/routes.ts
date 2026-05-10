import type { Express } from "express";
import type { Server } from "http";
import passport from "passport";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { adminRouter } from "./routes/admin";
import { upload, validateFile } from "./multer";
import express from "express";
import fs from "fs";
import path from "path";
import { sendPushToUser } from "./push";
import { db } from "./db";
import { bookings, users } from "@shared/schema";
import { eq } from "drizzle-orm";


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Setup Authentication
  setupAuth(app);

  // Admin Routes
  app.use("/api/admin", adminRouter);

  // Auth Routes
  app.post(api.auth.register.path, upload.single('profileImage'), async (req, res, next) => {
    try {
      const bodyData = { ...req.body };

      // Add image path if uploaded
      if (req.file) {
        // SECURITY: Validate file magic bytes before processing
        const isValid = await validateFile(req.file.path, ['jpg', 'png', 'gif', 'webp']);
        if (!isValid) {
          fs.unlinkSync(req.file.path); // Delete the invalid file
          return res.status(400).json({ message: "Invalid file type (magic bytes mismatch)" });
        }
        bodyData.profileImage = `/uploads/${req.file.filename}`;
      }

      // Manual data structuring and type coercion for FormData
      const structuredData: any = {
        username: bodyData.username?.trim().toLowerCase(),
        password: bodyData.password,
        fullName: bodyData.fullName,
        email: bodyData.email,
        phone: bodyData.phone,
        city: bodyData.city,
        role: bodyData.role,
        language: bodyData.language || 'ar',
        profileImage: bodyData.profileImage
      };

      // Handle Provider Profile nesting and coercion
      if (bodyData.role === 'provider') {
        let workingHours;
        try {
          workingHours = bodyData.workingHours ? JSON.parse(bodyData.workingHours) : undefined;
        } catch (e) {
          console.error("Failed to parse workingHours:", e);
        }

        structuredData.providerProfile = {
          serviceCategory: bodyData.serviceCategory,
          bio: bodyData.bio || undefined,
          // Ensure citiesServed is array
          citiesServed: bodyData.city ? [bodyData.city] : [],
          yearsOfExperience: bodyData.yearsOfExperience ? Number(bodyData.yearsOfExperience) : 0,
          // Coerce lat/lng to numbers safely
          latitude: (bodyData.latitude && !isNaN(parseFloat(bodyData.latitude))) ? parseFloat(bodyData.latitude) : null,
          longitude: (bodyData.longitude && !isNaN(parseFloat(bodyData.longitude))) ? parseFloat(bodyData.longitude) : null,
          isAvailable: true,
          workingHours: workingHours
        };
      }

      console.log("Structured Data for Zod:", JSON.stringify(structuredData, null, 2));
      const input = api.auth.register.input.parse(structuredData);

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
        console.error("Registration Validation Error:", err.errors.map((e: any) => e.message).join(", "));
        return res.status(400).json({
          message: "Validation error. Please check your input.",
        });
      }
      next(err);
    }
  });

  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/auth?error=true" }),
    (req, res) => {
      const user = req.user as any;
      if (user?.role === "provider") {
        res.redirect("/dashboard");
      } else {
        res.redirect("/");
      }
    }
  );

  app.post(api.auth.login.path, (req, res, next) => {
    // Using passport.authenticate middleware logic inside the route handler for custom response
    const authMiddleware = passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);

      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      // Explicitly check for ban status before logging in
      if (user.isBanned) {
        return res.status(403).json({ message: "Your account has been suspended. Contact support." });
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

  // Unified Profile Update Route
  app.patch("/api/user/profile", upload.single("avatar"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { fullName, latitude, longitude } = req.body;

    try {
      const updates: any = {};
      if (fullName) updates.fullName = fullName;
      if (latitude) updates.latitude = parseFloat(latitude);
      if (longitude) updates.longitude = parseFloat(longitude);
      if (req.file) {
        updates.profileImage = `/uploads/${req.file.filename}`;
      }

      const updatedUser = await storage.updateUser(user.id, updates);
      
      // Update session if needed
      req.login(updatedUser, (err) => {
        if (err) return res.status(500).json({ message: "Error updating session" });
        res.json(updatedUser);
      });
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Chat Image Upload Route
  app.post("/api/upload/image", upload.single("image"), (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  // Providers Routes
  // Providers Routes
  app.get("/api/providers", async (req, res) => {
    const query = (req.query.search as string) || "";
    const category = (req.query.category as string) || "all";
    const city = (req.query.city as string) || "";

    const providers = await storage.searchProviders(query, city, category);
    res.json(providers);
  });

  app.get("/api/providers/:id", async (req, res) => {
    const provider = await storage.getProvider(Number(req.params.id));
    if (!provider) return res.status(404).json({ message: "Provider not found" });
    res.json(provider);
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

  // User Profile Update (fullName, profileImage, lat/lng) - works for ALL roles
  app.patch("/api/user/profile", upload.single('profileImage'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    try {
      const updateData: any = {};

      if (req.body.fullName && req.body.fullName.trim()) {
        updateData.fullName = req.body.fullName.trim();
      }
      if (req.body.latitude) {
        updateData.latitude = parseFloat(req.body.latitude);
      }
      if (req.body.longitude) {
        updateData.longitude = parseFloat(req.body.longitude);
      }
      if (req.file) {
        // SECURITY: Validate file magic bytes
        const isValid = await validateFile(req.file.path, ['jpg', 'png', 'gif', 'webp']);
        if (!isValid) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: "Invalid file type (magic bytes mismatch)" });
        }
        updateData.profileImage = `/uploads/${req.file.filename}`;
      }

      const updatedUser = await storage.updateUser(user.id, updateData);

      // Refresh passport session with updated user data
      req.login(updatedUser, (err) => {
        if (err) return res.status(500).json({ message: "Session refresh failed" });
        res.json(updatedUser);
      });
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ message: "Failed to update profile" });
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

  app.patch('/api/conversations/:id/read', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const conversationId = Number(req.params.id);

    try {
      await storage.markConversationAsRead(conversationId, user.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error marking conversation as read:", err);
      res.status(500).json({ message: "Failed to mark read" });
    }
  });

  app.post('/api/upload/voice', upload.single('voice'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No voice file uploaded" });

    // SECURITY: Validate voice file magic bytes (mp3, wav, webm)
    const isValid = await validateFile(req.file.path, ['mp3', 'wav', 'webm']);
    if (!isValid) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Invalid audio file type (magic bytes mismatch)" });
    }

    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // Generic upload endpoint for Profile/Portfolio
  app.post('/api/uploads', upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // SECURITY: Validate file magic bytes (allow common images)
    const isValid = await validateFile(req.file.path, ['jpg', 'png', 'gif', 'webp']);
    if (!isValid) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Invalid file type (magic bytes mismatch)" });
    }

    res.json({ url: `/uploads/${req.file.filename}` });
  });

  app.get('/api/messages/unread-count', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    try {
      const count = await storage.getUnreadMessageCount(user.id);
      res.json({ count });
    } catch (err) {
      console.error("Error getting unread message count:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.messages.create.path, upload.single('image'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const conversationId = Number(req.params.id);

    try {
      const content = req.body.content || "";
      
      let imageUrl = req.body.imageUrl || null;
      if (req.file) {
        // SECURITY: Validate chat image magic bytes
        const isValid = await validateFile(req.file.path, ['jpg', 'png', 'gif', 'webp']);
        if (!isValid) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: "Invalid image type (magic bytes mismatch)" });
        }
        imageUrl = `/uploads/${req.file.filename}`;
      }
      const type = req.body.type || "text";
      const locationData = req.body.locationData || null;
      const fileUrl = req.body.fileUrl || null;
      const duration = req.body.duration ? parseInt(req.body.duration) : null;

      if (!content && !imageUrl && type !== 'location' && type !== 'voice') {
        return res.status(400).json({ message: "Message must have content, an image, location, or voice note" });
      }

      const messageContent = content ||
        (imageUrl ? "📷 Image" :
          (type === 'location' ? "📍 Shared a location" :
            (type === 'voice' ? "🎤 Voice Message" : "")));

      const message = await storage.createMessage({
        conversationId,
        senderId: user.id,
        content: messageContent,
        imageUrl,
        type,
        locationData,
        fileUrl,
        duration,
      });

      // Send notification to the other participant
      try {
        const conversation = await storage.getConversation(conversationId);
        if (conversation) {
          const recipientId = conversation.participant1Id === user.id
            ? conversation.participant2Id
            : conversation.participant1Id;

          let notifMessage = `💬 New message from ${user.fullName || user.username}`;
          if (type === 'voice') notifMessage = `🎤 New voice message from ${user.fullName || user.username}`;
          else if (type === 'location') notifMessage = `📍 Location shared by ${user.fullName || user.username}`;
          else if (imageUrl) notifMessage = `📷 New photo from ${user.fullName || user.username}`;

          // We only send Web Push Notifications for messages now,
          // keeping the in-app Notifications tab exclusively for bookings/reviews/admin.

          // Send Web Push Notification
          await sendPushToUser(
            recipientId,
            `Message from ${user.fullName || user.username}`,
            messageContent,
            `/messages?id=${conversationId}`
          );
        }
      } catch (notifErr) {
        console.error("Failed to send notification:", notifErr);
      }

      res.status(201).json(message);
    } catch (err) {
      console.error("Error creating message:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete Message
  app.delete("/api/messages/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const messageId = Number(req.params.id);

    try {
      await storage.deleteMessage(messageId, user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Booking Routes
  app.post("/api/bookings", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    try {
      const { providerId, date, description } = req.body;

      if (!providerId || !date) {
        return res.status(400).json({ message: "providerId and date are required" });
      }

      const booking = await storage.createBooking({
        clientId: user.id,
        providerId: Number(providerId),
        date: new Date(date),
        description: description || null,
        status: "pending",
      });

      // Notify the provider about the new booking
      await storage.createNotification({
        userId: Number(providerId),
        type: "booking_update",
        message: `New booking request from ${user.fullName || user.username} 📅`,
        link: "/messages",
      });

      res.status(201).json(booking);
    } catch (err) {
      next(err);
    }
  });

  // Reviews
  app.post("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    try {
      // Validate input
      const { providerId, rating, comment } = req.body;

      if (!providerId || !rating || !comment) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Optional: Check if user booked this provider before (skipped for now as per instructions)

      const review = await storage.createReview({
        clientId: user.id,
        providerId,
        rating,
        comment,
      });

      res.status(201).json(review);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  app.get("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const bookings = await storage.getBookingsForUser(user.id);
    res.json(bookings);
  });

  app.put("/api/bookings/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const bookingId = Number(req.params.id);
    const { status, price } = req.body;

    if (!["confirmed", "rejected", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updates: any = { status };
    if (price !== undefined) updates.price = Number(price);

    const updated = await storage.updateBookingStatus(bookingId, status);
    // If price was updated, we might need a specific storage method or update updateBookingStatus
    // For now, I'll update storage.ts to accept more updates if needed, but let's stick to the simplest fix.
    if (price !== undefined) {
      await db.update(bookings).set({ price: Number(price) }).where(eq(bookings.id, bookingId));
    }

    // Trigger notification for the client
    const statusMessages: Record<string, string> = {
      confirmed: "Your booking has been confirmed! ✅",
      rejected: "Your booking was declined. ❌",
      completed: "Your booking has been marked as completed. ⭐",
    };
    if (statusMessages[status] && updated.clientId) {
      await storage.createNotification({
        userId: updated.clientId,
        type: "booking_update",
        message: statusMessages[status],
        link: "/messages",
      });
    }

    res.json(updated);
  });

  app.get("/api/provider/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.role !== "provider") return res.status(403).json({ message: "Only providers can access stats" });

    try {
      const stats = await storage.getProviderStats(user.id);
      res.json(stats);
    } catch (err) {
      console.error("Error fetching provider stats:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notification Routes
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const notifs = await storage.getUnreadNotifications(user.id);
    res.json(notifs);
  });

  app.patch("/api/notifications/read-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    await storage.markAllNotificationsAsRead(user.id);
    res.json({ success: true });
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const notifId = Number(req.params.id);
    const updated = await storage.markNotificationRead(notifId);
    res.json(updated);
  });

  // Favorites Routes
  app.get("/api/favorites", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const favs = await storage.getFavorites(user.id);
    res.json(favs);
  });

  app.get("/api/favorites/:providerId/check", async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ favorited: false });
    const user = req.user as any;
    const providerId = Number(req.params.providerId);
    const isFavorited = await storage.checkFavorite(user.id, providerId);
    res.json({ favorited: isFavorited });
  });

  app.post("/api/favorites/:providerId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const providerId = Number(req.params.providerId);
    const result = await storage.toggleFavorite(user.id, providerId);
    res.json(result);
  });

  // Push Subscription Route
  app.post(api.push.subscribe.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    try {
      const { endpoint, keys } = req.body;
      await storage.upsertPushSubscription(user.id, {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      });
      res.status(201).json({ success: true });
    } catch (err) {
      console.error("Push subscription error:", err);
      res.status(500).json({ message: "Failed to store subscription" });
    }
  });
  // Support Tickets Routes
  app.get("/api/tickets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const tickets = await storage.getTicketsForUser(user.id);
    res.json(tickets);
  });

  app.post("/api/tickets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    try {
      const ticket = await storage.createTicket({
        ...req.body,
        userId: user.id
      });

      // Notify all admin users about the new ticket
      try {
        const allUsers = await db.select().from(users);
        const admins = allUsers.filter((u: any) => u.role === "admin");
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "system",
            message: `📬 New support ticket #${ticket.id}: "${ticket.subject}" from ${user.fullName}`,
            link: `/k-admin-portal-secure/tickets`,
          });
        }
      } catch (notifErr) {
        console.error("Failed to notify admins:", notifErr);
      }

      res.status(201).json(ticket);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid ticket data" });
    }
  });

  app.get("/api/tickets/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const ticket = await storage.getTicket(Number(req.params.id));
    if (!ticket) return res.sendStatus(404);

    // Allow access if owner or admin
    if (ticket.userId !== user.id && user.role !== "admin") {
      return res.sendStatus(403);
    }
    res.json(ticket);
  });

  app.post("/api/tickets/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    try {
      const msg = await storage.createTicketMessage({
        ticketId: Number(req.params.id),
        senderId: user.id,
        content: req.body.content
      });
      res.status(201).json(msg);
    } catch (err) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  app.patch("/api/tickets/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    // Only admins can change ticket status
    if (user.role !== "admin") return res.sendStatus(403);

    const ticketId = Number(req.params.id);
    const ticket = await storage.getTicket(ticketId);
    if (!ticket) return res.sendStatus(404);

    const updated = await storage.updateTicketStatus(ticketId, req.body.status);
    res.json(updated);
  });


  // NEW Admin Routes (Dedicated)
  app.use("/api/admin", adminRouter);

  // Auto-cleanup old messages (older than 7 days)
  const runCleanup = async () => {
    try {
      const count = await storage.cleanupOldMessages();
      if (count > 0) console.log(`🧹 Cleaned up ${count} messages older than 7 days`);
    } catch (err) {
      console.error("Message cleanup error:", err);
    }
  };
  // Run once on startup, then every hour
  runCleanup();
  setInterval(runCleanup, 60 * 60 * 1000);

  // Seed Data
  try {
    await seedDatabase();
  } catch (err) {
    console.warn("Seed skipped: tables not found", err);
  }

  return httpServer;
}

// Keeping seedDatabase as is for now, but note that the new Admin Dashboard
// uses a separate auth mechanism (Username/Password hardcoded or env)
// rather than the "users" table login.
async function seedDatabase() {
  // Ensure "admin" user exists in DB too
  const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || "admin123";

  const existingAdmin = await storage.getUserByUsername(ADMIN_USER);
  if (!existingAdmin) {
    console.log("Seeding admin user...");
    await storage.createUser({
      username: ADMIN_USER,
      password: ADMIN_PASS,
      role: "admin",
      fullName: "System Admin",
      email: null,
      phone: null,
      language: "ar",
    } as any);
  }

  // Seed other data if provider1 doesn't exist
  const existingUser = await storage.getUserByUsername("provider1");
  if (!existingUser) {
    console.log("Seeding demo data...");

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
        workingHours: {
          monday: { active: true, start: "09:00", end: "18:00" },
          tuesday: { active: true, start: "09:00", end: "18:00" },
          wednesday: { active: true, start: "09:00", end: "18:00" },
          thursday: { active: true, start: "09:00", end: "18:00" },
          friday: { active: true, start: "09:00", end: "18:00" },
          saturday: { active: true, start: "10:00", end: "14:00" },
          sunday: { active: false, start: "09:00", end: "18:00" }
        }
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


