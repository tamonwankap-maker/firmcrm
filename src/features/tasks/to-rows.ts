import { can, type Actor } from "@/server/auth/policy";
import { todayInBangkok } from "@/lib/dates";
import type { TaskWithRelations } from "./queries";

/** Serialise tasks for the client TaskList. */
export function toTaskRows(actor: Actor, tasks: TaskWithRelations[]) {
  const today = todayInBangkok();
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate?.toISOString() ?? null,
    overdue: !!t.dueDate && t.dueDate < today,
    status: t.status,
    ownerName: t.owner.name,
    link: t.organisation
      ? { href: `/organisations/${t.organisation.id}`, label: t.organisation.nameEn }
      : t.contact
        ? { href: `/contacts/${t.contact.id}`, label: t.contact.nameEn }
        : t.opportunity
          ? { href: `/opportunities/${t.opportunity.id}`, label: t.opportunity.name }
          : t.pitch
            ? { href: `/pitches/${t.pitch.id}`, label: `Pitch: ${t.pitch.opportunity.name}` }
            : null,
    canEdit: can(actor, "update", "Task", { memberIds: [t.ownerId] }),
  }));
}
