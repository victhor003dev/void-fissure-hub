"use client";
import { useState } from "react";

import { useTranslations } from "next-intl";
import { authClient } from "@/app/lib/auth-client";
import Button from "@/app/_components/ui/Button";
import Input from "@/app/_components/ui/Input";
import { useToast } from "@/app/_context/ToastProvider";
import { ToastType } from "@/app/_components/ui/Toast";

interface EmailAuthFormProps {
    isSignUp: boolean;
    email: string;
    setEmail: (val: string) => void;
    name: string;
    setName: (val: string) => void;
    closeModal: () => void;
}

export default function EmailAuthForm({
    isSignUp,
    email,
    setEmail,
    name,
    setName,
    closeModal,
}: EmailAuthFormProps) {
    const t = useTranslations("auth");
    const { addToast } = useToast();

    const [password, setPassword] = useState("");
    const [passwordRepeat, setPasswordRepeat] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSignUp) {
            // 1. Mismatch Check
            if (password !== passwordRepeat) {
                return addToast({
                    content: t("errors.PASSWORD_MISMATCH"),
                    toastType: ToastType.Error,
                });
            }

            // 2. Length Check
            if (password.length < 8) {
                return addToast({
                    content: t("errors.PASSWORD_TOO_SHORT"),
                    toastType: ToastType.Warning,
                });
            }

            // 3. Complexity Check (1 Number, 1 Special Char)
            const complexityRegex = /(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/;
            if (!complexityRegex.test(password)) {
                return addToast({
                    content: t("api.weakPassword"),
                    toastType: ToastType.Warning,
                });
            }
        }

        setLoading(true);

        if (isSignUp) {
            await authClient.signUp.email(
                { email, password, name },
                {
                    onSuccess: () => {
                        addToast({
                            title: t("emailLogin.successTitle"),
                            content: t("emailLogin.accountCreated"),
                            toastType: ToastType.Success,
                        });
                        closeModal();
                    },
                    onError: (ctx) => {
                        addToast({
                            title: t("emailLogin.errorTitle"),
                            content: ctx.error.message || t("errors.default"),
                            toastType: ToastType.Error,
                        });
                    },
                },
            );
        } else {
            await authClient.signIn.email(
                { email, password },
                {
                    onSuccess: () => {
                        setTimeout(closeModal, 500);
                    },
                    onError: (ctx) => {
                        const errorCode = String(ctx.error.code);
                        const errorMessage =
                            t(`errors.${errorCode}`) === `errors.${errorCode}`
                                ? t("errors.default")
                                : t(`errors.${errorCode}`);

                        addToast({
                            content: errorMessage,
                            toastType: ToastType.Error,
                        });
                    },
                },
            );
        }
        setLoading(false);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 w-full items-center max-w-sm p-2 pt-6 bg-background/50 border border-primary"
        >
            {isSignUp && (
                <Input
                    type="text"
                    placeholder={t("emailLogin.namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="min-w-32 w-9/10 bg-background"
                    required
                />
            )}

            <Input
                type="email"
                placeholder={t("emailLogin.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-32 w-9/10 bg-background"
                required
            />

            <Input
                type="password"
                placeholder={t("emailLogin.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-w-32 w-9/10 bg-background"
                required
            />

            {isSignUp && (
                <Input
                    type="password"
                    placeholder={t("emailLogin.repeatPasswordPlaceholder")}
                    value={passwordRepeat}
                    onChange={(e) => setPasswordRepeat(e.target.value)}
                    className="min-w-32 w-9/10 bg-background"
                    required
                />
            )}

            <span className="h-4" aria-hidden></span>

            <Button type="submit" disabled={loading}>
                {loading
                    ? "..."
                    : isSignUp
                      ? t("emailLogin.signUpButton")
                      : t("emailLogin.signInButton")}
            </Button>
        </form>
    );
}
