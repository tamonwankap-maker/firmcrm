/**
 * Row-level visibility filters (Prisma `where` fragments).
 *
 * RULE: every list/read query on these models MUST combine its own filter with
 * the matching function here, e.g.
 *   db.opportunity.findMany({ where: { AND: [opportunityVisibleWhere(user), filters] } })
 *
 * These mirror canSee()/can() in policy.ts and are covered by integration tests.
 */
import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "./policy";

const notArchived = { archivedAt: null } as const;

// ── Opportunity ────────────────────────────────────────────────────────────

/** Opportunity members: lead partner + team. */
export function opportunityMemberWhere(actor: Actor): Prisma.OpportunityWhereInput {
  return { OR: [{ leadPartnerId: actor.id }, { team: { some: { id: actor.id } } }] };
}

export function opportunityVisibleWhere(
  actor: Actor,
  opts: { includeArchived?: boolean } = {},
): Prisma.OpportunityWhereInput {
  const archived = opts.includeArchived ? {} : notArchived;
  if (actor.role === "ADMIN") return archived;
  if (actor.role === "VIEWER") return { ...archived, confidential: false };
  return { ...archived, OR: [{ confidential: false }, opportunityMemberWhere(actor)] };
}

/** Opportunities the actor may edit. */
export function opportunityEditableWhere(actor: Actor): Prisma.OpportunityWhereInput {
  switch (actor.role) {
    case "ADMIN":
      return {};
    case "BD":
      return opportunityVisibleWhere(actor, { includeArchived: true });
    case "PARTNER":
      return opportunityMemberWhere(actor);
    default:
      return { id: { in: [] } }; // nothing
  }
}

// ── Representative matters ─────────────────────────────────────────────────

export function matterVisibleWhere(
  actor: Actor,
  opts: { includeArchived?: boolean } = {},
): Prisma.RepresentativeMatterWhereInput {
  const archived = opts.includeArchived ? {} : notArchived;
  if (actor.role === "ADMIN") return archived;
  if (actor.role === "VIEWER") return { ...archived, confidential: false };
  return { ...archived, OR: [{ confidential: false }, { team: { some: { id: actor.id } } }] };
}

// ── Records that hang off an opportunity inherit its confidentiality ──────

function linkedOpportunityVisible(actor: Actor) {
  // A record with no opportunity is visible; otherwise the opportunity must be visible
  // (archived opportunities do not hide their linked activities).
  return [{ opportunityId: null }, { opportunity: opportunityVisibleWhere(actor, { includeArchived: true }) }];
}

export function activityVisibleWhere(actor: Actor): Prisma.ActivityWhereInput {
  if (actor.role === "ADMIN") return notArchived;
  return { ...notArchived, OR: linkedOpportunityVisible(actor) };
}

export function pitchVisibleWhere(actor: Actor): Prisma.PitchWhereInput {
  if (actor.role === "ADMIN") return notArchived;
  return { ...notArchived, opportunity: opportunityVisibleWhere(actor, { includeArchived: true }) };
}

export function taskVisibleWhere(actor: Actor): Prisma.TaskWhereInput {
  if (actor.role === "ADMIN") return {};
  return {
    AND: [
      { OR: linkedOpportunityVisible(actor) },
      {
        OR: [{ pitchId: null }, { pitch: { opportunity: opportunityVisibleWhere(actor, { includeArchived: true }) } }],
      },
    ],
  };
}
