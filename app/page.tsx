import Button, { ButtonSizes } from "./_components/ui/Button";
import Icon from "./_components/ui/Icon";

export default function Home() {
    return (
        <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <Button>Button</Button>
            <Button variant={ButtonSizes.Square}>
                <Icon name="ui/LithEraRelic" size={32} />
            </Button>
            <Button variant={ButtonSizes.Big} active={true}>
                <Icon name="ui/VoidRelicIcon" size={64} />
            </Button>
        </div>
    );
}
