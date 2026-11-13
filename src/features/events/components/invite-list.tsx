"use client";

import Link from "next/link";
import { useOptimistic, useRef, useTransition } from "react";
import { toast } from "sonner";
import { ShieldAlert, Trash2, UserPlus } from "lucide-react";
import { useFormAction } from "@/components/forms/use-form-action";
import { Picker } from "@/components/forms/picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { PickerOption } from "@/features/pickers/actions";
import { addInvitesAction, removeInviteAction, updateInviteAction } from "../actions";
import type { InviteUpdate } from "../schema";
import { RSVPS, RSVP_LABELS, type RsvpKey } from "../../labels";

export interface InviteRowData {
  id: string;
  contact: { id: string; name: string; sub: string; hasConsent: boolean };
  invited: boolean;
  rsvp: RsvpKey;
  attended: boolean | null;
  followUpOwner: PickerOption | null;
  followUpDone: boolean;
}

function InviteRow({ row, canEdit, canFollowUp }: { row: InviteRowData; canEdit: boolean; canFollowUp: boolean }) {
  const [pending, start] = useTransition();
  const [state, patchLocal] = useOptimistic(row, (cur, patch: InviteUpdate) => ({
    ...cur,
    ...(patch.invited !== undefined ? { invited: patch.invited } : {}),
    ...(patch.rsvp !== undefined ? { rsvp: patch.rsvp, invited: patch.rsvp !== "NO_REPLY" ? true : cur.invited } : {}),
    ...(patch.attended !== undefined ? { attended: patch.attended } : {}),
    ...(patch.followUpDone !== undefined ? { followUpDone: patch.followUpDone } : {}),
  }));
  const save = (patch: InviteUpdate) =>
    start(async () => {
      patchLocal(patch);
      const res = await updateInviteAction(row.id, patch);
      if (!res.ok) toast.error(res.error);
    });
  const name = row.contact.name;
  return (
    <tr className="border-b align-middle last:border-0">
      <td className="py-2 pr-3">
        <Link href={`/contacts/${row.contact.id}`} className="font-medium hover:underline">
          {name}
        </Link>
        {!row.contact.hasConsent && (
          <ShieldAlert className="ml-1 inline size-3.5 text-amber-600" aria-label="No event-invitation consent" />
        )}
        <div className="text-muted-foreground text-xs">{row.contact.sub}</div>
      </td>
      <td className="px-2 text-center">
        <Checkbox
          aria-label={`${name} invited`}
          checked={state.invited}
          disabled={!canEdit || pending}
          onChange={(e) => save({ invited: e.target.checked })}
        />
      </td>
      <td className="px-2">
        <NativeSelect
          aria-label={`${name} RSVP`}
          className="h-8 w-28 text-xs"
          value={state.rsvp}
          disabled={!canEdit || pending}
          onChange={(e) => save({ rsvp: e.target.value as RsvpKey })}
        >
          {RSVPS.map((r) => (
            <option key={r} value={r}>
              {RSVP_LABELS[r]}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="px-2">
        <NativeSelect
          aria-label={`${name} attended`}
          className="h-8 w-24 text-xs"
          value={state.attended == null ? "" : state.attended ? "yes" : "no"}
          disabled={!canEdit || pending}
          onChange={(e) => save({ attended: e.target.value === "" ? null : e.target.value === "yes" })}
        >
          <option value="">—</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </NativeSelect>
      </td>
      <td className="w-48 px-2">
        {canEdit ? (
          <Picker
            id={`fu-${row.id}`}
            name="_fu"
            kind="user"
            placeholder="Assign…"
            defaultValue={row.followUpOwner ? [row.followUpOwner] : []}
            onChange={(sel) => save({ followUpOwnerId: sel[0]?.id ?? null })}
          />
        ) : (
          <span className="text-xs">{row.followUpOwner?.label ?? "—"}</span>
        )}
      </td>
      <td className="px-2 text-center">
        <Checkbox
          aria-label={`${name} follow-up done`}
          checked={state.followUpDone}
          disabled={!(canEdit || canFollowUp) || pending}
          onChange={(e) => save({ followUpDone: e.target.checked })}
        />
      </td>
      <td className="pl-2 text-right">
        {canEdit && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label={`Remove ${name}`}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await removeInviteAction(row.id);
                if (!res.ok) toast.error(res.error);
              })
            }
          >
            <Trash2 />
          </Button>
        )}
      </td>
    </tr>
  );
}

export function InviteList({
  rows,
  canEdit,
  currentUserId,
}: {
  rows: InviteRowData[];
  canEdit: boolean;
  currentUserId: string;
}) {
  if (!rows.length) return <p className="text-muted-foreground text-sm">No one on the invite list yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs uppercase">
            <th className="py-2 pr-3 font-medium">Guest</th>
            <th className="px-2 text-center font-medium">Invited</th>
            <th className="px-2 font-medium">RSVP</th>
            <th className="px-2 font-medium">Attended</th>
            <th className="px-2 font-medium">Follow-up by</th>
            <th className="px-2 text-center font-medium">Done</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <InviteRow key={r.id} row={r} canEdit={canEdit} canFollowUp={r.followUpOwner?.id === currentUserId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AddInvitesForm({ eventId, tags }: { eventId: string; tags: { id: string; name: string }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, onSubmit, pending] = useFormAction(
    async (prev: Awaited<ReturnType<typeof addInvitesAction>> | null, form: FormData) => {
      const res = await addInvitesAction(eventId, prev, form);
      if (res.ok) {
        ref.current?.reset();
        toast.success(res.message ?? "Added.");
      }
      return res;
    },
  );
  return (
    <form ref={ref} onSubmit={onSubmit} className="bg-muted/30 flex flex-col gap-3 rounded-md border p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`inv-contacts-${eventId}`}>Contacts</Label>
          <Picker
            id={`inv-contacts-${eventId}`}
            name="contactIds"
            kind="contact"
            multiple
            placeholder="Search contacts…"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`inv-tag-${eventId}`}>…or everyone tagged</Label>
          <NativeSelect id={`inv-tag-${eventId}`} name="tagId" defaultValue="">
            <option value="">—</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`inv-org-${eventId}`}>…or everyone at</Label>
          <Picker id={`inv-org-${eventId}`} name="organisationId" kind="organisation" placeholder="Organisation…" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="onlyConsented" /> Only add contacts who opted in to event invitations
      </label>
      {state && !state.ok && state.warnings ? (
        <Alert variant="warning" className="flex flex-col gap-2">
          {state.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
          <label className="flex items-center gap-2">
            <Checkbox name="confirm" /> Add them anyway
          </label>
        </Alert>
      ) : state && !state.ok ? (
        <Alert variant="destructive">{state.error}</Alert>
      ) : null}
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          <UserPlus /> Add to invite list
        </Button>
      </div>
    </form>
  );
}
