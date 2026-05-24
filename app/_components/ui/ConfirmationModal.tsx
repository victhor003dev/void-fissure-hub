"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Button from "./Button";

interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmTimeoutSeconds?: number;
    children?: React.ReactNode;
    confirmButtonClassName?: string;
    variant?: "default" | "danger";
    className?: string;
    titleClassName?: string;
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmTimeoutSeconds = 0,
    children,
    confirmButtonClassName = "",
    variant = "default",
    className = "",
    titleClassName = "",
}: Props) {
    const t = useTranslations("confirmationModal");
    const [timeLeft, setTimeLeft] = useState<number>(confirmTimeoutSeconds);
    const [prevIsOpen, setPrevIsOpen] = useState<boolean>(isOpen);

    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen);
        if (isOpen) {
            setTimeLeft(confirmTimeoutSeconds);
        }
    }

    useEffect(() => {
        if (!isOpen || timeLeft <= 0) return;

        const timer = setTimeout(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [isOpen, timeLeft]);

    if (!isOpen) return null;

    const isButtonDisabled = timeLeft > 0;
    const isDanger = variant === "danger";

    const backdropClass = isDanger
        ? "bg-black/60 backdrop-blur-md z-120"
        : "bg-black/40 backdrop-blur-sm z-110";

    const containerClass = isDanger
        ? "border-error/40 bg-background shadow-red-900/20"
        : "border-border bg-background shadow-2xl";

    const headerClass = isDanger
        ? "text-error font-black uppercase italic tracking-wide"
        : "text-active font-bold";

    const defaultConfirmClass = isDanger
        ? "text-error border-error/30 hover:bg-error/10"
        : "";

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 duration-200 animate-in fade-in ${backdropClass}`}
        >
            <div
                className={`w-full max-w-lg border p-6 flex flex-col gap-4 text-center transform scale-in duration-150 ${containerClass} ${className}`}
            >
                <h3 className={`text-lg ${headerClass} ${titleClassName}`}>
                    {title}
                </h3>
                <p className="text-sm text-content">{message}</p>

                {children}

                <div className="flex flex-row-reverse justify-around gap-2 mt-2">
                    <Button
                        onClick={onConfirm}
                        disabled={isButtonDisabled}
                        className={`${defaultConfirmClass} ${confirmButtonClassName} ${isButtonDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                        {isButtonDisabled
                            ? t("confirmButtonTimed", { time: timeLeft })
                            : t("confirmButton")}
                    </Button>
                    <Button onClick={onCancel}>{t("cancelButton")}</Button>
                </div>
            </div>
        </div>
    );
}
