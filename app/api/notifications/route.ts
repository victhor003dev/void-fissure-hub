"use server";
import { auth } from "@/app/lib/auth";
import { authClient } from "@/app/lib/auth-client";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { data: session } = await authClient.getSession({
            fetchOptions: {
                headers: req.headers,
            },
        });

        if (!session || !session.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = (await clientPromise).db();
        const notifications = await db
            .collection("notifications")
            .find({ userId: session.user.id })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

        return Response.json(notifications);
    } catch (error) {
        console.error("NOTIFICATION_GET_ERROR:", error);
        return Response.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}

export async function PATCH(req: Request) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { notificationId, ids } = await req.json();
        const client = await clientPromise;
        const db = client.db();

        if (Array.isArray(ids) && ids.length > 0) {
            const objectIds = ids.map((id: string) => new ObjectId(id));
            await db.collection("notifications").updateMany(
                {
                    _id: { $in: objectIds },
                    userId: session.user.id,
                },
                {
                    $set: {
                        read: true,
                        readAt: new Date(),
                    },
                },
            );
            return NextResponse.json({ success: true, count: ids.length });
        }

        if (notificationId) {
            await db.collection("notifications").updateOne(
                {
                    _id: new ObjectId(notificationId),
                    userId: session.user.id,
                },
                { $set: { read: true } },
            );
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    } catch (error) {
        console.error("Patch Notification Error:", error);
        return NextResponse.json({ error: "Invalid Data" }, { status: 400 });
    }
}
