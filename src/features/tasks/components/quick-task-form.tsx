"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { useFormAction } from "@/components/forms/use-form-action";
import { Picker } from "@/components/forms/picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/server/actions/result";
import { createTaskAction } from "../actions";

/** Inline "add task" form. Optionally linked to an organisation or contact. */
export function QuickTaskForm({
  organisationId,
  contactId,
  opportunityId,
  pitchId,
}: {
  organisationId?: string;
  contactId?: string;
  opportunityId?: string;
  pitchId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, onSubmit, pending] = useFormAction(async (prev: ActionResult | null, form: FormData) => {
    const res = await createTaskAction(prev, form);
    if (res.ok) formRef.current?.reset();
    return res;
  });
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-2">
      {organisationId && <input type="hidden" name="organisationId" value={organisationId} />}
      {contactId && <input type="hidden" name="contactId" value={contactId} />}
      {opportunityId && <input type="hidden" name="opportunityId" value={opportunityId} />}
      {pitchId && <input type="hidden" name="pitchId" value={pitchId} />}
      <div className="flex flex-wrap gap-2">
        <Input name="title" placeholder="New task…" aria-label="Task title" required className="min-w-48 flex-1" />
        <Input name="dueDate" type="date" aria-label="Due date" className="w-40" />
        <div className="w-48">
          <Picker
            id={`task-owner-${organisationId ?? contactId ?? opportunityId ?? pitchId ?? "x"}`}
            name="ownerId"
            kind="user"
            placeholder="Owner (you)"
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          <Plus /> Add
        </Button>
      </div>
      {state && !state.ok && <Alert variant="destructive">{state.error}</Alert>}
    </form>
  );
}
