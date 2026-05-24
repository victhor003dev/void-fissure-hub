import { FilterItem } from "@/app/_components/ui/FilterRow";
import { SortOption } from "@/app/_components/ui/SearchAndSort";

export const ERA_FILTERS: FilterItem[] = [
    {
        id: "all",
        icon: "ui/InfiniteIcon",
        tKey: "all",
        isAll: true,
    },
    {
        id: "lith",
        icon: "ui/LithEraRelic",
        tKey: "lith",
    },
    {
        id: "meso",
        icon: "ui/MesoEraRelic",
        tKey: "meso",
    },
    {
        id: "neo",
        icon: "ui/NeoEraRelic",
        tKey: "neo",
    },
    {
        id: "axi",
        icon: "ui/AxiEraRelic",
        tKey: "axi",
    },
    {
        id: "requiem",
        icon: "ui/RequiemEraRelic",
        tKey: "requiem",
    },
];

export const SQUAD_SORTING: SortOption[] = [
    { id: "recentDesc", tKey: "sort.mostRecent" },
    { id: "recentAsc", tKey: "sort.leastRecent" },
    { id: "refinementDesc", tKey: "sort.refinementDesc" },
    { id: "refinementAsc", tKey: "sort.refinementAsc" },
    { id: "slotsAvailableAsc", tKey: "sort.slotsAvailableAsc" },
    { id: "slotsAvailableDesc", tKey: "sort.slotsAvailableDesc" },
    { id: "soonestAsc", tKey: "sort.soonestAsc" },
    { id: "soonestDesc", tKey: "sort.soonestDesc" },
];
