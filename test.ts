import { db } from './server/db';
import { users, bookings, verificationRequests, payments } from './shared/schema';
import { count, sum, eq, desc } from 'drizzle-orm';
import fs from 'fs';

async function main() {
  try {
    const totalUsers = await db.select({ count: count() }).from(users);
    console.log("totalUsers:", totalUsers);
    
    const totalProviders = await db.select({ count: count() }).from(users).where(eq(users.role, "provider"));
    console.log("totalProviders:", totalProviders);

    const totalBookings = await db.select({ count: count() }).from(bookings);
    console.log("totalBookings:", totalBookings);

    const pendingVerifications = await db.select({ count: count() }).from(verificationRequests).where(eq(verificationRequests.status, "pending"));
    console.log("pendingVerifications:", pendingVerifications);

    const totalRevenue = await db.select({ total: sum(payments.amount) }).from(payments).where(eq(payments.status, "completed"));
    console.log("totalRevenue:", totalRevenue);

    const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(10);
    console.log("recentUsers count:", recentUsers.length);

    const recentBookings = await db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(10);
    console.log("recentBookings count:", recentBookings.length);
  } catch (err: any) {
    console.error("Error:", err);
    fs.writeFileSync('db_error.txt', String(err));
  }
  process.exit(0);
}
main();
