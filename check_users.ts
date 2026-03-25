
import { db } from "./server/db";
import { users } from "./shared/schema";

async function checkUsers() {
    console.log("Checking users...");
    try {
        const userList = await db.select().from(users).limit(5);
        console.log("Users found:", userList.length);
        if (userList.length > 0) {
            console.log("First user:", userList[0].username);
        }
    } catch (error) {
        console.error("Error fetching users:", error);
    }
    process.exit(0);
}

checkUsers();
