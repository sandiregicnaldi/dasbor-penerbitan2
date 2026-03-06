import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications,
        },
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: [
        "http://localhost:5173", // Vite dev server
    ],
    user: {
        // This is the KEY fix: tell Better Auth about custom user fields
        // so they are included in session responses
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "personil",
                input: false, // Cannot be set by user during sign-up
            },
            status: {
                type: "string",
                defaultValue: "pending",
                input: false, // Cannot be set by user during sign-up
            },
            avatarInitials: {
                type: "string",
                required: false,
                input: false,
            },
            skills: {
                type: "string[]",
                required: false,
                input: false,
            },
        },
    },
});
