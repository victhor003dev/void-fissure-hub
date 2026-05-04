"use client";
import { useEffect } from "react";
import { authClient } from "@/app/lib/auth-client";
import { ToastType } from "@/app/_components/ui/Toast";
import { useTranslations } from "next-intl";
import { useToast } from "@/app/_context/ToastProvider";

export default function SocialToastWatcher() {
    const { data: session } = authClient.useSession();
    const { addToast } = useToast();
    const t = useTranslations("auth.emailLogin");

    useEffect(() => {
        if (!session?.user) {
            Object.keys(sessionStorage).forEach((key) => {
                if (key.startsWith("welcomed_")) {
                    sessionStorage.removeItem(key);
                }
            });
            return;
        }

        const welcomeKey = `welcomed_${session.user.id}`;
        const hasBeenWelcomed = sessionStorage.getItem(welcomeKey);

        if (!hasBeenWelcomed) {
            addToast({
                title: t("welcomeBack", { name: session.user.name }),
                content: t("signedIn", { name: session.user.name }),
                toastType: ToastType.Success,
                timerSeconds: 4,
            });

            sessionStorage.setItem(welcomeKey, "true");
        }
    }, [session, addToast, t]);

    return null;
}
