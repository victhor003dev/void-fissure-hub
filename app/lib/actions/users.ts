"use server";

import clientPromise from "@/app/lib/mongodb";
import { auth } from "@/app/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ObjectId, UpdateFilter } from "mongodb";
import { getRateLimiters } from "@/app/lib/rate-limiter";
import {
    executeDisband,
    executeLeaveSlot,
    SquadDocument,
} from "@/app/lib/actions/squads";

interface WarframeAccount {
    name: string;
    platform: string;
}

interface UserDocument {
    _id: ObjectId;
    warframeAccounts?: WarframeAccount[];
}

interface AggregatedSquad extends SquadDocument {
    relicDetails: {
        i18n: Record<string, { displayName: string }>;
    };
}

const ALLOWED_PLATFORMS = ["pc", "xbox", "psn", "switch", "ios", "android"];

/**
 * Adds a unique Warframe profile to the user's nested array account registry
 */
export async function addWarframeAccount(formData: FormData) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) return { error: "unauthorized" };

    // --- RATE LIMIT CHECK ---
    try {
        const { mutationLimiter } = await getRateLimiters();
        if (mutationLimiter) {
            await mutationLimiter.consume(`add_account:${session.user.id}`);
        }
    } catch (error) {
        return { error: "tooManyRequests" };
    }

    const name = (formData.get("warframeName") as string)?.trim();
    const platform = formData.get("platform") as string;

    if (!name || name.length < 2 || name.length > 30) {
        return { error: "invalidName" };
    }
    if (!ALLOWED_PLATFORMS.includes(platform)) {
        return { error: "invalidPlatform" };
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const userId = new ObjectId(session.user.id);

        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const existingAccount = await db
            .collection<UserDocument>("user")
            .findOne({
                _id: userId,
                warframeAccounts: {
                    $elemMatch: {
                        name: { $regex: new RegExp(`^${escapedName}$`, "i") },
                        platform: platform,
                    },
                },
            });

        if (existingAccount) {
            return { error: "duplicateAccount" };
        }

        const userDoc = await db
            .collection<UserDocument>("user")
            .findOne({ _id: userId }, { projection: { warframeAccounts: 1 } });

        if ((userDoc?.warframeAccounts?.length || 0) >= 10) {
            return { error: "tooManyAccounts" };
        }

        const update: UpdateFilter<UserDocument> = {
            $push: {
                warframeAccounts: { name, platform },
            },
        };

        const updateResult = await db
            .collection<UserDocument>("user")
            .updateOne({ _id: userId }, update);
        if (updateResult.matchedCount === 0) {
            return { error: "userNotFound" };
        }

        revalidatePath("/");
        revalidatePath("/settings/accounts");

        return { success: true };
    } catch (error) {
        console.error("Add Warframe Account Error:", error);
        return { error: "internalError" };
    }
}

/**
 * Removes one specific Warframe profile string from the user array, cascading into active
 * open squads to drop registration slots or disband hosted squads with notification despatches.
 */
export async function removeWarframeAccount(accountName: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { error: "unauthorized" };

    // --- RATE LIMIT CHECK ---
    try {
        const { mutationLimiter } = await getRateLimiters();
        if (mutationLimiter) {
            await mutationLimiter.consume(`remove_account:${session.user.id}`);
        }
    } catch (error) {
        return { error: "tooManyRequests" };
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const userId = session.user.id;

        // 1. Trace active squads where the user matches under this specific character profile
        const associatedSquads = await db
            .collection("squads")
            .aggregate<AggregatedSquad>([
                {
                    $match: {
                        status: "open",
                        members: {
                            $elemMatch: { userId, accountName },
                        },
                    },
                },
                {
                    $lookup: {
                        from: "relics",
                        localField: "targetRelic",
                        foreignField: "uniqueId",
                        as: "relicDetails",
                    },
                },
                {
                    $unwind: {
                        path: "$relicDetails",
                        preserveNullAndEmptyArrays: true,
                    },
                },
            ])
            .toArray();

        // 2. Process changes cleanly utilizing the shared internal core functions
        for (const squad of associatedSquads) {
            if (squad.ownerId === userId) {
                await executeDisband(squad._id, userId, accountName);
            } else {
                await executeLeaveSlot(squad._id, userId, accountName);
            }
        }

        // 3. Unlink the profile subdocument object directly from the user document array field safely
        const profilePullFilter: UpdateFilter<UserDocument> = {
            $pull: {
                warframeAccounts: { name: accountName },
            },
        };

        const updateResult = await db
            .collection<UserDocument>("user")
            .updateOne({ _id: new ObjectId(userId) }, profilePullFilter);

        if (updateResult.modifiedCount === 0) {
            return { error: "profile_not_found" };
        }

        revalidatePath("/");
        revalidatePath("/settings/accounts");
        return { success: true };
    } catch (error) {
        console.error("Remove Warframe Account Cascade Error:", error);
        return { error: "internalError" };
    }
}

/**
 * Danger zone action: Disbands all owned squads, cleanly drops membership slots across all
 * joined squads via notification pipelines, purges direct notification records, and delegates
 * auth profile, account links, and session cascades safely over to Better Auth.
 */
export async function purgeUserAccountData() {
    try {
        const reqHeaders = await headers();
        const session = await auth.api.getSession({ headers: reqHeaders });
        if (!session?.user?.id) {
            return { success: false, error: "unauthorized" };
        }

        // --- RATE LIMIT CHECK ---
        try {
            const { mutationLimiter } = await getRateLimiters();
            if (mutationLimiter) {
                await mutationLimiter.consume(
                    `purge_account:${session.user.id}`,
                );
            }
        } catch (error) {
            return { success: false, error: "tooManyRequests" };
        }

        const userId = session.user.id;
        const client = await clientPromise;
        const db = client.db();

        // 1. Fetch ALL active/open squads where this user is either a host or active participant
        const associatedSquads = await db
            .collection<SquadDocument>("squads")
            .find({
                status: "open",
                "members.userId": userId,
            })
            .toArray();

        // 2. Safely cycle through each connected squad using the core action parameters
        // to leave slot configurations or disband with system notification broadcasts
        for (const squad of associatedSquads) {
            const targetMembers = squad.members.filter(
                (m) => m.userId === userId,
            );

            for (const member of targetMembers) {
                if (squad.ownerId === userId) {
                    await executeDisband(squad._id, userId, member.accountName);
                } else {
                    await executeLeaveSlot(
                        squad._id,
                        userId,
                        member.accountName,
                    );
                }
            }
        }

        // 3. Fail-safe cleaning layer: Wipe out any unexpected lingering member references
        const squadPullFilter: UpdateFilter<SquadDocument> = {
            $pull: {
                members: { userId },
            },
        };

        await db
            .collection<SquadDocument>("squads")
            .updateMany({ "members.userId": userId }, squadPullFilter);

        // 4. Drop all incoming/pending notification feeds pointing to this identity
        await db.collection("notifications").deleteMany({ userId });

        // 5. Hand execution down to Better Auth to safely trigger internal delete routines.
        // This drops the user row (along with nested warframeAccounts), sessions, and ALL multi-provider account schemas.
        await auth.api.deleteUser({
            headers: reqHeaders,
            body: {},
        });

        // 6. Purge and clear all server caching layout paths
        revalidatePath("/");
        revalidatePath("/settings/accounts");

        return { success: true };
    } catch (err: unknown) {
        console.error("Critical identity purge execution loop breakdown:", err);
        return {
            success: false,
            error:
                err instanceof Error
                    ? err.message
                    : "Internal database mutation crash.",
        };
    }
}
