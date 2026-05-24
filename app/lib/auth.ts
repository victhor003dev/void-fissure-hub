import clientPromise from "@/app/lib/mongodb";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { getTranslations } from "next-intl/server";

const client = await clientPromise;
const db = client.db();

export const auth = betterAuth({
    database: mongodbAdapter(db),
    baseURL: process.env.BETTER_AUTH_URL,
    user: {
        deleteUser: {
            enabled: true,
        },
    },

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
    },
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path === "/sign-up/email") {
                const { password } = ctx.body;
                const complexityRegex =
                    /(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/;

                if (!complexityRegex.test(password)) {
                    const t = await getTranslations("auth.api");

                    throw new APIError("BAD_REQUEST", {
                        message: t("weakPassword"),
                    });
                }
            }
        }),
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
