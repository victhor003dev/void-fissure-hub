"use client";

import Input from "@/app/_components/ui/Input";
import { usePathname, useRouter, routing } from "@/i18n/routing";
import { useLocale } from "next-intl";

export default function LocaleSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const labels: Record<string, string> = {
        en: "🇺🇸 EN",
        es: "🇪🇸 ES",
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextLocale = e.target.value;
        router.replace(pathname, { locale: nextLocale });
    };

    return (
        <div className="relative inline-block">
            <Input
                as="select"
                defaultValue={locale}
                onChange={handleLanguageChange}
                className="w-24 cursor-pointer font-bold uppercase"
            >
                {/* Type 'loc' as a string to satisfy the linter */}
                {routing.locales.map((loc: string) => (
                    <option key={loc} value={loc}>
                        {labels[loc] || loc.toUpperCase()}
                    </option>
                ))}
            </Input>
        </div>
    );
}
