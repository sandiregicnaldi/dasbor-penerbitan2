
import { auth } from "./src/auth";
import { db } from "./src/db";
import { users } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("🔍 Debugging Auth...");

    const email = "admin@penerbitan.com";
    const password = "password123";

    try {
        console.log(`Attempting to sign in with ${email}...`);

        // better-auth doesn't expose a server-side "signIn" that returns a session token easily via the main `auth` object 
        // in the way valid for a script without a request object usually, 
        // but `auth.api.signInEmail` can be used 
        // However, better-auth v1 might require a request context or mock it.
        // Let's try sending a mock request if needed, or use the internal API.

        // Actually modern better-auth has `auth.api.signInEmail` which takes `body`.

        const response = await auth.api.signInEmail({
            body: {
                email,
                password
            },
            asResponse: false // We want the data
        });

        console.log("✅ Sign in successful!");
        console.log("Response:", JSON.stringify(response, null, 2));

    } catch (e) {
        console.error("❌ Sign in failed!");
        console.error(e);

        if (e instanceof Error) {
            console.error("Message:", e.message);
            console.error("Stack:", e.stack);
        }
    }

    try {
        console.log("Checking user in DB...");
        const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, email)
        });
        console.log("User found:", user ? "YES" : "NO");
        if (user) console.log(user);
    } catch (e) {
        console.error("DB Read Error:", e);
    }

    process.exit(0);
}

main();
