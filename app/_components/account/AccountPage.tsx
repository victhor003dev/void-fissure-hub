"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { authClient } from "@/app/lib/auth-client";
import Button, { ButtonVariants } from "@/app/_components/ui/Button";
import Icon from "@/app/_components/ui/Icon";
import ConfirmationModal from "@/app/_components/ui/ConfirmationModal";
import AddAccountModal from "@/app/_components/relic_hunting/AddAccountModal";
import { ToastType } from "@/app/_components/ui/Toast";
import { useToast } from "@/app/_context/ToastProvider";
import {
    purgeUserAccountData,
    removeWarframeAccount,
} from "@/app/lib/actions/users";

interface BetterAuthSession {
    user: {
        id: string;
        email: string;
        name: string;
        emailVerified: boolean;
        createdAt: string | Date;
        updatedAt: string | Date;
        image?: string | null;
    };
    session: {
        id: string;
        userId: string;
        expiresAt: string | Date;
        token: string;
        createdAt: string | Date;
        updatedAt: string | Date;
    };
}

interface WarframeAccount {
    name: string;
    platform: string;
}

interface AccountPageProps {
    session: BetterAuthSession;
}

export default function AccountPage({ session }: AccountPageProps) {
    const t = useTranslations("account");
    const locale = useLocale();
    const router = useRouter();
    const { addToast } = useToast();

    const hasFetched = useRef(false);

    // --- State Management ---
    const [name, setName] = useState<string>(session.user?.name || "");
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [userAccounts, setUserAccounts] = useState<WarframeAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = useState<boolean>(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState<boolean>(false);

    // --- Profile Unlinking States ---
    const [accountToRemove, setAccountToRemove] = useState<string | null>(null);
    const [showRemoveModal, setShowRemoveModal] = useState<boolean>(false);

    // --- Danger Zone Deletion Modals State ---
    const [showDeleteStage1, setShowDeleteStage1] = useState<boolean>(false);
    const [showDeleteStage2, setShowDeleteStage2] = useState<boolean>(false);

    // Determine if user is using an external social provider via presence of OAuth avatar asset
    const isSocialAccount = !!session.user?.image;

    // --- Synchronize Warframe Accounts Fetching ---
    const fetchAccounts = useCallback(async () => {
        if (!session.user?.id) return;
        setAccountsLoading(true);
        try {
            const res = await fetch("/api/user/accounts");
            if (res.ok) {
                const data = await res.json();
                setUserAccounts(data.accounts || []);
            }
        } catch (err) {
            console.error("Failed to fetch profiles:", err);
        } finally {
            setAccountsLoading(false);
        }
    }, [session.user?.id]);

    useEffect(() => {
        if (!hasFetched.current) {
            hasFetched.current = true;
            void fetchAccounts();
        }
    }, [fetchAccounts]);

    // --- Handlers ---
    const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSocialAccount) return;
        setIsUpdating(true);

        try {
            const { error } = await authClient.updateUser({ name });
            if (error) throw new Error(error.message);

            addToast({
                title: t("toast.profileSuccessTitle"),
                content: t("toast.profileSuccessContent"),
                toastType: ToastType.Success,
            });
        } catch (err: unknown) {
            addToast({
                title: t("toast.errorTitle"),
                content:
                    err instanceof Error
                        ? err.message
                        : t("toast.errorContent"),
                toastType: ToastType.Error,
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const triggerRemoveRequest = (accountName: string) => {
        setAccountToRemove(accountName);
        setShowRemoveModal(true);
    };

    const handleConfirmRemoveAccount = async () => {
        if (!accountToRemove) return;

        try {
            const result = await removeWarframeAccount(accountToRemove);
            if (result?.error) throw new Error(result.error);

            addToast({
                title: t("toast.genericSuccessTitle"),
                content: t("toast.profileRemoved"),
                toastType: ToastType.Success,
            });
            void fetchAccounts();
        } catch {
            addToast({
                title: t("toast.errorTitle"),
                content: t("toast.profileRemoveError"),
                toastType: ToastType.Error,
            });
        } finally {
            setShowRemoveModal(false);
            setAccountToRemove(null);
        }
    };

    const handleExecuteFinalPurge = async () => {
        try {
            const result = await purgeUserAccountData();
            if (!result.success) throw new Error(result.error);

            await authClient.signOut();

            addToast({
                title: t("toast.purgeSuccessTitle"),
                content: t("toast.purgeSuccessContent"),
                toastType: ToastType.Success,
            });

            setShowDeleteStage2(false);

            window.location.href = "/";
        } catch (err: unknown) {
            setShowDeleteStage2(false);
            addToast({
                title: t("toast.errorTitle"),
                content:
                    err instanceof Error ? err.message : t("toast.purgeError"),
                toastType: ToastType.Error,
            });
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="border-b border-border pb-6 mb-8">
                <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-active">
                    {t("addAccountTitle")}
                </h1>
                <p className="text-xs text-content mt-1">{t("subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 flex flex-col gap-3">
                    <div className="border border-primary/20 bg-primary/5 p-4 rounded-sm flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800 border border-border flex items-center justify-center text-primary font-bold uppercase">
                            {session.user?.image ? (
                                <Image
                                    src={session.user.image}
                                    alt={session.user.name || "Avatar"}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                session.user?.name?.charAt(0) || "T"
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-active truncate">
                                {session.user?.name}
                            </p>
                            <p className="text-xs text-content truncate">
                                {session.user?.email}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <div className="border border-border bg-background/40 p-6 rounded-sm interactive-shadow-1">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-active border-b border-border/50 pb-2 mb-4">
                            {t("profileSectionTitle")}
                        </h3>

                        <form
                            onSubmit={handleUpdateProfile}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-content mb-1.5">
                                    {t("accountNameLabel") ||
                                        "Web Account Name"}
                                </label>

                                <input
                                    type="text"
                                    value={name}
                                    readOnly={isSocialAccount}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`w-full border rounded-sm px-3 py-2 text-sm transition-colors focus:outline-none ${
                                        isSocialAccount
                                            ? "bg-black/20 border-border/40 text-content/70 cursor-not-allowed select-none"
                                            : "bg-black/40 border-border text-active focus:border-primary"
                                    }`}
                                    required
                                />

                                {/* Localized social disclaimer subtext block */}
                                {isSocialAccount && (
                                    <p className="text-[10px] text-content/40 mt-1 italic">
                                        {t("socialAccountDisclaimer") ||
                                            "Linked through your social authentication provider."}
                                    </p>
                                )}
                            </div>

                            {!isSocialAccount && (
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isUpdating}>
                                        {isUpdating
                                            ? t("savingButton")
                                            : t("saveButton")}
                                    </Button>
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="border border-border bg-background/40 p-6 rounded-sm interactive-shadow-1">
                        <div className="flex justify-between items-center border-b border-border/50 pb-2 mb-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-active">
                                {t("linkedProfilesTitle")}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsAddAccountOpen(true)}
                                className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
                            >
                                <Icon name="ui/plus" size={12} />{" "}
                                {t("addProfileButton")}
                            </button>
                        </div>

                        <div
                            className={`max-h-[170px] overflow-y-auto pr-1 scrollbar space-y-2 min-h-16 flex flex-col ${
                                accountsLoading || userAccounts.length === 0
                                    ? "justify-center"
                                    : "justify-start"
                            }`}
                        >
                            {accountsLoading ? (
                                <p className="text-xs text-content text-center italic">
                                    {t("loadingProfiles")}
                                </p>
                            ) : userAccounts.length === 0 ? (
                                <p className="text-xs text-content/50 text-center italic">
                                    {t("noProfiles")}
                                </p>
                            ) : (
                                userAccounts.map((acc) => (
                                    <div
                                        key={`${acc.name}-${acc.platform}`}
                                        className="flex items-center justify-between p-3 border border-border/50 bg-black/20"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Icon
                                                name={acc.platform}
                                                type="svg"
                                                size={18}
                                                className="shrink-0"
                                            />
                                            <span className="truncate text-sm font-medium text-active">
                                                {acc.name}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                triggerRemoveRequest(acc.name)
                                            }
                                            className="text-error/70 hover:text-error p-1 transition-colors"
                                            title={t("unlinkProfileTitle")}
                                        >
                                            <Icon name="ui/close" size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="border border-border bg-black/20 p-4 rounded-sm text-xs text-neutral-500">
                        <span>
                            {t("accountCreatedDate", {
                                date: new Date(
                                    session.user?.createdAt,
                                ).toLocaleDateString(locale),
                            })}
                        </span>
                    </div>

                    <div className="border border-error/30 bg-error/5 p-6 rounded-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-error border-b border-error/20 pb-2 mb-3">
                            {t("dangerZoneTitle")}
                        </h3>
                        <p className="text-xs text-content mb-4">
                            {t("dangerZoneDescription")}
                        </p>
                        <div className="flex justify-start">
                            <Button
                                type="button"
                                onClick={() => setShowDeleteStage1(true)}
                                className="border-error/30 text-error hover:bg-error/10 bg-transparent"
                            >
                                <Icon
                                    name="ui/close"
                                    className="mr-2"
                                    size={16}
                                />{" "}
                                {t("deleteAccountButton")}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <AddAccountModal
                isOpen={isAddAccountOpen}
                onClose={() => setIsAddAccountOpen(false)}
                onSuccess={() => {
                    setIsAddAccountOpen(false);
                    void fetchAccounts();
                }}
            />

            <ConfirmationModal
                isOpen={showRemoveModal}
                title={t("unlinkModal.title")}
                message={t("unlinkModal.message", {
                    name: accountToRemove ?? "",
                })}
                confirmTimeoutSeconds={5}
                onConfirm={handleConfirmRemoveAccount}
                onCancel={() => {
                    setShowRemoveModal(false);
                    setAccountToRemove(null);
                }}
            />

            <ConfirmationModal
                isOpen={showDeleteStage1}
                title={t("stage1.title")}
                message={t("stage1.message")}
                confirmTimeoutSeconds={5}
                onConfirm={() => {
                    setShowDeleteStage1(false);
                    setShowDeleteStage2(true);
                }}
                onCancel={() => setShowDeleteStage1(false)}
            />

            <ConfirmationModal
                isOpen={showDeleteStage2}
                variant="danger"
                title={t("stage2.title")}
                message={t("stage2.message")}
                confirmTimeoutSeconds={5}
                className="border-error bg-neutral-950 interactive-shadow-1"
                confirmButtonClassName="text-error border-error/40 hover:bg-error/10"
                onConfirm={handleExecuteFinalPurge}
                onCancel={() => setShowDeleteStage2(false)}
            />
        </div>
    );
}
