import React from "react";
// Pro tip: install 'clsx' and 'tailwind-merge' to handle dynamic classes cleaner
// npm install clsx tailwind-merge

export enum ButtonSizes {
    Normal = "NORMAL",
    Square = "SQUARE",
    Big = "BIG",
}

export enum ButtonVariants {
    Default = "DEFAULT",
    Vitruvian = "VITRUVIAN",
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
    size?: ButtonSizes;
    variant?: ButtonVariants;
};

const sizeStyles: Record<ButtonSizes, string> = {
    [ButtonSizes.Normal]: "interactive-shadow-6 py-2 px-4",
    [ButtonSizes.Square]: "interactive-shadow-4 p-2",
    [ButtonSizes.Big]: "interactive-shadow-4 py-2 px-8",
};

export default function Button({
    children,
    size = ButtonSizes.Normal,
    variant = ButtonVariants.Default,
    active = false,
    className = "",
    ...props
}: ButtonProps) {
    const isVitruvian = variant === ButtonVariants.Vitruvian;
    const vitruvianClip =
        "polygon(16px 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 16px 100%, 0% 50%)";

    // Standard button base styles
    const normalClasses =
        `interactive relative flex items-center justify-center gap-2 font-bold uppercase tracking-widest transition-all duration-200 bg-button-bg text-content text-button w-fit ${sizeStyles[size]} ${active ? "active" : ""} ${className}`.trim();

    if (!isVitruvian) {
        return (
            <button {...props} className={normalClasses}>
                <span className="relative z-10 flex items-center gap-3 leading-none transition-colors duration-200">
                    {children}
                </span>
            </button>
        );
    }

    return (
        <>
            <button
                {...props}
                className={`${normalClasses} [@media(max-width:419px)]:flex hidden`.trim()}
            >
                <span className="relative z-10 flex items-center gap-3 leading-none transition-colors duration-200">
                    {children}
                </span>
            </button>

            <div
                className={`relative group [@media(min-width:420px)]:inline-flex hidden items-center justify-center interactive mx-4 is-vitruvian ${className}`.trim()}
            >
                {/* Left Wing */}
                <div className="absolute left-0 w-0 h-full pointer-events-none z-20">
                    <div className="absolute left-0 top-1/2 -translate-x-2.5 -translate-y-1/2 w-2.5 h-2.5 bg-border-var rotate-45 transition-colors duration-200" />
                    <div className="absolute top-1 -right-5 w-9.5 h-px bg-border-var -rotate-45 origin-right opacity-40 group-hover:opacity-100 transition-all duration-200" />
                    <div className="absolute bottom-1 -right-5 w-9.5 h-px bg-border-var rotate-45 origin-right opacity-40 group-hover:opacity-100 transition-all duration-200" />
                </div>

                <button
                    {...props}
                    style={{ clipPath: vitruvianClip }}
                    className={`relative flex items-center justify-center gap-2 font-bold uppercase tracking-widest transition-all duration-200 h-8 px-10 py-0 w-full text-content-var border-none bg-transparent ${active ? "active" : ""} ${className}`.trim()}
                >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-70 transition-opacity duration-300 pointer-events-none bg-[radial-gradient(ellipse_at_50%_100%,var(--primary-active)_0%,transparent_70%)]" />
                    <span
                        className="absolute inset-0 -z-20 bg-border-var transition-colors duration-200"
                        style={{ clipPath: vitruvianClip }}
                    />
                    <span
                        className="absolute inset-px -z-10 bg-background"
                        style={{ clipPath: vitruvianClip }}
                    />
                    <span className="relative z-10 flex items-center gap-3 leading-none transition-colors duration-200">
                        {children}
                    </span>
                </button>

                {/* Right Wing */}
                <div className="absolute right-0 w-0 h-full pointer-events-none z-20">
                    <div className="absolute right-0 top-1/2 translate-x-2.5 -translate-y-1/2 w-2.5 h-2.5 bg-border-var rotate-45 transition-colors duration-200" />
                    <div className="absolute top-1 -left-5 w-9.5 h-px bg-border-var rotate-45 origin-left opacity-40 group-hover:opacity-100 transition-all duration-200" />
                    <div className="absolute bottom-1 -left-5 w-9.5 h-px bg-border-var -rotate-45 origin-left opacity-40 group-hover:opacity-100 transition-all duration-200" />
                </div>
            </div>
        </>
    );
}
