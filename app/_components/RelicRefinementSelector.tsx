"use client";

import React, { useMemo, useEffect } from "react";
import Icon from "@/app/_components/ui/Icon";

interface RelicData {
    uniqueId: string;
    i18n: Record<string, { displayName: string }>;
}

type Refinement = "Intact" | "Exceptional" | "Flawless" | "Radiant";

const OMNI_RELIC_ID =
    "/Lotus/Types/Game/Projections/T5VoidProjectionImmortalOmniA";

export default function RelicRefinementSelector({
    selectedRelic,
    value,
    onChange,
}: {
    selectedRelic: RelicData | null;
    value: Refinement;
    onChange: (val: Refinement) => void;
}) {
    const refinements: Refinement[] = [
        "Intact",
        "Exceptional",
        "Flawless",
        "Radiant",
    ];
    const selectedIndex = refinements.indexOf(value);

    const isImmortal = useMemo(() => {
        return (
            selectedRelic?.uniqueId.toLowerCase().includes("immortal") ?? false
        );
    }, [selectedRelic]);

    // Handle the Omni Relic logic
    const isOmni = selectedRelic?.uniqueId === OMNI_RELIC_ID;

    // Force Radiant if it's the Omni relic
    useEffect(() => {
        if (isOmni && value !== "Radiant") {
            onChange("Radiant");
        }
    }, [isOmni, value, onChange]);

    // If no relic or it's the Omni relic, we don't show the selector
    if (!selectedRelic || isOmni) return null;

    const getBaseIconName = () => {
        const folder = "relicRefinement";
        return isImmortal
            ? `${folder}/ImmortalRelicUpgrade`
            : `${folder}/VoidRelicUpgradeRocher`;
    };

    const getOverlayIconName = (ref: Refinement) => {
        const folder = "relicRefinement";
        const prefix = isImmortal ? "ImmortalRelicUpgrade" : "VoidRelicUpgrade";
        switch (ref) {
            case "Exceptional":
                return `${folder}/${prefix}OneLight`;
            case "Flawless":
                return `${folder}/${prefix}TwoLights`;
            case "Radiant":
                return `${folder}/${prefix}ThreeLights`;
            default:
                return null;
        }
    };

    return (
        <div className="flex items-center justify-between gap-2 w-full py-6 animate-in fade-in slide-in-from-top-2 duration-300">
            {refinements.map((ref, index) => {
                const isSelected = value === ref;
                const overlayName = getOverlayIconName(ref);
                const isHighlighted = index <= selectedIndex;

                // Set glow color: Cyan for standard, Red/Amber for Requiem
                const glowClass = isImmortal
                    ? "drop-shadow-[0_0_8px_rgba(255,100,0,0.8)]"
                    : "drop-shadow-[0_0_8px_cyan]";

                return (
                    <label
                        key={ref}
                        className="relative cursor-pointer group flex-1 flex justify-center"
                    >
                        <input
                            type="radio"
                            name="refinement"
                            value={ref}
                            checked={isSelected}
                            onChange={() => onChange(ref)}
                            className="sr-only"
                        />

                        {/* Top Selection Arrow */}
                        {isSelected && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-in fade-in zoom-in duration-200">
                                <Icon
                                    name="relicRefinement/selection_arrow"
                                    type="svg"
                                    size={32}
                                    className="drop-shadow-[0_0_5px_rgba(var(--primary-rgb),0.8)]"
                                />
                            </div>
                        )}

                        {/* Diamond Border Frame */}
                        <div
                            className={`
                            relative w-14 h-14 transition-all duration-300 rotate-45
                            border-2 flex items-center justify-center
                            ${
                                isHighlighted
                                    ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                                    : "border-border/60 bg-transparent hover:border-active/40"
                            }
                        `}
                        >
                            <div className="-rotate-45 relative w-full h-full flex items-center justify-center">
                                <Icon
                                    name={getBaseIconName()}
                                    type="png"
                                    size={40}
                                    className={`transition-all duration-300 ${isHighlighted ? "brightness-110" : "opacity-40 grayscale"}`}
                                />

                                {overlayName && (
                                    <div
                                        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
                                            isHighlighted
                                                ? `opacity-100 brightness-150 ${glowClass}`
                                                : "opacity-30 brightness-50"
                                        }`}
                                    >
                                        <Icon
                                            name={overlayName}
                                            type="png"
                                            size={80}
                                            className="ml-px mt-px"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </label>
                );
            })}
        </div>
    );
}
