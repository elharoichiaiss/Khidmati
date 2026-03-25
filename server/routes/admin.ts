import { Router } from "express";
import { storage } from "../storage";

export const adminRouter = Router();

// Middleware to check if user is admin
const isAuthenticatedAdmin = (req: any, res: any, next: any) => {
    // Explicitly casting req to any to access session, though extending Request type is better practice
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: "Forbidden: Admin Access Required" });
    }
};

// --- Admin Auth ---

adminRouter.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || "admin123";

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;

        // Find or create a DB user record for the admin so we can use their ID as senderId
        try {
            const allUsers = await storage.getAllUsers();
            let adminDbUser = allUsers.find(u => u.role === "admin") ||
                              allUsers.find(u => u.username === ADMIN_USER);

            if (!adminDbUser) {
                // Create admin user in DB if they don't exist
                adminDbUser = await storage.createUser({
                    username: ADMIN_USER,
                    password: "session-admin", // Won't be used for login, session handles auth
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

        return res.json({ message: "Admin login successful", user: { username: ADMIN_USER } });
    }

    res.status(401).json({ message: "Invalid admin credentials" });
});

adminRouter.post("/logout", (req, res) => {
    req.session.isAdmin = false;
    res.json({ message: "Logged out successfully" });
});

adminRouter.get("/me", (req, res) => {
    if (req.session.isAdmin) {
        return res.json({ username: "admin" });
    }
    res.status(401).send("Not authenticated");
});

// --- Admin Data (Protected) ---

adminRouter.get("/stats", isAuthenticatedAdmin, async (req, res) => {
    try {
        const users = await storage.getAllUsers();

        // KPI Calculations
        const totalUsers = users.length;
        const providers = users.filter(u => u.role === 'provider').length;
        // Assuming "Listings" correlates to Provider Profiles (active providers)
        // We can filter additionally if 'Active' means something specific like `!isBanned`
        const activeProviders = users.filter(u => u.role === 'provider' && !u.isBanned).length;

        // Total Listings: In this context, likely refers to total providers or posts. 
        // Since we don't have a "listings" table, we'll use provider count or similar.
        // Let's return stats object

        res.json({
            totalUsers,
            activeProviders,
            totalListings: providers, // Using total providers as listings for now
            bannedUsers: users.filter(u => u.isBanned).length
        });
    } catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

adminRouter.get("/users", isAuthenticatedAdmin, async (req, res) => {
    try {
        const users = await storage.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error("Admin users error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

adminRouter.get("/tickets", isAuthenticatedAdmin, async (req, res) => {
    try {
        const tickets = await storage.getAllTickets();
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

        // Use the admin's DB user ID stored in the session (set at login)
        let senderId: number | undefined = (req.session as any).adminUserId;

        // Fallback: find or auto-create the admin DB user
        if (!senderId) {
            const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
            const allUsers = await storage.getAllUsers();
            let adminDbUser = allUsers.find(u => u.role === "admin") ||
                              allUsers.find(u => u.username === ADMIN_USER);

            if (!adminDbUser) {
                // Auto-create admin user in DB (role ensures messages show as "Support Team")
                adminDbUser = await storage.createUser({
                    username: ADMIN_USER,
                    password: "session-admin-placeholder",
                    role: "admin",
                    fullName: "Support Team",
                    email: null,
                    phone: null,
                } as any);
                console.log("[Admin] Auto-created admin DB user with ID:", adminDbUser.id);
            }

            senderId = adminDbUser.id;
            // Cache in session for future requests
            (req.session as any).adminUserId = senderId;
        }

        const msg = await storage.createTicketMessage({
            ticketId,
            senderId,
            content: content.trim()
        });
        res.status(201).json(msg);
    } catch (error) {
        console.error("Admin ticket message error:", error);
        res.status(500).json({ message: "Server error", detail: String(error) });
    }
});

adminRouter.patch("/tickets/:id/status", isAuthenticatedAdmin, async (req, res) => {
    try {
        const updated = await storage.updateTicketStatus(Number(req.params.id), req.body.status);
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
        const userId = Number(req.params.id);
        console.log(`[Admin] Attempting to delete user: ${userId}`);
        await storage.deleteUser(userId);
        res.sendStatus(204);
    } catch (error) {
        console.error("Admin user delete error:", error);
        res.status(500).json({ message: "Failed to delete user" });
    }
});
