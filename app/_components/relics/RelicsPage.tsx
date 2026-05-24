"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ERA_FILTERS } from "@/app/[locale]/filters.data";
import FilterRow from "@/app/_components/ui/FilterRow";
import SearchAndSort from "@/app/_components/ui/SearchAndSort";
import RelicList from "@/app/_components/relics/RelicsList";

const RELIC_SORTING = [
    { id: "nameAsc", tKey: "sorting.nameAsc" },
    { id: "nameDesc", tKey: "sorting.nameDesc" },
    { id: "era", tKey: "sorting.era" },
];

export default function RelicsPage() {
    const [totalFound, setTotalFound] = useState(0);
    const t = useTranslations("relics");

    const containerClasses = [
        "grid gap-4 w-full max-w-7xl mx-auto px-4",
        "grid-cols-1 [grid-template-areas:'total''filter''search''relics']",
        "md:grid-cols-2 md:[grid-template-areas:'filter_total''search_search''relics_relics']",
        "lg:[grid-template-areas:'filter_total''filter_search''relics_relics']",
    ].join(" ");

    return (
        <div className={containerClasses}>
            <div className="[grid-area:filter] flex flex-col justify-start">
                <FilterRow
                    filterKey="era"
                    items={ERA_FILTERS}
                    defaultValue="all"
                />
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

            <div className="[grid-area:search] flex flex-col justify-end">
                <SearchAndSort
                    sortOptions={RELIC_SORTING}
                    defaultSort="nameAsc"
                    searchKey="q"
                    translationNamespace="relics"
                />
            </div>

            {/* col-span-full is critical here to let the grid expand */}
            <div className="[grid-area:relics] w-full mt-2 col-span-full">
                <RelicList onTotalChange={setTotalFound} />
            </div>
        </div>
    );
}
