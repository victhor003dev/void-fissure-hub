"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { SquadCard, Squad } from "./SquadCard";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";

interface SquadResponse {
    totalSquads: number;
    squads: Squad[];
}

interface SquadListProps {
    onTotalChange?: (total: number) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SquadList({ onTotalChange }: SquadListProps) {
    const t = useTranslations("relicHunting.squads");
    const locale = useLocale();
    const searchParams = useSearchParams();

    const queryString = searchParams.toString();
    const apiUrl = `/api/squad/search?locale=${locale}&${queryString}`;

    const { data, error, isLoading, isValidating } = useSWR<SquadResponse>(
        apiUrl,
        fetcher,
        {
            refreshInterval: 30 * 1000,
            revalidateOnFocus: true,
        },
    );

    useEffect(() => {
        if (data?.totalSquads !== undefined && onTotalChange) {
            onTotalChange(data.totalSquads);
        }
    }, [data?.totalSquads, onTotalChange]);

    if (isLoading && !data) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="h-28 sm:h-32 bg-border/10 border border-border/50"
                    />
                ))}
            </div>
        );
    }

    if (error || !data?.squads || data.squads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/30 rounded-sm">
                <p className="text-content/80 italic bg-background p-2 border border-border">
                    {t("noSquadsFound")}
                </p>
            </div>
        );
    }

    const isUpdating = isValidating && data;

    return (
        <div className="flex flex-col gap-4">
            <div
                className={`grid grid-cols-1 lg:grid-cols-2 gap-4 w-full transition-opacity duration-200 ${
                    isUpdating ? "opacity-70" : "opacity-100"
                }`}
            >
                {data.squads.map((squad) => (
                    <div key={squad.id} className="min-w-0 w-full">
                        <SquadCard squad={squad} />
                    </div>
                ))}
            </div>
        </div>
    );
}
