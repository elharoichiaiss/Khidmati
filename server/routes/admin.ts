import { Router } from "express";
import { storage } from "../storage";
import { compare } from "bcryptjs";

export const adminRouter = Router();

// Middleware to check if user is admin
const isAuthenticatedAdmin = (req: any, res: any, next: any) => {
    // Check for both the session flag and a valid admin user ID
    if (req.session && req.session.isAdmin && req.session.adminUserId) {
        next();
    } else {
        res.status(403).json({ message: "Forbidden: Admin Access Required" });
    }
};

// --- Admin Auth ---

adminRouter.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const ADMIN_USER = process.env.ADMIN_USERNAME;
    const ADMIN_PASS = process.env.ADMIN_PASSWORD;

    if (!ADMIN_USER || !ADMIN_PASS) {
        console.error("ADMIN_USERNAME or ADMIN_PASSWORD not set in environment");
        return res.status(500).json({ message: "Admin authentication not configured" });
    }

    // In a real production app, we should use bcrypt for the admin password too,
    // but here we compare against the SECURE environment variable.
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;

        try {
            const allUsers = await storage.getAllUsers();
            let adminDbUser = allUsers.find(u => u.role === "admin") ||
                              allUsers.find(u => u.username === ADMIN_USER);

            if (!adminDbUser) {
                // Auto-create admin user in DB if they don't exist
                adminDbUser = await storage.createUser({
                    username: ADMIN_USER,
                    password: "session-admin-placeholder", // Not used for login
                    role: "admin",
                    fullName: "System Admin",
                    email: null,
                    phone: null,
                } as any);
            }

            req.session.adminUserId = adminDbUser.id;
        } catch (e) {
            console.error("Could not find/create admin DB user:", e);
        }

        // Return sanitized user info (username only for UI)
        return res.json({ 
            message: "Admin login successful", 
            user: { username: ADMIN_USER } 
        });
    }

    res.status(401).json({ message: "Invalid admin credentials" });
});

adminRouter.post("/logout", (req, res) => {
    // DESTROY the session completely for logout security
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ message: "Failed to log out" });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: "Logged out successfully" });
    });
});

adminRouter.get("/me", (req: any, res) => {
    if (req.session.isAdmin) {
        return res.json({ username: process.env.ADMIN_USERNAME || "admin" });
    }
    res.status(401).send("Not authenticated");
});

// --- Admin Data (Protected) ---

adminRouter.get("/stats", isAuthenticatedAdmin, async (req, res) => {
    try {
        const users = await storage.getAllUsers();
        res.json({
            totalUsers: users.length,
            activeProviders: users.filter(u => u.role === 'provider' && !u.isBanned).length,
            totalListings: users.filter(u => u.role === 'provider').length,
            bannedUsers: users.filter(u => u.isBanned).length
        });
    } catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

adminRouter.get("/users", isAuthenticatedAdmin, async (req, res) => {
    try {
        const users = await storage.getAllUsers(); // Already sanitized in storage.ts
        res.json(users);
    } catch (error) {
        console.error("Admin users error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

adminRouter.get("/tickets", isAuthenticatedAdmin, async (req, res) => {
    try {
        const tickets = await storage.getAllTickets(); // Sanitized
        res.json(tickets);
    } catch (error) {
        console.error("Admin tickets error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

adminRouter.get("/tickets/:id", isAuthenticatedAdmin, async (req, res) => {
    try {
        const ticket = await storage.getTicket(Number(req.params.id));
        if (!ticket) return res.sendStatus(404);
        res.json(ticket);
    } catch (error) {
        console.error("Admin ticket error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

adminRouter.post("/tickets/:id/messages", isAuthenticatedAdmin, async (req, res) => {
    try {
        const ticketId = Number(req.params.id);
        const content = req.body.content;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Content is required" });
        }

        const senderId = (req.session as any).adminUserId;
        if (!senderId) return res.status(400).json({ message: "Admin user ID missing" });

        const msg = await storage.createTicketMessage({
            ticketId,
            senderId,
            content: content.trim()
        });
        res.status(201).json(msg);
    } catch (error) {
        console.error("Admin ticket message error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

adminRouter.patch("/tickets/:id/status", isAuthenticatedAdmin, async (req, res) => {
    try {
        const status = req.body.status;
        if (!["open", "closed", "resolved"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const updated = await storage.updateTicketStatus(Number(req.params.id), status as any);
        res.json(updated);
    } catch (error) {
        console.error("Admin ticket status error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

adminRouter.post("/users/:id/ban", isAuthenticatedAdmin, async (req, res) => {
    try {
        const user = await storage.toggleUserBan(Number(req.params.id));
        res.json(user);
    } catch (error) {
        console.error("Admin ban error:", error);
        res.status(500).json({ message: "Failed to ban user" });
    }
});

adminRouter.delete("/users/:id", isAuthenticatedAdmin, async (req, res) => {
    try {
        await storage.deleteUser(Number(req.params.id));
        res.sendStatus(204);
    } catch (error) {
        console.error("Admin user delete error:", error);
        res.status(500).json({ message: "Failed to delete user" });
    }
});
