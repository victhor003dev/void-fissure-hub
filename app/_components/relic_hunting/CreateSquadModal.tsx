"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { authClient } from "@/app/lib/auth-client";
import { useSWRConfig } from "swr"; // Added for immediate UI updates
import Button from "@/app/_components/ui/Button";
import Input from "@/app/_components/ui/Input";
import Icon from "@/app/_components/ui/Icon";
import { createSquad } from "@/app/lib/actions/squads";
import AddAccountModal from "@/app/_components/relic_hunting/AddAccountModal";
import RelicAutocomplete from "@/app/_components/RelicAutocomplete";
import RelicRefinementSelector from "@/app/_components/RelicRefinementSelector";
import ConfirmationModal from "@/app/_components/ui/ConfirmationModal";
import { ToastType } from "@/app/_components/ui/Toast";
import { useToast } from "@/app/_context/ToastProvider";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface WarframeAccount {
    name: string;
    platform: string;
}

interface RelicData {
    uniqueId: string;
    era: string;
    i18n: Record<string, { displayName: string }>;
}

type Refinement = "Intact" | "Exceptional" | "Flawless" | "Radiant";

const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 2);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function CreateSquadModal() {
    const { data: session, isPending: sessionLoading } =
        authClient.useSession();
    const { mutate } = useSWRConfig(); // Initialize SWR mutate
    const t = useTranslations("relicHunting.squads");
    const { addToast } = useToast();
    const locale = useLocale();

    // --- State ---
    const [mounted, setMounted] = useState(false);
    const [userAccounts, setUserAccounts] = useState<WarframeAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedRelic, setSelectedRelic] = useState<RelicData | null>(null);
    const [refinement, setRefinement] = useState<Refinement>("Intact");
    const [executionDate, setExecutionDate] = useState(getMinDateTime());
    const [minDateAttr, setMinDateAttr] = useState(getMinDateTime());
    const [selectedAccountName, setSelectedAccountName] = useState<string>("");
    const [isDateFocused, setIsDateFocused] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<FormData | null>(
        null,
    );

    // --- Actions ---
    const fetchAccounts = useCallback(async () => {
        if (!session?.user?.id) return;
        setAccountsLoading(true);
        try {
            const res = await fetch("/api/user/accounts");
            if (res.ok) {
                const data = await res.json();
                const accounts = data.accounts || [];
                setUserAccounts(accounts);

                if (accounts.length > 0) {
                    setSelectedAccountName((prev) => prev || accounts[0].name);
                }
            }
        } catch (err) {
            console.error("Failed to fetch user accounts:", err);
        } finally {
            setAccountsLoading(false);
        }
    }, [session?.user?.id]);

    const handleAccountAdded = async () => {
        await fetchAccounts();
        setIsAddOpen(false);
        setIsOpen(true);
    };

    // --- Effects ---
    useEffect(() => {
        let active = true;
        const timer = setTimeout(() => {
            if (!active) return;
            setMounted(true);
            if (session?.user?.id) {
                fetchAccounts();
            }
        }, 0);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [session?.user?.id, fetchAccounts]);

    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            const currentMin = getMinDateTime();
            setMinDateAttr(currentMin);
            if (!isDateFocused) {
                setExecutionDate((prev) =>
                    prev < currentMin ? currentMin : prev,
                );
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [isOpen, isDateFocused]);

    if (!session?.user && userAccounts.length > 0) {
        setUserAccounts([]);
        setSelectedAccountName("");
    }

    // --- Handlers ---
    const handleOpen = useCallback(() => {
        if (!mounted || sessionLoading || accountsLoading) return;
        if (!session) return;
        if (userAccounts.length === 0) {
            setIsAddOpen(true);
        } else {
            const freshMin = getMinDateTime();
            setExecutionDate(freshMin);
            setMinDateAttr(freshMin);
            setIsOpen(true);
        }
    }, [
        mounted,
        sessionLoading,
        accountsLoading,
        session,
        userAccounts.length,
    ]);

    const handleClose = () => {
        setIsOpen(false);
        setShowConfirm(false);
        setSelectedRelic(null);
        setRefinement("Intact");
        setPendingFormData(null);
    };

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const relicParam = searchParams.get("relic") || "";

    useEffect(() => {
        const shouldCreate = searchParams.get("create") === "true";
        const refinementQ = searchParams.get("refinement") as Refinement;

        if (shouldCreate && mounted) {
            if (!sessionLoading && !session) {
                addToast({
                    title: t("toast.errorTitle"),
                    content: t("toast.unauthorized"),
                    toastType: ToastType.Error,
                });

                const params = new URLSearchParams(searchParams.toString());
                params.delete("create");
                params.delete("refinement");
                params.delete("relic");

                const newUrl = params.toString()
                    ? `${pathname}?${params.toString()}`
                    : pathname;

                router.replace(newUrl, { scroll: false });
                return;
            }

            if (!isOpen && session) {
                const timer = setTimeout(() => {
                    handleOpen();
                    if (refinementQ) setRefinement(refinementQ);

                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("create");
                    params.delete("refinement");
                    params.delete("relic");

                    const newUrl = params.toString()
                        ? `${pathname}?${params.toString()}`
                        : pathname;

                    router.replace(newUrl, { scroll: false });
                }, 0);

                return () => clearTimeout(timer);
            }
        }
    }, [
        searchParams,
        mounted,
        isOpen,
        handleOpen,
        pathname,
        router,
        session,
        sessionLoading,
        addToast,
        t,
    ]);

    const handleFormSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);

        const selectedAccount = userAccounts.find(
            (acc) => acc.name === selectedAccountName,
        );
        if (selectedAccount) {
            data.set("platform", selectedAccount.platform);
        }

        let localDateValue = data.get("executionDate") as string;
        const selectedDate = new Date(localDateValue);
        const minDateAllowed = new Date(getMinDateTime());

        if (selectedDate.getTime() < minDateAllowed.getTime()) {
            const newMinString = getMinDateTime();
            localDateValue = newMinString;
            setExecutionDate(newMinString);
            addToast({
                content: t("toast.timeAdjusted"),
                toastType: ToastType.Info,
            });
        }

        data.set("executionDate", new Date(localDateValue).toISOString());
        data.set("refinement", refinement);
        data.set("relicEra", selectedRelic?.era || "");

        setPendingFormData(data);
        setShowConfirm(true);
    };

    const handleFinalConfirm = async () => {
        if (!pendingFormData) return;
        try {
            const result = await createSquad(pendingFormData);
            if (result.success) {
                addToast({
                    title: t("toast.createSuccessTitle"),
                    content: t("toast.createSuccessContent"),
                    toastType: ToastType.Success,
                });

                mutate(
                    (key) =>
                        typeof key === "string" &&
                        key.includes("/api/squad/search"),
                    undefined,
                    { revalidate: true },
                );

                handleClose();
            } else {
                addToast({
                    title: t("toast.errorTitle"),
                    content:
                        t(`toast.${result.error}`) || t("toast.genericError"),
                    toastType: ToastType.Error,
                });
                setShowConfirm(false);
            }
        } catch {
            addToast({
                title: t("toast.errorTitle"),
                content: t("toast.connectionError"),
                toastType: ToastType.Error,
            });
        }
    };

    const displayDate = useMemo(() => {
        if (!mounted) return "--/--/-- --:--";
        try {
            return new Date(executionDate).toLocaleString(locale, {
                dateStyle: "short",
                timeStyle: "short",
            });
        } catch {
            return executionDate;
        }
    }, [executionDate, locale, mounted]);

    const isLoading = !mounted || sessionLoading || accountsLoading;

    return (
        <>
            <Button
                onClick={handleOpen}
                className="bg-background"
                disabled={isLoading}
            >
                {isLoading ? "..." : t("newSquadButtonOpenModal")}
            </Button>

            <AddAccountModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSuccess={handleAccountAdded}
            />

            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center text-content justify-center p-4 backdrop-blur-sm">
                    <div
                        className="absolute inset-0 bg-black/20"
                        onClick={() => !showConfirm && handleClose()}
                    />
                    <form
                        onSubmit={handleFormSubmit}
                        className="relative max-w-xl z-101 w-full bg-background border border-border p-8 shadow-2xl flex flex-col gap-4"
                    >
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">
                                {t("modalTitle")}
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsAddOpen(true);
                                }}
                                className="text-xs text-primary hover:underline"
                            >
                                +{" "}
                                {t("addAnotherAccount", {
                                    defaultValue: "Add Account",
                                })}
                            </button>
                        </div>

                        <label className="text-sm font-medium">
                            {t("accountSelectionLabel")}
                        </label>
                        <div className="max-h-40 overflow-y-auto pr-1 scrollbar">
                            <div className="grid gap-2">
                                {userAccounts.map((acc) => (
                                    <label
                                        key={`${acc.name}-${acc.platform}`}
                                        className="flex items-center justify-between p-3 border border-border cursor-pointer hover:bg-accent transition-all"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <input
                                                type="radio"
                                                name="warframeAccount"
                                                value={acc.name}
                                                checked={
                                                    selectedAccountName ===
                                                    acc.name
                                                }
                                                onChange={(e) =>
                                                    setSelectedAccountName(
                                                        e.target.value,
                                                    )
                                                }
                                                className="accent-primary shrink-0"
                                            />
                                            <span className="truncate font-medium">
                                                {acc.name}
                                            </span>
                                        </div>
                                        <Icon
                                            name={acc.platform}
                                            type="svg"
                                            size={20}
                                            className="shrink-0"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">
                                    {t("relicLabel")}
                                </label>
                                <RelicAutocomplete
                                    locale={locale}
                                    name="relicId"
                                    defaultValue={relicParam}
                                    onSelectionChange={(_, relic) =>
                                        setSelectedRelic(relic as RelicData)
                                    }
                                    required
                                />
                            </div>
                            <RelicRefinementSelector
                                selectedRelic={selectedRelic}
                                value={refinement}
                                onChange={setRefinement}
                            />
                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-muted-foreground">
                                    {t("dateLabel")}
                                </label>
                                <Input
                                    type="datetime-local"
                                    name="executionDate"
                                    min={minDateAttr}
                                    value={executionDate}
                                    onChange={(e) =>
                                        setExecutionDate(e.target.value)
                                    }
                                    onFocus={() => setIsDateFocused(true)}
                                    onBlur={() => setIsDateFocused(false)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-4">
                            <Button type="submit" disabled={!selectedRelic}>
                                {t("submit")}
                            </Button>
                            <Button
                                type="button"
                                onClick={handleClose}
                                className="bg-transparent border-none text-muted-foreground hover:text-foreground"
                            >
                                {t("cancel")}
                            </Button>
                        </div>
                    </form>

                    <ConfirmationModal
                        isOpen={showConfirm}
                        title={t("confirmTitle", {
                            defaultValue: "Confirm Squad",
                        })}
                        message={t("confirmMessage", {
                            relic:
                                selectedRelic?.i18n[locale]?.displayName ||
                                "...",
                            refinement: refinement,
                            date: displayDate,
                            account: selectedAccountName,
                        })}
                        onConfirm={handleFinalConfirm}
                        onCancel={() => setShowConfirm(false)}
                    />
                </div>
            )}
        </>
    );
}
