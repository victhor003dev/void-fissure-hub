export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { initAgenda } = await import("@/app/lib/agenda");

        try {
            await initAgenda();
            console.log("🚀 Agenda worker initialized successfully");
        } catch (error) {
            console.error("❌ Agenda failed to start:", error);
        }
    }
}
