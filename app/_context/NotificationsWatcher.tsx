"use client";

import useSWR, { useSWRConfig } from "swr";
import { useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { authClient } from "@/app/lib/auth-client";
import { ToastType } from "@/app/_components/ui/Toast";
import { useToast } from "@/app/_context/ToastProvider";

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => res.json());

export default function NotificationWatcher() {
    const t = useTranslations("notifications");
    const locale = useLocale();
    const { addToast } = useToast();
    const { data: session } = authClient.useSession();
    const { mutate } = useSWRConfig();
    const lastNotifiedId = useRef<string | null>(null);

    useSWR(session ? "/api/notifications" : null, fetcher, {
        refreshInterval: 10 * 1000,
        onSuccess: async (data) => {
            if (!Array.isArray(data)) return;

            const latest = data[0];

            if (
                latest &&
                !latest.read &&
                latest._id !== lastNotifiedId.current
            ) {
                if (lastNotifiedId.current !== null) {
                    const values = { ...(latest.bodyValues || {}) };

                    if (
                        values.relicI18n &&
                        typeof values.relicI18n === "object"
                    ) {
                        const relicMap = values.relicI18n as Record<
                            string,
                            { displayName?: string }
                        >;

                        values.relic =
                            relicMap[locale]?.displayName ||
                            relicMap["en"]?.displayName ||
                            t("defaultRelicName");
                    }

                    const displayTitle = latest.titleKey
                        ? t(latest.titleKey)
                        : latest.title || t("defaultTitle");

                    const displayBody = latest.bodyKey
                        ? t(latest.bodyKey, values)
                        : latest.body || "";

                    addToast({
                        title: displayTitle,
                        content: displayBody,
                        toastType: ToastType.Info,
                        timerSeconds: 30,
                    });

                    try {
                        await fetch("/api/notifications", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                notificationId: latest._id,
                            }),
                            credentials: "include",
                        });

                        mutate("/api/notifications");
                    } catch (err) {
                        console.error(
                            "Failed to auto-mark notification as read",
                            err,
                        );
                    }
                }

                lastNotifiedId.current = latest._id;
            }
        },
    });

    return null;
}
