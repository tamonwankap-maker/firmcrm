/** Display labels for enums. Keep in one place so lists, forms, exports and imports agree. */

export const ORG_TYPES = [
  "CLIENT",
  "PROSPECT",
  "REFERRER",
  "FOREIGN_LAW_FIRM",
  "INTERMEDIARY",
  "MEDIA",
  "DIRECTORY",
  "ASSOCIATION",
] as const;
export type OrgType = (typeof ORG_TYPES)[number];
export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  CLIENT: "Client",
  PROSPECT: "Prospect",
  REFERRER: "Referrer",
  FOREIGN_LAW_FIRM: "Foreign law firm",
  INTERMEDIARY: "Intermediary",
  MEDIA: "Media",
  DIRECTORY: "Directory",
  ASSOCIATION: "Association",
};

export const ORG_STATUSES = ["ACTIVE", "DORMANT", "LOST"] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];
export const ORG_STATUS_LABELS: Record<OrgStatus, string> = { ACTIVE: "Active", DORMANT: "Dormant", LOST: "Lost" };

export const LANGUAGES = ["EN", "TH", "OTHER"] as const;
export const LANGUAGE_LABELS: Record<(typeof LANGUAGES)[number], string> = {
  EN: "English",
  TH: "Thai",
  OTHER: "Other",
};

export const MAILING_LISTS = ["NEWSLETTER", "CLIENT_ALERTS", "EVENT_INVITES"] as const;
export type MailingListKey = (typeof MAILING_LISTS)[number];
export const MAILING_LIST_LABELS: Record<MailingListKey, string> = {
  NEWSLETTER: "Newsletter",
  CLIENT_ALERTS: "Client alerts",
  EVENT_INVITES: "Event invitations",
};

export const CONSENT_SOURCES = [
  "WEB_FORM",
  "EVENT_SIGNUP",
  "EMAIL_REPLY",
  "VERBAL",
  "BUSINESS_CARD",
  "IMPORT",
  "OTHER",
] as const;
export const CONSENT_SOURCE_LABELS: Record<(typeof CONSENT_SOURCES)[number], string> = {
  WEB_FORM: "Web form",
  EVENT_SIGNUP: "Event sign-up",
  EMAIL_REPLY: "Email reply",
  VERBAL: "Verbal (recorded)",
  BUSINESS_CARD: "Business card",
  IMPORT: "Import",
  OTHER: "Other",
};

export const ACTIVITY_TYPES = [
  "MEETING",
  "CALL",
  "LUNCH",
  "EMAIL",
  "EVENT",
  "REFERRAL_GIVEN",
  "REFERRAL_RECEIVED",
  "GIFT",
] as const;
export type ActivityTypeKey = (typeof ACTIVITY_TYPES)[number];
export const ACTIVITY_TYPE_LABELS: Record<ActivityTypeKey, string> = {
  MEETING: "Meeting",
  CALL: "Call",
  LUNCH: "Lunch / dinner",
  EMAIL: "Email",
  EVENT: "Event",
  REFERRAL_GIVEN: "Referral given",
  REFERRAL_RECEIVED: "Referral received",
  GIFT: "Gift",
};

export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export type TaskStatusKey = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatusKey, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const CURRENCIES = ["THB", "USD"] as const;

export const STRENGTH_LABELS: Record<number, string> = {
  1: "1 – Cold",
  2: "2 – Acquainted",
  3: "3 – Working",
  4: "4 – Strong",
  5: "5 – Trusted adviser",
};

// ── Pipeline ──────────────────────────────────────────────────────────────

export const STAGES = ["LEAD", "QUALIFIED", "PROPOSAL_PREPARING", "SUBMITTED", "WON", "LOST", "ON_HOLD"] as const;
export type StageKey = (typeof STAGES)[number];
export const OPEN_STAGES = [
  "LEAD",
  "QUALIFIED",
  "PROPOSAL_PREPARING",
  "SUBMITTED",
  "ON_HOLD",
] as const satisfies readonly StageKey[];
export const ACTIVE_STAGES = [
  "LEAD",
  "QUALIFIED",
  "PROPOSAL_PREPARING",
  "SUBMITTED",
] as const satisfies readonly StageKey[];
export const STAGE_LABELS: Record<StageKey, string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  PROPOSAL_PREPARING: "Proposal preparing",
  SUBMITTED: "Submitted",
  WON: "Won",
  LOST: "Lost",
  ON_HOLD: "On hold",
};

export const OPP_SOURCES = [
  "REPEAT_CLIENT",
  "REFERRAL",
  "FOREIGN_LAW_FIRM_REFERRAL",
  "RFP_TENDER",
  "EVENT",
  "INBOUND",
  "OTHER",
] as const;
export type OppSourceKey = (typeof OPP_SOURCES)[number];
export const OPP_SOURCE_LABELS: Record<OppSourceKey, string> = {
  REPEAT_CLIENT: "Repeat client",
  REFERRAL: "Referral",
  FOREIGN_LAW_FIRM_REFERRAL: "Foreign law firm referral",
  RFP_TENDER: "RFP / tender",
  EVENT: "Event",
  INBOUND: "Inbound",
  OTHER: "Other",
};

export const CONFLICT_STATUSES = ["NOT_REQUESTED", "REQUESTED", "CLEARED", "CONFLICT"] as const;
export type ConflictKey = (typeof CONFLICT_STATUSES)[number];
export const CONFLICT_LABELS: Record<ConflictKey, string> = {
  NOT_REQUESTED: "Not requested",
  REQUESTED: "Requested",
  CLEARED: "Cleared",
  CONFLICT: "Conflict",
};

export const OUTCOME_REASONS = ["PRICE", "RELATIONSHIP", "EXPERTISE", "CONFLICT", "TIMING", "OTHER"] as const;
export type OutcomeReasonKey = (typeof OUTCOME_REASONS)[number];
export const OUTCOME_REASON_LABELS: Record<OutcomeReasonKey, string> = {
  PRICE: "Price",
  RELATIONSHIP: "Relationship",
  EXPERTISE: "Expertise",
  CONFLICT: "Conflict",
  TIMING: "Timing",
  OTHER: "Other",
};

export const PITCH_FORMATS = ["WRITTEN", "PRESENTATION", "BOTH", "EMAIL"] as const;
export const PITCH_FORMAT_LABELS: Record<(typeof PITCH_FORMATS)[number], string> = {
  WRITTEN: "Written proposal",
  PRESENTATION: "Presentation",
  BOTH: "Written + presentation",
  EMAIL: "Email",
};
export const PITCH_STATUSES = ["DRAFTING", "PARTNER_REVIEW", "SUBMITTED"] as const;
export type PitchStatusKey = (typeof PITCH_STATUSES)[number];
export const PITCH_STATUS_LABELS: Record<PitchStatusKey, string> = {
  DRAFTING: "Drafting",
  PARTNER_REVIEW: "Partner review",
  SUBMITTED: "Submitted",
};
export const STANDARD_PITCH_CHECKLIST = [
  "Team CVs",
  "Credentials",
  "Fee proposal",
  "Representative matters",
  "Firm profile",
] as const;

// ── Rankings & credentials ───────────────────────────────────────────────

export const SUBMISSION_STATUSES = [
  "PLANNING",
  "DRAFTING",
  "PARTNER_REVIEW",
  "SUBMITTED",
  "RESEARCH_INTERVIEW",
  "RESULTS_PUBLISHED",
] as const;
export type SubmissionStatusKey = (typeof SUBMISSION_STATUSES)[number];
export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatusKey, string> = {
  PLANNING: "Planning",
  DRAFTING: "Drafting",
  PARTNER_REVIEW: "Partner review",
  SUBMITTED: "Submitted",
  RESEARCH_INTERVIEW: "Research interview",
  RESULTS_PUBLISHED: "Results published",
};
/** Statuses where the submission deadline still matters. */
export const PRE_SUBMISSION_STATUSES: readonly SubmissionStatusKey[] = ["PLANNING", "DRAFTING", "PARTNER_REVIEW"];

export const AWARD_STATUSES = ["ENTERED", "SHORTLISTED", "WON", "NOT_WON"] as const;
export type AwardStatusKey = (typeof AWARD_STATUSES)[number];
export const AWARD_STATUS_LABELS: Record<AwardStatusKey, string> = {
  ENTERED: "Entered",
  SHORTLISTED: "Shortlisted",
  WON: "Won",
  NOT_WON: "Not won",
};

// ── Marketing & key clients ──────────────────────────────────────────────

export const EVENT_FORMATS = ["IN_PERSON", "ONLINE", "HYBRID"] as const;
export type EventFormatKey = (typeof EVENT_FORMATS)[number];
export const EVENT_FORMAT_LABELS: Record<EventFormatKey, string> = {
  IN_PERSON: "In person",
  ONLINE: "Online",
  HYBRID: "Hybrid",
};

export const EVENT_STATUSES = ["PLANNING", "INVITES_SENT", "HELD", "CANCELLED"] as const;
export type EventStatusKey = (typeof EVENT_STATUSES)[number];
export const EVENT_STATUS_LABELS: Record<EventStatusKey, string> = {
  PLANNING: "Planning",
  INVITES_SENT: "Invites sent",
  HELD: "Held",
  CANCELLED: "Cancelled",
};

export const RSVPS = ["NO_REPLY", "YES", "NO", "MAYBE"] as const;
export type RsvpKey = (typeof RSVPS)[number];
export const RSVP_LABELS: Record<RsvpKey, string> = { NO_REPLY: "No reply", YES: "Yes", NO: "No", MAYBE: "Maybe" };

export const CONTENT_TYPES = [
  "CLIENT_ALERT",
  "ARTICLE",
  "GUIDE",
  "LINKEDIN_POST",
  "MEDIA_INTERVIEW",
  "SPEAKING",
] as const;
export type ContentTypeKey = (typeof CONTENT_TYPES)[number];
export const CONTENT_TYPE_LABELS: Record<ContentTypeKey, string> = {
  CLIENT_ALERT: "Client alert",
  ARTICLE: "Article",
  GUIDE: "Guide",
  LINKEDIN_POST: "LinkedIn post",
  MEDIA_INTERVIEW: "Media interview",
  SPEAKING: "Speaking",
};

export const CONTENT_STATUSES = ["IDEA", "DRAFTING", "REVIEW", "PUBLISHED"] as const;
export type ContentStatusKey = (typeof CONTENT_STATUSES)[number];
export const CONTENT_STATUS_LABELS: Record<ContentStatusKey, string> = {
  IDEA: "Idea",
  DRAFTING: "Drafting",
  REVIEW: "Review",
  PUBLISHED: "Published",
};

export const HEALTH_LABELS: Record<number, string> = {
  1: "1 – At risk",
  2: "2 – Concern",
  3: "3 – Stable",
  4: "4 – Healthy",
  5: "5 – Thriving",
};
