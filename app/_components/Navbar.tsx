"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import Button, { ButtonSizes } from "@/app/_components/ui/Button";
import Icon from "@/app/_components/ui/Icon";
import LocaleSwitcher from "@/app/_components/LocaleSwitcher";
import AuthModal from "@/app/_components/auth/AuthModal";
import InteractiveLabel from "@/app/_components/ui/InteractiveLabel";
import { useInteractiveLabel } from "@/app/_hooks/useInteractiveLabel";
import { useTranslations } from "next-intl";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const params = useParams();
    const pathname = usePathname();
    const lang = params?.lang || "en";

    const translationRoot = "navbar";
    const t = useTranslations(translationRoot);

    const navLinks = [
        { id: "relicHunting", href: `/${lang}`, icon: "ui/VoidFissureIcon" },
        { id: "relics", href: `/${lang}/relics`, icon: "ui/VoidRelicIcon" },
    ];

    const activeLink = navLinks.find((link) => link.href === pathname);
    const { displayId, getLabelProps } = useInteractiveLabel(
        activeLink?.id || null,
        "relicHunting",
    );

    return (
        <nav className="bg-background border-b border-border relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 md:h-32 items-stretch">
                    {/* Logo Section */}
                    <div className="flex-none basis-1/5 md:basis-1/4 flex items-center pr-4 relative">
                        <Link
                            href={`/${lang}`}
                            className="text-2xl md:text-3xl font-bold text-content whitespace-nowrap"
                        >
                            <span className="md:hidden">VFH</span>
                            <span className="hidden md:block text-primary">
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
                                /* Center on mobile, Right-align on desktop */
                                items-center md:items-end 
                                md:justify-end z-50
                            `}
                        >
                            {/* Mobile Links */}
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
                                <AuthModal />
                                <div className="flex items-center gap-2">
                                    <LocaleSwitcher />
                                </div>
                            </div>
                        </div>

                        <div className="md:hidden flex items-center">
                            <Button
                                size={ButtonSizes.Big}
                                onClick={() => setIsOpen(!isOpen)}
                            >
                                <Icon name={isOpen ? "x" : "menu"} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
