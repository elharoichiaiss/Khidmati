import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?\n" +
    "Expected format: postgresql://user:password@localhost:5432/dbname"
  );
}

// Validate URL format
let dbHost = "unknown";
try {
  dbHost = new URL(process.env.DATABASE_URL).hostname;
} catch {
  throw new Error("DATABASE_URL is not a valid URL. Check your .env file.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" 
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" } 
    : false,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test connection on startup
pool.on("connect", () => {
  console.log("✅ Database connected successfully to:", dbHost);
});

pool.on("error", (err) => {
  console.error("❌ Database pool error:", err.message);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await pool.end();
  console.log("Database pool closed.");
  process.exit(0);
});

console.log("🗄️  DB Pool initialized — Host:", dbHost);
export const db = drizzle(pool, { schema });
