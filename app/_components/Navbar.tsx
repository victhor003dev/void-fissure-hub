"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { authClient } from "@/app/lib/auth-client"; // Added to check session
import Button, { ButtonSizes } from "@/app/_components/ui/Button";
import Icon from "@/app/_components/ui/Icon";
import LocaleSwitcher from "@/app/_components/LocaleSwitcher";
import AuthModal from "@/app/_components/auth/AuthModal";
import InteractiveLabel from "@/app/_components/ui/InteractiveLabel";
import { useInteractiveLabel } from "@/app/_hooks/useInteractiveLabel";
import NotificationList from "@/app/_components/NotificationList";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const locale = useLocale();

    const { data: session } = authClient.useSession(); // Hook into session status

    const translationRoot = "navbar";
    const t = useTranslations(translationRoot);

    const navLinks = [
        { id: "relicHunting", href: `/${locale}`, icon: "ui/VoidFissureIcon" },
        { id: "relics", href: `/${locale}/relics`, icon: "ui/VoidRelicIcon" },
    ];

    const activeLink = navLinks.find((link) => link.href === pathname);
    const { displayId, getLabelProps } = useInteractiveLabel(
        activeLink?.id || null,
        "relicHunting",
    );

    const accountHref = `/${locale}/account`;

    return (
        <nav className="bg-background border-b border-border relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 md:h-32 items-stretch">
                    {/* Logo Section */}
                    <div className="flex-none basis-1/5 md:basis-1/4 flex items-center pr-4 relative">
                        <Link
                            href={`/${locale}`}
                            className="text-2xl md:text-3xl font-bold text-content whitespace-nowrap"
                        >
                            <span className="md:hidden">VFH</span>
                            <span className="hidden md:block text-primary pr-2">
                                VOID FISSURE HUB
                            </span>
                        </Link>
                        <div className="absolute right-0 top-0 h-full w-2 separator-bg" />
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex flex-col justify-end h-full pl-8 pb-4">
                        <InteractiveLabel
                            labelKey={displayId}
                            namespace={translationRoot}
                            className="mb-1"
                        />
                        <div className="flex space-x-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.id}
                                    href={link.href}
                                    {...getLabelProps(link.id)}
                                >
                                    <Button
                                        size={ButtonSizes.Big}
                                        active={pathname === link.href}
                                    >
                                        <Icon name={link.icon} />
                                    </Button>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Utilities Container */}
                    <div className="flex flex-1 md:flex-none justify-end md:ml-auto">
                        <div
                            className={`
                                ${isOpen ? "flex" : "hidden"} md:flex 
                                flex-col absolute md:static 
                                top-16 left-0 w-full md:w-auto md:h-full
                                bg-background md:bg-transparent border-b md:border-none border-border
                                p-4 md:p-0 md:pb-4 gap-4 md:gap-2
                                items-center md:items-end 
                                md:justify-end z-50
                            `}
                        >
                            {/* Mobile Links inside the drawer */}
                            <div className="flex flex-col md:hidden w-full gap-2 border-b border-border pb-4 mb-2">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.id}
                                        href={link.href}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Button
                                            size={ButtonSizes.Big}
                                            active={pathname === link.href}
                                            className="w-full justify-start gap-3"
                                        >
                                            <Icon name={link.icon} />
                                            <span className="uppercase text-xs font-bold">
                                                {t(link.id)}
                                            </span>
                                        </Button>
                                    </Link>
                                ))}
                            </div>

                            <div className="flex flex-col items-center md:items-end gap-4 md:gap-2 w-full md:w-auto">
                                <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end">
                                    <AuthModal />
                                    {/* Desktop Account Button: placed right of AuthModal */}
                                    {session && (
                                        <Link
                                            href={accountHref}
                                            className="hidden md:block"
                                        >
                                            <Button
                                                size={ButtonSizes.Square}
                                                active={
                                                    pathname === accountHref
                                                }
                                                className="p-2"
                                            >
                                                <Icon
                                                    name="ui/account"
                                                    size={20}
                                                />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <LocaleSwitcher />
                                    <div className="hidden md:block">
                                        <NotificationList />
                                    </div>
                                    {/* Mobile Account Button: nested inside the utility section list */}
                                    {session && (
                                        <Link
                                            href={accountHref}
                                            className="md:hidden"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <Button
                                                size={ButtonSizes.Square}
                                                active={
                                                    pathname === accountHref
                                                }
                                                className="p-2"
                                            >
                                                <Icon
                                                    name="ui/account"
                                                    size={20}
                                                />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="md:hidden">
                                <NotificationList />
                            </div>
                            <div className="md:hidden">
                                <Button
                                    size={ButtonSizes.Big}
                                    onClick={() => setIsOpen(!isOpen)}
                                >
                                    <Icon
                                        name={
                                            isOpen
                                                ? "ui/close"
                                                : "ui/burgerMenu"
                                        }
                                    />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
