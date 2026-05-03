"use client";
import { useEffect, useState, memo } from "react";
import Icon from "@/app/_components/ui/Icon";

export enum ToastType {
    Info = "Information",
    Warning = "Warning",
    Success = "Success",
    Error = "Error",
}

export type ToastProps = {
    title?: string;
    content: string;
    toastType: ToastType;
    timerSeconds: number;
};

const toastIcon: Record<ToastType, string | undefined> = {
    [ToastType.Info]: undefined,
    [ToastType.Error]: "status/cross",
    [ToastType.Success]: "status/check",
    [ToastType.Warning]: "status/exclamation",
};

const typeStyles: Record<ToastType, string> = {
    [ToastType.Info]: "toast-info",
    [ToastType.Success]: "toast-success",
    [ToastType.Warning]: "toast-warning",
    [ToastType.Error]: "toast-error",
};

const Toast = memo(function Toast({
    title,
    content,
    toastType,
    timerSeconds = 5,
    onClose,
}: ToastProps & { onClose: () => void }) {
    const [isExiting, setIsExiting] = useState(false);
    const iconName = toastIcon[toastType];

    useEffect(() => {
        const timer = setTimeout(() => setIsExiting(true), timerSeconds * 1000);
        return () => clearTimeout(timer);
    }, [timerSeconds]);

    useEffect(() => {
        if (isExiting) {
            const timeout = setTimeout(onClose, 300);
            return () => clearTimeout(timeout);
        }
    }, [isExiting, onClose]);

    return (
        <div
            className={`
            bg-background w-80 p-4 flex items-center gap-3 relative
            interactive-shadow-8 ${typeStyles[toastType]}
            ${isExiting ? "animate-toast-exit" : "animate-toast-entry"} 
        `}
        >
            {iconName && (
                <div className="shrink-0 flex items-center justify-center text-content-var">
                    <Icon name={iconName} />
                </div>
            )}

            <div className="flex flex-col flex-1 justify-center pr-6 min-h-10">
                {title && (
                    <h4 className="font-bold text-sm leading-none mb-1 text-content-var">
                        {title}
                    </h4>
                )}
                <p className="text-xs opacity-90 leading-tight text-content-var">
                    {content}
                </p>
            </div>

            <button
                onClick={() => setIsExiting(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center text-content-var"
            >
                <Icon name="ui/close" size={18} />
            </button>
        </div>
    );
});

export default Toast;
