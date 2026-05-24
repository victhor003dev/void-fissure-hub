"use server";
import { auth } from "@/app/lib/auth";
import { headers } from "next/headers";
import clientPromise from "@/app/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return NextResponse.json({ accounts: [] }, { status: 401 });
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const queryId = ObjectId.isValid(session.user.id)
            ? new ObjectId(session.user.id)
            : session.user.id;

        const user = await db
            .collection("user")
            .findOne(
                { _id: queryId as unknown as ObjectId },
                { projection: { warframeAccounts: 1 } },
            );

        return NextResponse.json({
            accounts: user?.warframeAccounts || [],
        });
    } catch (error) {
        console.error("Fetch Accounts Error:", error);
        return NextResponse.json({ accounts: [] }, { status: 500 });
    }
}
