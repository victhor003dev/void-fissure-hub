"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ERA_FILTERS, SQUAD_SORTING } from "@/app/[locale]/filters.data";
import SquadList from "@/app/_components/relic_hunting/SquadList";
import FilterRow from "@/app/_components/ui/FilterRow";
import SearchAndSort from "@/app/_components/ui/SearchAndSort";
import CreateSquadModal from "@/app/_components/relic_hunting/CreateSquadModal";
import MySquadList from "@/app/_components/relic_hunting/MySquadList";

export default function RelicHuntingPage() {
    const [totalFound, setTotalFound] = useState(0);
    const t = useTranslations("relicHunting.squads");

    const containerClasses = [
        "grid gap-4 w-full max-w-7xl",
        "grid-cols-1 [grid-template-areas:'total''filter''search''squads']",
        "md:grid-cols-2 md:[grid-template-areas:'filter_total''search_search''squads_squads']",
        "lg:[grid-template-areas:'filter_total''filter_search''squads_squads']",
    ].join(" ");

    return (
        <div className={containerClasses}>
            <div className="[grid-area:filter] flex flex-col justify-start">
                <FilterRow filterKey="era" items={ERA_FILTERS} />
            </div>

            <div className="[grid-area:total] flex items-center justify-end font-bold text-content h-fit lg:pt-1">
                <span className="text-sm uppercase tracking-wider opacity-80">
                    {t.rich("totalFound", {
                        count: totalFound,
                        number: (chunks) => (
                            <span className="text-foreground ml-1 text-base">
                                {chunks}
                            </span>
                        ),
                    })}
                </span>
            </div>

            {/* RIGHT SIDE BOTTOM: Search and Sort */}
            <div className="[grid-area:search] flex flex-col justify-end">
                <SearchAndSort
                    sortOptions={SQUAD_SORTING}
                    defaultSort="recentDesc"
                    searchKey="q"
                    translationNamespace="relicHunting"
                />
            </div>

            {/* LIST AREA */}
            <div className="[grid-area:squads] gap-4 flex flex-col items-center mt-2">
                {/* Personal squads shown first for easy access */}
                <MySquadList />

                <CreateSquadModal />

                <div className="w-full">
                    <SquadList onTotalChange={setTotalFound} />
                </div>
            </div>
        </div>
    );
}
