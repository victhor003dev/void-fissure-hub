export type ButtonProps = {
    active?: boolean;
    children?: React.ReactNode;
    variant?: ButtonSizes;
};

export enum ButtonSizes {
    Normal = "NORMAL",
    Square = "SQUARE",
    Big = "BIG",
}

const sizeStyles: Record<ButtonSizes, string> = {
    [ButtonSizes.Normal]: "interactive-shadow-6 py-2 px-4",
    [ButtonSizes.Square]: "interactive-shadow-4 p-2",
    [ButtonSizes.Big]: "interactive-shadow-4 py-2 px-8",
};

export default function Button({
    children,
    variant = ButtonSizes.Normal,
    active = false,
}: ButtonProps) {
    const variantClasses = sizeStyles[variant];

    return (
        <button
            className={`${variantClasses} ${active ? "active" : ""} interactive text-content  text-button font-bold uppercase`}
        >
            {children}
        </button>
    );
}
