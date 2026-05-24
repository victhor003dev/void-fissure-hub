"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDebounce } from "@/app/_hooks/useDebounce";
import Input from "@/app/_components/ui/Input";
import { useTranslations } from "next-intl";
import Icon from "@/app/_components/ui/Icon";

export interface Relic {
    uniqueId: string;
    era: string;
    isVaulted: boolean;
    i18n: Record<string, { displayName: string }>;
    rewards: Array<{
        rarity: string;
        i18n: Record<string, string>;
    }>;
}

interface RelicAutocompleteProps {
    locale: string;
    name: string;
    onSelectionChange: (relicId: string | null, relic?: Relic | null) => void;
    required?: boolean;
    defaultValue?: string; // New prop to receive 'q' from URL
}

const getRarityIcon = (rarity: string) => {
    switch (rarity?.toUpperCase()) {
        case "RARE":
            return "rarity/Rare";
        case "UNCOMMON":
            return "rarity/Uncommon";
        case "COMMON":
        default:
            return "rarity/Common";
    }
};

export default function RelicAutocomplete({
    locale,
    name,
    onSelectionChange,
    required,
    defaultValue,
}: RelicAutocompleteProps) {
    const [query, setQuery] = useState(defaultValue || "");
    const [results, setResults] = useState<Relic[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedRelic, setSelectedRelic] = useState<Relic | null>(null);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const isSelectingRef = useRef(false);

    const debouncedQuery = useDebounce(query, 300);
    const t = useTranslations("search.relicAutocomplete");

    // Memoized selection handler to prevent unnecessary re-renders in effects
    const handleSelect = useCallback(
        (relic: Relic) => {
            isSelectingRef.current = true;
            setSelectedRelic(relic);
            setQuery(relic.i18n[locale].displayName);
            setIsOpen(false);
            setResults([]);
            onSelectionChange(relic.uniqueId, relic);
        },
        [locale, onSelectionChange],
    );

    // --- EFFECT: Handle Outside Clicks ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- EFFECT: Handle Initial Value (URL Redirect) ---
    useEffect(() => {
        if (defaultValue && defaultValue.length >= 2) {
            const autoSelectInitial = async () => {
                setLoading(true);
                try {
                    const res = await fetch(
                        `/api/relics/search?q=${encodeURIComponent(defaultValue)}&locale=${locale}`,
                    );
                    if (res.ok) {
                        const data: Relic[] = await res.json();
                        // Find an exact name match to be safe
                        const match = data.find(
                            (r) =>
                                r.i18n[locale].displayName.toLowerCase() ===
                                defaultValue.toLowerCase(),
                        );
                        if (match) {
                            handleSelect(match);
                        }
                    }
                } catch (err) {
                    console.error("Failed to auto-select relic from URL:", err);
                } finally {
                    setLoading(false);
                }
            };
            autoSelectInitial();
        }
    }, [defaultValue, locale, handleSelect]);

    // --- EFFECT: Handle Live Search ---
    useEffect(() => {
        const controller = new AbortController();

        const fetchRelics = async () => {
            if (isSelectingRef.current) {
                isSelectingRef.current = false;
                return;
            }

            if (debouncedQuery.length < 2) {
                setResults([]);
                setIsOpen(false);
                return;
            }

            // Don't search if the query matches the already selected relic
            if (
                selectedRelic &&
                debouncedQuery === selectedRelic.i18n[locale].displayName
            ) {
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(
                    `/api/relics/search?q=${encodeURIComponent(debouncedQuery)}&locale=${locale}`,
                    { signal: controller.signal },
                );

                if (!res.ok) throw new Error("Network response was not ok");

                const data: Relic[] = await res.json();
                setResults(data);
                setIsOpen(true);
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") return;
                console.error("Search error:", err);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        fetchRelics();
        return () => controller.abort();
    }, [debouncedQuery, locale, selectedRelic]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        isSelectingRef.current = false;
        setQuery(val);

        if (selectedRelic && val !== selectedRelic.i18n[locale].displayName) {
            setSelectedRelic(null);
            onSelectionChange(null, null);
        }
    };

    const deployableClasses =
        "absolute z-50 w-full mt-1 border border-border max-h-60 overflow-auto bg-background/90 backdrop-blur-sm text-active shadow-xl scrollbar";

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <Input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (
                            query.length >= 2 &&
                            (!selectedRelic ||
                                query !==
                                    selectedRelic.i18n[locale].displayName)
                        ) {
                            setIsOpen(true);
                        }
                    }}
                    placeholder={t("placeholder")}
                    className="w-full"
                    autoComplete="off"
                />
                {loading && (
                    <div className="absolute right-3 top-2.5">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {/* Hidden input for the primary ID used in forms */}
            <input
                type="hidden"
                name={name}
                value={selectedRelic?.uniqueId || ""}
                required={required}
            />

            {/* Hidden input for the Era (important for your server actions) */}
            <input
                type="hidden"
                name="relicEra"
                value={selectedRelic?.era || ""}
            />

            {isOpen && results.length > 0 && (
                <ul className={deployableClasses}>
                    {results.map((relic) => {
                        const searchLower = query.toLowerCase();
                        const matchingReward = relic.rewards?.find((r) =>
                            r.i18n[locale]?.toLowerCase().includes(searchLower),
                        );
                        const nameMatches = relic.i18n[locale].displayName
                            .toLowerCase()
                            .includes(searchLower);

                        return (
                            <li
                                key={relic.uniqueId}
                                onClick={() => handleSelect(relic)}
                                className="px-4 py-3 hover:bg-neutral-800 cursor-pointer flex flex-col transition-colors border-b border-border/40 last:border-0"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-active">
                                        {relic.i18n[locale].displayName}
                                    </span>
                                    {relic.isVaulted && (
                                        <span className="uppercase text-[10px] tracking-wider border border-primary/50 px-1.5 py-0.5 text-primary">
                                            {t("vaulted")}
                                        </span>
                                    )}
                                </div>

                                {!nameMatches && matchingReward && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-xs text-content italic">
                                            {t("rewardContains", {
                                                reward: matchingReward.i18n[
                                                    locale
                                                ],
                                            })}
                                        </span>
                                        <Icon
                                            name={getRarityIcon(
                                                matchingReward.rarity,
                                            )}
                                            type="png"
                                            size={16}
                                        />
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {isOpen &&
                query.length >= 2 &&
                !loading &&
                results.length === 0 && (
                    <div className={deployableClasses}>
                        <div className="px-4 py-3 text-neutral-400 italic">
                            {t("noResults", { query: query })}
                        </div>
                    </div>
                )}
        </div>
    );
}
