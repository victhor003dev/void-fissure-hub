"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Input from "@/app/_components/ui/Input";

export interface SortOption {
    id: string;
    tKey: string;
}

interface SearchAndSortProps {
    searchKey?: string;
    sortKey?: string;
    sortOptions: SortOption[];
    defaultSort?: string;
    placeholderTKey?: string;
    translationNamespace?: string;
}

export default function SearchAndSort({
    searchKey = "query",
    sortKey = "sort",
    sortOptions,
    defaultSort,
    placeholderTKey = "searchPlaceholder",
    translationNamespace = "",
}: SearchAndSortProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations(translationNamespace);

    const [searchTerm, setSearchTerm] = useState(
        searchParams.get(searchKey) || "",
    );

    const updateUrl = useCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());

            if (!value) {
                params.delete(key);
            } else {
                params.set(key, value);
            }

            const queryString = params.toString();
            const url = queryString ? `${pathname}?${queryString}` : pathname;

            router.push(url, { scroll: false });
        },
        [searchParams, pathname, router],
    );

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm !== (searchParams.get(searchKey) || "")) {
                updateUrl(searchKey, searchTerm);
            }
        }, 400); // 400ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, searchKey, updateUrl, searchParams]);

    return (
        <div className="flex flex-row gap-2 p-2 w-full h-fit">
            <Input
                using="select"
                value={searchParams.get(sortKey) || defaultSort || ""}
                onChange={(e) => updateUrl(sortKey, e.target.value)}
                className="p-2 bg-background w-fit shrink"
            >
                {sortOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                        {t(option.tKey)}
                    </option>
                ))}
            </Input>
            <Input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t(placeholderTKey)}
                className=" p-2 bg-background grow"
            />
        </div>
    );
}
