interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
    name: string;
    size?: number;
    type?: "svg" | "png";
}

export default function Icon({
    name,
    size = 24,
    className,
    type = "svg",
    ...props
}: IconProps) {
    const isSvg = type === "svg";
    const iconPath = `/icons/${name}.${type}`;

    const iconStyles: React.CSSProperties = isSvg
        ? {
              backgroundColor: "currentColor",
              maskImage: `url(${iconPath})`,
              maskRepeat: "no-repeat",
              maskSize: "contain",
              maskPosition: "center",
              WebkitMaskImage: `url(${iconPath})`,
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              WebkitMaskPosition: "center",
          }
        : {
              backgroundImage: `url(${iconPath})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
              backgroundPosition: "center",
          };

    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                display: "inline-block",
                flexShrink: 0,
                ...iconStyles,
            }}
            {...props}
        />
    );
}
