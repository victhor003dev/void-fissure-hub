"use client";

import useSWR from "swr";
import { useLocale, useTranslations } from "next-intl";
import { authClient } from "@/app/lib/auth-client";
import {
    SquadCard,
    type Squad,
} from "@/app/_components/relic_hunting/SquadCard";

interface MySquad extends Squad {
    isOwner: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MySquadList() {
    const { data: session } = authClient.useSession();
    const locale = useLocale();
    const t = useTranslations("relicHunting.squads");

    const { data, isLoading } = useSWR<{ squads: MySquad[] }>(
        session?.user ? `/api/squad/search?mine=true&locale=${locale}` : null,
        fetcher,
        { refreshInterval: 30000 },
    );

    if (!session || isLoading || !data?.squads?.length) return null;

    const squads = data.squads;

    const hosting = squads.filter((s) => s.isOwner === 1);
    const joined = squads.filter((s) => s.isOwner !== 1);

    return (
        <div className="w-full flex flex-col gap-6 mb-6">
            {/* Hosting Section */}
            {hosting.length > 0 && (
                <div className="flex flex-col gap-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                        {t("hosting")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {hosting.map((squad) => (
                            <SquadCard key={squad.id} squad={squad} />
                        ))}
                    </div>
                </div>
            )}

            {/* Joined Section */}
            {joined.length > 0 && (
                <div className="flex flex-col gap-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/60">
                        {t("joined")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {joined.map((squad) => (
                            <SquadCard key={squad.id} squad={squad} />
                        ))}
                    </div>
                </div>
            )}

            <div className="h-px w-full bg-border/30 mt-4" />
        </div>
    );
}
