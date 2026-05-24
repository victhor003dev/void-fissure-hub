"use client";

import React, { useState, useEffect } from "react";
import Icon from "@/app/_components/ui/Icon";
import { authClient } from "@/app/lib/auth-client";
import Button from "@/app/_components/ui/Button";
import { useTranslations } from "next-intl";

import { ToastType } from "@/app/_components/ui/Toast";

import SquadDetailsModal, {
    DetailedSquad,
} from "@/app/_components/relic_hunting/SquadDetails";
import JoinSquadWithAccountModal from "@/app/_components/relic_hunting/JoinSquadWithAccountModal";
import { useToast } from "@/app/_context/ToastProvider";
import { disbandSquad, joinSquad, leaveSquad } from "@/app/lib/actions/squads";

export interface Squad {
    id: string;
    relicName: string;
    relicEra: string;
    refinement: "Intact" | "Exceptional" | "Flawless" | "Radiant";
    executionDate: string;
    currentTenno: number;
    maxTenno: number;
    ownerId?: string;
}

interface Participant {
    id: string;
    name: string;
    isLeader: boolean;
    platform: string;
}

const refinementTranslations = {
    Intact: "refinement.intact",
    Exceptional: "refinement.exceptional",
    Flawless: "refinement.flawless",
    Radiant: "refinement.radiant",
} as const;

export function SquadCard({ squad: initialSquad }: { squad: Squad }) {
    const { data: session } = authClient.useSession();
    const t = useTranslations("relicHunting.squadCard");
    const { addToast } = useToast();

    // --- State ---
    const [mounted, setMounted] = useState(false);
    const [dynamicSize, setDynamicSize] = useState(80);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isAccountSelectOpen, setIsAccountSelectOpen] = useState(false);

    const [fullSquadData, setFullSquadData] = useState<DetailedSquad>(
        initialSquad as DetailedSquad,
    );
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isMember, setIsMember] = useState(false);
    const [loading, setLoading] = useState(false);

    // --- Hydration-Safe Effects ---
    useEffect(() => {
        // requestAnimationFrame avoids the "synchronous cascading render" warning
        // by deferring the state update to the next paint cycle.
        const frame = requestAnimationFrame(() => {
            setMounted(true);
        });

        const handleResize = () => {
            setDynamicSize(window.innerWidth >= 520 ? 120 : 80);
        };

        handleResize();
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    // --- Derived Date ---
    const formattedDate = mounted
        ? new Date(initialSquad.executionDate)
              .toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
              })
              .replace(",", "")
        : "--/--/-- --:--";

    // --- Handlers ---
    const handleOpenDetails = async () => {
        setIsDetailsOpen(true);
        setLoading(true);
        try {
            const res = await fetch(`/api/squad/${initialSquad.id}`);
            if (res.status === 403) return;

            const data = await res.json();
            setIsMember(data.isMember);
            setParticipants(data.isMember ? data.participants : []);

            if (data.squad) {
                setFullSquadData(data.squad);
            } else if (data.ownerId) {
                setFullSquadData((prev) => ({
                    ...prev,
                    ownerId: data.ownerId,
                }));
            }
        } catch {
            addToast({
                content: "Failed to load squad details.",
                toastType: ToastType.Error,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleJoinSquad = async (accountName: string, platform: string) => {
        setLoading(true);
        try {
            const result = await joinSquad(
                initialSquad.id,
                accountName,
                platform,
            );

            if (result.success) {
                addToast({
                    title: t("toast.joinSuccessTitle"),
                    content: t("toast.joinSuccessContent"),
                    toastType: ToastType.Success,
                });
                await handleOpenDetails();
                setIsAccountSelectOpen(false);
            } else {
                addToast({
                    title: t("toast.errorTitle"),
                    content: result.error
                        ? t(`toast.${result.error}`)
                        : t("toast.joinErrorContent"),
                    toastType: ToastType.Error,
                });
            }
        } catch {
            addToast({
                title: t("toast.errorTitle"),
                content: t("toast.genericErrorContent"),
                toastType: ToastType.Error,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveSquad = async () => {
        try {
            const result = await leaveSquad(initialSquad.id);

            if (result.success) {
                addToast({
                    title: t("toast.leaveSuccessTitle"),
                    content: t("toast.leaveSuccessContent"),
                    toastType: ToastType.Info,
                });
                await handleOpenDetails();
            } else {
                addToast({
                    title: t("toast.errorTitle"),
                    content: t("toast.leaveErrorContent"),
                    toastType: ToastType.Error,
                });
            }
        } catch {
            addToast({
                title: t("toast.errorTitle"),
                content: t("toast.connectionErrorContent"),
                toastType: ToastType.Error,
            });
        }
    };

    const handleDisbandSquad = async () => {
        try {
            const result = await disbandSquad(initialSquad.id);

            if (result.success) {
                addToast({
                    title: t("toast.disbandSuccessTitle"),
                    content: t("toast.disbandSuccessContent"),
                    toastType: ToastType.Success,
                });
                setIsDetailsOpen(false);
            } else {
                addToast({
                    title: t("toast.errorTitle"),
                    content: t("toast.disbandErrorContent"),
                    toastType: ToastType.Error,
                });
            }
        } catch {
            addToast({
                title: t("toast.errorTitle"),
                content: t("toast.genericErrorContent"),
                toastType: ToastType.Error,
            });
        }
    };

    const iconPath = `relic/${initialSquad.relicEra}Relic${initialSquad.refinement}`;

    return (
        <>
            <div className="flex items-center bg-background border border-border gap-2 min-[440px]:gap-4 p-1 transition-colors group relative overflow-hidden h-28 sm:h-32">
                <div className="hidden min-[440px]:flex shrink-0 items-center justify-center w-24 min-[520px]:w-32">
                    <Icon
                        type="png"
                        name={iconPath}
                        className="object-contain"
                        size={dynamicSize}
                    />
                </div>

                <div className="hidden min-[440px]:block w-2 h-full separator-bg [--sep-stop:30%] shrink-0" />

                <div className="flex flex-col flex-1 min-w-0 pl-2 min-[440px]:pl-0 py-1 justify-center">
                    <h3 className="text-base sm:text-lg font-semibold text-content truncate w-full">
                        {initialSquad.relicName}
                    </h3>
                    <span className="text-primary uppercase text-xs sm:text-sm font-bold truncate">
                        [{t(refinementTranslations[initialSquad.refinement])}]
                    </span>
                    <span className="text-content/80 text-xs sm:text-sm tabular-nums">
                        {formattedDate}
                    </span>
                    <span className="font-medium mt-auto text-xs sm:text-base text-foreground">
                        {t("squadSize", {
                            currentSize:
                                participants.length ||
                                initialSquad.currentTenno,
                            maxSize: initialSquad.maxTenno,
                        })}
                    </span>
                </div>

                <div className="flex items-end h-full pr-2 min-[440px]:pr-1 pb-1 shrink-0">
                    {!session ? (
                        <span className="interactive-shadow-4 p-2 text-content uppercase text-[10px] min-[440px]:text-xs whitespace-nowrap">
                            {t("loginToJoinLabel")}
                        </span>
                    ) : (
                        <Button onClick={handleOpenDetails} disabled={loading}>
                            {t("viewButton")}
                        </Button>
                    )}
                </div>
            </div>

            <SquadDetailsModal
                squad={fullSquadData}
                participants={participants}
                isOpen={isDetailsOpen}
                isMember={isMember}
                userId={session?.user?.id}
                onClose={() => setIsDetailsOpen(false)}
                onJoinRequest={() => setIsAccountSelectOpen(true)}
                onLeave={handleLeaveSquad}
                onDisband={handleDisbandSquad}
            />

            <JoinSquadWithAccountModal
                key={isAccountSelectOpen ? "open" : "closed"}
                isOpen={isAccountSelectOpen}
                onClose={() => setIsAccountSelectOpen(false)}
                onConfirm={handleJoinSquad}
            />
        </>
    );
}
