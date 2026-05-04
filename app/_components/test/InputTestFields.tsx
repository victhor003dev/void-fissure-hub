import Input from "@/app/_components/ui/Input";

export default function InputTestFields() {
    return (
        <div className="w-100">
            <Input placeholder="test" />
            <Input using="select">
                <option>A</option>
            </Input>
            <Input using="textarea" />
            <fieldset>
                <label>
                    <Input type="radio" name="test" /> A
                </label>
                <label>
                    <Input type="radio" name="test" /> B
                </label>
                <label>
                    <Input type="radio" name="test" /> C
                </label>
            </fieldset>
            <label>
                <Input type="checkbox" /> Check
            </label>
            <Input type="color" />
            <Input type="date" />
            <Input type="search" />
        </div>
    );
}
