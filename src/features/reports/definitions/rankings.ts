import "server-only";
import { db } from "@/server/db";
import { SUBMISSION_STATUS_LABELS } from "../../labels";
import type { ReportDef } from "../types";

export const rankingsReport: ReportDef = {
  id: "rankings",
  title: "Rankings calendar",
  description: "Directory submissions for a guide year: deadlines, owners, referees briefed and results.",
  roles: ["ADMIN", "BD", "PARTNER"],
  params: ["year"],
  async run(_actor, p) {
    const subs = await db.directorySubmission.findMany({
      where: { archivedAt: null, year: p.year },
      orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { directory: { name: "asc" } }],
      include: {
        directory: { select: { name: true } },
        practiceArea: { select: { name: true } },
        owner: { select: { name: true } },
        partnerReviewer: { select: { name: true } },
        referees: { select: { briefed: true } },
        _count: { select: { matters: true } },
      },
    });
    const rows = subs.map((s) => ({
      deadline: s.deadline?.toISOString() ?? null,
      directory: s.directory.name,
      practice: s.practiceArea.name,
      status: SUBMISSION_STATUS_LABELS[s.status],
      owner: s.owner.name,
      reviewer: s.partnerReviewer?.name ?? null,
      referees: s.referees.length,
      briefed: s.referees.filter((r) => r.briefed).length,
      matters: s._count.matters,
      result: s.resultTier,
    }));
    return {
      columns: [
        { key: "deadline", label: "Deadline", type: "date" },
        { key: "directory", label: "Directory", type: "text" },
        { key: "practice", label: "Practice area", type: "text" },
        { key: "status", label: "Status", type: "text" },
        { key: "owner", label: "Owner", type: "text" },
        { key: "reviewer", label: "Partner reviewer", type: "text" },
        { key: "referees", label: "Referees", type: "number" },
        { key: "briefed", label: "Briefed", type: "number" },
        { key: "matters", label: "Matters", type: "number" },
        { key: "result", label: "Result", type: "text" },
      ],
      rows,
      highlights: [
        { label: "Submissions", value: String(rows.length) },
        {
          label: "Referees briefed",
          value: `${rows.reduce((s, r) => s + r.briefed, 0)} / ${rows.reduce((s, r) => s + r.referees, 0)}`,
        },
      ],
    };
  },
};
