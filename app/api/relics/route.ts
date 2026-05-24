"use server";

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import Items, { Item } from "@wfcd/items";
import { Filter, Condition, Document } from "mongodb";

// --- Types ---
export interface RelicReward {
    _path: string;
    rarity: "COMMON" | "UNCOMMON" | "RARE";
    i18n: Record<string, string>;
}

export interface MongoRelic {
    _id: string;
    uniqueId: string;
    era: string;
    internalId: string;
    isVaulted: boolean;
    i18n: Record<string, { displayName: string }>;
    rewards: RelicReward[];
}

export interface EnrichedRelic extends MongoRelic {
    image: string | null;
}

const warframeItems = new Items({ category: ["Relics"] });

function hasImageName(item: Item): item is Item & { imageName: string } {
    return (
        "imageName" in item &&
        typeof (item as Record<string, unknown>).imageName === "string"
    );
}

function diacriticRegex(query: string): string {
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
    const query = searchParams.get("q")?.trim() || "";
    const era = searchParams.get("era") || "all";
    const locale = searchParams.get("locale") || "en";
    const sortType = searchParams.get("sort") || "nameAsc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = 24;

    try {
        const client = await clientPromise;
        const db = client.db();
        const collection = db.collection<MongoRelic>("relics");

        // --- 1. Build Filters ---
        const filter: Filter<MongoRelic> = {};

        if (era !== "all") {
            const escapedEra = era.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const eraCondition: Condition<string> = {
                $regex: new RegExp(`^${escapedEra}$`, "i"),
            };
            filter.era = eraCondition;
        }

        if (query) {
            const fuzzyQuery = diacriticRegex(query);
            filter.$or = [
                {
                    [`i18n.${locale}.displayName`]: {
                        $regex: fuzzyQuery,
                        $options: "i",
                    },
                },
                {
                    [`rewards.i18n.${locale}`]: {
                        $regex: fuzzyQuery,
                        $options: "i",
                    },
                },
            ];
        }

        // --- 2. Build Pipeline ---
        const pipeline: Document[] = [{ $match: filter }];

        pipeline.push({
            $addFields: {
                eraWeight: {
                    $switch: {
                        branches: [
                            {
                                case: { $eq: [{ $toLower: "$era" }, "lith"] },
                                then: 1,
                            },
                            {
                                case: { $eq: [{ $toLower: "$era" }, "meso"] },
                                then: 2,
                            },
                            {
                                case: { $eq: [{ $toLower: "$era" }, "neo"] },
                                then: 3,
                            },
                            {
                                case: { $eq: [{ $toLower: "$era" }, "axi"] },
                                then: 4,
                            },
                            {
                                case: {
                                    $eq: [{ $toLower: "$era" }, "requiem"],
                                },
                                then: 5,
                            },
                            {
                                case: { $eq: [{ $toLower: "$era" }, "omni"] },
                                then: 6,
                            },
                        ],
                        default: 99,
                    },
                },
            },
        });

        let sortStage: Record<string, 1 | -1>;

        switch (sortType) {
            case "nameAsc":
                sortStage = { [`i18n.${locale}.displayName`]: 1 };
                break;
            case "nameDesc":
                sortStage = { [`i18n.${locale}.displayName`]: -1 };
                break;
            case "era":
            default:
                sortStage = { eraWeight: 1, internalId: 1 };
                break;
        }

        pipeline.push({ $sort: sortStage });
        pipeline.push({ $skip: (page - 1) * limit });
        pipeline.push({ $limit: limit });

        // --- 3. Execution ---
        const [total, relics] = await Promise.all([
            collection.countDocuments(filter),
            collection
                .aggregate<MongoRelic & { eraWeight: number }>(pipeline)
                .toArray(),
        ]);

        // --- 4. Enrichment ---
        const enrichedRelics: EnrichedRelic[] = relics.map((relic) => {
            const itemData = warframeItems.find(
                (i) => i.uniqueName === relic.uniqueId,
            );

            let imageUrl: string | null = null;
            if (itemData && hasImageName(itemData)) {
                imageUrl = `https://cdn.warframestat.us/img/${itemData.imageName}`;
            }

            const { eraWeight: _eraWeight, ...cleanRelic } = relic;

            return {
                ...cleanRelic,
                _id: relic._id.toString(),
                image: imageUrl,
            } as EnrichedRelic;
        });

        return NextResponse.json({
            relics: enrichedRelics,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Relic Fetch Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
