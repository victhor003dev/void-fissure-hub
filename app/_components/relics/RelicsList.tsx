"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import RelicCard from "@/app/_components/relics/RelicCard";
import RelicModal from "@/app/_components/relics/RelicModal";
import { EnrichedRelic } from "@/app/api/relics/route";

export default function RelicList({
    onTotalChange,
}: {
    onTotalChange: (n: number) => void;
}) {
    const searchParams = useSearchParams();
    const locale = useLocale();
    const t = useTranslations("relics");

    const era = searchParams.get("era") || "all";
    const query = searchParams.get("q") || "";
    const sort = searchParams.get("sort") || "nameAsc";

    const [data, setData] = useState<EnrichedRelic[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [selectedRelic, setSelectedRelic] = useState<EnrichedRelic | null>(
        null,
    );
    const [isModalOpen, setIsModalOpen] = useState(false);

    const observerTarget = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
        onTotalChange(total);
    }, [total, onTotalChange]);

    const fetchRelics = useCallback(
        async (pageNum: number) => {
            setLoading(true);
            try {
                const limit = pageNum === 1 ? 48 : 24;
                const res = await fetch(
                    `/api/relics?era=${era}&q=${query}&sort=${sort}&locale=${locale}&page=${pageNum}&limit=${limit}`,
                );
                const result = await res.json();
                const newRelics = result.relics as EnrichedRelic[];

                setData((prev) => {
                    if (pageNum === 1) return newRelics;
                    const existingIds = new Set(prev.map((r) => r.uniqueId));
                    const filteredNew = newRelics.filter(
                        (r) => !existingIds.has(r.uniqueId),
                    );
                    return [...prev, ...filteredNew];
                });

                setTotal(result.total);
                setHasMore(pageNum < result.totalPages);
                setPage(pageNum);
            } catch (error) {
                console.error("Failed to fetch relics", error);
            } finally {
                setLoading(false);
            }
        },
        [era, query, sort, locale],
    );

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            fetchRelics(1);
        } else {
            fetchRelics(1);
        }

        scrollContainerRef.current?.scrollTo({ top: 0 });
    }, [era, query, sort, fetchRelics]);

    useEffect(() => {
        if (!hasMore || loading || data.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchRelics(page + 1);
                }
            },
            {
                root: scrollContainerRef.current,
                threshold: 0.1,
                rootMargin: "400px",
            },
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) observer.observe(currentTarget);

        return () => {
            if (currentTarget) observer.disconnect();
        };
    }, [hasMore, loading, data.length, page, fetchRelics]);

    const handleCardClick = (relic: EnrichedRelic) => {
        setSelectedRelic(relic);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    // --- RESPONSIVE GRID LOGIC ---
    // grid-cols-2 ensures we never drop to 1 column.
    // gap-3 saves horizontal space on mobile so cards can be wider.
    const gridClassName =
        "grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] justify-items-center gap-3 sm:gap-6 w-full";

    return (
        <>
            <div
                ref={scrollContainerRef}
                className="w-full h-[calc(100vh-280px)] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar shadow-inner"
            >
                <div className="flex flex-col gap-8 w-full pb-20">
                    <div className={gridClassName}>
                        {data.map((relic) => (
                            <RelicCard
                                key={relic.uniqueId}
                                relic={relic}
                                onClick={() => handleCardClick(relic)}
                            />
                        ))}

                        {(loading || data.length === 0) && (
                            <>
                                {[...Array(12)].map((_, i) => (
                                    <div
                                        key={`skeleton-${i}`}
                                        className="aspect-square w-full max-w-[180px] bg-white/5 animate-pulse border border-white/5"
                                    />
                                ))}
                            </>
                        )}
                    </div>

                    {hasMore && (
                        <div
                            ref={observerTarget}
                            className="h-20 w-full flex items-center justify-center"
                        >
                            {loading && data.length > 0 && (
                                <span className="text-[var(--content-inactive)] animate-pulse text-xs uppercase tracking-[0.2em]">
                                    {t("loadingStatus")}
                                </span>
                            )}
                        </div>
                    )}

                    {!hasMore && data.length > 0 && (
                        <div className="text-center py-4 text-[var(--content-inactive)] text-xs uppercase tracking-widest opacity-40">
                            {t("endOfList")}
                        </div>
                    )}
                </div>
            </div>

            <RelicModal
                key={selectedRelic?.uniqueId || "closed"}
                relic={selectedRelic}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </>
    );
}
