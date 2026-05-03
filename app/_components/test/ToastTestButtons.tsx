"use client";
import { useToast } from "@/app/_context/ToastProvider";
import { ToastType } from "@/app/_components/ui/Toast";

export default function ToastTestButtons() {
    const { addToast } = useToast();

    const testToasts = [
        {
            label: "Quick Success",
            color: "bg-emerald-600",
            action: () =>
                addToast({
                    content: "Changes saved instantly!",
                    toastType: ToastType.Success,
                    title: "Success",
                    timerSeconds: 2,
                }),
        },
        {
            label: "Persistent Error",
            color: "bg-red-600",
            action: () =>
                addToast({
                    content:
                        "Critical connection failure. Please manualy check your gateway settings.",
                    toastType: ToastType.Error,
                    title: "System Error",
                    timerSeconds: 12,
                }),
        },
        {
            label: "Warning",
            color: "bg-amber-600",
            action: () =>
                addToast({
                    content: "Low disk space detected.",
                    toastType: ToastType.Warning,
                    title: "Warning",
                    timerSeconds: 5,
                }),
        },
        {
            label: "Standard Info",
            color: "bg-zinc-600",
            action: () =>
                addToast({
                    content: "A new patch is ready.",
                    toastType: ToastType.Info,
                }),
        },
    ];

    return (
        <div className="flex flex-wrap gap-4 p-8 border border-zinc-800 rounded-xl bg-zinc-950/50">
            {testToasts.map((t) => (
                <button
                    key={t.label}
                    onClick={t.action}
                    className={`${t.color} text-white px-4 py-2 rounded-md font-medium transition-all active:scale-95 hover:brightness-110 shadow-lg`}
                >
                    {t.label}
                </button>
            ))}

            <button
                onClick={() => {
                    addToast({
                        content: "I'll be here for 10s",
                        toastType: ToastType.Info,
                        timerSeconds: 10,
                    });
                    setTimeout(
                        () =>
                            addToast({
                                content: "I'm gone in 2s!",
                                toastType: ToastType.Success,
                                timerSeconds: 2,
                            }),
                        500,
                    );
                    setTimeout(
                        () =>
                            addToast({
                                content: "Standard 6s warning",
                                toastType: ToastType.Warning,
                                timerSeconds: 6,
                            }),
                        1000,
                    );
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:brightness-110"
            >
                Trigger Chaos Cascade
            </button>
        </div>
    );
}
