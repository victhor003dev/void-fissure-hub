"use client";

import { useState } from "react";

export function useInteractiveLabel(
    activeId: string | null,
    fallbackId: string,
) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Priority: Hover > Active > Fallback
    const displayId = hoveredId || activeId || fallbackId;

    const getLabelProps = (id: string) => ({
        onMouseEnter: () => setHoveredId(id),
        onMouseLeave: () => setHoveredId(null),
    });

    return {
        displayId,
        getLabelProps,
    };
}
