"use client";

import { useState } from "react";
import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { FormStatus, fieldErrors } from "@/components/forms/form-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { changeStageAction } from "../actions";
import { OUTCOME_REASONS, OUTCOME_REASON_LABELS, STAGES, STAGE_LABELS, type StageKey } from "../../labels";

/**
 * Move an opportunity to another stage. Won/Lost asks for a reason; warnings (e.g. conflict not
 * cleared) must be acknowledged. Used on the detail page and in the board's drop dialog.
 */
export function StageChanger({
  opportunityId,
  current,
  initialTarget,
  today,
  onDone,
  onCancel,
}: {
  opportunityId: string;
  current: StageKey;
  initialTarget?: StageKey;
  today: string;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [target, setTarget] = useState<StageKey>(initialTarget ?? current);
  const [state, onSubmit, pending] = useFormAction(
    async (prev: Awaited<ReturnType<typeof changeStageAction>> | null, form: FormData) => {
      const res = await changeStageAction(opportunityId, prev, form);
      if (res.ok) onDone?.();
      return res;
    },
  );
  const e = fieldErrors(state);
  const closing = target === "WON" || target === "LOST";
  const warnings = state && !state.ok ? state.warnings : undefined;
  const id = (k: string) => `${opportunityId}-${k}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {!warnings && <FormStatus state={state} />}
      <Field label="Move to stage" htmlFor={id("stage")} error={e.stage}>
        <NativeSelect
          id={id("stage")}
          name="stage"
          value={target}
          onChange={(ev) => setTarget(ev.target.value as StageKey)}
        >
          {STAGES.map((s) => (
            <option key={s} value={s} disabled={s === current}>
              {STAGE_LABELS[s]}
              {s === current ? " (current)" : ""}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {closing && (
        <>
          <Field
            label={target === "WON" ? "Why did we win?" : "Why did we lose?"}
            htmlFor={id("outcomeReason")}
            error={e.outcomeReason}
            required
          >
            <NativeSelect id={id("outcomeReason")} name="outcomeReason" defaultValue="" required>
              <option value="">Choose…</option>
              {OUTCOME_REASONS.map((r) => (
                <option key={r} value={r}>
                  {OUTCOME_REASON_LABELS[r]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Notes on the outcome" htmlFor={id("outcome")} error={e.outcome}>
            <Textarea
              id={id("outcome")}
              name="outcome"
              rows={2}
              placeholder="e.g. Lost on price to Firm X; client wanted a capped fee"
            />
          </Field>
          <Field label="Decision date" htmlFor={id("closedDate")} error={e.closedDate}>
            <Input id={id("closedDate")} name="closedDate" type="date" defaultValue={today} />
          </Field>
        </>
      )}
      {warnings && (
        <Alert variant="warning" className="flex flex-col gap-2">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
          <label className="flex items-center gap-2">
            <Checkbox name="confirm" /> Continue anyway
          </label>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || target === current}>
          {pending ? "Saving…" : "Update stage"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
