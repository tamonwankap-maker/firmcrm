import Link from "next/link";
import { Gift, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateOnly, todayInBangkok } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { can, type Actor } from "@/server/auth/policy";
import { cn } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS } from "../../labels";
import type { ActivityWithRelations } from "../queries";
import { activityFacts } from "../facts";
import { NextActionToggle } from "./next-action-toggle";

/** Chronological list of activities with next actions. */
export function ActivityTimeline({
  activities,
  actor,
  showOrganisation = true,
  emptyMessage = "No activities logged yet.",
  returnTo,
}: {
  activities: ActivityWithRelations[];
  actor: Actor;
  showOrganisation?: boolean;
  emptyMessage?: string;
  returnTo?: string;
}) {
  if (!activities.length) return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  const today = todayInBangkok();
  return (
    <ol className="flex flex-col divide-y">
      {activities.map((a) => {
        const canEdit = can(actor, "update", "Activity", activityFacts(a));
        const overdue = a.nextAction && !a.nextActionDone && a.nextActionDue && a.nextActionDue < today;
        return (
          <li key={a.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium tabular-nums">{formatDateOnly(a.date)}</span>
              <Badge variant="secondary">{ACTIVITY_TYPE_LABELS[a.type]}</Badge>
              {a.type === "GIFT" && a.giftValue && (
                <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                  <Gift className="size-3" /> {formatMoney(a.giftValue.toString(), a.giftCurrency ?? "THB")}
                </span>
              )}
              {showOrganisation && a.organisation && (
                <Link href={`/organisations/${a.organisation.id}`} className="text-primary hover:underline">
                  {a.organisation.nameEn}
                </Link>
              )}
              {a.opportunity && (
                <Link href={`/opportunities/${a.opportunity.id}`} className="text-primary text-xs hover:underline">
                  ↳ {a.opportunity.name}
                </Link>
              )}
              <span className="text-muted-foreground text-xs">by {a.owner.name}</span>
              {canEdit && (
                <Link
                  href={`/activities/${a.id}/edit${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                  className="text-muted-foreground hover:text-foreground ml-auto"
                  aria-label="Edit activity"
                >
                  <Pencil className="size-3.5" />
                </Link>
              )}
            </div>
            <p className="text-sm whitespace-pre-line">{a.summary}</p>
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {a.contacts.length > 0 && (
                <span>
                  With:{" "}
                  {a.contacts.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ", "}
                      <Link href={`/contacts/${c.id}`} className="hover:underline">
                        {c.nameEn}
                      </Link>
                    </span>
                  ))}
                </span>
              )}
              {a.internalAttendees.length > 0 && <span>Firm: {a.internalAttendees.map((u) => u.name).join(", ")}</span>}
              {a.practiceAreas.length > 0 && <span>{a.practiceAreas.map((p) => p.name).join(", ")}</span>}
            </div>
            {a.nextAction && (
              <div
                className={cn(
                  "mt-1 flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-sm",
                  overdue && "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950",
                  a.nextActionDone && "opacity-60",
                )}
              >
                <NextActionToggle id={a.id} done={a.nextActionDone} disabled={!canEdit} />
                <span className={cn("flex-1", a.nextActionDone && "line-through")}>
                  <span className="font-medium">Next:</span> {a.nextAction}
                </span>
                {a.nextActionDue && (
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap",
                      overdue ? "font-medium text-amber-800 dark:text-amber-300" : "text-muted-foreground",
                    )}
                  >
                    {overdue ? "Overdue · " : "Due "}
                    {formatDateOnly(a.nextActionDue)}
                  </span>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
