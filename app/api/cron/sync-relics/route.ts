"use server";

import { syncRelics } from "@/app/lib/warframe/syncRelics";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const cronKey = searchParams.get("key");

        if (!cronKey || cronKey !== process.env.CRON_SECRET_KEY) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await syncRelics();

        return NextResponse.json({
            success: true,
            message: "Warframe relics database synchronized successfully.",
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
