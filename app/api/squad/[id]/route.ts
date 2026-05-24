"use server";
import { auth } from "@/app/lib/auth";
import { headers } from "next/headers";
import clientPromise from "@/app/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

interface MongoParticipant {
    userId: string;
    accountName: string;
    platform?: string;
}

interface MongoSquad {
    _id: ObjectId;
    relicName?: string;
    targetRelic: string;
    relicEra: string;
    refinement: string;
    ownerId: string;
    members: MongoParticipant[];
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
        return NextResponse.json(
            { error: "Invalid ID format" },
            { status: 400 },
        );
    }
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const client = await clientPromise;
        const db = client.db();

        const squad = await db
            .collection<MongoSquad>("squads")
            .findOne({ _id: new ObjectId(id) });

        if (!squad)
            return NextResponse.json({ error: "Not found" }, { status: 404 });

        const isMember = squad.members.some(
            (m) => m.userId === session.user.id,
        );

        const fallbackName =
            squad.targetRelic
                .split("/")
                .pop()
                ?.replace("T3VoidProjection", "") || "Unknown Relic";

        const baseData = {
            id: squad._id.toString(),
            relicName: squad.relicName || fallbackName,
            relicEra: squad.relicEra,
            refinement: squad.refinement,
            ownerId: squad.ownerId,
            isMember,
        };

        if (!isMember) return NextResponse.json(baseData);

        return NextResponse.json({
            ...baseData,
            participants: squad.members.map((m) => ({
                id: m.userId,
                name: m.accountName,
                platform: m.platform || "pc",
                isLeader: m.userId === squad.ownerId,
            })),
        });
    } catch (error) {
        console.error("Fetch Squad Details Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
