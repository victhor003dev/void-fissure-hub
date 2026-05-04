"use client";
import { useTranslations } from "next-intl";
import { authClient } from "@/app/lib/auth-client"; // Change this path to match your file

import Button, {
    ButtonSizes,
    ButtonVariants,
} from "@/app/_components/ui/Button";
import Icon from "@/app/_components/ui/Icon";

export default function AuthButtons() {
    const t = useTranslations("auth.socialLogins");

    const login = async (provider: "google" | "discord") => {
        await authClient.signIn.social({
            provider,
            callbackURL: "/",
        });
    };

    return (
        <div className="flex items-center gap-3 flex-col">
            <>
                <Button
                    onClick={() => login("google")}
                    size={ButtonSizes.Big}
                    variant={ButtonVariants.Vitruvian}
                    className="min-w-85"
                >
                    <span className="flex items-center justify-center gap-2 whitespace-nowrap">
                        {t.rich("google", {
                            icon: () => (
                                <Icon name="google" className="shrink-0" />
                            ),
                        })}
                    </span>
                </Button>
                <Button
                    onClick={() => login("discord")}
                    size={ButtonSizes.Big}
                    variant={ButtonVariants.Vitruvian}
                    className="min-w-85"
                >
                    <span className="flex items-center justify-center gap-2 whitespace-nowrap">
                        {t.rich("discord", {
                            icon: () => (
                                <Icon name="discord" className="shrink-0" />
                            ),
                        })}
                    </span>
                </Button>
            </>
        </div>
    );
}
