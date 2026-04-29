import clientPromise from "@/app/lib/mongodb";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

const client = await clientPromise;

const db = client.db();

export const auth = betterAuth({
    database: mongodbAdapter(db),
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
        },
    },
});
