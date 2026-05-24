import clientPromise from "@/app/lib/mongodb";
import { RateLimiterMongo } from "rate-limiter-flexible";

interface Limiters {
    mutationLimiter: RateLimiterMongo | null;
    readLimiter: RateLimiterMongo | null;
}

const instances: Limiters = {
    mutationLimiter: null,
    readLimiter: null,
};

/**
 * Initializes and returns the rate limiters using existing MongoDB connection
 */
export async function getRateLimiters() {
    // If already initialized, return the cached instances immediately
    if (instances.mutationLimiter && instances.readLimiter) {
        return instances;
    }

    const client = await clientPromise;
    const db = client.db();

    // 1. Strict Limiter for Writes / Server Actions (Mutations)
    if (!instances.mutationLimiter) {
        instances.mutationLimiter = new RateLimiterMongo({
            storeClient: db,
            tableName: "rateLimits_mutations",
            points: 5,
            duration: 60,
            blockDuration: 60,
        });
    }

    // 2. High-Capacity Global Limiter for Reads (GET Routes / Middleware)
    if (!instances.readLimiter) {
        instances.readLimiter = new RateLimiterMongo({
            storeClient: db,
            tableName: "rateLimits_global_reads",
            points: 60,
            duration: 60,
            inMemoryBlockOnConsumed: 60,
            inMemoryBlockDuration: 300,
        });
    }

    return instances;
}
