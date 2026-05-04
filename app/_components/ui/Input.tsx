import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    as?: "input";
};
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
    as: "select";
};

type InputOrSelectProps = InputProps | SelectProps;

export default function Input({ className, ...props }: InputOrSelectProps) {
    const baseClassNames =
        "placeholder-shown:uppercase interactive-shadow-4 interactive bg-transparent p-2 outline-none appearance-none";
    const combinedClassName = `${baseClassNames} ${className || ""}`;

    if (props.as === "select") {
        return (
            <div className="relative inline-flex items-center">
                <select
                    className={combinedClassName}
                    {...({
                        ...props,
                        as: undefined,
                    } as React.SelectHTMLAttributes<HTMLSelectElement>)}
                />
                {/* Your arrow code */}
            </div>
        );
    }

    return (
        <input
            className={combinedClassName}
            {...({
                ...props,
                as: undefined,
            } as React.InputHTMLAttributes<HTMLInputElement>)}
        />
    );
}
