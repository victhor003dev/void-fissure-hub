import { HTMLProps } from "react";

export type ButtonProps = {
    active?: boolean;
    children?: React.ReactNode;
    size?: ButtonSizes;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

export enum ButtonSizes {
    Normal = "NORMAL",
    Square = "SQUARE",
    Big = "BIG",
}

const sizeStyles: Record<ButtonSizes, string> = {
    [ButtonSizes.Normal]: "interactive-shadow-6 py-2 px-4",
    [ButtonSizes.Square]: "interactive-shadow-4 p-2 bg-red-500",
    [ButtonSizes.Big]: "interactive-shadow-4 py-2 px-8",
};

export default function Button({
    children,
    size = ButtonSizes.Normal,
    active = false,
    onClick,
}: ButtonProps) {
    const sizeClasses = sizeStyles[size];

    return (
        <button
            className={`${sizeClasses} ${active ? "active" : ""} interactive text-content  text-button font-bold uppercase`}
            onClick={onClick}
        >
            {children}
        </button>
    );
}
