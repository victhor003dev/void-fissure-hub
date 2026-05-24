"use server";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";

/**
 * Converts a plain string into a regex pattern that matches
 * accented variations of vowels (Diacritic Insensitivity).
 */
function diacriticRegex(query: string) {
    return query
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/[aáàäâãå]/gi, "[a,á,à,ä,â,ã,å]")
        .replace(/[eéèëê]/gi, "[e,é,è,ë,ê]")
        .replace(/[iíìïîıİ]/gi, "[i,í,ì,ï,î,ı,İ]")
        .replace(/[oóòöôõ]/gi, "[o,ó,ò,ö,ô,õ]")
        .replace(/[uúùüû]/gi, "[u,ú,ù,ü,û]")
        .replace(/[nñń]/gi, "[n,ñ,ń]")
        .replace(/[sśß]/gi, "[s,ś,ß]")
        .replace(/[cçć]/gi, "[c,ç,ć]")
        .replace(/[zźż]/gi, "[z,ź,ż]")
        .replace(/[lł]/gi, "[l,ł]");
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const locale = searchParams.get("locale") || "en";

    if (query.length < 2) return NextResponse.json([]);

    const client = await clientPromise;
    const db = client.db();

    const fuzzyQuery = diacriticRegex(query);

    const relics = await db
        .collection("relics")
        .find({
            $or: [
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
                {
                    uniqueId: {
                        $regex: query.replace(/\s+/g, "_").toLowerCase(),
                        $options: "i",
                    },
                },
            ],
        })
        .project({
            uniqueId: 1,
            era: 1,
            [`i18n.${locale}`]: 1,
            isVaulted: 1,
            rewards: 1,
        })
        .limit(10)
        .toArray();

    return NextResponse.json(relics);
}
