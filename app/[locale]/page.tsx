import RelicHuntingPage from "@/app/_components/relic_hunting/RelicHuntingPage";

export default async function Home() {
    return (
        <div
            className="h-fit min-h-screen w-screen font-roboto 
            bg-[radial-gradient(circle,var(--color-primary)_-10%,var(--color-background)_85%)]"
        >
            <div className="flex items-center justify-center p-2 w-full">
                <RelicHuntingPage />
            </div>
        </div>
    );
}
