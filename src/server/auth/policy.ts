/**
 * Role-based access control — the single source of truth for "who may do what".
 *
 * Pure functions (no DB access) so every rule is unit-tested in tests/unit/policy.test.ts.
 * Row-level filtering for lists lives in ./visibility.ts and must agree with these rules.
 *
 * Rules (PLAN.md §2 "Access rules"):
 *  - ADMIN: everything.
 *  - BD: create/edit all BD records; cannot see confidential records unless named on them.
 *  - PARTNER: create records; edit only records they are a member of (owner / lead / team / relationship partner);
 *             read-only firm-wide pipeline summary.
 *  - VIEWER: read-only, never sees confidential records.
 *  - Confidential records: ADMIN + named members only.
 */

export type Role = "ADMIN" | "BD" | "PARTNER" | "VIEWER";

export interface Actor {
  id: string;
  role: Role;
}

export type Action = "read" | "create" | "update" | "archive" | "delete" | "export";

/** Records that hold BD data and follow the membership/confidential rules. */
export const BD_SUBJECTS = [
  "Organisation",
  "Contact",
  "Activity",
  "Opportunity",
  "Pitch",
  "DirectorySubmission",
  "Referee",
  "RepresentativeMatter",
  "Award",
  "Event",
  "EventInvite",
  "Content",
  "ClientPlan",
  "Task",
] as const;
export type BdSubject = (typeof BD_SUBJECTS)[number];

/** System areas that only ADMIN may manage. */
export const ADMIN_SUBJECTS = ["User", "Setting", "AuditLog", "LookupList"] as const;
export type AdminSubject = (typeof ADMIN_SUBJECTS)[number];

/** Special subjects with their own rules. */
export type SpecialSubject = "MailingConsent" | "PipelineSummary" | "Tag";

export type Subject = BdSubject | AdminSubject | SpecialSubject;

/** The facts about a specific record that the policy needs. */
export interface ResourceFacts {
  confidential?: boolean;
  /** Users named on the record: owners, lead partner, team, relationship partner, attendees… */
  memberIds?: readonly string[];
}

export function isMember(actor: Actor, resource?: ResourceFacts): boolean {
  return !!resource?.memberIds?.includes(actor.id);
}

/** Can the actor see this record at all? (confidential gate) */
export function canSee(actor: Actor, resource?: ResourceFacts): boolean {
  if (actor.role === "ADMIN") return true;
  if (!resource?.confidential) return true;
  if (actor.role === "VIEWER") return false;
  return isMember(actor, resource);
}

const isAdminSubject = (s: Subject): s is AdminSubject => (ADMIN_SUBJECTS as readonly string[]).includes(s);

/**
 * Main policy check.
 * For create, pass no resource. For read/update/archive on a specific record, pass its facts.
 * For "read" on a list without a record, this answers "may they open the list at all";
 * row filtering is done by visibility.ts.
 */
export function can(actor: Actor, action: Action, subject: Subject, resource?: ResourceFacts): boolean {
  const { role } = actor;

  if (role === "ADMIN") return true;

  // Hard delete is ADMIN-only for everything.
  if (action === "delete") return false;

  if (isAdminSubject(subject)) return false;

  if (subject === "PipelineSummary") {
    return action === "read" && (role === "BD" || role === "PARTNER");
  }

  if (subject === "MailingConsent") {
    // PDPA data: everyone who can see the contact may read it; only BD changes it.
    if (action === "read") return true;
    return role === "BD";
  }

  if (subject === "Tag") {
    if (action === "read") return true;
    return role === "BD";
  }

  // ── BD records ──
  if (!canSee(actor, resource)) return false;

  switch (action) {
    case "read":
      return true;
    case "create":
      return role === "BD" || role === "PARTNER";
    case "update":
    case "archive":
      if (role === "BD") return true;
      if (role === "PARTNER") return isMember(actor, resource);
      return false;
    case "export":
      // Partners may export, but queries restrict them to their own records.
      return role === "BD" || role === "PARTNER";
    default:
      return false;
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do this.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Throwing variant for server actions. */
export function assertCan(actor: Actor, action: Action, subject: Subject, resource?: ResourceFacts): void {
  if (!can(actor, action, subject, resource)) throw new ForbiddenError();
}

/** True if exports for this actor must be limited to records they are a member of. */
export function exportScopedToOwn(actor: Actor): boolean {
  return actor.role === "PARTNER";
}
