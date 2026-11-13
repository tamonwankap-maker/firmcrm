"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, STAGE_LABELS, type StageKey } from "../../labels";
import { StageChanger } from "./stage-changer";

export interface BoardCard {
  id: string;
  name: string;
  organisation: string;
  stage: StageKey;
  lead: string;
  fee: string;
  probability: number;
  confidential: boolean;
  conflictWarning: boolean;
  nextPitch: string | null;
  canEdit: boolean;
}

/**
 * Kanban board. Drag a card to another column (or use its "Move…" menu, which works by keyboard)
 * to open the stage dialog; Won/Lost ask for a reason there.
 */
export function OpportunityBoard({
  cards,
  columnTotals,
  today,
}: {
  cards: BoardCard[];
  columnTotals: Record<string, string>;
  today: string;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<StageKey | null>(null);
  const [pending, setPending] = useState<{ card: BoardCard; to: StageKey } | null>(null);

  return (
    <>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 lg:-mx-8 lg:px-8">
        <div className="grid min-w-[1100px] grid-cols-7 gap-3">
          {STAGES.map((stage) => {
            const col = cards.filter((c) => c.stage === stage);
            return (
              <section
                key={stage}
                aria-label={STAGE_LABELS[stage]}
                className={cn("bg-muted/40 flex flex-col rounded-lg border p-2", over === stage && "ring-ring ring-2")}
                onDragOver={(e) => {
                  if (dragging) {
                    e.preventDefault();
                    setOver(stage);
                  }
                }}
                onDragLeave={() => setOver((s) => (s === stage ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  const card = cards.find((c) => c.id === dragging);
                  setDragging(null);
                  if (card && card.stage !== stage) setPending({ card, to: stage });
                }}
              >
                <header className="mb-2 px-1">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{STAGE_LABELS[stage]}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">{col.length}</span>
                  </div>
                  {columnTotals[stage] && (
                    <div className="text-muted-foreground text-xs">{columnTotals[stage]} weighted</div>
                  )}
                  {(stage === "WON" || stage === "LOST") && (
                    <div className="text-muted-foreground text-[11px]">last 90 days</div>
                  )}
                </header>
                <ul className="flex flex-col gap-2">
                  {col.map((c) => (
                    <li
                      key={c.id}
                      draggable={c.canEdit}
                      onDragStart={() => setDragging(c.id)}
                      onDragEnd={() => setDragging(null)}
                      className={cn(
                        "bg-card rounded-md border p-2.5 text-sm shadow-xs",
                        c.canEdit && "cursor-grab",
                        dragging === c.id && "opacity-50",
                      )}
                    >
                      <Link href={`/opportunities/${c.id}`} className="leading-snug font-medium hover:underline">
                        {c.confidential && (
                          <Lock className="text-destructive mr-1 inline size-3" aria-label="Confidential" />
                        )}
                        {c.name}
                      </Link>
                      <div className="text-muted-foreground mt-0.5 truncate text-xs">{c.organisation}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span>{c.lead}</span>
                        {c.fee && <span className="text-muted-foreground">{c.fee}</span>}
                        <span className="text-muted-foreground">{c.probability}%</span>
                      </div>
                      {c.nextPitch && (
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                          <CalendarClock className="size-3" /> Pitch due {c.nextPitch}
                        </div>
                      )}
                      {c.conflictWarning && (
                        <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                          Conflict check not cleared
                        </div>
                      )}
                      {c.canEdit && (
                        <select
                          aria-label={`Move ${c.name} to another stage`}
                          className="bg-background text-muted-foreground mt-2 w-full rounded border px-1 py-0.5 text-xs"
                          value=""
                          onChange={(e) => e.target.value && setPending({ card: c, to: e.target.value as StageKey })}
                        >
                          <option value="">Move to…</option>
                          {STAGES.filter((s) => s !== c.stage).map((s) => (
                            <option key={s} value={s}>
                              {STAGE_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Change stage"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setPending(null)} />
          <div className="bg-card relative w-full max-w-md rounded-lg p-5 shadow-xl">
            <h2 className="mb-1 font-semibold">{pending.card.name}</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              {STAGE_LABELS[pending.card.stage]} → {STAGE_LABELS[pending.to]}
            </p>
            <StageChanger
              opportunityId={pending.card.id}
              current={pending.card.stage}
              initialTarget={pending.to}
              today={today}
              onDone={() => setPending(null)}
              onCancel={() => setPending(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
