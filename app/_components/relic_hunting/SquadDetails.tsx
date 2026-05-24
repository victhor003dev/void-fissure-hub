"use client";

import React, { useState, useEffect } from "react";
import Icon from "@/app/_components/ui/Icon";
import Button from "@/app/_components/ui/Button";
import { useTranslations } from "next-intl";
import { Squad } from "./SquadCard";
import ConfirmationModal from "@/app/_components/ui/ConfirmationModal";

export interface DetailedSquad extends Squad {
    ownerId: string;
}

interface Participant {
    id: string;
    name: string;
    isLeader: boolean;
    platform: string;
}

interface SquadDetailsModalProps {
    squad: DetailedSquad;
    participants: Participant[];
    isOpen: boolean;
    onClose: () => void;
    userId: string | undefined;
    onJoinRequest: () => void;
    onLeave: () => Promise<void>;
    onDisband: () => Promise<void>;
    isMember: boolean;
}

export default function SquadDetailsModal({
    squad,
    participants,
    isOpen,
    onClose,
    userId,
    isMember,
    onJoinRequest,
    onLeave,
    onDisband,
}: SquadDetailsModalProps) {
    const t = useTranslations("relicHunting.squadCard");
    const [showConfirmDisband, setShowConfirmDisband] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");

    // Countdown logic with Days/Hours/Minutes/Seconds
    useEffect(() => {
        if (!isOpen) return;

        const calculateTime = () => {
            const now = new Date().getTime();
            const target = new Date(squad.executionDate).getTime();
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft(t("timeUntilExpired"));
                return;
            }

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor(
                (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
            );
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            const parts = [];
            if (d > 0) parts.push(`${d}d`);
            if (h > 0 || d > 0) parts.push(`${h}h`);
            if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
            parts.push(`${s}s`);

            setTimeLeft(parts.join(" "));
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [isOpen, squad.executionDate, t]);

    if (!isOpen) return null;

    const isOwner = Boolean(
        userId && squad.ownerId && String(squad.ownerId) === String(userId),
    );

    const slots = Array(4)
        .fill(null)
        .map((_, i) => participants[i] || null);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            />

            <div className="relative bg-background border border-border w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8">
                {/* Relic Header */}
                <div className="flex gap-4 mb-6">
                    <Icon
                        type="png"
                        name={`relic/${squad.relicEra}Relic${squad.refinement}`}
                        size={80}
                    />
                    <div className="flex flex-col justify-center">
                        <h2 className="text-xl font-bold uppercase">
                            {squad.relicName}
                        </h2>
                        <span className="text-primary font-bold uppercase">
                            [{t(`refinement.${squad.refinement.toLowerCase()}`)}
                            ]
                        </span>
                    </div>
                </div>

                {/* Squad Info: Time and Size */}
                <div className="flex flex-col gap-0.5 mb-4 text-left border-l-2 border-primary/30 pl-3">
                    <div className="text-xs font-bold uppercase text-content/60 flex gap-1">
                        <span>{t("timeUntilLabel")}</span>
                        <span className="text-foreground tabular-nums">
                            {timeLeft}
                        </span>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                        {t("squadSize", {
                            currentSize:
                                participants.length || squad.currentTenno,
                            maxSize: squad.maxTenno,
                        })}
                    </div>
                </div>

                {/* Participants Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
                    {slots.map((p, i) => {
                        const isCurrentUser =
                            p?.id && userId && String(p.id) === String(userId);
                        return (
                            <div
                                key={i}
                                className={`h-16 border flex items-center px-4 gap-3 ${
                                    p?.isLeader
                                        ? "border-primary/50 bg-primary/5"
                                        : "border-border bg-accent/20"
                                } ${!p ? "opacity-40" : ""}`}
                            >
                                {p ? (
                                    <>
                                        <Icon
                                            name={p.platform || "pc"}
                                            type="svg"
                                            size={20}
                                        />
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={`truncate font-medium ${
                                                        p.isLeader
                                                            ? "text-primary"
                                                            : "text-foreground"
                                                    }`}
                                                >
                                                    {p.name}
                                                </span>
                                                {isCurrentUser && (
                                                    <span className="text-[9px] bg-primary/20 text-primary px-1 font-bold uppercase border border-primary/30">
                                                        {t("currentUserBadge")}
                                                    </span>
                                                )}
                                            </div>
                                            {p.isLeader && (
                                                <span className="text-[10px] uppercase font-bold opacity-70">
                                                    {t("hostBadge")}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-xs uppercase tracking-widest mx-auto">
                                        {isMember
                                            ? t("emptySlot")
                                            : t("hiddenSlot")}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Actions Footer */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4">
                    <Button
                        onClick={onClose}
                        className="w-full sm:w-fit order-2 sm:order-1"
                    >
                        {t("close")}
                    </Button>

                    {isOwner ? (
                        <Button
                            onClick={() => setShowConfirmDisband(true)}
                            className="w-full sm:w-fit order-1 sm:order-2 text-error border-error/40"
                        >
                            {t("disbandButton")}
                        </Button>
                    ) : isMember ? (
                        <Button
                            onClick={onLeave}
                            className="w-full sm:w-fit order-1 sm:order-2 text-warning border-color-warning/40"
                        >
                            {t("leaveButton")}
                        </Button>
                    ) : (
                        <Button
                            onClick={onJoinRequest}
                            disabled={participants.length >= 4}
                            /* Default variant for Join */
                            className="w-full sm:w-fit order-1 sm:order-2"
                        >
                            {t("joinButton")}
                        </Button>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={showConfirmDisband}
                onConfirm={async () => {
                    await onDisband();
                    setShowConfirmDisband(false);
                }}
                onCancel={() => setShowConfirmDisband(false)}
                title={t("confirmDisbandTitle")}
                message={t("confirmDisbandMessage")}
            />
        </div>
    );
}
