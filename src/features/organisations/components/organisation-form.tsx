"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { FormStatus, fieldErrors } from "@/components/forms/form-shell";
import { Picker } from "@/components/forms/picker";
import { DuplicateNotice } from "@/components/records/duplicate-notice";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/server/actions/result";
import type { PickerOption } from "@/features/pickers/actions";
import {
  ORG_STATUSES,
  ORG_STATUS_LABELS,
  ORG_TYPES,
  ORG_TYPE_LABELS,
  type OrgStatus,
  type OrgType,
} from "../../labels";

export interface OrganisationFormValues {
  nameEn: string;
  nameTh: string;
  type: OrgType | "";
  status: OrgStatus;
  industryId: string;
  country: string;
  relationshipPartner: PickerOption | null;
  isKeyClient: boolean;
  website: string;
  notes: string;
}

export function OrganisationForm({
  action,
  defaults,
  industries,
  countries,
  submitLabel,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  defaults: OrganisationFormValues;
  industries: { id: string; name: string }[];
  countries: { code: string; name: string; common: boolean }[];
  submitLabel: string;
}) {
  const [state, onSubmit, pending] = useFormAction(action);
  const e = fieldErrors(state);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormStatus state={state} />
      {state && !state.ok && state.duplicates && <DuplicateNotice matches={state.duplicates} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name (English)" htmlFor="nameEn" error={e.nameEn} required>
          <Input id="nameEn" name="nameEn" defaultValue={defaults.nameEn} required maxLength={300} />
        </Field>
        <Field label="Name (Thai) / ชื่อภาษาไทย" htmlFor="nameTh" error={e.nameTh}>
          <Input id="nameTh" name="nameTh" lang="th" defaultValue={defaults.nameTh} maxLength={300} />
        </Field>
        <Field label="Type" htmlFor="type" error={e.type} required>
          <NativeSelect id="type" name="type" defaultValue={defaults.type} required>
            <option value="">Choose…</option>
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>
                {ORG_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Status" htmlFor="status" error={e.status}>
          <NativeSelect id="status" name="status" defaultValue={defaults.status}>
            {ORG_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORG_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Industry" htmlFor="industryId" error={e.industryId}>
          <NativeSelect id="industryId" name="industryId" defaultValue={defaults.industryId}>
            <option value="">—</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Country" htmlFor="country" error={e.country}>
          <NativeSelect id="country" name="country" defaultValue={defaults.country}>
            <optgroup label="Common">
              {countries
                .filter((c) => c.common)
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="All countries">
              {countries
                .filter((c) => !c.common)
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          </NativeSelect>
        </Field>
        <Field label="Relationship partner" htmlFor="relationshipPartnerId" error={e.relationshipPartnerId}>
          <Picker
            id="relationshipPartnerId"
            name="relationshipPartnerId"
            kind="user"
            defaultValue={defaults.relationshipPartner ? [defaults.relationshipPartner] : []}
            placeholder="Search partners…"
          />
        </Field>
        <Field label="Website" htmlFor="website" error={e.website}>
          <Input id="website" name="website" defaultValue={defaults.website} placeholder="www.example.co.th" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="isKeyClient" defaultChecked={defaults.isKeyClient} /> Key client
      </label>
      <Field label="Notes" htmlFor="notes" error={e.notes}>
        <Textarea id="notes" name="notes" defaultValue={defaults.notes} rows={4} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
