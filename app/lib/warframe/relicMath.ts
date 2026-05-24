export type Rarity = "COMMON" | "UNCOMMON" | "RARE";
export type Refinement = "Intact" | "Exceptional" | "Flawless" | "Radiant";

const CHANCES = {
    Intact: { COMMON: 76, UNCOMMON: 22, RARE: 2 }, // 76/3 ≈ 25.33%
    Exceptional: { COMMON: 70, UNCOMMON: 26, RARE: 4 }, // 70/3 ≈ 23.33%
    Flawless: { COMMON: 60, UNCOMMON: 34, RARE: 6 }, // 60/3 ≈ 20%
    Radiant: { COMMON: 50, UNCOMMON: 40, RARE: 10 }, // 50/3 ≈ 16.67%
};

export const getRewardProbability = (
    relicUniqueId: string,
    rewardRarity: Rarity,
    refinement: Refinement,
    allRewards: { rarity: string }[],
): number => {
    if (relicUniqueId.includes("ImmortalOmni")) {
        return 100 / allRewards.length;
    }

    const poolChance = CHANCES[refinement][rewardRarity];
    const sameRarityCount = allRewards.filter(
        (r) => r.rarity === rewardRarity,
    ).length;

    return poolChance / (sameRarityCount || 1);
};
