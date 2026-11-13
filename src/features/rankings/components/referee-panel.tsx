"use client";

import Link from "next/link";
import { useOptimistic, useRef, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Trash2, UserPlus } from "lucide-react";
import { useFormAction } from "@/components/forms/use-form-action";
import { Picker } from "@/components/forms/picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { addRefereeAction, removeRefereeAction, setRefereeBriefedAction } from "../actions";

export interface RefereeRow {
  id: string;
  contact: { id: string; name: string; sub: string };
  briefed: boolean;
  briefedDate: string;
  notes: string | null;
  warnings: string[];
}

function Row({ r, canEdit }: { r: RefereeRow; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [briefed, setBriefed] = useOptimistic(r.briefed);
  return (
    <li className="flex flex-col gap-1 py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/contacts/${r.contact.id}`} className="font-medium hover:underline">
          {r.contact.name}
        </Link>
        <span className="text-muted-foreground text-xs">{r.contact.sub}</span>
        <label className="ml-auto flex items-center gap-1.5 text-xs">
          <Checkbox
            checked={briefed}
            disabled={!canEdit || pending}
            onChange={(e) => {
              const next = e.target.checked;
              start(async () => {
                setBriefed(next);
                const res = await setRefereeBriefedAction(r.id, next);
                if (!res.ok) toast.error(res.error);
              });
            }}
          />
          Briefed{briefed && r.briefedDate ? ` ${r.briefedDate}` : ""}
        </label>
        {canEdit && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label={`Remove ${r.contact.name}`}
            disabled={pending}
            onClick={() => {
              if (!confirm(`Remove ${r.contact.name} as a referee?`)) return;
              start(async () => {
                const res = await removeRefereeAction(r.id);
                if (!res.ok) toast.error(res.error);
              });
            }}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {r.warnings.map((w) => (
        <p key={w} className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-3" aria-hidden /> {w}
        </p>
      ))}
      {r.notes && <p className="text-muted-foreground text-xs">{r.notes}</p>}
    </li>
  );
}

export function RefereePanel({
  submissionId,
  referees,
  canEdit,
}: {
  submissionId: string;
  referees: RefereeRow[];
  canEdit: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, onSubmit, pending] = useFormAction(
    async (prev: Awaited<ReturnType<typeof addRefereeAction>> | null, form: FormData) => {
      const res = await addRefereeAction(submissionId, prev, form);
      if (res.ok) formRef.current?.reset();
      return res;
    },
  );
  const briefedCount = referees.filter((r) => r.briefed).length;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">
        {referees.length === 1 ? "1 referee" : `${referees.length} referees`} · {briefedCount} briefed. Avoid reusing a
        referee within two years — directories may discount repeat referees.
      </p>
      {referees.length > 0 && (
        <ul className="flex flex-col divide-y">
          {referees.map((r) => (
            <Row key={r.id} r={r} canEdit={canEdit} />
          ))}
        </ul>
      )}
      {canEdit && (
        <form ref={formRef} onSubmit={onSubmit} className="bg-muted/30 flex flex-col gap-2 rounded-md border p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Picker
              id={`referee-${submissionId}`}
              name="contactId"
              kind="contact"
              placeholder="Search client contacts…"
            />
            <Input name="notes" placeholder="Notes (optional)" aria-label="Referee notes" />
            <Button type="submit" variant="outline" disabled={pending}>
              <UserPlus /> Add referee
            </Button>
          </div>
          {state && !state.ok && state.warnings ? (
            <Alert variant="warning" className="flex flex-col gap-1.5">
              {state.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
              <label className="flex items-center gap-2">
                <Checkbox name="confirm" /> Add anyway
              </label>
            </Alert>
          ) : state && !state.ok ? (
            <Alert variant="destructive">{state.error}</Alert>
          ) : null}
        </form>
      )}
    </div>
  );
}
