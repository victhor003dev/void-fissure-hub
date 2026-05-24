import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "@/app/[locale]/globals.css";
import { NextIntlClientProvider } from "next-intl";
import { ToastProvider } from "@/app/_context/ToastProvider";
import SocialToastWatcher from "@/app/_context/SocialToastWatcher";
import NotificationWatcher from "@/app/_context/NotificationsWatcher";
import Navbar from "@/app/_components/Navbar";

const roboto = Roboto({
    variable: "--font-roboto",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Void Fissure Hub",
    description:
        "A site to find people in warframe who want to open the same relics as you.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${roboto.variable} ${roboto.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col">
                <NextIntlClientProvider>
                    <ToastProvider>
                        <SocialToastWatcher />
                        <NotificationWatcher />
                        <Navbar />
                        {children}
                    </ToastProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
