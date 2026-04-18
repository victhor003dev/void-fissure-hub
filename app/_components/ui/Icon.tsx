interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
    name: string;
    size?: number;
}

export default function Icon({
    name,
    size = 24,
    className,
    ...props
}: IconProps) {
    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                backgroundColor: "currentColor", // This provides the color
                maskImage: `url(/icons/${name}.svg)`,
                maskRepeat: "no-repeat",
                maskSize: "contain",
                maskPosition: "center",
                WebkitMaskImage: `url(/icons/${name}.svg)`,
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                WebkitMaskPosition: "center",
            }}
            {...props}
        />
    );
}
