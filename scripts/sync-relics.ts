import dotenv from "dotenv";
import path from "path";

// 1. Load the environment variables FIRST
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// 2. NOW import the sync function (which depends on the env vars)
// Using a dynamic import to ensure the env vars are in memory first
async function main() {
    if (!process.env.MONGODB_URI) {
        console.error("❌ MONGODB_URI is not defined in .env.local");
        process.exit(1);
    }

    // Import dynamically
    const { syncRelics } = await import("../app/lib/warframe/syncRelics");

    console.log("🚀 Starting Warframe Relic synchronization...");

    try {
        const result = await syncRelics();
        console.log("✅ Sync complete!");
        console.table(result);
    } catch (error) {
        console.error("❌ Sync failed:");
        console.error(error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

main();
