import clientPromise from "@/app/lib/mongodb";
import Items from "@wfcd/items";
import { decompress } from "lzma";
import https from "https";
import http from "http";

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
            resolve(Buffer.from(result as Uint8Array).toString("utf-8"));
        });
    });
};

function fetchBufferNative(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const options = {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "*/*",
            },
        };
        client
            .get(url, options, (res) => {
                if (
                    res.statusCode &&
                    res.statusCode >= 300 &&
                    res.statusCode < 400 &&
                    res.headers.location
                ) {
                    return resolve(fetchBufferNative(res.headers.location));
                }
                if (res.statusCode !== 200) {
                    return reject(
                        new Error(
                            `Failed to fetch ${url}: Status ${res.statusCode}`,
                        ),
                    );
                }
                const chunks: Buffer[] = [];
                res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
                res.on("end", () => resolve(Buffer.concat(chunks)));
                res.on("error", (err) => reject(err));
            })
            .on("error", (err) => reject(err));
    });
}

function fetchTextNative(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const options = {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "*/*",
            },
        };
        client
            .get(url, options, (res) => {
                if (res.statusCode !== 200) {
                    return reject(
                        new Error(
                            `Failed to fetch ${url}: Status ${res.statusCode}`,
                        ),
                    );
                }
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => resolve(data));
                res.on("error", (err) => reject(err));
            })
            .on("error", (err) => reject(err));
    });
}

// --- PIPELINE COMPILATION ---
async function processAllLanguages(masterMap: Map<string, RelicDoc>) {
    for (const lang of LANGUAGES) {
        console.log(
            `📡 Processing Master Sync & Translation for [${lang.toUpperCase()}]...`,
        );
        try {
            await sleep(2500);

            const compressedIndex = await fetchBufferNative(
                `https://origin.warframe.com/PublicExport/index_${lang}.txt.lzma`,
            );
            const decompressedIndex = await decompressAsync(compressedIndex);
            const lines = decompressedIndex.split(/\r?\n/);

            const relicLine = lines.find((line) =>
                line.includes("ExportRelicArcane"),
            );
            if (!relicLine) throw new Error(`Relic manifest missing in index`);

            await sleep(500);
            const rawRelicText = await fetchTextNative(
                `http://content.warframe.com/PublicExport/Manifest/${relicLine}`,
            );
            const cleanedRelicText = rawRelicText.trim().startsWith("{")
                ? rawRelicText.trim()
                : `{${rawRelicText.trim()}}`;
            const relicData = JSON.parse(cleanedRelicText) as {
                ExportRelicArcane: RawRelicItem[];
            };

            const rawItems = relicData.ExportRelicArcane.filter(
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

                await sleep(500); // Small breaker inside language manifest downloads
                const rawText = await fetchTextNative(
                    `http://content.warframe.com/PublicExport/Manifest/${line}`,
                );
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
        } catch (e) {
            const err = e as Error;
            console.error(
                `❌ Error processing language [${lang.toUpperCase()}]: ${err.message}`,
            );
        }
    }
}

// --- PHASE 4: SMART VAULT STATUS ---
async function applyVaultStatus(masterMap: Map<string, RelicDoc>) {
    console.log(
        "\n📦 Phase 4: Applying Vault Status (Local + Live Verification)...",
    );

    try {
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

// --- MAIN CONTROLLER ---
export async function syncRelics() {
    const client = await clientPromise;
    const db = client.db();

    const masterMap = new Map<string, RelicDoc>();

    await processAllLanguages(masterMap);
    await applyVaultStatus(masterMap);

    const finalDocs = Array.from(masterMap.values());
    console.log(`\n💾 Finalizing: Writing ${finalDocs.length} relics to DB...`);

    if (finalDocs.length === 0) {
        console.log("⚠️ No records were successfully resolved to write.");
        return {
            success: false,
            message: "No data gathered due to stream blocking.",
        };
    }

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
