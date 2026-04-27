"use client";
import { useTranslations } from "next-intl";
import { authClient } from "../../lib/auth-client"; // Change this path to match your file
import Button, { ButtonSizes } from "../ui/Button";
import Icon from "../ui/Icon";

export default function AuthButtons() {
    const { data: session } = authClient.useSession();
    const t = useTranslations("login");

    const login = async (provider: "google" | "discord") => {
        await authClient.signIn.social({
            provider,
            callbackURL: "/",
        });
    };

    return (
        <div className="flex items-center gap-3">
            {session ? (
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                        {session.user.name}
                    </span>
                    <Button
                        onClick={() => authClient.signOut()}
                        size={ButtonSizes.Big}
                    >
                        Logout
                    </Button>
                </div>
            ) : (
                <>
                    <Button
                        onClick={() => login("google")}
                        size={ButtonSizes.Big}
                    >
                        {t("socialLogins.google")}
                        <Icon name="google" />
                    </Button>
                    <Button
                        onClick={() => login("discord")}
                        size={ButtonSizes.Big}
                    >
                        {t("socialLogins.discord")}
                        <Icon name="discord" />
                    </Button>
                </>
            )}
        </div>
    );
}
