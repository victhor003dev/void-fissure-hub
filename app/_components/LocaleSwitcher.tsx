"use client";

import { useSearchParams } from "next/navigation";
import Input from "@/app/_components/ui/Input";
import { usePathname, useRouter, routing } from "@/i18n/routing";
import { useLocale } from "next-intl";

export default function LocaleSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const labels: Record<string, string> = {
        en: "🇺🇸 EN",
        es: "🇪🇸 ES",
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextLocale = e.target.value;

        const currentParams = searchParams.toString();

        const targetPath = currentParams
            ? `${pathname}?${currentParams}`
            : pathname;

        router.replace(targetPath, { locale: nextLocale });
    };

    return (
        <div className="relative inline-block">
            <Input
                using="select"
                defaultValue={locale}
                onChange={handleLanguageChange}
                className="w-24 cursor-pointer font-bold uppercase"
            >
                {routing.locales.map((loc) => (
                    <option key={loc} value={loc}>
                        {labels[loc] || loc.toUpperCase()}
                    </option>
                ))}
            </Input>
        </div>
    );
}
