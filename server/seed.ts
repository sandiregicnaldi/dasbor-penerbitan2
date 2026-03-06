
import { db } from "./src/db";
import { users, accounts } from "./src/db/schema";
import { auth } from "./src/auth";
import { eq } from "drizzle-orm";

async function main() {
    console.log("🌱 Seeding database...");

    const email = "admin@penerbitan.com";
    const password = "password123";
    const name = "Admin Penerbitan";

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
        where: (table, { eq }) => eq(table.email, email)
    });

    if (existingUser) {
        console.log("⚠️ Admin user already exists.");
        process.exit(0);
    }

    // Create user via Better Auth logic or direct DB insert
    // Better auth hashes passwords, so using its API is better if possible.
    // However, since we are in a script, we might not have the full server context easily.
    // simpler: use better-auth's api if exposed or insert directly if we can hash.
    // Better Auth doesn't expose a simple "hash" function publicly in entry.
    // So we will use the `auth.api.signUp` if we can mock the request or just use internal.

    // Actually, Better Auth has a valid API to call.
    // But since this is a seed script running in Node, we can use the `auth` instance.

    try {
        const user = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
            }
        });

        // Update role to admin manually
        if (user) {
            // drizzle-orm update query needs explicit `eq` import or usage
            // But here we can use the `db.update` syntax correctly
            await db.update(users)
                .set({ role: 'admin', skills: ['Admin', 'QC'] })
                .where(eq(users.email, email));

            console.log("✅ Admin user created:");
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${password}`);
        }
    } catch (e) {
        console.error("Failed to seed admin:", e);
    }

    process.exit(0);
}

main();
