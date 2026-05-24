import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import AccountPage from "@/app/_components/account/AccountPage";

interface Props {
    params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props) {
    const { lang } = await params;
    const t = await getTranslations({ locale: lang, namespace: "account" });
    return {
        title: `${t("addAccountTitle")} | Tenno Hub`,
    };
}

export default async function Page() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect(`/`);
    }

    return <AccountPage session={session} />;
}
