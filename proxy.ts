// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { getRateLimiters } from "@/app/lib/rate-limiter";

// 1. Initialize the next-intl handler
const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith("/api/") || pathname.includes("/settings/")) {
        try {
            const { readLimiter } = await getRateLimiters();

            if (readLimiter) {
                const ip =
                    request.headers.get("x-forwarded-for")?.split(",")[0] ??
                    "127.0.0.1";
                const trackingKey = `read_traffic:${ip}`;
                await readLimiter.consume(trackingKey);
            }
        } catch (error) {
            return new NextResponse(
                JSON.stringify({ error: "Too Many Requests" }),
                {
                    status: 429,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        // If the API request is under the limit, proceed normally
        return NextResponse.next();
    }

    // 3. Fallback to standard next-intl handling for pages/layouts
    return handleI18nRouting(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next (internal framework styles/scripts)
         * - _vercel (internal platform tracking)
         * - Static assets with extensions (e.g., favicon.ico, images)
         */
        "/((?!_next|_vercel|.*\\..*).*)",
    ],
};
