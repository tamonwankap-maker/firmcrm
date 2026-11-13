import { Checkbox } from "@/components/ui/checkbox";

export function PracticeAreaCheckboxes({
  name = "practiceAreaIds",
  options,
  defaultValue = [],
  legend = "Practice areas",
}: {
  name?: string;
  options: { id: string; name: string }[];
  defaultValue?: string[];
  legend?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((pa) => (
          <label key={pa.id} className="flex items-center gap-2 text-sm">
            <Checkbox name={name} value={pa.id} defaultChecked={defaultValue.includes(pa.id)} />
            {pa.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
