
import { db } from "./server/db";
import { messages } from "./shared/schema";
import { desc } from "drizzle-orm";

async function checkMessages() {
    console.log("Checking last 5 messages...");
    try {
        const lastMessages = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(5);
        console.log(JSON.stringify(lastMessages, null, 2));
    } catch (error) {
        console.error("Error fetching messages:", error);
    }
    process.exit(0);
}

checkMessages();
