"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { setTaskStatusAction } from "../actions";
import { TASK_STATUS_LABELS, type TaskStatusKey } from "../../labels";

export interface TaskRow {
  id: string;
  title: string;
  dueDate: string | null; // ISO
  overdue: boolean;
  status: TaskStatusKey;
  ownerName: string;
  link: { href: string; label: string } | null;
  canEdit: boolean;
}

function TaskItem({ t, showOwner, showLink }: { t: TaskRow; showOwner: boolean; showLink: boolean }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useOptimistic(t.status);
  const done = status === "DONE";
  return (
    <li className="flex items-start gap-2.5 py-2">
      <Checkbox
        className="mt-0.5"
        aria-label={done ? `Reopen ${t.title}` : `Complete ${t.title}`}
        checked={done}
        disabled={!t.canEdit || pending}
        onChange={(e) =>
          start(async () => {
            const next = e.target.checked ? "DONE" : "OPEN";
            setStatus(next);
            const res = await setTaskStatusAction(t.id, next);
            if (!res.ok) toast.error(res.error);
          })
        }
      />
      <div className="min-w-0 flex-1 text-sm">
        <div className={cn(done && "text-muted-foreground line-through")}>{t.title}</div>
        <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
          {showLink && t.link && (
            <Link href={t.link.href} className="hover:underline">
              {t.link.label}
            </Link>
          )}
          {showOwner && <span>{t.ownerName}</span>}
          {status === "IN_PROGRESS" && <Badge variant="outline">{TASK_STATUS_LABELS[status]}</Badge>}
        </div>
      </div>
      {t.dueDate && (
        <span
          className={cn(
            "text-xs whitespace-nowrap",
            t.overdue && !done ? "font-medium text-amber-700 dark:text-amber-300" : "text-muted-foreground",
          )}
        >
          {t.overdue && !done ? "Overdue · " : ""}
          {formatDateOnly(t.dueDate)}
        </span>
      )}
    </li>
  );
}

export function TaskList({
  tasks,
  showOwner = true,
  showLink = true,
  emptyMessage = "No open tasks.",
}: {
  tasks: TaskRow[];
  showOwner?: boolean;
  showLink?: boolean;
  emptyMessage?: string;
}) {
  if (!tasks.length) return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  return (
    <ul className="flex flex-col divide-y">
      {tasks.map((t) => (
        <TaskItem key={t.id} t={t} showOwner={showOwner} showLink={showLink} />
      ))}
    </ul>
  );
}
