"use server";

import clientPromise from "@/app/lib/mongodb";
import { auth } from "@/app/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { getRateLimiters } from "@/app/lib/rate-limiter";
import {
    createNotification,
    createBulkNotifications,
} from "@/app/lib/notifications";

const ALLOWED_PLATFORMS = ["pc", "xbox", "psn", "switch", "ios", "android"];
const MAX_MEMBERS = 4;

export interface SquadMember {
    userId: string;
    accountName: string;
    platform: string;
    joinedAt: Date;
}

export interface SquadDocument {
    _id: ObjectId;
    ownerId: string;
    members: SquadMember[];
    maxTenno: number;
    relicEra: string;
    refinement: string;
    status: string;
    targetRelic: ObjectId | string;
    executionDate: Date;
    createdAt: Date;
}

interface AggregatedSquad extends SquadDocument {
    relicDetails: {
        i18n: Record<string, { displayName: string }>;
    };
}

// ============================================================================
// INTERNAL CORE ENGINE FUNCTIONS (Safe for internal cascades & multi-accounting)
// ============================================================================

/**
 * Low-level engine execution to systematically drop a hosted squad and dispatch notifications.
 * Decoupled from user session contexts so it can run during batch cascades or account purges.
 */
export async function executeDisband(
    squadId: ObjectId,
    ownerId: string,
    hostAccountName: string,
): Promise<boolean> {
    const client = await clientPromise;
    const db = client.db();

    const squad = await db
        .collection("squads")
        .aggregate<AggregatedSquad>([
            { $match: { _id: squadId, ownerId } },
            {
                $lookup: {
                    from: "relics",
                    localField: "targetRelic",
                    foreignField: "uniqueId",
                    as: "relicDetails",
                },
            },
            { $unwind: "$relicDetails" },
        ])
        .next();

    if (!squad) return false;

    const memberIds = squad.members
        .filter((m) => m.userId !== ownerId)
        .map((m) => m.userId);

    await db.collection("squads").deleteOne({ _id: squadId });

    if (memberIds.length > 0) {
        await createBulkNotifications(memberIds, {
            type: "squad_disband",
            titleKey: "squad_disbanded_title",
            bodyKey: "squad_disbanded_body_detailed",
            bodyValues: {
                host: hostAccountName,
                relicI18n: squad.relicDetails.i18n,
            },
        });
    }

    return true;
}

/**
 * Low-level engine execution to safely pull a precise user profile out of a squad array field.
 * Explicitly maps to the driver's Partial structure constraints, remaining 100% type-safe.
 */
export async function executeLeaveSlot(
    squadId: ObjectId,
    userId: string,
    accountName: string,
): Promise<boolean> {
    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection<SquadDocument>("squads").updateOne(
        {
            _id: squadId,
            ownerId: { $ne: userId },
        },
        {
            $pull: {
                members: {
                    userId: userId,
                    accountName: accountName,
                },
            },
        },
    );

    return result.modifiedCount > 0;
}

// ============================================================================
// EXPORTED PUBLIC CLIENT ACTIONS (Rate Limiting Applied)
// ============================================================================

export async function createSquad(formData: FormData) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { error: "unauthorized" };

    // --- RATE LIMIT CHECK ---
    try {
        const { mutationLimiter } = await getRateLimiters();
        if (mutationLimiter) {
            await mutationLimiter.consume(`create_squad:${session.user.id}`);
        }
    } catch (error) {
        return { error: "tooManyRequests" };
    }

    const accountName = (formData.get("warframeAccount") as string)?.trim();
    const platform = (formData.get("platform") as string)?.toLowerCase();
    const relicIdRaw = formData.get("relicId") as string;
    const refinement = formData.get("refinement") as string;
    const relicEra = formData.get("relicEra") as string;
    const rawDate = formData.get("executionDate") as string;

    if (!accountName || accountName.length > 30)
        return { error: "invalid_account" };
    if (!ALLOWED_PLATFORMS.includes(platform))
        return { error: "invalid_platform" };
    if (!relicIdRaw || !relicEra) return { error: "missing_relic_info" };

    const executionDate = new Date(rawDate);
    const now = new Date();
    if (
        isNaN(executionDate.getTime()) ||
        executionDate < new Date(now.getTime() + 60000)
    ) {
        return { error: "invalid_date" };
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const isValidId = /^[0-9a-fA-F]{24}$/.test(relicIdRaw);

        const squadData: Omit<SquadDocument, "_id"> = {
            members: [
                {
                    userId: session.user.id,
                    accountName,
                    platform,
                    joinedAt: new Date(),
                },
            ],
            executionDate,
            targetRelic: isValidId ? new ObjectId(relicIdRaw) : relicIdRaw,
            relicEra,
            refinement: refinement || "Intact",
            ownerId: session.user.id,
            createdAt: new Date(),
            status: "open",
            maxTenno: MAX_MEMBERS,
        };

        await db
            .collection<SquadDocument>("squads")
            .insertOne(squadData as SquadDocument);
        revalidatePath("/");
        return { success: true };
    } catch (e) {
        return { error: "database_error" };
    }
}

export async function joinSquad(
    squadId: string,
    accountName: string,
    platform: string,
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { error: "unauthorized" };

    // --- RATE LIMIT CHECK ---
    try {
        const { mutationLimiter } = await getRateLimiters();
        if (mutationLimiter) {
            await mutationLimiter.consume(`join_squad:${session.user.id}`);
        }
    } catch (error) {
        return { error: "tooManyRequests" };
    }

    if (!accountName || accountName.length > 30)
        return { error: "invalid_account" };
    if (!ALLOWED_PLATFORMS.includes(platform))
        return { error: "invalid_platform" };

    try {
        const client = await clientPromise;
        const db = client.db();
        const id = new ObjectId(squadId);

        const result = await db
            .collection<SquadDocument>("squads")
            .findOneAndUpdate(
                {
                    _id: id,
                    status: "open",
                    "members.userId": { $ne: session.user.id },
                    $expr: { $lt: [{ $size: "$members" }, MAX_MEMBERS] },
                },
                {
                    $push: {
                        members: {
                            userId: session.user.id,
                            accountName,
                            platform,
                            joinedAt: new Date(),
                        },
                    },
                },
                { returnDocument: "after" },
            );

        if (!result) return { error: "join_failed_or_full" };

        const squadWithDetails = await db
            .collection("squads")
            .aggregate<AggregatedSquad>([
                { $match: { _id: id } },
                {
                    $lookup: {
                        from: "relics",
                        localField: "targetRelic",
                        foreignField: "uniqueId",
                        as: "relicDetails",
                    },
                },
                { $unwind: "$relicDetails" },
            ])
            .next();

        if (squadWithDetails) {
            await createNotification({
                userId: squadWithDetails.ownerId,
                type: "squad_join",
                titleKey: "new_member_title",
                bodyKey: "new_member_body",
                bodyValues: {
                    accountName,
                    relicI18n: squadWithDetails.relicDetails.i18n,
                },
            });
        }

        revalidatePath("/");
        return { success: true };
    } catch (e) {
        return { error: "database_error" };
    }
}

export async function leaveSquad(squadId: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { error: "unauthorized" };

    // --- RATE LIMIT CHECK ---
    try {
        const { mutationLimiter } = await getRateLimiters();
        if (mutationLimiter) {
            await mutationLimiter.consume(`leave_squad:${session.user.id}`);
        }
    } catch (error) {
        return { error: "tooManyRequests" };
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const id = new ObjectId(squadId);

        // Find the slot matching the user to determine which account string they are removing
        const squadDoc = await db
            .collection<SquadDocument>("squads")
            .findOne({ _id: id, "members.userId": session.user.id });

        const targetMember = squadDoc?.members.find(
            (m) => m.userId === session.user.id,
        );
        if (!targetMember) return { error: "cannot_leave" };

        // Process through shared engine to securely update DB records
        const success = await executeLeaveSlot(
            id,
            session.user.id,
            targetMember.accountName,
        );
        if (!success) return { error: "cannot_leave" };

        revalidatePath("/");
        return { success: true };
    } catch (e) {
        return { error: "database_error" };
    }
}

export async function disbandSquad(squadId: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { error: "unauthorized" };

    // --- RATE LIMIT CHECK ---
    try {
        const { mutationLimiter } = await getRateLimiters();
        if (mutationLimiter) {
            await mutationLimiter.consume(`disband_squad:${session.user.id}`);
        }
    } catch (error) {
        return { error: "tooManyRequests" };
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const id = new ObjectId(squadId);

        const squadDoc = await db
            .collection<SquadDocument>("squads")
            .findOne({ _id: id, ownerId: session.user.id });

        if (!squadDoc) return { error: "unauthorized_not_owner" };

        const hostName =
            squadDoc.members.find((m) => m.userId === session.user.id)
                ?.accountName || "Host";

        // Process through shared engine
        const success = await executeDisband(id, session.user.id, hostName);
        if (!success) return { error: "unauthorized_not_owner" };

        revalidatePath("/");
        return { success: true };
    } catch (e) {
        return { error: "database_error" };
    }
}
