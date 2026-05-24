"use client";

import React, { useEffect, useState } from "react";
import Button from "@/app/_components/ui/Button";
import Icon from "@/app/_components/ui/Icon";
import { useTranslations } from "next-intl";
import { ToastType } from "@/app/_components/ui/Toast";
import { useToast } from "@/app/_context/ToastProvider";

interface WarframeAccount {
    name: string;
    platform: string;
}

interface JoinSquadWithAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (accountName: string, platform: string) => void;
}

export default function JoinSquadWithAccountModal({
    isOpen,
    onClose,
    onConfirm,
}: JoinSquadWithAccountModalProps) {
    const { addToast } = useToast();
    const t = useTranslations("relicHunting.squadCard");
    const [accounts, setAccounts] = useState<WarframeAccount[]>([]);
    const [selected, setSelected] = useState<string>("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // If it's not open, just exit.
        // No need to setState here; the 'key' prop on the parent handles the reset.
        if (!isOpen) return;

        let isMounted = true;

        const fetchAccounts = async () => {
            try {
                // Moving this into the async function
                // prevents the "synchronous" warning.
                setLoading(true);

                const res = await fetch("/api/user/accounts");
                if (!res.ok) throw new Error("Failed to fetch accounts");

                const data = await res.json();

                if (isMounted) {
                    setAccounts(data.accounts || []);
                }
            } catch (err) {
                console.error("Error fetching accounts:", err);
                if (isMounted) {
                    addToast({
                        content: "Could not load your Warframe accounts.",
                        toastType: ToastType.Error,
                    });
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchAccounts();

        return () => {
            isMounted = false;
        };
    }, [isOpen, addToast]);

    const handleConfirm = () => {
        const account = accounts.find((acc) => acc.name === selected);
        if (account) {
            onConfirm(account.name, account.platform);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="relative bg-background border border-border p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95">
                <h3 className="text-lg font-bold mb-4 uppercase tracking-tight">
                    {t("selectAccountTitle", {
                        defaultValue: "Select Account",
                    })}
                </h3>

                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-1">
                    {loading ? (
                        <p className="text-sm text-content/60 text-center py-4 italic">
                            {t("loadingAccounts", {
                                defaultValue: "Loading accounts...",
                            })}
                        </p>
                    ) : accounts.length > 0 ? (
                        accounts.map((acc) => (
                            <label
                                key={acc.name}
                                className={`flex items-center justify-between p-3 border cursor-pointer transition-all hover:bg-accent/10 ${
                                    selected === acc.name
                                        ? "border-primary bg-primary/5"
                                        : "border-border"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="acc"
                                        value={acc.name}
                                        onChange={() => setSelected(acc.name)}
                                        checked={selected === acc.name}
                                        className="accent-primary h-4 w-4"
                                    />
                                    <span className="font-medium">
                                        {acc.name}
                                    </span>
                                </div>
                                <Icon
                                    name={acc.platform}
                                    type="svg"
                                    size={18}
                                />
                            </label>
                        ))
                    ) : (
                        <p className="text-sm text-content/60 text-center py-4">
                            {t("noAccountsFound", {
                                defaultValue: "No accounts found.",
                            })}
                        </p>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button onClick={onClose} className="flex-1">
                        {t("cancel", { defaultValue: "Cancel" })}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selected || loading}
                        className="flex-1"
                    >
                        {t("confirmJoin", { defaultValue: "Confirm Join" })}
                    </Button>
                </div>
            </div>
        </div>
    );
}
