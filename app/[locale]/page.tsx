import AuthModal from "@/app/_components/auth/AuthModal";
import LocaleSwitcher from "@/app/_components/LocaleSwitcher";
import ToastTestButtons from "@/app/_components/test/ToastTestButtons";

export default function Home() {
    return (
        <div
            className="h-screen w-screen font-roboto 
            bg-[radial-gradient(circle,var(--color-primary)_-50%,var(--color-background)_85%)]"
        >
            <AuthModal></AuthModal>
            <ToastTestButtons></ToastTestButtons>
            <LocaleSwitcher />
        </div>
    );
}
