"use client";

import { useRef, useState } from "react";
import { useFormAction } from "@/components/forms/use-form-action";
import { Pencil } from "lucide-react";
import { addLookupAction, renameLookupAction, toggleLookupAction } from "@/features/lookups/actions";
import type { LookupKind } from "@/features/lookups/schema";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Item {
  id: string;
  name: string;
  active: boolean;
}

export function LookupEditor({ kind, items, singular }: { kind: LookupKind; items: Item[]; singular: string }) {
  const addForm = useRef<HTMLFormElement>(null);
  const [state, onAdd, pending] = useFormAction(
    async (prev: Awaited<ReturnType<typeof addLookupAction>> | null, form: FormData) => {
      const res = await addLookupAction(prev, form);
      if (res.ok) addForm.current?.reset();
      return res;
    },
  );
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y rounded-md border">
        {items.map((item) => (
          <LookupRow key={item.id} kind={kind} item={item} />
        ))}
      </ul>
      <form ref={addForm} onSubmit={onAdd} className="flex gap-2">
        <input type="hidden" name="kind" value={kind} />
        <Input name="name" placeholder={`New ${singular}`} aria-label={`New ${singular}`} required maxLength={120} />
        <Button type="submit" variant="outline" disabled={pending}>
          Add
        </Button>
      </form>
      {state && !state.ok && <Alert variant="destructive">{state.error}</Alert>}
    </div>
  );
}

function LookupRow({ kind, item }: { kind: LookupKind; item: Item }) {
  const [editing, setEditing] = useState(false);
  const [state, onRename, pending] = useFormAction(
    async (prev: Awaited<ReturnType<typeof renameLookupAction>> | null, form: FormData) => {
      const res = await renameLookupAction(prev, form);
      if (res.ok) setEditing(false);
      return res;
    },
  );

  return (
    <li className="flex items-center gap-2 px-3 py-1.5 text-sm">
      {editing ? (
        <form onSubmit={onRename} className="flex flex-1 gap-2">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={item.id} />
          <Input name="name" defaultValue={item.name} aria-label="Name" required autoFocus className="h-8" />
          <Button type="submit" size="sm" disabled={pending}>
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <>
          <span className={item.active ? "flex-1" : "text-muted-foreground flex-1 line-through"}>{item.name}</span>
          {!item.active && <Badge variant="outline">Inactive</Badge>}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label={`Rename ${item.name}`}
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
          <form action={toggleLookupAction}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={item.id} />
            <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs">
              {item.active ? "Deactivate" : "Activate"}
            </Button>
          </form>
        </>
      )}
      {state && !state.ok && <span className="text-destructive text-xs">{state.error}</span>}
    </li>
  );
}
