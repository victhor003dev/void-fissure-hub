import RelicsPage from "@/app/_components/relics/RelicsPage";

export default async function RelicsRoute() {
    return (
        <div
            className="h-fit min-h-screen w-screen font-roboto 
            bg-[radial-gradient(circle,var(--color-primary)_-10%,var(--color-background)_85%)]"
        >
            <div className="flex items-center justify-center p-2 w-full">
                <RelicsPage />
            </div>
        </div>
    );
}
