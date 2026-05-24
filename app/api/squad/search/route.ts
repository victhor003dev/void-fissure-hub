"use server";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { Filter, Sort, Document } from "mongodb";
import { auth } from "@/app/lib/auth";
import { headers } from "next/headers";

/**
 * Escapes regex special characters and adds diacritic (accent) insensitivity
 * to the search query for global language support.
 */
function diacriticRegex(query: string) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return escaped
        .replace(/[aáàäâãå]/gi, "[a,á,à,ä,â,ã,å]")
        .replace(/[eéèëê]/gi, "[e,é,è,ë,ê]")
        .replace(/[iíìïîıİ]/gi, "[i,í,ì,ï,î,ı,İ]")
        .replace(/[oóòöôõ]/gi, "[o,ó,ò,ö,ô,õ]")
        .replace(/[uúùüû]/gi, "[u,ú,ù,ü,û]")
        .replace(/[nñń]/gi, "[n,ñ,ń]")
        .replace(/[sśß]/gi, "[s,ś,ß]")
        .replace(/[cçć]/gi, "[c,ç,ć]");
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en";
    const mine = searchParams.get("mine") === "true";
    const query = searchParams.get("q") || "";
    const era = searchParams.get("era") || "";
    const sortType = searchParams.get("sort") || "recentDesc";

    try {
        const client = await clientPromise;
        const db = client.db();

        const session = await auth.api.getSession({
            headers: await headers(),
        });
        const currentUserId = session?.user?.id;

        // --- 1. Initial Match Stage (Filters before expensive Lookups) ---
        let matchStage: Filter<Document> = {};

        if (mine) {
            if (!currentUserId) {
                return NextResponse.json({ totalSquads: 0, squads: [] });
            }
            matchStage.$or = [
                { ownerId: currentUserId },
                { "members.userId": currentUserId },
            ];
        } else {
            matchStage = {
                status: "open",
                executionDate: { $gt: new Date() },
            };

            if (currentUserId) {
                matchStage.ownerId = { $ne: currentUserId };
                matchStage["members.userId"] = { $ne: currentUserId };
            }

            if (era) {
                // Escape era string to prevent regex injection
                const escapedEra = era.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                matchStage.relicEra = {
                    $regex: new RegExp(`^${escapedEra}$`, "i"),
                };
            }
        }

        // --- 2. Sorting Logic ---
        let sortStage: Sort = { createdAt: -1 };

        if (mine) {
            sortStage = { executionDate: -1 };
        } else {
            switch (sortType) {
                case "recentAsc":
                    sortStage = { createdAt: 1 };
                    break;
                case "refinementDesc":
                    sortStage = { refinementPriority: -1 };
                    break;
                case "refinementAsc":
                    sortStage = { refinementPriority: 1 };
                    break;
                case "soonestAsc":
                    sortStage = { executionDate: 1 };
                    break;
                case "soonestDesc":
                    sortStage = { executionDate: -1 };
                    break;
                case "slotsAvailableAsc":
                    sortStage = { slotsLeft: 1 };
                    break;
                case "slotsAvailableDesc":
                    sortStage = { slotsLeft: -1 };
                    break;
                default:
                    sortStage = { createdAt: -1 };
            }
        }

        // --- 3. The Pipeline ---
        const pipeline: Document[] = [
            { $match: matchStage },
            {
                $lookup: {
                    from: "relics",
                    localField: "targetRelic",
                    foreignField: "uniqueId",
                    as: "relicDetails",
                },
            },
            { $unwind: { path: "$relicDetails" } },
            {
                $addFields: {
                    relicName: `$relicDetails.i18n.${locale}.displayName`,
                    currentTenno: { $size: "$members" },
                    slotsLeft: { $subtract: [4, { $size: "$members" }] },
                    isOwner: {
                        $cond: [
                            { $eq: ["$ownerId", currentUserId || ""] },
                            1,
                            0,
                        ],
                    },
                    refinementPriority: {
                        $switch: {
                            branches: [
                                {
                                    case: { $eq: ["$refinement", "Radiant"] },
                                    then: 4,
                                },
                                {
                                    case: { $eq: ["$refinement", "Flawless"] },
                                    then: 3,
                                },
                                {
                                    case: {
                                        $eq: ["$refinement", "Exceptional"],
                                    },
                                    then: 2,
                                },
                            ],
                            default: 1,
                        },
                    },
                },
            },
        ];

        // --- 4. Text Search Match ---
        if (query) {
            const fuzzyQuery = diacriticRegex(query);
            pipeline.push({
                $match: {
                    $or: [
                        { relicName: { $regex: fuzzyQuery, $options: "i" } },
                        {
                            [`relicDetails.rewards.i18n.${locale}`]: {
                                $regex: fuzzyQuery,
                                $options: "i",
                            },
                        },
                    ],
                },
            });
        }

        const finalSort = mine ? { isOwner: -1, ...sortStage } : sortStage;

        // --- 5. Faceted Output (Pagination & Metadata) ---
        pipeline.push({
            $facet: {
                metadata: [{ $count: "total" }],
                data: [
                    { $sort: finalSort },
                    { $limit: mine ? 20 : 50 },
                    {
                        $project: {
                            id: { $toString: "$_id" },
                            _id: 0,
                            relicName: 1,
                            relicEra: 1,
                            refinement: 1,
                            executionDate: 1,
                            status: 1,
                            currentTenno: 1,
                            maxTenno: { $literal: 4 },
                            isOwner: 1,
                        },
                    },
                ],
            },
        });

        const result = await db
            .collection("squads")
            .aggregate(pipeline)
            .toArray();

        const facetResult = result[0] as {
            metadata: { total: number }[];
            data: Document[];
        };

        return NextResponse.json({
            totalSquads: facetResult.metadata[0]?.total || 0,
            squads: facetResult.data || [],
        });
    } catch (error) {
        console.error("Search Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
