"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { authClient } from "@/app/lib/auth-client"; // Hooking up Better Auth
import { EnrichedRelic } from "@/app/api/relics/route";
import Icon from "@/app/_components/ui/Icon";
import { getRewardProbability, Refinement } from "@/app/lib/warframe/relicMath";
import RelicRefinementSelector from "@/app/_components/RelicRefinementSelector";
import Button, { ButtonVariants } from "@/app/_components/ui/Button";

interface RelicModalProps {
    relic: EnrichedRelic | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function RelicModal({
    relic,
    isOpen,
    onClose,
}: RelicModalProps) {
    const [refinement, setRefinement] = useState<Refinement>("Intact");
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations("relics.modal");

    // Fetch the current session state
    const { data: session } = authClient.useSession();

    if (!relic || !isOpen) return null;

    const isOmni = relic.uniqueId.toLowerCase().includes("immortalomni");
    const imageName = isOmni
        ? "RequiemRelicRadiant"
        : `${relic.era}Relic${refinement}`;

    const getRarityPath = (rarity: string) => {
        return rarity.charAt(0) + rarity.slice(1).toLowerCase();
    };

    const getLocalizedName = () => {
        return relic.i18n[locale]?.displayName || relic.i18n["en"].displayName;
    };

    const handleSearchSquads = () => {
        const encodedName = encodeURIComponent(getLocalizedName());
        router.push(`/?q=${encodedName}`);
        onClose();
    };

    const handleCreateSquad = () => {
        const encodedName = encodeURIComponent(getLocalizedName());
        router.push(
            `/?relic=${encodedName}&create=true&refinement=${refinement}`,
        );
        onClose();
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-2 sm:p-4">
            <div
                className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-5xl h-full max-h-[90vh] md:h-162.5 flex flex-col overflow-hidden border border-border inner bg-zinc-950 shadow-2xl animate-in fade-in zoom-in duration-200 interactive-shadow-6 ">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-110 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/40 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white active:scale-90 md:right-8 md:top-8"
                    aria-label={t("closeLabel")}
                >
                    <Icon name="ui/close" type="svg" size={20} />
                </button>

                <div className="h-1 w-full bg-linear-to-r from-transparent via-primary to-transparent opacity-50 shrink-0" />

                {/* Main Content Area */}
                <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
                    {/* LEFT SECTION */}
                    <div className="relative flex w-full md:w-95 shrink-0 flex-col items-center justify-center bg-linear-to-b from-white/5 to-transparent p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/5">
                        <div className="relative flex items-center justify-center mb-4 md:mb-6 min-h-30 md:min-h-60">
                            <Icon
                                key={imageName}
                                name={`relic/${imageName}`}
                                type="png"
                                size={
                                    typeof window !== "undefined" &&
                                    window.innerWidth < 400
                                        ? 120
                                        : 260
                                }
                                className="drop-shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]"
                            />
                        </div>

                        <div className="text-center mb-6 md:mb-10">
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter text-[var(--content-active)] italic leading-tight px-4">
                                {getLocalizedName()}
                            </h2>
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                                {relic.isVaulted && (
                                    <Icon
                                        name="ui/Vault"
                                        type="svg"
                                        size={12}
                                        className="text-primary opacity-80"
                                    />
                                )}
                                <span className="text-[9px] md:text-[10px] tracking-[0.3em] text-primary uppercase font-bold opacity-60">
                                    {relic.isVaulted
                                        ? t("statusVaulted")
                                        : t("statusActive")}
                                </span>
                            </div>
                        </div>

                        <div className="w-full flex flex-col items-center gap-6 md:gap-8 mb-4 md:mb-0">
                            <div className="w-full max-w-[320px] scale-90 sm:scale-100 origin-center">
                                <RelicRefinementSelector
                                    selectedRelic={relic}
                                    value={refinement}
                                    onChange={setRefinement}
                                />
                            </div>

                            <div className="flex flex-col w-full gap-2 px-6">
                                <Button
                                    onClick={handleSearchSquads}
                                    variant={ButtonVariants.Vitruvian}
                                >
                                    {t("btnSearch")}
                                </Button>

                                {/* Only render the Create Squad action if a session exists */}
                                {session && (
                                    <Button
                                        onClick={handleCreateSquad}
                                        variant={ButtonVariants.Vitruvian}
                                    >
                                        {t("btnCreate")}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SECTION */}
                    <div className="flex flex-1 flex-col p-5 md:p-10 bg-black/40 min-w-0 md:h-full">
                        <div className="mb-4 md:mb-6 flex items-center justify-between shrink-0">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--content-inactive)]">
                                {t("rewardManifest")}
                            </h3>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar min-h-75">
                            {relic.rewards.map((reward, idx) => {
                                const probability = getRewardProbability(
                                    relic.uniqueId,
                                    reward.rarity,
                                    refinement,
                                    relic.rewards,
                                );
                                return (
                                    <div
                                        key={`${reward._path}-${idx}`}
                                        className="group flex items-center justify-between border border-white/5 bg-white/3 p-3 md:p-4 transition-all hover:bg-white/[0.07]"
                                    >
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-xs md:text-sm font-medium text-white/90 truncate pr-4 group-hover:text-primary transition-colors">
                                                {reward.i18n[locale] ||
                                                    reward.i18n["en"]}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Icon
                                                    name={`rarity/${getRarityPath(reward.rarity)}`}
                                                    type="png"
                                                    size={16}
                                                    className="opacity-90"
                                                />
                                                <span
                                                    className={`text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${reward.rarity === "RARE" ? "text-amber-400" : reward.rarity === "UNCOMMON" ? "text-zinc-300" : "text-zinc-500"}`}
                                                >
                                                    {t(
                                                        `rarity.${reward.rarity.toLowerCase()}`,
                                                    )}
                                                </span>
                                                <span className="text-[9px] md:text-[11px] font-mono">
                                                    {probability.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 shrink-0 md:gap-1.5">
                                            {[1, 2, 3].map((barIndex) => {
                                                const isActive =
                                                    (reward.rarity ===
                                                        "COMMON" &&
                                                        barIndex === 1) ||
                                                    (reward.rarity ===
                                                        "UNCOMMON" &&
                                                        barIndex <= 2) ||
                                                    (reward.rarity === "RARE" &&
                                                        barIndex <= 3);
                                                return (
                                                    <div
                                                        key={barIndex}
                                                        className={`h-1 w-6 md:h-1.5 md:w-8 rounded-sm transition-all duration-300 ${isActive ? "bg-primary shadow-[0_0_5px_rgba(var(--primary-rgb),0.3)]" : "bg-white/10"}`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
