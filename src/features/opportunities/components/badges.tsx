import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CONFLICT_LABELS, STAGE_LABELS, type ConflictKey, type StageKey } from "../../labels";

const STAGE_VARIANT: Record<StageKey, "secondary" | "outline" | "success" | "destructive" | "warning"> = {
  LEAD: "outline",
  QUALIFIED: "secondary",
  PROPOSAL_PREPARING: "secondary",
  SUBMITTED: "secondary",
  WON: "success",
  LOST: "destructive",
  ON_HOLD: "warning",
};

export function StageBadge({ stage }: { stage: StageKey }) {
  return <Badge variant={STAGE_VARIANT[stage]}>{STAGE_LABELS[stage]}</Badge>;
}

const CONFLICT_VARIANT: Record<ConflictKey, "outline" | "warning" | "success" | "destructive"> = {
  NOT_REQUESTED: "outline",
  REQUESTED: "warning",
  CLEARED: "success",
  CONFLICT: "destructive",
};

export function ConflictBadge({ status }: { status: ConflictKey }) {
  return <Badge variant={CONFLICT_VARIANT[status]}>Conflict: {CONFLICT_LABELS[status]}</Badge>;
}

export function ConfidentialBadge() {
  return (
    <Badge variant="destructive" className="gap-1">
      <Lock className="size-3" aria-hidden /> Confidential
    </Badge>
  );
}
