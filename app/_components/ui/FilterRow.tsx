"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import Button, { ButtonSizes } from "@/app/_components/ui/Button";
import Icon from "@/app/_components/ui/Icon";
import InteractiveLabel from "@/app/_components/ui/InteractiveLabel";
import { useInteractiveLabel } from "@/app/_hooks/useInteractiveLabel";

export interface FilterItem {
    id: string;
    icon: string;
    tKey: string;
    isAll?: boolean;
}

interface FilterRowProps {
    items: FilterItem[];
    filterKey?: string;
    defaultValue?: string;
    translationNamespace?: string;
}

export default function FilterRow({
    items,
    filterKey = "filter",
    defaultValue,
    translationNamespace = "",
}: FilterRowProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const allItem = useMemo(() => items.find((i) => i.isAll), [items]);

    const activeValue = useMemo(() => {
        const currentParam = searchParams.get(filterKey);
        if (currentParam) return currentParam;
        return defaultValue || allItem?.id || null;
    }, [searchParams, filterKey, defaultValue, allItem]);

    const { displayId, getLabelProps } = useInteractiveLabel(
        activeValue,
        allItem?.id || "",
    );

    const activeLabelKey = useMemo(() => {
        return items.find((i) => i.id === displayId)?.tKey || "";
    }, [displayId, items]);

    const updateUrl = useCallback(
        (value: string, replace = false) => {
            const params = new URLSearchParams(searchParams.toString());
            const targetItem = items.find((i) => i.id === value);

            if (targetItem?.isAll) {
                params.delete(filterKey);
            } else {
                params.set(filterKey, value);
            }

            const queryString = params.toString();
            const url = queryString ? `${pathname}?${queryString}` : pathname;

            if (replace) {
                router.replace(url, { scroll: false });
            } else {
                router.push(url, { scroll: false });
            }
        },
        [searchParams, filterKey, pathname, router, items],
    );

    useEffect(() => {
        const currentParam = searchParams.get(filterKey);
        if (!currentParam && defaultValue && defaultValue !== allItem?.id) {
            updateUrl(defaultValue, true);
        }
    }, [searchParams, filterKey, defaultValue, allItem, updateUrl]);

    return (
        <div className="flex flex-col w-full">
            <InteractiveLabel
                labelKey={activeLabelKey}
                namespace={translationNamespace}
                className="mb-1 ml-2"
            />

            <nav className="p-2 flex flex-row gap-1 w-full overflow-x-auto scrollbar-hide">
                {items.map((item) => (
                    <Button
                        key={item.id}
                        size={ButtonSizes.Square}
                        active={activeValue === item.id}
                        className="bg-background shrink-0"
                        onClick={() => updateUrl(item.id)}
                        {...getLabelProps(item.id)}
                    >
                        <Icon name={item.icon} />
                    </Button>
                ))}
            </nav>
        </div>
    );
}
