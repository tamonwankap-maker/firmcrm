"use client";

import { useState } from "react";
import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { FormStatus, fieldErrors } from "@/components/forms/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDateOnly } from "@/lib/dates";
import { saveConsentAction } from "../actions";
import {
  CONSENT_SOURCES,
  CONSENT_SOURCE_LABELS,
  MAILING_LISTS,
  MAILING_LIST_LABELS,
  type MailingListKey,
} from "../../labels";

export interface ConsentRow {
  list: MailingListKey;
  optedIn: boolean;
  consentDate: string; // ISO
  withdrawnDate: string | null;
  source: (typeof CONSENT_SOURCES)[number];
  evidenceNote: string | null;
}

/** PDPA consents per mailing list, with an inline editor for BD/Admin. */
export function ConsentPanel({
  contactId,
  consents,
  canEdit,
  today,
}: {
  contactId: string;
  consents: ConsentRow[];
  canEdit: boolean;
  today: string; // YYYY-MM-DD in Bangkok
}) {
  const [editing, setEditing] = useState<MailingListKey | null>(null);
  return (
    <ul className="flex flex-col divide-y">
      {MAILING_LISTS.map((list) => {
        const c = consents.find((x) => x.list === list);
        return (
          <li key={list} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-32 font-medium">{MAILING_LIST_LABELS[list]}</span>
              {!c ? (
                <Badge variant="outline">No record</Badge>
              ) : c.optedIn ? (
                <Badge variant="success">Opted in</Badge>
              ) : (
                <Badge variant="destructive">{c.withdrawnDate ? "Withdrawn" : "Opted out"}</Badge>
              )}
              {c && (
                <span className="text-muted-foreground text-xs">
                  {c.optedIn
                    ? `since ${formatDateOnly(c.consentDate)}`
                    : c.withdrawnDate
                      ? `on ${formatDateOnly(c.withdrawnDate)}`
                      : ""}{" "}
                  · {CONSENT_SOURCE_LABELS[c.source]}
                </span>
              )}
              {canEdit && editing !== list && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7"
                  onClick={() => setEditing(list)}
                >
                  {c ? "Update" : "Record"}
                </Button>
              )}
            </div>
            {c?.evidenceNote && <p className="text-muted-foreground mt-1 text-xs">Evidence: {c.evidenceNote}</p>}
            {editing === list && (
              <ConsentEditor
                contactId={contactId}
                list={list}
                current={c}
                today={today}
                onDone={() => setEditing(null)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ConsentEditor({
  contactId,
  list,
  current,
  today,
  onDone,
}: {
  contactId: string;
  list: MailingListKey;
  current?: ConsentRow;
  today: string;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<"IN" | "OUT">(current ? (current.optedIn ? "OUT" : "IN") : "IN");
  const [state, onSubmit, pending] = useFormAction(
    async (prev: Awaited<ReturnType<typeof saveConsentAction>> | null, form: FormData) => {
      const res = await saveConsentAction(prev, form);
      if (res.ok) onDone();
      return res;
    },
  );
  const e = fieldErrors(state);
  const id = (k: string) => `${list}-${k}`;
  return (
    <form onSubmit={onSubmit} className="bg-muted/40 mt-2 flex flex-col gap-3 rounded-md border p-3">
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="list" value={list} />
      <FormStatus state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Status" htmlFor={id("status")}>
          <NativeSelect
            id={id("status")}
            name="status"
            value={status}
            onChange={(ev) => setStatus(ev.target.value as "IN" | "OUT")}
          >
            <option value="IN">Opted in</option>
            <option value="OUT">Opted out / withdrawn</option>
          </NativeSelect>
        </Field>
        <Field label="Source" htmlFor={id("source")} error={e.source}>
          <NativeSelect id={id("source")} name="source" defaultValue={current?.source ?? "EMAIL_REPLY"}>
            {CONSENT_SOURCES.map((s) => (
              <option key={s} value={s}>
                {CONSENT_SOURCE_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="Consent date"
          htmlFor={id("consentDate")}
          error={e.consentDate}
          help="Date consent was given (or recorded)"
        >
          <Input
            id={id("consentDate")}
            name="consentDate"
            type="date"
            required
            defaultValue={current ? current.consentDate.slice(0, 10) : today}
          />
        </Field>
        {status === "OUT" && (
          <Field label="Withdrawn on" htmlFor={id("withdrawnDate")} error={e.withdrawnDate}>
            <Input id={id("withdrawnDate")} name="withdrawnDate" type="date" defaultValue={today} />
          </Field>
        )}
      </div>
      <Field
        label="Evidence"
        htmlFor={id("evidenceNote")}
        error={e.evidenceNote}
        help="e.g. 'Reply email 12 Nov 2026 filed in iManage'"
      >
        <Input id={id("evidenceNote")} name="evidenceNote" defaultValue={current?.evidenceNote ?? ""} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Save consent
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
