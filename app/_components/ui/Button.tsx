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

<svg
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    fill="currentColor"
    stroke="none"
>
    <g transform="translate(0,256) scale(0.1,-0.1)">
        <path d="M1256 2548 c-3 -7 -6 -75 -9 -150 l-4 -137 ..." />
        <path d="M667 2338 c-9 -5 -17 -14 -17 -19 ..." />
    </g>
</svg>;
