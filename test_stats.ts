import { db } from "./server/db.js";
import { users, bookings, verificationRequests, payments } from "./shared/schema.js";
import { eq, desc, count, sum } from "drizzle-orm";

async function testStats() {
  try {
    console.log("Fetching totalUsers...");
    const totalUsers = await db.select({ count: count() }).from(users);
    console.log("totalUsers:", totalUsers);

    console.log("Fetching totalProviders...");
    const totalProviders = await db.select({ count: count() }).from(users).where(eq(users.role, "provider"));
    console.log("totalProviders:", totalProviders);

    console.log("Fetching totalBookings...");
    const totalBookings = await db.select({ count: count() }).from(bookings);
    console.log("totalBookings:", totalBookings);

    console.log("Fetching pendingVerifications...");
    const pendingVerifications = await db.select({ count: count() }).from(verificationRequests).where(eq(verificationRequests.status, "pending"));
    console.log("pendingVerifications:", pendingVerifications);

    console.log("Fetching totalRevenue...");
    const totalRevenue = await db.select({ total: sum(payments.amount) }).from(payments).where(eq(payments.status, "completed"));
    console.log("totalRevenue:", totalRevenue);

    console.log("Fetching recentUsers...");
    const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(1);
    console.log("recentUsers count:", recentUsers.length);

    console.log("Fetching recentBookings...");
    const recentBookings = await db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(1);
    console.log("recentBookings count:", recentBookings.length);

    console.log("ALL SUCCESS");
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
}

testStats();
