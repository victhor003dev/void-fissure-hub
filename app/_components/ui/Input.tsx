"use client";

import React, { useState, useEffect, useRef } from "react";
import Icon from "@/app/_components/ui/Icon";

// Define specific props for each supported tag
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    using?: "input";
};
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
    using: "select";
};
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    using: "textarea";
};

// Union type for the component
type UniversalInputProps = InputProps | SelectProps | TextareaProps;

export default function Input({ className, ...props }: UniversalInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const baseClassNames =
        "placeholder-shown:uppercase p-2 bg-transparent outline-none appearance-none text-content w-full transition-all border-none interactive";
    const combinedClassName = `${baseClassNames} ${className || ""}`;

    const shadowWrapperClasses = `relative w-full interactive-shadow-4 transition-all bg-background`;
    const interactiveClasses = `interactive group relative inline-flex items-center w-full transition-all`;

    useEffect(() => {
        if (!isOpen || props.using !== "select") return;
        const handleGlobalClick = () => {
            setTimeout(() => setIsOpen(false), 10);
        };
        window.addEventListener("mouseup", handleGlobalClick);
        return () => window.removeEventListener("mouseup", handleGlobalClick);
    }, [isOpen, props.using]);

    if (props.using === "select") {
        // Alias 'using' to '_' to suppress 'unused variable' warnings
        const { using: _, ...rest } = props as SelectProps;
        return (
            <div className={shadowWrapperClasses}>
                <div ref={containerRef} className={interactiveClasses}>
                    <select
                        className={`${combinedClassName} h-full pr-8 cursor-pointer z-10`}
                        onClick={() => setIsOpen(!isOpen)}
                        onBlur={() => setIsOpen(false)}
                        onChange={(e) => {
                            setIsOpen(false);
                            (e.target as HTMLSelectElement).blur();
                            rest.onChange?.(e);
                        }}
                        {...rest}
                    />
                    <div
                        className={`pointer-events-none absolute right-2 flex items-center justify-center transition-transform duration-200 z-20 ${
                            isOpen ? "rotate-0" : "rotate-180"
                        }`}
                    >
                        <Icon
                            name="ui/triangle"
                            className="h-3 w-3 fill-current text-content"
                            size={16}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (props.using === "textarea") {
        const { using: _, ...rest } = props as TextareaProps;
        return (
            <div className={shadowWrapperClasses}>
                <div className={interactiveClasses}>
                    <textarea
                        className={`${combinedClassName} min-h-[100px] z-10`}
                        {...rest}
                    />
                </div>
            </div>
        );
    }

    if (props.type === "checkbox" || props.type === "radio") {
        const { using: _, ...rest } = props as InputProps;
        return (
            <input
                className={`cursor-pointer accent-content ${className || ""}`}
                {...rest}
            />
        );
    }

    const { using: _, ...rest } = props as InputProps;

    const isSearch = props.type === "search";

    return (
        <div className={shadowWrapperClasses}>
            <div className={interactiveClasses}>
                <input
                    className={`${combinedClassName} h-full z-10 ${isSearch ? "pr-10" : ""}`}
                    {...rest}
                />

                {isSearch && (
                    <div className="pointer-events-none absolute right-3 flex items-center justify-center z-20">
                        <Icon
                            name="ui/SearchIcon"
                            className="h-4 w-4 fill-current text-content opacity-50 group-focus-within:opacity-100 transition-opacity"
                            size={18}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
