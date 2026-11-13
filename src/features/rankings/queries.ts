import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { matterVisibleWhere } from "@/server/auth/visibility";
import type { Actor } from "@/server/auth/policy";
import { listParamsSchema, pageArgs, zOptEnum, zOptFilterId } from "@/lib/list-params";
import { todayInBangkok } from "@/lib/dates";
import { PRE_SUBMISSION_STATUSES, SUBMISSION_STATUSES } from "../labels";
import { matterInclude } from "../matters/queries";
import { refereeUses } from "./service";
import { refereeReuse, refereeWarnings } from "./rules";

export const submissionListInclude = {
  directory: { select: { id: true, name: true } },
  practiceArea: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
  partnerReviewer: { select: { id: true, name: true } },
  rankedLawyers: { select: { id: true, name: true } },
  referees: { select: { briefed: true } },
  _count: { select: { matters: true } },
} satisfies Prisma.DirectorySubmissionInclude;
export type SubmissionRow = Prisma.DirectorySubmissionGetPayload<{ include: typeof submissionListInclude }>;

export const submissionFilterSchema = listParamsSchema.extend({
  year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  directory: zOptFilterId,
  practice: zOptFilterId,
  status: zOptEnum(SUBMISSION_STATUSES),
  mine: z.enum(["1"]).optional().catch(undefined),
});
export type SubmissionFilter = z.infer<typeof submissionFilterSchema>;

export async function listSubmissions(actor: Actor, f: SubmissionFilter) {
  const where: Prisma.DirectorySubmissionWhereInput = {
    archivedAt: f.archived ? { not: null } : null,
    ...(f.year ? { year: f.year } : {}),
    ...(f.directory ? { directoryId: f.directory } : {}),
    ...(f.practice ? { practiceAreaId: f.practice } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.mine
      ? { OR: [{ ownerId: actor.id }, { partnerReviewerId: actor.id }, { rankedLawyers: { some: { id: actor.id } } }] }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.directorySubmission.count({ where }),
    db.directorySubmission.findMany({
      where,
      orderBy: [{ year: "desc" }, { deadline: { sort: "asc", nulls: "last" } }, { directory: { name: "asc" } }],
      ...pageArgs(f.page, 50),
      include: submissionListInclude,
    }),
  ]);
  return { total, rows };
}

export async function submissionYears() {
  const rows = await db.directorySubmission.findMany({
    distinct: ["year"],
    select: { year: true },
    orderBy: { year: "desc" },
  });
  return rows.map((r) => r.year);
}

export async function getSubmission(actor: Actor, id: string) {
  const s = await db.directorySubmission.findUnique({
    where: { id },
    include: {
      ...submissionListInclude,
      referees: {
        orderBy: { createdAt: "asc" },
        include: {
          contact: {
            select: { id: true, nameEn: true, nameTh: true, title: true, organisation: { select: { nameEn: true } } },
          },
        },
      },
      matters: { where: matterVisibleWhere(actor), include: matterInclude, orderBy: { year: "desc" } },
    },
  });
  if (!s) return null;
  // Linked confidential matters this user cannot see: counted, never shown.
  const hiddenMatters = s._count.matters - s.matters.length;
  const referees = await Promise.all(
    s.referees.map(async (r) => ({
      ...r,
      warnings: refereeWarnings(refereeReuse({ id: s.id, year: s.year }, await refereeUses(db, r.contactId))),
    })),
  );
  return { ...s, referees, hiddenMatters };
}
export type SubmissionDetail = NonNullable<Awaited<ReturnType<typeof getSubmission>>>;

/** Referee history for the contact page. */
export function refereeHistory(contactId: string) {
  return db.referee.findMany({
    where: { contactId, submission: { archivedAt: null } },
    orderBy: { submission: { year: "desc" } },
    include: {
      submission: {
        select: {
          id: true,
          year: true,
          directory: { select: { name: true } },
          practiceArea: { select: { name: true } },
        },
      },
    },
  });
}

/** Upcoming directory and award deadlines (next `days` days, plus overdue), for the dashboard. */
export async function rankingDeadlines(actor: Actor, opts: { mine: boolean; days?: number }) {
  const today = todayInBangkok();
  const until = new Date(today.getTime() + (opts.days ?? 60) * 86_400_000);
  const [subs, awards] = await Promise.all([
    db.directorySubmission.findMany({
      where: {
        archivedAt: null,
        status: { in: [...PRE_SUBMISSION_STATUSES] },
        deadline: { lte: until },
        ...(opts.mine ? { OR: [{ ownerId: actor.id }, { partnerReviewerId: actor.id }] } : {}),
      },
      orderBy: { deadline: "asc" },
      take: 10,
      include: { directory: { select: { name: true } }, practiceArea: { select: { name: true } } },
    }),
    db.award.findMany({
      where: {
        archivedAt: null,
        status: "ENTERED",
        deadline: { gte: today, lte: until },
        ...(opts.mine ? { ownerId: actor.id } : {}),
      },
      orderBy: { deadline: "asc" },
      take: 5,
    }),
  ]);
  return { subs, awards, today };
}
