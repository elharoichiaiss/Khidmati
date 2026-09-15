import { Router } from "express";
import { storage } from "../storage";
import { compare } from "bcryptjs";
import { db } from "../db";
import { bookings as bookingsTable, users as usersTable, invoices as invoicesTable } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { sendPushToUser } from "../push";

export const adminRouter = Router();

const isAuthenticatedAdmin = (req: any, res: any, next: any) => {
    if (req.session && req.session.isAdmin && req.session.adminUserId) {
        next();
    } else {
        res.status(403).json({ message: "Forbidden: Admin Access Required" });
    }
};

adminRouter.post("/login", async (req, res) => {
    const { username: rawUsername, password: rawPassword } = req.body;
    const username = rawUsername?.trim();
    const password = rawPassword?.trim();

    const ADMIN_USER = process.env.ADMIN_USERNAME?.trim();
    const ADMIN_PASS = process.env.ADMIN_PASSWORD?.trim();

    if (!ADMIN_USER || !ADMIN_PASS) {
        return res.status(500).json({ message: "Admin credentials not configured" });
    }

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
        return res.status(401).json({ message: "Invalid admin credentials" });
    }

    try {
        let adminDbUser = await storage.getUserByUsername(ADMIN_USER);

        if (!adminDbUser) {
            adminDbUser = await storage.createUser({
                username: ADMIN_USER,
                password: ADMIN_PASS,
                role: "admin",
                fullName: "System Admin",
                email: null,
                phone: null,
                language: 'ar'
            } as any);
        }

        if (!adminDbUser) {
            return res.status(500).json({ message: "Admin session initialization failed" });
        }

        req.session.isAdmin = true;
        req.session.adminUserId = adminDbUser.id;

        return res.json({ 
            message: "Admin login successful", 
            user: { username: ADMIN_USER } 
        });
    } catch (e) {
        console.error("Admin login error:", e);
        return res.status(500).json({ message: "Admin session initialization failed" });
    }
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

async function fetchSupabaseAuthUsers(): Promise<any[]> {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return [];

    const users: any[] = [];
    const perPage = 200;
    let page = 1;

    while (true) {
        const resp = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=${perPage}&page=${page}`, {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        });
        if (!resp.ok) {
            console.error("Supabase auth users fetch error:", resp.status, await resp.text().catch(() => ""));
            break;
        }
        const data: any = await resp.json();
        const batch: any[] = data?.users || [];
        users.push(...batch);
        if (batch.length < perPage) break;
        page++;
        if (page > 50) break;
    }
    return users;
}

function formatSupabaseAuthUser(u: any) {
    const meta = u.user_metadata || {};
    return {
        id: u.id,
        username: meta.username || (u.email || "").split("@")[0] || "user",
        fullName: meta.fullName || meta.full_name || meta.name || u.email || "مستخدم",
        email: u.email || meta.email || null,
        phone: meta.phone || "",
        role: meta.role || "client",
        status: meta.status || "active",
        avatar: meta.avatar_url || meta.picture || "",
        city: meta.city || "",
        createdAt: u.created_at || new Date().toISOString(),
        isBanned: Boolean(u.banned_until || meta.is_banned),
        source: "supabase-auth",
    };
}

adminRouter.get("/stats", isAuthenticatedAdmin, async (req, res) => {
    try {
        const users = await storage.getAllUsers();
        let supabaseCount = 0;
        try {
            supabaseCount = (await fetchSupabaseAuthUsers()).length;
        } catch (e) {
            console.error("Admin stats supabase count error:", e);
        }
        res.json({
            totalUsers: users.length + supabaseCount,
            activeProviders: users.filter(u => u.role === 'provider' && !u.isBanned).length,
            totalListings: users.filter(u => u.role === 'provider').length,
            bannedUsers: users.filter(u => u.isBanned).length
        });
    } catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

adminRouter.get("/auth-users", isAuthenticatedAdmin, async (req, res) => {
    try {
        const authUsers = await fetchSupabaseAuthUsers();
        res.json(authUsers.map(formatSupabaseAuthUser));
    } catch (error) {
        console.error("Admin supabase auth users error:", error);
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

        const ticket = await storage.getTicket(ticketId);
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });

        const msg = await storage.createTicketMessage({
            ticketId,
            senderId,
            content: content.trim()
        });

        // Notify the ticket owner about the admin reply + push if subscribed
        if (ticket.userId) {
            try {
                const message = `New reply on your ticket #${ticketId}: "${ticket.subject}"`;
                await storage.createNotification({
                    userId: ticket.userId,
                    type: "new_message",
                    message,
                    link: `/support/${ticketId}`,
                });
                try {
                    await sendPushToUser(ticket.userId, "Support Ticket Reply", message, `/support/${ticketId}`);
                } catch (pushErr) {
                    // Push may fail silently
                }
            } catch (notifErr) {
                console.error("Failed to notify ticket owner:", notifErr);
            }
        }

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
        const userId = Number(req.params.id);
        const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";

        if (!reason) {
            return res.status(400).json({ message: "Reason is required" });
        }

        const target = await storage.getUser(userId);
        if (!target) {
            return res.status(404).json({ message: "User not found" });
        }

        // Record the deletion + admin reason so the user can be informed at login
        await storage.recordAccountDeletion({
            username: target.username,
            email: target.email,
            fullName: target.fullName,
            reason,
            deletedBy: (req.user as any)?.id ?? null,
        });

        await storage.deleteUser(userId);
        res.sendStatus(204);
    } catch (error) {
        console.error("Admin user delete error:", error);
        res.status(500).json({ message: "Failed to delete user" });
    }
});

// --- Broadcast Notification ---

adminRouter.post("/broadcast", isAuthenticatedAdmin, async (req, res) => {
    try {
        const { title, message } = req.body;
        if (!title?.trim() || !message?.trim()) {
            return res.status(400).json({ message: "Title and message are required" });
        }

        const allUsers = await storage.getAllUsers();
        let sentCount = 0;

        for (const user of allUsers) {
            try {
                await storage.createNotification({
                    userId: user.id,
                    type: "system",
                    message: `${title}: ${message}`,
                    link: "/notifications",
                });
                sentCount++;
                try {
                    await sendPushToUser(user.id, title, message, "/notifications");
                } catch (pushErr) {
                    // Push may fail silently
                }
            } catch (notifErr) {
                console.error(`Failed to notify user ${user.id}:`, notifErr);
            }
        }

        console.log(`Broadcast sent to ${sentCount}/${allUsers.length} users`);
        res.json({ message: `Notification sent to ${sentCount} users`, sentCount, totalUsers: allUsers.length });
    } catch (error) {
        console.error("Broadcast error:", error);
        res.status(500).json({ message: "Failed to send broadcast" });
    }
});

// --- Bookings Overview ---

adminRouter.get("/bookings", isAuthenticatedAdmin, async (req, res) => {
    try {
        const allBookings = await db.select({
            id: bookingsTable.id,
            date: bookingsTable.date,
            status: bookingsTable.status,
            price: bookingsTable.price,
            description: bookingsTable.description,
            createdAt: bookingsTable.createdAt,
            clientId: bookingsTable.clientId,
            providerId: bookingsTable.providerId,
        }).from(bookingsTable)
            .orderBy(desc(bookingsTable.createdAt));

        const enriched = [];
        for (const b of allBookings) {
            const [client] = await db.select().from(usersTable).where(eq(usersTable.id, b.clientId));
            const [provider] = await db.select().from(usersTable).where(eq(usersTable.id, b.providerId));
            enriched.push({
                ...b,
                clientName: client?.fullName || "Unknown",
                providerName: provider?.fullName || "Unknown",
            });
        }

        res.json(enriched);
    } catch (error) {
        console.error("Admin bookings error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// --- Invoices Overview ---

adminRouter.get("/invoices", isAuthenticatedAdmin, async (req, res) => {
    try {
        const allInvoices = await db.select({
            id: invoicesTable.id,
            clientName: invoicesTable.clientName,
            providerId: invoicesTable.providerId,
            serviceType: invoicesTable.serviceType,
            description: invoicesTable.description,
            agreedPrice: invoicesTable.agreedPrice,
            status: invoicesTable.status,
            createdAt: invoicesTable.createdAt,
            updatedAt: invoicesTable.updatedAt,
        }).from(invoicesTable)
            .orderBy(desc(invoicesTable.createdAt));

        const enriched = [];
        for (const inv of allInvoices) {
            const [provider] = await db.select().from(usersTable).where(eq(usersTable.id, inv.providerId));
            enriched.push({
                ...inv,
                providerName: provider?.fullName || "Unknown",
            });
        }

        res.json(enriched);
    } catch (error) {
        console.error("Admin invoices error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// --- Env Info (for Settings page) ---

adminRouter.get("/env", isAuthenticatedAdmin, async (req, res) => {
    const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
    const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || "";
    const NODE_ENV = process.env.NODE_ENV || "development";
    res.json({
        adminUsername: ADMIN_USER,
        adminWhatsapp: ADMIN_WHATSAPP,
        nodeEnv: NODE_ENV,
        vapidConfigured: !!process.env.VAPID_PUBLIC_KEY,
        googleOAuthConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    });
});

// --- Pending Providers ---

adminRouter.get("/pending-providers", isAuthenticatedAdmin, async (req, res) => {
    try {
        const allUsers = await storage.getAllUsers();
        const pendingProviders = allUsers.filter(u => u.role === "provider" && u.status === "pending");
        res.json(pendingProviders);
    } catch (error) {
        console.error("Pending providers error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

adminRouter.post("/providers/:id/activate", isAuthenticatedAdmin, async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const updated = await storage.updateUserStatus(userId, "active");
        res.json(updated);
    } catch (error) {
        console.error("Activate provider error:", error);
        res.status(500).json({ message: "Failed to activate provider" });
    }
});

// --- Reports Export ---

function toCSV(headers: string[], rows: string[][]): string {
    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    return [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
}

interface ReportData { headers: string[]; rows: string[][]; title: string; }
function dateStr(d: Date) { return d.toISOString().slice(0, 10); }

async function getReportData(type: string): Promise<ReportData> {
    if (type === "users") {
        const allUsers = await storage.getAllUsers();
        return {
            title: "Users Report",
            headers: ["ID", "Username", "Full Name", "Role", "Email", "Phone", "City", "Language", "Banned", "Created At"],
            rows: allUsers.map(u => [
                String(u.id), u.username, u.fullName, u.role,
                u.email || "", u.phone || "", u.city || "",
                u.language || "", String(u.isBanned || false),
                u.createdAt ? new Date(u.createdAt).toISOString() : ""
            ])
        };
    } else if (type === "bookings") {
        const allBookings = await db.select({
            id: bookingsTable.id, date: bookingsTable.date, status: bookingsTable.status,
            price: bookingsTable.price, description: bookingsTable.description,
            createdAt: bookingsTable.createdAt, clientId: bookingsTable.clientId,
            providerId: bookingsTable.providerId,
        }).from(bookingsTable).orderBy(desc(bookingsTable.createdAt));

        const rows: string[][] = [];
        for (const b of allBookings) {
            const [c] = await db.select().from(usersTable).where(eq(usersTable.id, b.clientId));
            const [p] = await db.select().from(usersTable).where(eq(usersTable.id, b.providerId));
            rows.push([
                String(b.id), b.date ? new Date(b.date).toISOString() : "", b.status,
                String(b.price || 0), b.description || "",
                c?.fullName || "Unknown", p?.fullName || "Unknown",
                b.createdAt ? new Date(b.createdAt).toISOString() : ""
            ]);
        }
        return {
            title: "Bookings Report",
            headers: ["ID", "Date", "Status", "Price", "Description", "Client", "Provider", "Created At"],
            rows,
        };
    } else if (type === "tickets") {
        const allTickets = await storage.getAllTickets();
        return {
            title: "Tickets Report",
            headers: ["ID", "Subject", "Description", "Status", "Priority", "User", "Created At", "Updated At"],
            rows: allTickets.map((t: any) => [
                String(t.id), t.subject, t.description,
                t.status, t.priority,
                t.user?.fullName || t.user?.username || "Unknown",
                t.createdAt ? new Date(t.createdAt).toISOString() : "",
                t.updatedAt ? new Date(t.updatedAt).toISOString() : ""
            ])
        };
    } else if (type === "summary") {
        const allUsers = await storage.getAllUsers();
        const allTickets = await storage.getAllTickets();
        const allBookingsRaw = await db.select().from(bookingsTable);

        const totalUsers = allUsers.length;
        const providers = allUsers.filter(u => u.role === "provider").length;
        const clients = allUsers.filter(u => u.role === "client").length;
        const banned = allUsers.filter(u => u.isBanned).length;
        const openTickets = allTickets.filter((t: any) => t.status === "open").length;
        const resolvedTickets = allTickets.filter((t: any) => t.status === "resolved").length;
        const totalBookings = allBookingsRaw.length;
        const completed = allBookingsRaw.filter(b => b.status === "completed").length;
        const revenue = allBookingsRaw.filter(b => b.status === "completed").reduce((s, b) => s + (b.price || 0), 0);
        const now = new Date().toISOString();

        return {
            title: "Summary Report",
            headers: ["Metric", "Value", "Generated At"],
            rows: [
                ["Total Users", String(totalUsers), now],
                ["Providers", String(providers), now],
                ["Clients", String(clients), now],
                ["Banned Users", String(banned), now],
                ["Open Tickets", String(openTickets), now],
                ["Resolved Tickets", String(resolvedTickets), now],
                ["Total Bookings", String(totalBookings), now],
                ["Completed Bookings", String(completed), now],
                ["Total Revenue (DH)", String(revenue), now],
            ]
        };
    }
    throw new Error("Invalid report type");
}

adminRouter.get("/reports/:type", isAuthenticatedAdmin, async (req, res) => {
    try {
        const type = req.params.type;
        const format = (req.query.format as string) || "csv";
        const validTypes = ["users", "bookings", "tickets", "summary"];
        const validFormats = ["csv", "xlsx", "pdf"];

        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: "Invalid report type. Use: users, bookings, tickets, summary" });
        }
        if (!validFormats.includes(format)) {
            return res.status(400).json({ message: "Invalid format. Use: csv, xlsx, pdf" });
        }

        const data = await getReportData(type);
        const today = dateStr(new Date());

        if (format === "csv") {
            const csv = toCSV(data.headers, data.rows);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="khidmati_${type}_${today}.csv"`);
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
            const lastColLetter = String.fromCharCode(64 + Math.max(2, data.headers.length));
            ws.mergeCells(`A2:${lastColLetter}2`);
            const titleCell = ws.getCell("A2");
            titleCell.value = data.title;
            titleCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
            titleCell.alignment = { vertical: "middle" };

            ws.mergeCells(`A3:${lastColLetter}3`);
            const subtitleCell = ws.getCell("A3");
            subtitleCell.value = `Generated: ${new Date().toLocaleString()} | Administrator: System Admin`;
            subtitleCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF64748B" } };
            subtitleCell.alignment = { vertical: "middle" };

            // 2. Table Headers starting at Row 5
            const startRow = 5;
            const headerRow = ws.getRow(startRow);
            headerRow.values = data.headers;
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
            data.rows.forEach((rowData, ri) => {
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
            data.headers.forEach((h, colIndex) => {
                const colLetter = String.fromCharCode(65 + colIndex);
                const headerText = h.toLowerCase();

                for (let r = startRow + 1; r <= startRow + data.rows.length; r++) {
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
            data.headers.forEach((h, colIndex) => {
                const column = ws.getColumn(colIndex + 1);
                let maxLength = h.length;

                for (let r = startRow + 1; r <= startRow + data.rows.length; r++) {
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

            if (data.headers.length > 0) {
                ws.autoFilter = {
                    from: { row: startRow, column: 1 },
                    to: { row: startRow + data.rows.length, column: data.headers.length },
                };
            }

            const buf = await wb.xlsx.writeBuffer() as Buffer;
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="khidmati_${type}_${today}.xlsx"`);
            res.send(buf);

        } else if (format === "pdf") {
            const { default: PDFDocument } = await import("pdfkit");
            const doc = new PDFDocument({ margin: 40, size: "A4", layout: type === "summary" ? "portrait" : "landscape" });
            const buffers: Buffer[] = [];
            doc.on("data", (chunk: Buffer) => buffers.push(chunk));
            doc.on("end", () => {
                const pdf = Buffer.concat(buffers);
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader("Content-Disposition", `attachment; filename="khidmati_${type}_${today}.pdf"`);
                res.send(pdf);
            });

            doc.fontSize(18).font("Helvetica-Bold").text(data.title, { align: "center" });
            doc.fontSize(9).font("Helvetica").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
            doc.moveDown(1);

            const pageWidth = type === "summary" ? 525 : 780;
            const colCount = data.headers.length;
            const colWidth = Math.max(60, Math.floor(pageWidth / colCount));

            // Headers
            doc.font("Helvetica-Bold").fontSize(7);
            let y = doc.y;
            let x = 40;
            data.headers.forEach((h) => {
                doc.rect(x, y, colWidth, 16).fill("#2563eb").fill("#ffffff");
                doc.text(h, x + 2, y + 4, { width: colWidth - 4, align: "left" });
                x += colWidth;
            });
            doc.fill("#000000");
            y += 16;

            // Rows
            doc.font("Helvetica").fontSize(6);
            data.rows.forEach((row, ri) => {
                x = 40;
                if (y > 520) {
                    doc.addPage();
                    y = 40;
                    doc.font("Helvetica-Bold").fontSize(7);
                    x = 40;
                    data.headers.forEach((h) => {
                        doc.rect(x, y, colWidth, 14).fill("#2563eb").fill("#ffffff");
                        doc.text(h, x + 2, y + 3, { width: colWidth - 4, align: "left" });
                        x += colWidth;
                    });
                    doc.fill("#000000");
                    y += 14;
                    x = 40;
                    doc.font("Helvetica").fontSize(6);
                }
                if (ri % 2 === 0) {
                    doc.rect(x, y, colWidth * colCount, 14).fill("#f1f5f9").fill("#000000");
                }
                x = 40;
                row.forEach((cell) => {
                    doc.text(cell, x + 2, y + 3, { width: colWidth - 4, align: "left" });
                    x += colWidth;
                });
                y += 14;
            });

            doc.end();
        }
    } catch (error) {
        console.error("Report error:", error);
        res.status(500).json({ message: "Failed to generate report" });
    }
});
