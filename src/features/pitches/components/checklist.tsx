"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addChecklistItemAction, removeChecklistItemAction, toggleChecklistItemAction } from "../actions";

export interface ChecklistItemRow {
  id: string;
  label: string;
  done: boolean;
  isStandard: boolean;
}

function Item({ pitchId, item, canEdit }: { pitchId: string; item: ChecklistItemRow; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useOptimistic(item.done);
  return (
    <li className="flex items-center gap-2.5 py-1.5 text-sm">
      <Checkbox
        aria-label={item.label}
        checked={done}
        disabled={!canEdit || pending}
        onChange={(e) => {
          const next = e.target.checked;
          start(async () => {
            setDone(next);
            const res = await toggleChecklistItemAction(pitchId, item.id, next);
            if (!res.ok) toast.error(res.error);
          });
        }}
      />
      <span className={cn("flex-1", done && "text-muted-foreground line-through")}>{item.label}</span>
      {canEdit && !item.isStandard && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label={`Remove ${item.label}`}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await removeChecklistItemAction(pitchId, item.id);
              if (!res.ok) toast.error(res.error);
            })
          }
        >
          <Trash2 />
        </Button>
      )}
    </li>
  );
}

export function PitchChecklist({
  pitchId,
  items,
  canEdit,
}: {
  pitchId: string;
  items: ChecklistItemRow[];
  canEdit: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, onSubmit, pending] = useFormAction(
    async (prev: Awaited<ReturnType<typeof addChecklistItemAction>> | null, form: FormData) => {
      const res = await addChecklistItemAction(pitchId, prev, form);
      if (res.ok) formRef.current?.reset();
      return res;
    },
  );
  const done = items.filter((i) => i.done).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="bg-muted h-2 flex-1 rounded" aria-hidden>
          <div
            className="bg-primary h-2 rounded transition-all"
            style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {done} of {items.length} done
        </span>
      </div>
      <ul className="flex flex-col divide-y">
        {items.map((i) => (
          <Item key={i.id} pitchId={pitchId} item={i} canEdit={canEdit} />
        ))}
      </ul>
      {canEdit && (
        <form ref={formRef} onSubmit={onSubmit} className="flex gap-2">
          <Input
            name="label"
            placeholder="Add an item, e.g. Thai translation"
            aria-label="New checklist item"
            required
            maxLength={200}
          />
          <Button type="submit" variant="outline" disabled={pending}>
            <Plus /> Add
          </Button>
        </form>
      )}
      {state && !state.ok && <p className="text-destructive text-xs">{state.error}</p>}
    </div>
  );
}
