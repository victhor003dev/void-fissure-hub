"use client";

import React, { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { useTranslations, useLocale } from "next-intl";
import { authClient } from "@/app/lib/auth-client";
import Button, { ButtonSizes } from "@/app/_components/ui/Button";
import Icon from "@/app/_components/ui/Icon";
import { BodyValue } from "@/app/lib/notifications";

interface Notification {
    _id: string;
    userId: string;
    type: string;
    titleKey?: string;
    bodyKey?: string;
    bodyValues?: Record<string, BodyValue>;
    title?: string;
    body?: string;
    link?: string;
    read: boolean;
    createdAt: string;
}

const fetcher = async (url: string) => {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch");
    }
    return res.json();
};

export default function NotificationList() {
    const t = useTranslations("notifications");
    const locale = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { data: session } = authClient.useSession();

    const {
        data: notifications,
        error,
        mutate,
        isLoading,
    } = useSWR<Notification[]>(session ? "/api/notifications" : null, fetcher);

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

    const isArray = Array.isArray(notifications);
    const unreadCount = isArray
        ? notifications.filter((n) => !n.read).length
        : 0;

    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (isOpen && unreadCount > 0 && isArray) {
            timer = setTimeout(async () => {
                try {
                    const unreadIds = notifications
                        .filter((n) => !n.read)
                        .map((n) => n._id);

                    if (unreadIds.length === 0) return;

                    await fetch("/api/notifications", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ids: unreadIds }),
                        credentials: "include",
                    });

                    mutate();
                } catch (err) {
                    console.error("Failed to bulk mark as read", err);
                }
            }, 1500);
        }

        return () => clearTimeout(timer);
    }, [isOpen, unreadCount, notifications, isArray, mutate]);

    if (!session) return null;

    const handleMarkAsRead = async (id: string) => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId: id }),
                credentials: "include",
            });
            mutate();
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    return (
        <div className="relative inline-block" ref={wrapperRef}>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                size={ButtonSizes.Square}
                className="relative p-2"
            >
                <Icon name="ui/bell" size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white ring-2 ring-background">
                        {unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                /* RESPONSIVE POSITIONING:
                   Mobile: Fixed center using left-1/2 and -translate-x-1/2.
                   Desktop (md): Absolute aligned to the right of the button.
                */
                <div className="fixed left-1/2 top-[70px] z-50 mt-2 w-[calc(100vw-2rem)] -translate-x-1/2 border border-border bg-background shadow-xl origin-top rounded-sm animate-in fade-in zoom-in-95 duration-200 md:absolute md:left-auto md:right-0 md:top-full md:w-80 md:translate-x-0">
                    <div className="flex items-center justify-between border-b border-border bg-background/50 p-3 backdrop-blur-md">
                        <span className="font-bold text-active">
                            {t("title")}
                        </span>
                        <span className="text-xs text-content">
                            {unreadCount} {t("unread")}
                        </span>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto md:max-h-96">
                        {error ? (
                            <div className="p-4 text-center text-xs text-error-400">
                                {t("errorLoading")}
                            </div>
                        ) : isLoading ? (
                            <div className="p-4 text-center text-xs text-content animate-pulse">
                                {t("loading")}
                            </div>
                        ) : !isArray || notifications.length === 0 ? (
                            <div className="p-8 text-center text-sm italic text-content">
                                {t("noNotifications")}
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const translationValues: Record<
                                    string,
                                    string | number
                                > = {};

                                if (n.bodyValues) {
                                    Object.entries(n.bodyValues).forEach(
                                        ([key, value]) => {
                                            if (
                                                typeof value === "string" ||
                                                typeof value === "number"
                                            ) {
                                                translationValues[key] = value;
                                            }
                                        },
                                    );
                                }

                                // Tiered Relic Resolution
                                if (
                                    n.bodyValues?.relicI18n &&
                                    typeof n.bodyValues.relicI18n === "object"
                                ) {
                                    const relicMap = n.bodyValues
                                        .relicI18n as Record<
                                        string,
                                        { displayName?: string }
                                    >;
                                    translationValues.relic =
                                        relicMap[locale]?.displayName ||
                                        relicMap["en"]?.displayName ||
                                        (n.bodyValues.era as string) ||
                                        t("defaultRelicName");
                                } else if (n.bodyValues?.era) {
                                    translationValues.relic = n.bodyValues
                                        .era as string;
                                } else if (!translationValues.relic) {
                                    translationValues.relic =
                                        t("defaultRelicName");
                                }

                                if (!translationValues.host)
                                    translationValues.host =
                                        (n.bodyValues?.host as string) ||
                                        t("unknownUser");
                                if (!translationValues.accountName)
                                    translationValues.accountName =
                                        (n.bodyValues?.accountName as string) ||
                                        t("unknownUser");

                                const displayTitle = n.titleKey
                                    ? t(n.titleKey)
                                    : n.title || t("defaultTitle");
                                const displayBody = n.bodyKey
                                    ? t(n.bodyKey, translationValues)
                                    : n.body || "";

                                return (
                                    <div
                                        key={n._id}
                                        onClick={() =>
                                            !n.read && handleMarkAsRead(n._id)
                                        }
                                        className={`cursor-pointer border-b border-border/50 p-4 transition-all duration-300 last:border-0 ${
                                            !n.read
                                                ? "bg-primary/5 hover:bg-primary/10"
                                                : "hover:bg-primary/40"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <h4
                                                className={`text-sm ${!n.read ? "font-bold text-active" : "text-content"}`}
                                            >
                                                {displayTitle}
                                            </h4>
                                            {!n.read && (
                                                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                                            )}
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-xs text-content">
                                            {displayBody}
                                        </p>
                                        <span className="mt-2 block text-[10px] text-neutral-500">
                                            {new Date(
                                                n.createdAt,
                                            ).toLocaleString(locale, {
                                                dateStyle: "short",
                                                timeStyle: "short",
                                            })}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
