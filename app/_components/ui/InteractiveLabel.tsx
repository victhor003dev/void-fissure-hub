"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface Props {
    labelKey: string;
    namespace?: string;
    className?: string;
}

const InteractiveLabel = ({
    labelKey,
    namespace = "navbar",
    className = "",
}: Props) => {
    const t = useTranslations(namespace);
    const text = t.has(labelKey) ? t(labelKey) : labelKey;

    const baseClasses =
        "text-lg md:text-xl font-bold text-content uppercase tracking-tighter typewriter-text";

    return (
        <div className={`h-8 flex items-end ${className}`}>
            <span className="typewriter-container">
                <span
                    key={labelKey}
                    className={`${baseClasses}`}
                    style={{ "--n": text.length } as React.CSSProperties}
                >
                    {text}
                </span>
            </span>
        </div>
    );
};

export default InteractiveLabel;
