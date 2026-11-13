"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { saveSettingsAction } from "@/features/settings/actions";
import { STAGE_LABELS, STAGES, type Settings } from "@/features/settings/schema";
import { Field } from "@/components/forms/field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useFormAction(saveSettingsAction);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form onSubmit={action} className="flex flex-col gap-6">
      {state && !state.ok && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">{state.message}</Alert>}
      <Field
        label="USD → THB exchange rate"
        htmlFor="usdToThbRate"
        error={errors?.usdToThbRate}
        help="Used to show USD fee estimates in THB pipeline totals. Update periodically."
      >
        <Input
          id="usdToThbRate"
          name="usdToThbRate"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={settings.usdToThbRate}
          className="max-w-40"
        />
      </Field>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Default win probability by stage (%)</legend>
        <p className="text-muted-foreground mb-3 text-xs">
          Pre-filled when an opportunity moves stage; users can override it.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {STAGES.map((s) => (
            <Field key={s} label={STAGE_LABELS[s]} htmlFor={`prob_${s}`}>
              <Input
                id={`prob_${s}`}
                name={`prob_${s}`}
                type="number"
                min={0}
                max={100}
                step={1}
                defaultValue={settings.stageDefaultProbability[s]}
                className="max-w-28"
              />
            </Field>
          ))}
        </div>
        {errors?.stageDefaultProbability && <p className="text-destructive mt-2 text-xs">Each value must be 0–100.</p>}
      </fieldset>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
