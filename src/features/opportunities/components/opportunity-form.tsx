"use client";

import { useState } from "react";
import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { FormStatus, fieldErrors } from "@/components/forms/form-shell";
import { Picker } from "@/components/forms/picker";
import { PracticeAreaCheckboxes } from "@/components/forms/practice-area-checkboxes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { ActionResult } from "@/server/actions/result";
import type { PickerOption } from "@/features/pickers/actions";
import {
  CONFLICT_LABELS,
  CONFLICT_STATUSES,
  CURRENCIES,
  OPEN_STAGES,
  OPP_SOURCES,
  OPP_SOURCE_LABELS,
  STAGE_LABELS,
  type ConflictKey,
  type OppSourceKey,
  type StageKey,
} from "../../labels";

export interface OpportunityFormValues {
  name: string;
  organisation: PickerOption | null;
  source: OppSourceKey | "";
  referrerOrg: PickerOption | null;
  referrerContact: PickerOption | null;
  practiceAreaIds: string[];
  leadPartner: PickerOption | null;
  team: PickerOption[];
  feeEstimateMin: string;
  feeEstimateMax: string;
  currency: "THB" | "USD";
  probability: string;
  stage: StageKey;
  conflictStatus: ConflictKey;
  expectedDecisionDate: string;
  competitors: string;
  confidential: boolean;
}

const REFERRAL_SOURCES: OppSourceKey[] = ["REFERRAL", "FOREIGN_LAW_FIRM_REFERRAL"];

export function OpportunityForm({
  action,
  defaults,
  practiceAreas,
  mode,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  defaults: OpportunityFormValues;
  practiceAreas: { id: string; name: string }[];
  mode: "create" | "edit";
}) {
  const [state, onSubmit, pending] = useFormAction(action);
  const [source, setSource] = useState(defaults.source);
  const e = fieldErrors(state);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormStatus state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Opportunity name"
          htmlFor="name"
          error={e.name}
          required
          help="e.g. “Project Lotus — acquisition of Vietnamese target”"
        >
          <Input id="name" name="name" defaultValue={defaults.name} required maxLength={300} />
        </Field>
        <Field label="Client / prospect" htmlFor="organisationId" error={e.organisationId} required>
          <Picker
            id="organisationId"
            name="organisationId"
            kind="organisation"
            defaultValue={defaults.organisation ? [defaults.organisation] : []}
          />
        </Field>
        <Field label="Source" htmlFor="source" error={e.source} required>
          <NativeSelect
            id="source"
            name="source"
            value={source}
            onChange={(ev) => setSource(ev.target.value as OppSourceKey)}
            required
          >
            <option value="">Choose…</option>
            {OPP_SOURCES.map((s) => (
              <option key={s} value={s}>
                {OPP_SOURCE_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {source && REFERRAL_SOURCES.includes(source) ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Referred by (firm)" htmlFor="referrerOrgId" error={e.referrerOrgId}>
              <Picker
                id="referrerOrgId"
                name="referrerOrgId"
                kind="organisation"
                defaultValue={defaults.referrerOrg ? [defaults.referrerOrg] : []}
              />
            </Field>
            <Field label="Referred by (person)" htmlFor="referrerContactId" error={e.referrerContactId}>
              <Picker
                id="referrerContactId"
                name="referrerContactId"
                kind="contact"
                defaultValue={defaults.referrerContact ? [defaults.referrerContact] : []}
              />
            </Field>
          </div>
        ) : (
          <div />
        )}
        <Field label="Lead partner" htmlFor="leadPartnerId" error={e.leadPartnerId} required>
          <Picker
            id="leadPartnerId"
            name="leadPartnerId"
            kind="lawyer"
            defaultValue={defaults.leadPartner ? [defaults.leadPartner] : []}
          />
        </Field>
        <Field
          label="Team"
          htmlFor="teamIds"
          error={e.teamIds}
          help="People named here can see it if it is confidential"
        >
          <Picker id="teamIds" name="teamIds" kind="lawyer" multiple defaultValue={defaults.team} />
        </Field>
        <Field label="Fee estimate" htmlFor="feeEstimateMin" error={e.feeEstimateMin ?? e.feeEstimateMax}>
          <div className="flex gap-2">
            <Input
              id="feeEstimateMin"
              name="feeEstimateMin"
              inputMode="decimal"
              placeholder="Min"
              defaultValue={defaults.feeEstimateMin}
              aria-label="Minimum fee"
            />
            <Input
              name="feeEstimateMax"
              inputMode="decimal"
              placeholder="Max"
              defaultValue={defaults.feeEstimateMax}
              aria-label="Maximum fee"
            />
            <NativeSelect
              name="currency"
              defaultValue={defaults.currency}
              aria-label="Currency"
              className="w-24 shrink-0"
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Win probability %"
            htmlFor="probability"
            error={e.probability}
            help={mode === "create" ? "Blank = stage default" : undefined}
          >
            <Input
              id="probability"
              name="probability"
              type="number"
              min={0}
              max={100}
              defaultValue={defaults.probability}
            />
          </Field>
          <Field label="Expected decision" htmlFor="expectedDecisionDate" error={e.expectedDecisionDate}>
            <Input
              id="expectedDecisionDate"
              name="expectedDecisionDate"
              type="date"
              defaultValue={defaults.expectedDecisionDate}
            />
          </Field>
        </div>
        {mode === "create" && (
          <Field label="Starting stage" htmlFor="stage" error={e.stage}>
            <NativeSelect id="stage" name="stage" defaultValue={defaults.stage}>
              {OPEN_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        <Field label="Conflict check" htmlFor="conflictStatus" error={e.conflictStatus}>
          <NativeSelect id="conflictStatus" name="conflictStatus" defaultValue={defaults.conflictStatus}>
            {CONFLICT_STATUSES.map((c) => (
              <option key={c} value={c}>
                {CONFLICT_LABELS[c]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Competitors" htmlFor="competitors" error={e.competitors} help="Comma-separated">
          <Input
            id="competitors"
            name="competitors"
            defaultValue={defaults.competitors}
            placeholder="e.g. Firm A, Firm B"
          />
        </Field>
      </div>
      <PracticeAreaCheckboxes options={practiceAreas} defaultValue={defaults.practiceAreaIds} />
      {e.practiceAreaIds && <p className="text-destructive -mt-3 text-xs">{e.practiceAreaIds[0]}</p>}
      <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
        <Checkbox name="confidential" defaultChecked={defaults.confidential} className="mt-0.5" />
        <span>
          <span className="font-medium">Confidential</span>
          <span className="text-muted-foreground block text-xs">
            Only the Head of BD, the lead partner and the team can see it. Others see it only as an anonymous count in
            pipeline totals.
          </span>
          {e.confidential && <span className="text-destructive block text-xs">{e.confidential[0]}</span>}
        </span>
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create opportunity" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
