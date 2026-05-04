"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import EmailAuthForm from "@/app/_components/auth/EmailAuthForm";
import AuthButtons from "@/app/_components/auth/AuthButtons";
import { authClient } from "@/app/lib/auth-client";
import Button, { ButtonSizes } from "@/app/_components/ui/Button";
import { useToast } from "@/app/_context/ToastProvider";
import { ToastType } from "@/app/_components/ui/Toast";

export default function AuthModal() {
    const t = useTranslations("auth.loginModal");
    const [isOpen, setIsOpen] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");

    const { addToast } = useToast();

    const { data: session } = authClient.useSession();

    const closeModal = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                closeModal();
            }
        };

        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
            document.documentElement.style.overflow = "hidden";
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, closeModal]);

    return (
        <>
            {/* Open Modal Button */}
            {session ? (
                <Button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        authClient.signOut();
                        addToast({
                            content: t("toast.signOffContent"),
                            title: t("toast.signOffTitle"),
                            toastType: ToastType.Success,
                            timerSeconds: 5,
                        });
                    }}
                    size={ButtonSizes.Big}
                >
                    {t("signOffButton")}
                </Button>
            ) : (
                <Button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(true);
                    }}
                    className="min-w-25 md:min-w-0"
                >
                    {t("loginButton")}
                </Button>
            )}
            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    {/* BACKDROP */}
                    <div
                        className="fixed inset-0 bg-transparent backdrop-blur-sm"
                        onClick={closeModal}
                    />

                    {/* MODAL */}
                    <div
                        className="relative z-101 w-full max-w-md
                        shadow-2xl border border-border bg-background/70 overflow-hidden"
                    >
                        <div className="p-8 flex flex-col gap-6">
                            <EmailAuthForm
                                isSignUp={isSignUp}
                                email={email}
                                setEmail={setEmail}
                                name={name}
                                setName={setName}
                                closeModal={closeModal}
                            />
                            <div className="h-px separator-bg w-full" />
                            <AuthButtons />
                        </div>
                        <div className="p-4 flex justify-end gap-1 bg-transparent">
                            <Button
                                className="bg-background"
                                type="button"
                                onClick={() => setIsSignUp(!isSignUp)}
                            >
                                {isSignUp ? t("doSignIn") : t("doSignUp")}
                            </Button>
                            <Button
                                className="bg-background"
                                onClick={closeModal}
                            >
                                {t("backButton")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
