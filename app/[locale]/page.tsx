import Navbar from "@/app/_components/Navbar";

export default function Home() {
    return (
        <div
            className="h-screen w-screen font-roboto 
            bg-[radial-gradient(circle,var(--color-primary)_-10%,var(--color-background)_85%)]"
        >
            <Navbar />
        </div>
    );
}
