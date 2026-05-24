"use client";
import Toast, { ToastType } from "@/app/_components/ui/Toast";
import {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
} from "react";

interface ToastOptions {
    content: string;
    toastType?: ToastType;
    title?: string;
    timerSeconds?: number;
}

interface ToastMessage extends Required<Omit<ToastOptions, "title">> {
    id: string;
    title?: string;
}

const ToastContext = createContext<
    | {
          addToast: (options: ToastOptions) => void;
      }
    | undefined
>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback(
        ({
            content,
            toastType = ToastType.Info,
            title,
            timerSeconds = 6,
        }: ToastOptions) => {
            const generateId = () => {
                try {
                    return crypto.randomUUID();
                } catch {
                    return (
                        Math.random().toString(36).substring(2, 11) +
                        Date.now().toString(36)
                    );
                }
            };

            const id = generateId();

            setToasts((prev) => [
                ...prev,
                { id, content, toastType, title, timerSeconds },
            ]);
        },
        [],
    );

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-200 pointer-events-none items-center">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast
                            {...toast}
                            onClose={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
};
