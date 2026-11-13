"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { FormStatus, fieldErrors } from "@/components/forms/form-shell";
import { Picker } from "@/components/forms/picker";
import { PracticeAreaCheckboxes } from "@/components/forms/practice-area-checkboxes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/server/actions/result";
import type { PickerOption } from "@/features/pickers/actions";
import { HEALTH_LABELS } from "../../labels";

export interface ClientPlanFormValues {
  organisation: PickerOption | null;
  year: string;
  objectives: string;
  crossSellTargetIds: string[];
  reviewMeetingDate: string;
  healthScore: number;
  owner: PickerOption | null;
}

export function ClientPlanForm({
  action,
  defaults,
  practiceAreas,
  mode,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  defaults: ClientPlanFormValues;
  practiceAreas: { id: string; name: string }[];
  mode: "create" | "edit";
}) {
  const [state, onSubmit, pending] = useFormAction(action);
  const e = fieldErrors(state);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormStatus state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        {mode === "create" && (
          <>
            <Field label="Client" htmlFor="organisationId" error={e.organisationId} required>
              <Picker
                id="organisationId"
                name="organisationId"
                kind="organisation"
                defaultValue={defaults.organisation ? [defaults.organisation] : []}
              />
            </Field>
            <Field label="Plan year" htmlFor="year" error={e.year} required>
              <Input
                id="year"
                name="year"
                type="number"
                min={2000}
                max={2100}
                defaultValue={defaults.year}
                required
                className="max-w-32"
              />
            </Field>
          </>
        )}
        <Field label="Health score" htmlFor="healthScore" error={e.healthScore}>
          <NativeSelect id="healthScore" name="healthScore" defaultValue={String(defaults.healthScore)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {HEALTH_LABELS[n]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Next review meeting" htmlFor="reviewMeetingDate" error={e.reviewMeetingDate}>
          <Input
            id="reviewMeetingDate"
            name="reviewMeetingDate"
            type="date"
            defaultValue={defaults.reviewMeetingDate}
          />
        </Field>
        <Field label="Plan owner" htmlFor="ownerId" error={e.ownerId} help="Defaults to you">
          <Picker id="ownerId" name="ownerId" kind="user" defaultValue={defaults.owner ? [defaults.owner] : []} />
        </Field>
      </div>
      <Field label="Objectives" htmlFor="objectives" error={e.objectives} required>
        <Textarea
          id="objectives"
          name="objectives"
          defaultValue={defaults.objectives}
          rows={6}
          required
          placeholder={
            "• Grow share of capital markets work\n• Introduce the tax team to the new CFO\n• Quarterly relationship lunch with GC"
          }
        />
      </Field>
      <PracticeAreaCheckboxes
        name="crossSellTargetIds"
        legend="Cross-sell target practices"
        options={practiceAreas}
        defaultValue={defaults.crossSellTargetIds}
      />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create plan" : "Save plan"}
        </Button>
      </div>
    </form>
  );
}
