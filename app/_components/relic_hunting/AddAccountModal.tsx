"use client";

import { useState, ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import Button from "@/app/_components/ui/Button";
import Input from "@/app/_components/ui/Input";
import Icon from "@/app/_components/ui/Icon";
import { addWarframeAccount } from "@/app/lib/actions/users";
import { useToast } from "@/app/_context/ToastProvider";
import { ToastType } from "@/app/_components/ui/Toast";

const PLATFORMS = [
    { id: "pc", key: "pc" },
    { id: "xbox", key: "xbox" },
    { id: "psn", key: "playstation" },
    { id: "switch", key: "switch" },
    { id: "ios", key: "iphone" },
    { id: "android", key: "android" },
];

export default function AddAccountModal({
    isOpen,
    onClose,
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}) {
    const t = useTranslations("account");
    const { addToast } = useToast();
    const [selectedPlatform, setSelectedPlatform] = useState("pc");

    if (!isOpen) return null;

    const handleAction = async (formData: FormData) => {
        const result = await addWarframeAccount(formData);

        if (result?.error) {
            addToast({
                title: t("toast.addErrorTitle"),
                content: t(`errors.${result.error}`),
                toastType: ToastType.Error,
                timerSeconds: 5,
            });
            return;
        }

        addToast({
            title: t("toast.accountAddedTitle"),
            content: t("toast.accountAddedContent"),
            toastType: ToastType.Success,
            timerSeconds: 5,
        });

        if (onSuccess) onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4 text-content backdrop-blur-md">
            <div className="absolute inset-0 bg-black/20" onClick={onClose} />

            <form
                action={handleAction}
                className="relative z-111 w-full max-w-sm bg-background border border-border p-8 shadow-2xl flex flex-col gap-6"
            >
                <h2 className="text-xl font-bold">{t("addAccountTitle")}</h2>

                <div className="flex flex-col gap-2">
                    <label className="text-sm text-muted-foreground">
                        {t("accountNameLabel")}
                    </label>
                    <Input
                        name="warframeName"
                        placeholder={t("namePlaceholder")}
                        required
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm text-muted-foreground">
                        {t("platformLabel")}
                    </label>
                    <div className="relative">
                        <div className="absolute pl-2 top-1/2 z-1 -translate-y-1/2 pointer-events-none text-content">
                            <Icon name={`${selectedPlatform}`} className="" />
                        </div>

                        <Input
                            using="select"
                            name="platform"
                            value={selectedPlatform}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                setSelectedPlatform(e.target.value)
                            }
                            className="pl-10"
                            required
                        >
                            {PLATFORMS.map((p) => (
                                <option
                                    key={p.id}
                                    value={p.id}
                                    className="bg-background"
                                >
                                    {t(`platforms.${p.key}`)}
                                </option>
                            ))}
                        </Input>

                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-[10px]">
                            ▼
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                    <Button type="submit" className="w-full">
                        {t("saveButton")}
                    </Button>
                    <Button
                        type="button"
                        onClick={onClose}
                        className="bg-transparent border-none text-muted-foreground hover:text-foreground"
                    >
                        {t("cancelButton")}
                    </Button>
                </div>
            </form>
        </div>
    );
}
