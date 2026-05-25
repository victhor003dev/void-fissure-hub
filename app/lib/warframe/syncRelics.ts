import clientPromise from "@/app/lib/mongodb";
import Items from "@wfcd/items";
import { decompress } from "lzma";

// --- TYPES & INTERFACES ---
interface RewardI18n {
    [key: string]: string;
}
interface RelicReward {
    _path: string;
    rarity: string;
    i18n: RewardI18n;
}
interface RelicDoc {
    uniqueId: string;
    internalId: string;
    era: string;
    i18n: { [lang: string]: { displayName: string } };
    rewards: RelicReward[];
    isVaulted?: boolean;
    lastUpdated?: Date;
}
interface RawRelicReward {
    rewardName: string;
    rarity: string;
}
interface RawRelicItem {
    uniqueName: string;
    name: string;
    relicRewards: RawRelicReward[];
}
interface RawManifestItem {
    uniqueName?: string;
    name?: string;
    resultType?: string;
}
interface WfcdRelic {
    uniqueName?: string;
    vaulted?: boolean;
}

const LANGUAGES = [
    "en",
    "de",
    "es",
    "fr",
    "it",
    "ja",
    "ko",
    "pl",
    "pt",
    "ru",
    "th",
    "tr",
    "uk",
    "zh",
    "tc",
];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FETCH_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

// --- UTILS ---
const decompressAsync = (buffer: Buffer): Promise<string> => {
    return new Promise((resolve, reject) => {
        decompress(buffer, (result, err) => {
            if (err) return reject(err);
            if (!result) return reject(new Error("Decompression failed"));
            resolve(Buffer.from(result as Uint8Array).toString("utf-8"));
        });
    });
};

// Added sleep here to ensure no over-fetching
const secureFetch = async (url: string) => {
    await sleep(2000);
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
};

const getManifestText = async (
    lang: string,
    targetName: string,
): Promise<string> => {
    const indexRes = await secureFetch(
        `https://origin.warframe.com/PublicExport/index_${lang}.txt.lzma`,
    );
    const compressed = Buffer.from(await indexRes.arrayBuffer());
    const decompressed = await decompressAsync(compressed);
    const lines = decompressed
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

    const manifestLine = lines.find((line) => line.includes(targetName));
    if (!manifestLine)
        throw new Error(`Manifest ${targetName} not found for ${lang}`);

    const dataRes = await secureFetch(
        `http://content.warframe.com/PublicExport/Manifest/${manifestLine}`,
    );
    const text = (await dataRes.text()).trim();
    return text.startsWith("{") ? text : `{${text}}`;
};

// --- PHASE 1 & 2: RELIC AGGREGATION ---
async function buildRelicMap(): Promise<Map<string, RelicDoc>> {
    const masterMap = new Map<string, RelicDoc>();
    for (const lang of LANGUAGES) {
        console.log(`📡 Phase 1/2: Fetching Relics [${lang.toUpperCase()}]...`);
        try {
            const data = JSON.parse(
                await getManifestText(lang, "ExportRelicArcane"),
            ) as { ExportRelicArcane: RawRelicItem[] };
            data.ExportRelicArcane.filter((i) => i.relicRewards).forEach(
                (item) => {
                    const familyId = item.uniqueName.replace(
                        /(Bronze|Silver|Iron|Gold|Radiant|Platinum)$/i,
                        "",
                    );
                    if (!masterMap.has(familyId)) {
                        masterMap.set(familyId, {
                            uniqueId: familyId,
                            internalId: item.name
                                .toLowerCase()
                                .replace(/\s+/g, "_")
                                .replace(/reliquia_|relique_|relic_/g, ""),
                            era:
                                ["Lith", "Meso", "Neo", "Axi", "Requiem"].find(
                                    (e) => item.name.includes(e),
                                ) || "Axi",
                            i18n: {},
                            rewards: [],
                        });
                    }
                    const entry = masterMap.get(familyId)!;
                    entry.i18n[lang] = { displayName: item.name };
                    item.relicRewards.forEach((rew) => {
                        if (
                            !entry.rewards.find(
                                (r) => r._path === rew.rewardName,
                            )
                        ) {
                            entry.rewards.push({
                                _path: rew.rewardName,
                                rarity: rew.rarity,
                                i18n: {},
                            });
                        }
                    });
                },
            );
        } catch (e) {
            console.error(`Error in ${lang}: ${(e as Error).message}`);
        }
    }
    return masterMap;
}

// --- PHASE 3: TRANSLATE REWARDS ---
async function translateRewards(masterMap: Map<string, RelicDoc>) {
    console.log("\n📡 Phase 3: Multi-Manifest Translation...");
    for (const lang of LANGUAGES) {
        console.log(`   Building dictionary for [${lang.toUpperCase()}]...`);
        try {
            const indexRes = await secureFetch(
                `https://origin.warframe.com/PublicExport/index_${lang}.txt.lzma`,
            );
            const lines = (
                await decompressAsync(Buffer.from(await indexRes.arrayBuffer()))
            )
                .split(/\r?\n/)
                .map((l) => l.trim());
            const itemMap = new Map<string, string>();
            const resultMap = new Map<string, string>();

            for (const target of [
                "ExportWarframes",
                "ExportWeapons",
                "ExportUpgrades",
                "ExportResources",
                "ExportRecipes",
            ]) {
                const line = lines.find((l) => l.includes(target));
                if (!line) continue;
                const res = await secureFetch(
                    `http://content.warframe.com/PublicExport/Manifest/${line}`,
                );
                const json = JSON.parse(
                    (await res.text())
                        .trim()
                        .replace(/^[^{]*/, "")
                        .replace(/[^}]*$/, ""),
                ) as Record<string, RawManifestItem[]>;
                (json[target] || []).forEach((item) => {
                    if (item.uniqueName && item.name)
                        itemMap.set(item.uniqueName, item.name);
                    if (
                        target === "ExportRecipes" &&
                        item.uniqueName &&
                        item.resultType
                    )
                        resultMap.set(item.uniqueName, item.resultType);
                });
            }
            masterMap.forEach((relic) => {
                relic.rewards.forEach((reward) => {
                    const path = reward._path
                        .replace("/StoreItems/Types/", "/Types/")
                        .replace("/StoreItems/", "/");
                    const name =
                        itemMap.get(resultMap.get(path) || "") ||
                        itemMap.get(path) ||
                        itemMap.get(reward._path);
                    if (name) reward.i18n[lang] = name;
                });
            });
        } catch (e) {
            console.warn(`   ❌ Error in ${lang}: ${(e as Error).message}`);
        }
    }
}

// --- PHASE 4 & MAIN ---
async function applyVaultStatus(masterMap: Map<string, RelicDoc>) {
    const items = new Items({ category: ["Relics"] }) as unknown as WfcdRelic[];
    const vaultMap = new Map<string, boolean>();
    items.forEach(
        (i) =>
            i.uniqueName &&
            i.vaulted &&
            vaultMap.set(
                i.uniqueName.replace(
                    /(Bronze|Silver|Iron|Gold|Radiant|Platinum)$/i,
                    "",
                ),
                true,
            ),
    );
    masterMap.forEach((r) => (r.isVaulted = vaultMap.get(r.uniqueId) || false));
}

export async function syncRelics() {
    const db = (await clientPromise).db();
    const masterMap = await buildRelicMap();
    await translateRewards(masterMap);
    await applyVaultStatus(masterMap);
    const ops = Array.from(masterMap.values()).map((doc) => ({
        updateOne: {
            filter: { uniqueId: doc.uniqueId },
            update: { $set: { ...doc, lastUpdated: new Date() } },
            upsert: true,
        },
    }));
    for (let i = 0; i < ops.length; i += 100)
        await db.collection("relics").bulkWrite(ops.slice(i, i + 100));
    console.log("🏁 Sync Complete.");
    return { success: true };
}
