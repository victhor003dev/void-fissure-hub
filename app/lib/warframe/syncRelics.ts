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
    i18n: {
        [lang: string]: { displayName: string };
    };
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

// --- UTILS ---
const decompressAsync = (buffer: Buffer): Promise<string> => {
    return new Promise((resolve, reject) => {
        decompress(buffer, (result, err) => {
            if (err) return reject(err);
            if (!result) return reject(new Error("Decompression failed"));
            // Cast result to Buffer to satisfy TS
            resolve(Buffer.from(result as Uint8Array).toString("utf-8"));
        });
    });
};

const getManifestText = async (lang: string): Promise<string> => {
    const indexRes = await fetch(
        `https://origin.warframe.com/PublicExport/index_${lang}.txt.lzma`,
        { cache: "no-store" },
    );
    const compressed = Buffer.from(await indexRes.arrayBuffer());
    const decompressed = await decompressAsync(compressed);
    const lines = decompressed.split(/\r?\n/);

    const manifestLine = lines.find((line) =>
        line.includes("ExportRelicArcane"),
    );
    if (!manifestLine) throw new Error(`Relic manifest not found for ${lang}`);

    const dataRes = await fetch(
        `http://content.warframe.com/PublicExport/Manifest/${manifestLine}`,
        { cache: "no-store" },
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
            const data = JSON.parse(await getManifestText(lang)) as {
                ExportRelicArcane: RawRelicItem[];
            };
            const rawItems = data.ExportRelicArcane.filter(
                (i) => i.relicRewards,
            );

            for (const item of rawItems) {
                const familyId = item.uniqueName.replace(
                    /(Bronze|Silver|Iron|Gold|Radiant|Platinum)$/i,
                    "",
                );
                const internalId = item.name
                    .toLowerCase()
                    .replace(/\s+/g, "_")
                    .replace(/reliquia_|relique_|relic_/g, "");

                if (!masterMap.has(familyId)) {
                    masterMap.set(familyId, {
                        uniqueId: familyId,
                        internalId: internalId,
                        era:
                            ["Lith", "Meso", "Neo", "Axi", "Requiem"].find(
                                (e) => item.name.includes(e),
                            ) || "Axi",
                        i18n: {},
                        rewards: [],
                    });
                }

                const entry = masterMap.get(familyId)!;

                if (!entry.i18n[lang]) {
                    entry.i18n[lang] = { displayName: item.name };
                }

                item.relicRewards.forEach((rew) => {
                    let rewardEntry = entry.rewards.find(
                        (r) => r._path === rew.rewardName,
                    );
                    if (!rewardEntry) {
                        rewardEntry = {
                            _path: rew.rewardName,
                            rarity: rew.rarity,
                            i18n: {},
                        };
                        entry.rewards.push(rewardEntry);
                    }
                });
            }
            await sleep(1000);
        } catch (e) {
            const err = e as Error;
            console.error(`Error in ${lang}: ${err.message}`);
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
            const indexRes = await fetch(
                `https://origin.warframe.com/PublicExport/index_${lang}.txt.lzma`,
                { cache: "no-store" },
            );
            const lines = (
                await decompressAsync(Buffer.from(await indexRes.arrayBuffer()))
            ).split(/\r?\n/);

            const targetManifests = [
                "ExportWarframes",
                "ExportWeapons",
                "ExportUpgrades",
                "ExportResources",
                "ExportRecipes",
            ];
            const itemMap = new Map<string, string>();
            const resultMap = new Map<string, string>();

            for (const target of targetManifests) {
                const line = lines.find((l) => l.includes(target));
                if (!line) continue;
                const res = await fetch(
                    `http://content.warframe.com/PublicExport/Manifest/${line}`,
                );
                const rawText = await res.text();
                const json = JSON.parse(
                    rawText
                        .trim()
                        .replace(/^[^{]*/, "")
                        .replace(/[^}]*$/, ""),
                ) as Record<string, RawManifestItem[]>;
                const dataArray = json[target] || [];

                dataArray.forEach((item) => {
                    if (item.uniqueName && item.name)
                        itemMap.set(item.uniqueName, item.name);
                    if (
                        target === "ExportRecipes" &&
                        item.uniqueName &&
                        item.resultType
                    ) {
                        resultMap.set(item.uniqueName, item.resultType);
                    }
                });
            }

            masterMap.forEach((relic) => {
                relic.rewards.forEach((reward) => {
                    const rawPath = reward._path;
                    const normalizedPath = rawPath
                        .replace("/StoreItems/Types/", "/Types/")
                        .replace("/StoreItems/", "/");

                    let finalName = "";
                    const resultPath =
                        resultMap.get(normalizedPath) || resultMap.get(rawPath);

                    if (resultPath) {
                        finalName = itemMap.get(resultPath) || "";
                    }

                    if (!finalName) {
                        finalName =
                            itemMap.get(normalizedPath) ||
                            itemMap.get(rawPath) ||
                            "";
                    }

                    if (finalName) {
                        reward.i18n[lang] = finalName;
                    }
                });
            });
            await sleep(500);
        } catch (e) {
            const err = e as Error;
            console.warn(`   ❌ Error: ${err.message}`);
        }
    }
}

// --- PHASE 4: SMART VAULT STATUS ---
async function applyVaultStatus(masterMap: Map<string, RelicDoc>) {
    console.log(
        "\n📦 Phase 4: Applying Vault Status (Local + Live Verification)...",
    );

    try {
        // We cast the Items instance to an array of our specific interface
        const items = new Items({
            category: ["Relics"],
        }) as unknown as WfcdRelic[];
        const vaultMap = new Map<string, boolean>();

        items.forEach((item) => {
            if (item.uniqueName) {
                const normalizedPath = item.uniqueName.replace(
                    /(Bronze|Silver|Iron|Gold|Radiant|Platinum)$/i,
                    "",
                );
                if (item.vaulted) vaultMap.set(normalizedPath, true);
            }
        });

        masterMap.forEach((relic) => {
            let isVaulted = vaultMap.get(relic.uniqueId) || false;

            // Manual Override for the Eterna/Omni Consolidation
            if (relic.uniqueId.includes("T5VoidProjectionImmortalOmniA")) {
                isVaulted = false;
            }

            relic.isVaulted = isVaulted;
        });

        const vaultedCount = Array.from(masterMap.values()).filter(
            (r) => r.isVaulted,
        ).length;
        console.log(
            `   ✅ Vault status synced. ${vaultedCount} relics vaulted.`,
        );
    } catch (e) {
        const err = e as Error;
        console.warn(`   ❌ Phase 4 Error: ${err.message}`);
    }
}

// --- MAIN ---
export async function syncRelics() {
    const client = await clientPromise;
    const db = client.db();

    const masterMap = await buildRelicMap();
    await translateRewards(masterMap);
    await applyVaultStatus(masterMap);

    const finalDocs = Array.from(masterMap.values());
    console.log(`\n💾 Finalizing: Writing ${finalDocs.length} relics to DB...`);

    const ops = finalDocs.map((doc) => ({
        updateOne: {
            filter: { uniqueId: doc.uniqueId },
            update: { $set: { ...doc, lastUpdated: new Date() } },
            upsert: true,
        },
    }));

    for (let i = 0; i < ops.length; i += 100) {
        await db.collection("relics").bulkWrite(ops.slice(i, i + 100));
    }

    console.log("🏁 Sync Complete.");
    return { success: true };
}
