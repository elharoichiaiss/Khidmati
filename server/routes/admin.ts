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

adminRouter.post("/login", (req, res) => {
    const { username, password } = req.body;

    // HARDCODED ADMIN CREDENTIALS
    // In a real app, these should be environment variables
    const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || "admin123";

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        return res.json({ message: "Admin login successful", user: { username: "admin" } });
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
        res.status(500).json({ message: "Failed to delete user" });
    }
});
