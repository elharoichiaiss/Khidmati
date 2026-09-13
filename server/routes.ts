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
import { bookings, users, reviews, serviceCategories, recurringBookings, verificationRequests, providerBadges, providerProfiles, paymentMethods, payments, messages } from "@shared/schema";
import { eq, desc, and, isNotNull, count, sum, or, ilike, ne } from "drizzle-orm";
import { calculateDistance } from "./geo";


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve uploaded files with security headers (DGSSI 12.5.2)
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"), {
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Security-Policy", "default-src 'none'");
      },
    })
  );

  // Setup Authentication
  setupAuth(app);

  // Banned User Restrictions Middleware
  app.use("/api", (req, res, next) => {
    if (req.isAuthenticated() && (req.user as any)?.isBanned) {
      const isAllowed =
        req.path === "/user" ||
        req.path === "/logout" ||
        req.path === "/tickets" ||
        req.path.startsWith("/tickets/");

      if (!isAllowed) {
        return res.status(403).json({
          message: "Account is banned. You can only submit support tickets.",
          isBanned: true
        });
      }
    }
    next();
  });

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
          serviceCategory: bodyData.serviceCategory || bodyData.providerProfile?.serviceCategory,
          bio: bodyData.bio || bodyData.providerProfile?.bio || undefined,
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
          message: "Validation error: " + err.errors.map((e: any) => e.path.join(".") + ": " + e.message).join("; "),
        });
      }
      next(err);
    }
  });

  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get("/api/check-username", async (req, res) => {
    const username = (req.query.username as string)?.trim().toLowerCase();
    const current = (req.query.current as string)?.trim().toLowerCase();
    if (!username || username.length < 3) return res.json({ available: false });
    const existing = await storage.getUserByUsername(username);
    res.json({ available: !existing || (current && existing.username.toLowerCase() === current) });
  });

  // Complete the missing profile steps after social (Google) sign-in
  app.post("/api/complete-profile", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    try {
      const { role, username, phone, city, serviceCategory, yearsOfExperience, bio } = req.body;

      const finalRole = role === "provider" ? "provider" : "client";

      // Allow Google users to pick a proper username
      let finalUsername = user.username;
      if (username && typeof username === "string") {
        const clean = username.trim().toLowerCase();
        if (clean.length < 3) {
          return res.status(400).json({ message: "Username must be at least 3 characters" });
        }
        if (clean !== user.username) {
          const existing = await storage.getUserByUsername(clean);
          if (existing && existing.id !== user.id) {
            return res.status(400).json({ message: "Username already exists" });
          }
          finalUsername = clean;
        }
      }

      if (!city || !(city as string).trim()) {
        return res.status(400).json({ message: "City is required" });
      }

      if (finalRole === "provider" && !serviceCategory) {
        return res.status(400).json({ message: "Please select your service category" });
      }

      await db.update(users).set({
        username: finalUsername,
        phone: phone || user.phone,
        city,
        role: finalRole,
      }).where(eq(users.id, user.id));

      if (finalRole === "provider") {
        await storage.updateProviderProfile(user.id, {
          serviceCategory,
          citiesServed: [city],
          yearsOfExperience: Number(yearsOfExperience) || 0,
          bio: bio || undefined,
          isAvailable: true,
        } as any);
      }

      const updated = await storage.getUser(user.id);
      if (!updated) {
        return res.status(500).json({ message: "Failed to reload user" });
      }
      const fullUser: any = updated.role === "provider"
        ? { ...updated, providerProfile: await storage.getProviderProfile(user.id) }
        : updated;

      req.login(fullUser, (err) => {
        if (err) return next(err);
        res.json(fullUser);
      });
    } catch (err) {
      console.error("Complete profile error:", err);
      res.status(500).json({ message: "Failed to complete profile" });
    }
  });

  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/auth?error=true" }),
    (req, res) => {
      const user = req.user as any;
      if (user?.role === "provider") {
        res.redirect("/provider/dashboard");
      } else if (user && !user.city) {
        res.redirect("/complete-profile");
      } else {
        res.redirect("/");
      }
    }
  );

  // Forgot Password
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور" });
      }
      
      const result = await storage.createPasswordResetToken(user.id);
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${result.token}`;
      console.log("Password reset URL:", resetUrl);
      
      res.json({ 
        message: "إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور",
        ...(process.env.NODE_ENV !== 'production' && { resetUrl })
      });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ message: "حدث خطأ أثناء معالجة الطلب" });
    }
  });

  // Reset Password
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password || password.length < 6) {
        return res.status(400).json({ message: "رابط إعادة التعيين غير صالح أو كلمة المرور قصيرة جداً" });
      }
      
      const userId = await storage.validatePasswordResetToken(token);
      if (!userId) {
        return res.status(400).json({ message: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" });
      }
      
      await storage.updateUserPassword(userId, password);
      
      res.json({ message: "تم إعادة تعيين كلمة المرور بنجاح" });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ message: "حدث خطأ أثناء إعادة تعيين كلمة المرور" });
    }
  });

  app.post(api.auth.login.path, (req, res, next) => {
    // Using passport.authenticate middleware logic inside the route handler for custom response
    const authMiddleware = passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) return next(err);

      if (!user) {
        // The user could not be found — check if their account was deleted by an admin
        const submitted = String(req.body?.username || "").trim().toLowerCase();
        if (submitted) {
          try {
            const deletion = await storage.getAccountDeletion(submitted);
            if (deletion) {
              return res.status(403).json({
                message: "deleted_by_admin",
                deleted: true,
                reason: deletion.reason,
              });
            }
          } catch (lookupErr) {
            console.error("Deletion lookup error:", lookupErr);
          }
        }
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

  // Self-service account deletion (irreversible)
  app.post(api.account.deleteAccount.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as any;
    try {
      if (user.role === "admin") {
        return res.status(400).json({ message: "Admins cannot delete their account from here" });
      }
      const { reason, confirmation } = req.body;
      if (confirmation !== true) {
        return res.status(400).json({ message: "Confirmation is required" });
      }

      if (reason) {
        console.log(`[ACCOUNT_DELETION] user=${user.username} (id=${user.id}) reason="${reason}"`);
      }

      await storage.deleteUser(user.id);

      req.logout((err) => {
        if (err) {
          console.error("Logout after account deletion error:", err);
          return res.status(500).json({ message: "Failed to complete deletion" });
        }
        res.json({ success: true, message: "Account permanently deleted" });
      });
    } catch (err) {
      console.error("Delete account error:", err);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Profile update route is defined below (with file-type security validation)

  // Chat Image Upload Route
  app.post("/api/upload/image", upload.single("image"), (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  // Providers Routes
  app.get("/api/providers", async (req, res) => {
    const query = (req.query.search as string) || "";
    const category = (req.query.category as string) || "all";
    const city = (req.query.city as string) || "";

    const providers = await storage.searchProviders(query, city, category);
    res.json(providers);
  });

  // Nearby providers search
  app.get("/api/providers/nearby", async (req, res) => {
    try {
      const { lat, lng, radius = "10", category } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({ message: "خطأ في إحداثيات الموقع" });
      }

      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      const maxRadius = parseFloat(radius as string);

      const providers = await db.select({
        user: users,
        profile: providerProfiles,
      })
      .from(users)
      .innerJoin(providerProfiles, eq(users.id, providerProfiles.userId))
      .where(and(
        eq(users.role, "provider"),
        eq(users.status, "active"),
        eq(providerProfiles.isAvailable, true),
        isNotNull(users.latitude),
        isNotNull(users.longitude),
        category ? eq(providerProfiles.serviceCategory, category as string) : undefined,
      ));

      const nearby = providers
        .map(p => {
          const dist = calculateDistance(
            userLat, userLng,
            p.user.latitude!, p.user.longitude!
          );
          return {
            ...p,
            distance: Math.round(dist * 10) / 10,
            profile: p.profile,
          };
        })
        .filter(p => p.distance <= maxRadius)
        .sort((a, b) => a.distance - b.distance);

      res.json(nearby);
    } catch (err) {
      console.error("Nearby search error:", err);
      res.status(500).json({ message: "حدث خطأ في البحث عن الحرفيين القريبين" });
    }
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

    // Prevent self-review
    if (user.id === providerId) {
      return res.status(400).json({ message: "You cannot review yourself" });
    }

    try {
      // Check for duplicate review
      const [existing] = await db.select().from(reviews)
        .where(and(eq(reviews.clientId, user.id), eq(reviews.providerId, providerId)));
      if (existing) {
        return res.status(409).json({ message: "already_reviewed" });
      }

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

    if (!targetUserId || isNaN(Number(targetUserId))) {
      return res.status(400).json({ message: "Invalid target user ID" });
    }

    const targetUser = await storage.getUser(Number(targetUserId));
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const conversation = await storage.createConversation(user.id, Number(targetUserId));
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

  // Typing indicator endpoint (in-memory stub for future WebSocket integration)
  app.post("/api/conversations/:id/typing", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    res.json({ success: true });
  });

  // Mark messages as read with readAt timestamp
  app.patch("/api/conversations/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const convId = parseInt(req.params.id);
      if (isNaN(convId)) return res.status(400).json({ message: "Invalid conversation ID" });
      const userId = (req.user as any).id;

      await db.update(messages)
        .set({ read: true, readAt: new Date() })
        .where(and(
          eq(messages.conversationId, convId),
          ne(messages.senderId, userId),
          eq(messages.read, false)
        ));

      res.json({ success: true });
    } catch (err) {
      console.error("Mark read error:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // Update user's last seen timestamp
  app.post("/api/user/last-seen", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, (req.user as any).id));
      res.json({ success: true });
    } catch (err) {
      console.error("Last seen error:", err);
      res.status(500).json({ message: "حدث خطأ" });
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

  // Invoice Routes
  app.post("/api/conversations/:id/invoices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.role !== "provider") return res.status(403).json({ message: "Only providers can create invoices" });

    const conversationId = Number(req.params.id);
    const { description, agreedPrice } = req.body;

    if (!description || !agreedPrice) {
      return res.status(400).json({ message: "Description and agreed price are required" });
    }

    const priceNum = Number(agreedPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }

    try {
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });

      const clientId = conversation.participant1Id === user.id ? conversation.participant2Id : conversation.participant1Id;
      const client = await storage.getUser(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      
      const providerProfile = await storage.getProviderProfile(user.id);
      const serviceType = providerProfile?.serviceCategory || "General Service";

      // Create the invoice
      const invoice = await storage.createInvoice({
        conversationId,
        providerId: user.id,
        clientId,
        clientName: client.fullName,
        clientPhone: client.phone || "",
        serviceType,
        description,
        agreedPrice: priceNum,
        status: "pending_agreement"
      });

      // Create a message containing the invoice
      const message = await storage.createMessage({
        conversationId,
        senderId: user.id,
        content: `Invoice created for ${agreedPrice} MAD`,
        type: "invoice",
        invoiceId: invoice.id
      });

      // Send notification
      await sendPushToUser(
        clientId,
        `New Invoice from ${user.fullName}`,
        `An invoice for ${agreedPrice} MAD has been sent.`,
        `/messages?id=${conversationId}`
      );

      // Attach the invoice to the returned message for the frontend
      res.status(201).json({ ...message, invoice });
    } catch (err) {
      console.error("Error creating invoice:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/invoices/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const invoiceId = Number(req.params.id);
    const { status } = req.body;

    try {
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      // Validate status transition based on user role
      if (status === "agreed" && user.id === invoice.clientId && invoice.status === "pending_agreement") {
        // Valid
      } else if (status === "rejected" && user.id === invoice.clientId && invoice.status === "pending_agreement") {
        // Valid (Client rejected price)
      } else if (status === "awaiting_confirmation" && user.id === invoice.providerId && invoice.status === "agreed") {
        // Valid
      } else if (status === "rejected" && user.id === invoice.providerId && invoice.status === "agreed") {
        // Valid (Provider didn't receive cash)
      } else if (status === "completed" && user.id === invoice.clientId && invoice.status === "awaiting_confirmation") {
        // Valid
      } else {
        return res.status(403).json({ message: "Invalid status transition or unauthorized user" });
      }

      const updated = await storage.updateInvoiceStatus(invoiceId, status);

      // When the client agrees on the price in chat, mark the related pending booking as confirmed
      if (status === "agreed") {
        try {
          const [pendingBooking] = await db.select().from(bookings)
            .where(and(
              eq(bookings.clientId, invoice.clientId),
              eq(bookings.providerId, invoice.providerId),
              eq(bookings.status, "pending")
            ))
            .orderBy(desc(bookings.createdAt))
            .limit(1);
          if (pendingBooking) {
            await db.update(bookings).set({ status: "confirmed" }).where(eq(bookings.id, pendingBooking.id));
          }
        } catch (bookingErr) {
          console.error("Failed to confirm booking from invoice:", bookingErr);
        }
      }

      // When the price is not agreed, mark the related pending booking as rejected
      if (status === "rejected") {
        try {
          const [pendingBooking] = await db.select().from(bookings)
            .where(and(
              eq(bookings.clientId, invoice.clientId),
              eq(bookings.providerId, invoice.providerId),
              eq(bookings.status, "pending")
            ))
            .orderBy(desc(bookings.createdAt))
            .limit(1);
          if (pendingBooking) {
            await db.update(bookings).set({ status: "rejected" }).where(eq(bookings.id, pendingBooking.id));
          }
        } catch (bookingErr) {
          console.error("Failed to reject booking from invoice:", bookingErr);
        }
      }

      // When the client confirms the invoice, mark the related booking as completed
      if (status === "completed") {
        try {
          const [relatedBooking] = await db.select().from(bookings)
            .where(and(
              eq(bookings.clientId, invoice.clientId),
              eq(bookings.providerId, invoice.providerId),
              or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed"))
            ))
            .orderBy(desc(bookings.createdAt))
            .limit(1);
          if (relatedBooking) {
            await db.update(bookings).set({ status: "completed" }).where(eq(bookings.id, relatedBooking.id));
          }
        } catch (bookingErr) {
          console.error("Failed to complete booking from invoice:", bookingErr);
        }
      }
      
      // Notify the other party
      const notifyUserId = user.id === invoice.clientId ? invoice.providerId : invoice.clientId;
      const statusMsgs: Record<string, string> = {
        "agreed": "Client agreed to the invoice price.",
        "awaiting_confirmation": "Provider confirmed cash received. Please confirm.",
        "completed": "Invoice payment is fully confirmed."
      };
      
      if (statusMsgs[status]) {
        await sendPushToUser(
          notifyUserId,
          "Invoice Update",
          statusMsgs[status],
          `/messages?id=${invoice.conversationId}`
        );
      }

      res.json(updated);
    } catch (err) {
      console.error("Error updating invoice status:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    const userId = Number(req.params.id);
    try {
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/invoices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    try {
      const invoices = await storage.getInvoicesForUser(user.id);
      res.json(invoices);
    } catch (err) {
      console.error("Error fetching user invoices:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const invoiceId = Number(req.params.id);
    
    try {
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      const isAuthenticatedNormal = req.isAuthenticated();
      const isAdminSession = req.session && (req.session as any).isAdmin;

      if (!isAuthenticatedNormal && !isAdminSession) {
          return res.sendStatus(401);
      }

      if (!isAdminSession) {
          const user = req.user as any;
          if (invoice.clientId !== user.id && invoice.providerId !== user.id && user.role !== "admin") {
              return res.status(403).json({ message: "Unauthorized to view this invoice" });
          }
      }

      res.json(invoice);
    } catch (err) {
      console.error("Error fetching invoice:", err);
      res.status(500).json({ message: "Internal server error" });
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

      const provider = await storage.getUser(Number(providerId));
      if (!provider || provider.role !== "provider" || provider.status !== "active" || provider.isBanned) {
        return res.status(400).json({ message: "This provider is not active or available for booking" });
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
        link: "/provider/bookings",
      });

      res.status(201).json(booking);
    } catch (err) {
      next(err);
    }
  });

  // Reviews (standalone endpoint)
  app.post("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    try {
      const { providerId, rating, comment } = req.body;

      if (!providerId || !rating || !comment) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const numRating = Number(rating);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      if (user.id === providerId) {
        return res.status(400).json({ message: "You cannot review yourself" });
      }

      // Check for duplicate review
      const [existing] = await db.select().from(reviews)
        .where(and(eq(reviews.clientId, user.id), eq(reviews.providerId, Number(providerId))));
      if (existing) {
        return res.status(409).json({ message: "already_reviewed" });
      }

      const review = await storage.createReview({
        clientId: user.id,
        providerId: Number(providerId),
        rating: numRating,
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

  // Get current user's bookings (as client)
  app.get("/api/my-bookings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = (req.user as any).id;
      const userBookings = await db.select({
        booking: bookings,
        provider: users,
        profile: providerProfiles,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.providerId, users.id))
      .leftJoin(providerProfiles, eq(users.id, providerProfiles.userId))
      .where(eq(bookings.clientId, userId))
      .orderBy(desc(bookings.createdAt));

      res.json(userBookings);
    } catch (err) {
      console.error("Error fetching user bookings:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // Get current user's bookings (as provider)
  app.get("/api/provider/my-bookings", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "provider") return res.status(403).json({ message: "Unauthorized" });
    try {
      const userId = (req.user as any).id;
      const providerBookings = await db.select({
        booking: bookings,
        client: users,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.clientId, users.id))
      .where(eq(bookings.providerId, userId))
      .orderBy(desc(bookings.createdAt));

      res.json(providerBookings);
    } catch (err) {
      console.error("Error fetching provider bookings:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.put("/api/bookings/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const bookingId = Number(req.params.id);
    if (isNaN(bookingId)) return res.status(400).json({ message: "Invalid booking ID" });

    const { status, price } = req.body;

    if (!["confirmed", "rejected", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Authorization: only the provider or client of this booking can update it
    const existingBooking = await storage.getBookingsForUser(user.id);
    const booking = existingBooking.find(b => b.id === bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.providerId !== user.id && booking.clientId !== user.id && user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Validate price is non-negative
    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
      return res.status(400).json({ message: "Price must be a non-negative number" });
    }

    const updates: any = { status };
    if (price !== undefined) updates.price = Number(price);

    const updated = await storage.updateBookingStatus(bookingId, status);
    if (!updated) return res.status(404).json({ message: "Booking not found" });

    if (price !== undefined) {
      await db.update(bookings).set({ price: Number(price) }).where(eq(bookings.id, bookingId));
    }

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
        link: "/bookings",
      });
    }

    res.json(updated);
  });

  // Recurring Bookings
  app.get("/api/recurring-bookings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = (req.user as any).id;
      const userRole = (req.user as any).role;

      const bookings = await db.select().from(recurringBookings).where(
        userRole === "provider"
          ? eq(recurringBookings.providerId, userId)
          : eq(recurringBookings.clientId, userId)
      ).orderBy(desc(recurringBookings.createdAt));

      res.json(bookings);
    } catch (err) {
      console.error("Error fetching recurring bookings:", err);
      res.status(500).json({ message: "حدث خطأ في جلب الحجوزات المتكررة" });
    }
  });

  app.post("/api/recurring-bookings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = (req.user as any).id;
      const { providerId, serviceCategory, frequency, startDate, time, description, dayOfWeek, dayOfMonth, endDate, price } = req.body;

      if (!providerId || !serviceCategory || !frequency || !startDate || !time) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (!["daily", "weekly", "biweekly", "monthly"].includes(frequency)) {
        return res.status(400).json({ message: "Invalid frequency" });
      }

      const [booking] = await db.insert(recurringBookings).values({
        clientId: userId,
        providerId: Number(providerId),
        serviceCategory,
        frequency,
        startDate: new Date(startDate),
        time,
        description: description || null,
        dayOfWeek: dayOfWeek != null ? Number(dayOfWeek) : null,
        dayOfMonth: dayOfMonth != null ? Number(dayOfMonth) : null,
        endDate: endDate ? new Date(endDate) : null,
        price: price ? Number(price) : 0,
      }).returning();
      res.status(201).json(booking);
    } catch (err) {
      console.error("Error creating recurring booking:", err);
      res.status(500).json({ message: "حدث خطأ في إنشاء الحجز المتكرر" });
    }
  });

  app.put("/api/recurring-bookings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { id } = req.params;
      const bookingId = parseInt(id);
      if (isNaN(bookingId)) return res.status(400).json({ message: "Invalid ID" });

      // Authorization: only owner can update
      const [existing] = await db.select().from(recurringBookings).where(eq(recurringBookings.id, bookingId));
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (existing.clientId !== (req.user as any).id && existing.providerId !== (req.user as any).id && (req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Only allow safe fields to be updated
      const { status, description, price } = req.body;
      const updates: any = {};
      if (status) updates.status = status;
      if (description !== undefined) updates.description = description;
      if (price !== undefined) updates.price = Number(price);

      const [updated] = await db.update(recurringBookings)
        .set(updates)
        .where(eq(recurringBookings.id, bookingId))
        .returning();
      res.json(updated);
    } catch (err) {
      console.error("Error updating recurring booking:", err);
      res.status(500).json({ message: "حدث خطأ في تحديث الحجز المتكرر" });
    }
  });

  app.delete("/api/recurring-bookings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { id } = req.params;
      const bookingId = parseInt(id);
      if (isNaN(bookingId)) return res.status(400).json({ message: "Invalid ID" });

      // Authorization: only owner can delete
      const [existing] = await db.select().from(recurringBookings).where(eq(recurringBookings.id, bookingId));
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (existing.clientId !== (req.user as any).id && existing.providerId !== (req.user as any).id && (req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await db.delete(recurringBookings).where(eq(recurringBookings.id, bookingId));
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting recurring booking:", err);
      res.status(500).json({ message: "حدث خطأ في حذف الحجز المتكرر" });
    }
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

  // Verification requests
  app.post("/api/verification/request", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const user = req.user as any;
      const userId = user.id;
      if (user.role !== "provider") {
        return res.status(403).json({ message: "فقط الحرفيون يمكنهم طلب التوثيق" });
      }
      const [existing] = await db.select().from(verificationRequests)
        .where(and(eq(verificationRequests.userId, userId), eq(verificationRequests.status, "pending")));
      if (existing) {
        return res.status(400).json({ message: "لديك طلب توثيق قيد المراجعة بالفعل" });
      }
      const { idDocument, professionalLicense, additionalDocs, notes } = req.body;
      const [request] = await db.insert(verificationRequests).values({
        userId,
        idDocument: idDocument || null,
        professionalLicense: professionalLicense || null,
        additionalDocs: additionalDocs || null,
        notes: notes || null,
      }).returning();
      res.status(201).json(request);
    } catch (err) {
      console.error("Verification request error:", err);
      res.status(500).json({ message: "حدث خطأ في تقديم طلب التوثيق" });
    }
  });

  app.get("/api/verification/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const user = req.user as any;
      const userId = user.id;
      const [request] = await db.select().from(verificationRequests)
        .where(eq(verificationRequests.userId, userId))
        .orderBy(desc(verificationRequests.createdAt))
        .limit(1);
      res.json(request || { status: "none" });
    } catch (err) {
      console.error("Verification status error:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  const checkIsAdmin = (req: any) => {
    if (req.isAuthenticated() && req.user && req.user.role === "admin") return true;
    if (req.session && req.session.isAdmin) return true;
    return false;
  };

  app.get("/api/admin/verification-requests", async (req, res) => {
    if (!checkIsAdmin(req)) return res.status(403).json({ message: "Unauthorized" });
    try {
      const requests = await db.select().from(verificationRequests)
        .where(eq(verificationRequests.status, "pending"))
        .orderBy(desc(verificationRequests.createdAt));
      res.json(requests);
    } catch (err) {
      console.error("Error fetching verification requests:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.put("/api/admin/verification-requests/:id", async (req, res) => {
    if (!checkIsAdmin(req)) return res.status(403).json({ message: "Unauthorized" });
    const adminId = (req.user as any)?.id || (req.session as any)?.adminUserId;
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'" });
      }

      const [request] = await db.update(verificationRequests)
        .set({ status, notes, reviewedBy: adminId, updatedAt: new Date() })
        .where(eq(verificationRequests.id, parseInt(id)))
        .returning();

      if (status === "approved") {
        await db.update(providerProfiles)
          .set({ isVerified: true, verifiedAt: new Date() })
          .where(eq(providerProfiles.userId, request.userId));

        await db.insert(providerBadges).values({
          providerId: request.userId,
          badgeType: "verified",
        });
      }

      res.json(request);
    } catch (err) {
      console.error("Error updating verification request:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // Admin - Dashboard stats
  app.get("/api/admin/stats", async (req, res) => {
    if (!checkIsAdmin(req)) return res.status(403).json({ message: "Unauthorized" });
    try {
      const totalUsers = await db.select({ count: count() }).from(users);
      const totalProviders = await db.select({ count: count() }).from(users).where(eq(users.role, "provider"));
      const totalBookings = await db.select({ count: count() }).from(bookings);
      const pendingVerifications = await db.select({ count: count() }).from(verificationRequests).where(eq(verificationRequests.status, "pending"));
      const totalRevenue = await db.select({ total: sum(payments.amount) }).from(payments).where(eq(payments.status, "completed"));
      const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(10);
      const recentBookings = await db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(10);

      res.json({
        totalUsers: Number(totalUsers[0]?.count) || 0,
        totalProviders: Number(totalProviders[0]?.count) || 0,
        totalBookings: Number(totalBookings[0]?.count) || 0,
        pendingVerifications: Number(pendingVerifications[0]?.count) || 0,
        totalRevenue: Number(totalRevenue[0]?.total) || 0,
        recentUsers,
        recentBookings,
      });
    } catch (err) {
      console.error("Admin stats error:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // Admin - Manage users (with pagination)
  app.get("/api/admin/users", async (req, res) => {
    if (!checkIsAdmin(req)) return res.status(403).json({ message: "Unauthorized" });
    try {
      const { role, status, search } = req.query;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const offset = (page - 1) * limit;

      let query: any = db.select().from(users);
      let countQuery: any = db.select({ count: count() }).from(users);
      const conditions = [];

      if (role) conditions.push(eq(users.role, role as any));
      if (status) conditions.push(eq(users.status, status as any));
      if (search) {
        conditions.push(
          or(
            ilike(users.fullName, `%${search}%`),
            ilike(users.username, `%${search}%`),
            ilike(users.email, `%${search}%`),
            ilike(users.phone, `%${search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        // @ts-ignore
        query = query.where(and(...conditions));
        // @ts-ignore
        countQuery = countQuery.where(and(...conditions));
      }

      const [totalResult, usersList] = await Promise.all([
        countQuery,
        query.orderBy(desc(users.createdAt)).limit(limit).offset(offset),
      ]);

      const total = Number(totalResult[0]?.count) || 0;
      const safeUsers = usersList.map((u: any) => {
        const { password, ...rest } = u;
        return rest;
      });

      res.setHeader("X-Total-Count", total);
      res.setHeader("X-Page", page);
      res.setHeader("X-Limit", limit);
      res.json(safeUsers);
    } catch (err) {
      console.error("Admin users error:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });


  // Admin - Update user
  app.put("/api/admin/users/:id", async (req, res) => {
    if (!checkIsAdmin(req)) return res.status(403).json({ message: "Unauthorized" });
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });

      const { status, isBanned } = req.body;
      const updates: any = {};
      if (status) {
        if (!["active", "pending", "rejected"].includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }
        updates.status = status;
      }
      if (isBanned !== undefined) updates.isBanned = isBanned;

      const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err) {
      console.error("Admin update user error:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // Admin - Get all bookings (with pagination)
  app.get("/api/admin/bookings", async (req, res) => {
    if (!checkIsAdmin(req)) return res.status(403).json({ message: "Unauthorized" });
    try {
      const { status } = req.query;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const offset = (page - 1) * limit;

      let query: any = db.select().from(bookings);
      let countQuery: any = db.select({ count: count() }).from(bookings);

      if (status) {
        query = query.where(eq(bookings.status, status as any));
        countQuery = countQuery.where(eq(bookings.status, status as any));
      }

      const [totalResult, bookingsList] = await Promise.all([
        countQuery,
        query.orderBy(desc(bookings.createdAt)).limit(limit).offset(offset),
      ]);

      const total = Number(totalResult[0]?.count) || 0;
      res.setHeader("X-Total-Count", total);
      res.setHeader("X-Page", page);
      res.setHeader("X-Limit", limit);
      res.json(bookingsList);
    } catch (err) {
      console.error("Admin bookings error:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });


  // Admin - Get all verification requests with user info
  app.get("/api/admin/verifications", async (req, res) => {
    if (!checkIsAdmin(req)) return res.status(403).json({ message: "Unauthorized" });
    try {
      const requests = await db.select({
        request: verificationRequests,
        user: users,
      })
      .from(verificationRequests)
      .innerJoin(users, eq(verificationRequests.userId, users.id))
      .orderBy(desc(verificationRequests.createdAt));

      res.json(requests);
    } catch (err) {
      console.error("Admin verifications error:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // Admin - Revenue report
  app.get("/api/admin/revenue", async (req, res) => {
    if (!checkIsAdmin(req)) return res.status(403).json({ message: "Unauthorized" });
    try {
      const { period = "monthly" } = req.query;
      const paymentsData = await db.select().from(payments).where(eq(payments.status, "completed")).orderBy(desc(payments.paidAt));
      res.json({ payments: paymentsData, period });
    } catch (err) {
      console.error("Admin revenue error:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.get("/api/providers/:id/badges", async (req, res) => {
    try {
      const { id } = req.params;
      const badges = await db.select().from(providerBadges)
        .where(eq(providerBadges.providerId, parseInt(id)));
      res.json(badges);
    } catch (err) {
      console.error("Error fetching badges:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // Provider Report
  app.get("/api/provider/report", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.role !== "provider") return res.status(403).json({ message: "Only providers" });

    const type = (req.query.type as string) || "summary";
    const format = (req.query.format as string) || "csv";
    const validFormats = ["csv", "xlsx", "pdf"];

    if (!validFormats.includes(format)) {
      return res.status(400).json({ message: "Invalid format. Use: csv, xlsx, pdf" });
    }

    try {
      const stats = await storage.getProviderStats(user.id);
      const allBookings = await storage.getBookingsForUser(user.id);
      const allReviews = await db.select().from(reviews).where(eq(reviews.providerId, user.id));

      const today = new Date().toISOString().split("T")[0];
      const name = user.fullName.replace(/\s+/g, "_");

      let headers: string[];
      let rows: string[][];
      let title: string;

      if (type === "bookings") {
        title = "My Bookings Report";
        headers = ["ID", "Date", "Status", "Price", "Client", "Created At"];
        rows = allBookings.map((b: any) => [
          String(b.id),
          b.date ? new Date(b.date).toISOString() : "",
          b.status,
          String(b.price || 0),
          b.client?.fullName || "Unknown",
          b.createdAt ? new Date(b.createdAt).toISOString() : ""
        ]);
      } else if (type === "reviews") {
        title = "Reviews Report";
        headers = ["ID", "Client", "Rating", "Comment", "Date"];
        rows = (allReviews || []).map((r: any) => [
          String(r.id),
          r.client?.fullName || "Unknown",
          String(r.rating),
          r.comment ? `"${r.comment.replace(/"/g, '""')}"` : "",
          r.createdAt ? new Date(r.createdAt).toISOString() : ""
        ]);
      } else {
        title = "Performance Summary";
        headers = ["Metric", "Value"];
        rows = [
          ["Total Bookings", String(stats.totalBookings || 0)],
          ["Pending Requests", String(stats.pendingRequests || 0)],
          ["Completed", String(allBookings.filter((b: any) => b.status === "completed").length || 0)],
          ["Total Earnings (DH)", String(stats.totalEarnings || 0)],
          ["Average Rating", stats.averageRating ? String(stats.averageRating) : "No ratings"],
          ["Total Reviews", String(allReviews.length)],
        ];
      }

      const dateStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      if (format === "csv") {
        const csvLines = [headers.join(","), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))];
        const csv = csvLines.join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${name}_${type}_${today}.csv"`);
        res.send("\uFEFF" + csv);

      } else if (format === "xlsx") {
        const { default: ExcelJS } = await import("exceljs");
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet(type);

        // Ensure gridlines are visible
        ws.views = [{ showGridLines: true }];

        const borderStyle = {
          top: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
          left: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
          right: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
        };

        // 1. Add Title block
        const lastColLetter = String.fromCharCode(64 + Math.max(2, headers.length));
        ws.mergeCells(`A2:${lastColLetter}2`);
        const titleCell = ws.getCell("A2");
        titleCell.value = title;
        titleCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
        titleCell.alignment = { vertical: "middle" };

        ws.mergeCells(`A3:${lastColLetter}3`);
        const subtitleCell = ws.getCell("A3");
        subtitleCell.value = `Generated: ${new Date().toLocaleString()} | Provider: ${user.fullName}`;
        subtitleCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF64748B" } };
        subtitleCell.alignment = { vertical: "middle" };

        // 2. Table Headers starting at Row 5
        const startRow = 5;
        const headerRow = ws.getRow(startRow);
        headerRow.values = headers;
        headerRow.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        headerRow.fill = {
          type: "pattern" as const,
          pattern: "solid" as const,
          fgColor: { argb: "FF00BCD4" }, // Khidmati teal
        };
        headerRow.alignment = { vertical: "middle", horizontal: "center" };
        headerRow.height = 26;
        headerRow.eachCell((cell: any) => { cell.border = borderStyle; });

        // 3. Add Data Rows
        rows.forEach((rowData, ri) => {
          const row = ws.getRow(startRow + 1 + ri);
          row.values = rowData;
          row.height = 20;
          row.alignment = { vertical: "middle" };

          const bgColor = ri % 2 === 0 ? "FFF8FAFC" : "FFFFFFFF";
          row.eachCell((cell: any) => {
            cell.font = { name: "Segoe UI", size: 10 };
            cell.fill = {
              type: "pattern" as const,
              pattern: "solid" as const,
              fgColor: { argb: bgColor },
            };
            cell.border = borderStyle;
          });
        });

        // 4. Formatting cells by detecting column types
        headers.forEach((h, colIndex) => {
          const colLetter = String.fromCharCode(65 + colIndex);
          const headerText = h.toLowerCase();

          for (let r = startRow + 1; r <= startRow + rows.length; r++) {
            const cell = ws.getCell(`${colLetter}${r}`);
            const val = cell.value;

            if (val !== null && val !== undefined) {
              const valStr = String(val).trim();
              if (headerText.includes("price") || headerText.includes("earning") || headerText.includes("revenue") || headerText.includes("value")) {
                const numericVal = Number(valStr);
                if (!isNaN(numericVal)) {
                  cell.value = numericVal;
                  cell.numFmt = `#,##0.00 "DH"`;
                  cell.alignment = { vertical: "middle", horizontal: "right" };
                }
              } else if (headerText.includes("rating")) {
                const numericVal = Number(valStr);
                if (!isNaN(numericVal)) {
                  cell.value = numericVal;
                  cell.numFmt = "0.0";
                  cell.alignment = { vertical: "middle", horizontal: "center" };
                }
              } else if (headerText.includes("id")) {
                const numericVal = Number(valStr);
                if (!isNaN(numericVal)) {
                  cell.value = numericVal;
                  cell.alignment = { vertical: "middle", horizontal: "center" };
                }
              } else if (headerText.includes("date") || headerText.includes("created") || headerText.includes("updated")) {
                const d = new Date(valStr);
                if (!isNaN(d.getTime())) {
                  cell.value = d;
                  cell.numFmt = "yyyy-mm-dd hh:mm";
                  cell.alignment = { vertical: "middle", horizontal: "center" };
                }
              }
            }
          }
        });

        // 5. Auto-fit column widths
        headers.forEach((h, colIndex) => {
          const column = ws.getColumn(colIndex + 1);
          let maxLength = h.length;

          for (let r = startRow + 1; r <= startRow + rows.length; r++) {
            const cell = ws.getCell(r, colIndex + 1);
            let valStr = "";
            if (cell.value instanceof Date) {
              valStr = cell.value.toISOString().slice(0, 16);
            } else if (cell.value !== null && cell.value !== undefined) {
              valStr = String(cell.value);
            }
            if (valStr.length > maxLength) {
              maxLength = valStr.length;
            }
          }

          column.width = Math.max(12, maxLength + 4);
        });

        if (headers.length > 0) {
          ws.autoFilter = {
            from: { row: startRow, column: 1 },
            to: { row: startRow + rows.length, column: headers.length },
          };
        }

        const buf = await wb.xlsx.writeBuffer() as Buffer;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${name}_${type}_${today}.xlsx"`);
        res.send(buf);

      } else if (format === "pdf") {
        const { default: PDFDocument } = await import("pdfkit");
        const doc = new PDFDocument({ margin: 40, size: "A4", layout: type === "summary" ? "portrait" : "landscape" });
        const pdfBuffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => pdfBuffers.push(chunk));
        doc.on("end", () => {
          const pdf = Buffer.concat(pdfBuffers);
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", `attachment; filename="${name}_${type}_${today}.pdf"`);
          res.send(pdf);
        });

        doc.fontSize(18).font("Helvetica-Bold").text(title, { align: "center" });
        doc.fontSize(9).font("Helvetica").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
        doc.moveDown(1.5);
        doc.fontSize(9).text(`Provider: ${user.fullName}`, { align: "center" });
        doc.moveDown(1);

        const pageWidth = type === "summary" ? 525 : 780;
        const colCount = headers.length;
        const colWidth = Math.max(70, Math.floor(pageWidth / colCount));

        let y2 = doc.y;
        // Headers
        doc.font("Helvetica-Bold").fontSize(7);
        let x2 = 40;
        headers.forEach((h) => {
          doc.rect(x2, y2, colWidth, 16).fill("#2563eb").fill("#ffffff");
          doc.text(h, x2 + 2, y2 + 4, { width: colWidth - 4, align: "left" });
          x2 += colWidth;
        });
        doc.fill("#000000");
        y2 += 16;

        // Rows
        doc.font("Helvetica").fontSize(6);
        rows.forEach((row, ri) => {
          x2 = 40;
          if (y2 > 520) { doc.addPage(); y2 = 40; doc.font("Helvetica-Bold").fontSize(7); x2 = 40; headers.forEach((h) => { doc.rect(x2, y2, colWidth, 14).fill("#2563eb").fill("#ffffff"); doc.text(h, x2 + 2, y2 + 3, { width: colWidth - 4, align: "left" }); x2 += colWidth; }); doc.fill("#000000"); y2 += 14; x2 = 40; doc.font("Helvetica").fontSize(6); }
          if (ri % 2 === 0) doc.rect(x2, y2, colWidth * colCount, 14).fill("#f1f5f9").fill("#000000");
          x2 = 40;
          row.forEach((cell) => { doc.text(cell, x2 + 2, y2 + 3, { width: colWidth - 4, align: "left" }); x2 += colWidth; });
          y2 += 14;
        });

        doc.end();
      }
    } catch (err) {
      console.error("Provider report error:", err);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Client Report
  app.get("/api/client/report", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.role !== "client") return res.status(403).json({ message: "Only clients" });

    const format = (req.query.format as string) || "pdf";
    if (format !== "pdf") return res.status(400).json({ message: "Only PDF format supported" });

    try {
      const allBookings = await storage.getBookingsForUser(user.id);
      const { tickets: ticketsTable } = await import("@shared/schema");
      const ticketsList = await db.select().from(ticketsTable).where(eq(ticketsTable.userId, user.id)).catch(() => []);

      const { default: PDFDocument } = await import("pdfkit");

      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => {
        const pdf = Buffer.concat(buffers);
        const name = user.fullName.replace(/\s+/g, "_");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${name}_report.pdf"`);
        res.send(pdf);
      });

      let y = 50;

      doc.fontSize(22).font("Helvetica-Bold").text("Khidmati — Client Report", 50, y);
      y += 35;
      doc.moveTo(50, y).lineTo(550, y).strokeColor("#e5e7eb").stroke();
      y += 20;

      doc.fontSize(11).font("Helvetica-Bold").text(user.fullName, 50, y);
      y += 16;
      doc.fontSize(9).font("Helvetica");
      if (user.email) { doc.text(`Email: ${user.email}`, 50, y); y += 13; }
      if (user.phone) { doc.text(`Phone: ${user.phone}`, 50, y); y += 13; }
      if (user.city) { doc.text(`City: ${user.city}`, 50, y); y += 13; }
      y += 15;

      // Stats
      doc.moveTo(50, y).lineTo(550, y).strokeColor("#e5e7eb").stroke();
      y += 15;
      doc.fontSize(14).font("Helvetica-Bold").text("Booking Summary", 50, y);
      y += 22;

      const total = allBookings.length;
      const pending = allBookings.filter((b: any) => b.status === "pending").length;
      const confirmed = allBookings.filter((b: any) => b.status === "confirmed").length;
      const completed = allBookings.filter((b: any) => b.status === "completed").length;

      const rows = [
        ["Total Bookings", String(total)],
        ["Pending", String(pending)],
        ["Confirmed", String(confirmed)],
        ["Completed", String(completed)],
        ["Support Tickets", String(ticketsList.length || 0)],
      ];
      for (const [label, value] of rows) {
        doc.fontSize(10).font("Helvetica");
        doc.text(label, 50, y);
        doc.font("Helvetica-Bold");
        doc.text(value, 350, y, { align: "right" });
        y += 18;
      }

      // Recent bookings
      y += 10;
      doc.moveTo(50, y).lineTo(550, y).strokeColor("#e5e7eb").stroke();
      y += 15;
      doc.fontSize(14).font("Helvetica-Bold").text("Recent Bookings", 50, y);
      y += 22;

      const recent = allBookings.slice(-5);
      if (recent.length === 0) {
        doc.fontSize(10).font("Helvetica").text("No bookings yet.", 50, y);
      } else {
        for (const b of recent) {
          doc.fontSize(10).font("Helvetica-Bold");
          doc.text(`#${b.id} — ${b.status}`, 50, y);
          y += 14;
          doc.fontSize(9).font("Helvetica");
          doc.text(`Provider: ${b.provider?.fullName || "N/A"}  |  ${b.date ? new Date(b.date).toLocaleDateString() : "N/A"}`, 50, y);
          if (b.price) doc.text(`Price: ${b.price} DH`, 50, y + 12);
          y += 28;
          if (y > 700) { doc.addPage(); y = 50; }
        }
      }

      doc.end();
    } catch (err) {
      console.error("Client report error:", err);
      res.status(500).json({ message: "Failed to generate report" });
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
    const user = req.user as any;
    const notifId = Number(req.params.id);
    if (isNaN(notifId)) return res.status(400).json({ message: "Invalid notification ID" });

    try {
      const { notifications: notifTable } = await import("@shared/schema");
      const [existing] = await db.select().from(notifTable)
        .where(and(eq(notifTable.id, notifId), eq(notifTable.userId, user.id)));
      
      if (!existing) return res.status(404).json({ message: "Notification not found" });

      const updated = await storage.markNotificationRead(notifId);
      res.json(updated);
    } catch (err) {
      console.error("Error marking notification read:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
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
      const { subject, description, priority } = req.body;
      if (!subject?.trim() || !description?.trim()) {
        return res.status(400).json({ message: "Subject and description are required" });
      }
      if (priority && !["low", "normal", "high"].includes(priority)) {
        return res.status(400).json({ message: "Invalid priority" });
      }

      const ticket = await storage.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        priority: priority || "normal",
        userId: user.id
      });

      try {
        const allUsers = await db.select().from(users);
        const admins = allUsers.filter((u: any) => u.role === "admin");
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "system",
            message: `New support ticket #${ticket.id}: "${ticket.subject}" from ${user.fullName}`,
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
    const ticketId = Number(req.params.id);
    const ticket = await storage.getTicket(ticketId);
    if (!ticket) return res.sendStatus(404);

    // Allow access if owner or admin
    if (ticket.userId !== user.id && user.role !== "admin") {
      return res.sendStatus(403);
    }

    // Mark the ticket as read when its owner opens it
    if (ticket.userId === user.id) {
      await storage.markTicketRead(ticketId);
      const refreshed = await storage.getTicket(ticketId);
      return res.json(refreshed);
    }
    res.json(ticket);
  });

  app.post("/api/tickets/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const ticketId = Number(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ message: "Invalid ticket ID" });

    try {
      // Authorization: only ticket owner or admin can post messages
      const ticket = await storage.getTicket(ticketId);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (ticket.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { content } = req.body;
      if (!content?.trim()) {
        return res.status(400).json({ message: "Content is required" });
      }

      const msg = await storage.createTicketMessage({
        ticketId,
        senderId: user.id,
        content: content.trim()
      });

      // The owner just wrote a reply, so the thread is read up to now
      if (ticket.userId === user.id) {
        await storage.markTicketRead(ticketId);
      }

      // Notify the admins about a new reply from the client
      try {
        const allUsers = await db.select().from(users);
        const admins = allUsers.filter((u: any) => u.role === "admin");
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "new_message",
            message: `New reply on ticket #${ticketId} from ${user.fullName || user.username}`,
            link: `/k-admin-portal-secure/tickets/${ticketId}`,
          });
        }
      } catch (notifErr) {
        console.error("Failed to notify admins:", notifErr);
      }

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


  // Service Categories
  app.get("/api/service-categories", async (_req, res) => {
    try {
      const categories = await db.select().from(serviceCategories).orderBy(serviceCategories.sortOrder);
      res.json(categories);
    } catch (err) {
      console.error("Error fetching categories:", err);
      res.status(500).json({ message: "حدث خطأ في جلب الفئات" });
    }
  });

  // Payment Methods
  app.get("/api/payment-methods", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    try {
      const methods = await db.select().from(paymentMethods)
        .where(eq(paymentMethods.userId, user.id))
        .orderBy(desc(paymentMethods.isDefault));
      res.json(methods);
    } catch (err) {
      console.error("Error fetching payment methods:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/payment-methods", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    try {
      const { type, label, details, isDefault } = req.body;
      if (!type || !["cash_plus", "cmi", "card", "cash"].includes(type)) {
        return res.status(400).json({ message: "Invalid payment method type" });
      }
      const data = { type, label: label || null, details: details || null, isDefault: isDefault || false, userId: user.id };
      const [method] = await db.insert(paymentMethods).values(data).returning();
      res.status(201).json(method);
    } catch (err) {
      console.error("Error saving payment method:", err);
      res.status(500).json({ message: "حدث خطأ في حفظ طريقة الدفع" });
    }
  });

  app.delete("/api/payment-methods/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    try {
      await db.delete(paymentMethods).where(
        and(eq(paymentMethods.id, parseInt(req.params.id)), eq(paymentMethods.userId, user.id))
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting payment method:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
  });

  // Process Payment
  app.post("/api/payments/process", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    try {
      const { bookingId, method, phoneNumber } = req.body;
      
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      if (!booking) return res.status(404).json({ message: "الحجز غير موجود" });
      if (booking.clientId !== user.id) return res.status(403).json({ message: "Unauthorized" });
      
      const amount = booking.price || 0;
      
      if (method === "cash") {
        const [payment] = await db.insert(payments).values({
          bookingId,
          amount,
          method: "cash",
          status: "pending",
        }).returning();
        return res.json({ payment, message: "سيتم الدفع عند التنفيذ" });
      }
      
      if (method === "cash_plus") {
        const [payment] = await db.insert(payments).values({
          bookingId,
          amount,
          method: "cash_plus",
          status: "pending",
          phoneNumber: phoneNumber || "",
          transactionId: "CP-" + Date.now(),
        }).returning();
        return res.json({ 
          payment, 
          message: "تم إرسال رمز الدفع عبر Cash Plus",
          requiresOtp: true,
          otpSent: true
        });
      }
      
      const [payment] = await db.insert(payments).values({
        bookingId,
        amount,
        method,
        status: "completed",
        transactionId: "TXN-" + Date.now(),
        paidAt: new Date(),
      }).returning();
      
      await db.update(bookings).set({ status: "confirmed" }).where(eq(bookings.id, bookingId));
      
      res.json({ payment, message: "تم الدفع بنجاح" });
    } catch (err) {
      console.error("Payment processing error:", err);
      res.status(500).json({ message: "حدث خطأ في معالجة الدفع" });
    }
  });

  // Get payments for a booking
  app.get("/api/payments/booking/:bookingId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const payments_list = await db.select().from(payments)
        .where(eq(payments.bookingId, parseInt(req.params.bookingId)));
      res.json(payments_list);
    } catch (err) {
      console.error("Error fetching payments:", err);
      res.status(500).json({ message: "حدث خطأ" });
    }
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
  // Seed service categories
  const existingCategories = await db.select().from(serviceCategories);
  if (existingCategories.length === 0) {
    const CATEGORIES_SEED = [
      { nameAr: "سباكة", nameFr: "Plomberie", nameEn: "Plumbing", icon: "Droplets", color: "#0ea5e9", basePrice: 200 },
      { nameAr: "كهرباء", nameFr: "Électricité", nameEn: "Electrician", icon: "Zap", color: "#f59e0b", basePrice: 200 },
      { nameAr: "تنظيف", nameFr: "Nettoyage", nameEn: "Cleaning", icon: "Sparkles", color: "#10b981", basePrice: 150 },
      { nameAr: "دهانات", nameFr: "Peinture", nameEn: "Painting", icon: "PaintBucket", color: "#8b5cf6", basePrice: 350 },
      { nameAr: "تكييف", nameFr: "Climatisation", nameEn: "AC & HVAC", icon: "Wind", color: "#06b6d4", basePrice: 300 },
      { nameAr: "تصليح", nameFr: "Réparation", nameEn: "Repairs", icon: "Wrench", color: "#f97316", basePrice: 200 },
      { nameAr: "دروس خصوصية", nameFr: "Tutoring", nameEn: "Tutoring", icon: "BookOpen", color: "#ec4899", basePrice: 100 },
      { nameAr: "نقل عفش", nameFr: "Déménagement", nameEn: "Moving", icon: "Truck", color: "#14b8a6", basePrice: 500 },
      { nameAr: "نجارة", nameFr: "Menuiserie", nameEn: "Carpentry", icon: "Hammer", color: "#a16207", basePrice: 300 },
      { nameAr: "حدادة", nameFr: "Ferronnerie", nameEn: "Metalwork", icon: "Hammer", color: "#78716c", basePrice: 350 },
      { nameAr: "تبليط", nameFr: "Carrelage", nameEn: "Tiling", icon: "Square", color: "#0d9488", basePrice: 300 },
      { nameAr: "جبس", nameFr: "Plâtre", nameEn: "Plastering", icon: "Box", color: "#d4d4d4", basePrice: 250 },
      { nameAr: "حدائق", nameFr: "Jardinage", nameEn: "Gardening", icon: "Flower2", color: "#22c55e", basePrice: 200 },
      { nameAr: "مكافحة حشرات", nameFr: "Anti-nuisibles", nameEn: "Pest Control", icon: "Bug", color: "#dc2626", basePrice: 300 },
      { nameAr: "صيانة", nameFr: "Maintenance", nameEn: "Maintenance", icon: "Settings", color: "#6b7280", basePrice: 200 },
      { nameAr: "أخرى", nameFr: "Autre", nameEn: "Other", icon: "MoreHorizontal", color: "#a3a3a3", basePrice: 200 },
    ];
    await db.insert(serviceCategories).values(CATEGORIES_SEED);
    console.log("✅ Seeded 16 service categories with pricing");
  }

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

  // Seed other data only if there are no non-admin users (clients/providers) in the database
  const allUsers = await storage.getAllUsers();
  const hasDemoData = allUsers.some(u => u.role !== "admin");
  if (!hasDemoData) {
    console.log("Seeding demo data...");

    // Create a Provider
    const provider = await storage.createUser({
      username: "provider1",
      password: "password123",
      fullName: "محمد",
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


