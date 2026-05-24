"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import Icon from "@/app/_components/ui/Icon";
import { EnrichedRelic } from "@/app/api/relics/route";

interface RelicCardProps {
    relic: EnrichedRelic;
    onClick: () => void;
}

export default function RelicCard({ relic, onClick }: RelicCardProps) {
    const locale = useLocale();
    const cardRef = useRef<HTMLButtonElement>(null);
    const [cardSize, setCardSize] = useState(180);

    const displayName =
        relic.i18n[locale]?.displayName || relic.i18n["en"].displayName;
    const era = relic.era;

    const isOmni = relic.uniqueId.toLowerCase().includes("immortalomni");
    const imageName = isOmni ? "RequiemRelicRadiant" : `${era}RelicIntact`;

    // Use ResizeObserver for rock-solid sizing.
    // This catches grid reflows that 'window resize' might miss.
    useEffect(() => {
        const element = cardRef.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect) {
                    setCardSize(Math.floor(entry.contentRect.width));
                }
            }
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <button
            ref={cardRef}
            onClick={onClick}
            className="group relative aspect-square w-full min-w-35 max-w-45 overflow-hidden 
                        border-border border 
                        transition-all hover:border-primary/50 bg-background/20"
        >
            {/* 1. BACKGROUND LAYER: The Relic (Optically Centered) */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
                <div className="transition-transform duration-500 ease-out group-hover:scale-110">
                    <Icon
                        name={`relic/${imageName}`}
                        type="png"
                        size={cardSize}
                        className="h-full w-full object-contain opacity-80 group-hover:opacity-100"
                    />
                </div>
            </div>

            {/* 2. FRONT LAYER: Localized Name (Overlaying) */}
            <div
                className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center 
                            bg-linear-to-t from-background/80 to-transparent pb-3 pt-14 px-2"
            >
                <span
                    className="text-sm font-bold text-center leading-tight transition-colors drop-shadow-md line-clamp-2 
                                 text-[var(--content-inactive)] group-hover:text-[var(--content-active)]"
                >
                    {displayName}
                </span>
            </div>

            {/* 3. TOP LAYER: Vaulted Status */}
            <div className="absolute right-2 top-2 z-20">
                {relic.isVaulted && (
                    <Icon
                        name="ui/Vault"
                        size={Math.floor(cardSize * 0.16)}
                        className="text-content drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                    />
                )}
            </div>

            {/* 4. HOVER GLOW LAYER */}
            <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-25 z-15
                            bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)] 
                            transition-opacity"
            />
        </button>
    );
}
