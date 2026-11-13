# PLAN — Law Firm BD CRM

Status: **Approved 13 Nov 2026 ("approved as-is"). All 7 phases complete (13 Nov 2026). Ready for go-live review.**
Scope: Business Development only. No billing, time recording, matter/document management or full conflict checking.

---

## 1. Key technical decisions

| Topic | Decision | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), TypeScript strict, React Server Components. `cacheComponents` is **off** (every page is per-user) | Per brief |
| Mutations | Server Actions for forms; Route Handlers only for exports, auth and health | One place to enforce auth + validation + audit |
| Database | **PostgreSQL 16 in dev, test and prod** (via Docker) | Thai search needs `pg_trgm`; SQLite behaves differently (no trigram, no arrays, different collation). Brief allows SQLite but one engine everywhere avoids "works on my machine" bugs |
| ORM | Prisma 7 (driver adapter `@prisma/adapter-pg`, config in `prisma.config.ts`) + checked-in SQL migrations | Per brief. Raw SQL migrations add trigram indexes and check constraints Prisma can't express |
| Thai text | UTF-8 everywhere; all text NFC-normalised on save; search with `ILIKE` + `pg_trgm` GIN indexes on `name_en`, `name_th`, email | Thai has no spaces between words, so word-based full-text search fails. Substring + trigram search works for Thai and English and is fast |
| Auth | Auth.js v5, Credentials provider (email + password, Argon2id hashes), JWT session; Prisma adapter tables (`Account`, `Session`, `VerificationToken`) created now | Adding Microsoft Entra ID later = add one provider + map Entra users to existing `User` rows by email. No schema change |
| Session freshness | Every request re-reads the user's `role` and `active` from the DB (cached per request) | Deactivating a user or changing a role takes effect immediately, not at token expiry |
| RBAC | One policy module (`src/server/auth/policy.ts`) + Prisma "visibility filters" per entity. Every query that lists records goes through a filter | Confidential records can never leak through a forgotten `where` clause |
| Audit | Every create/update/delete/stage change writes an `AuditLog` row in the same DB transaction, with a JSON field-level diff | Tamper-evident history; required for PDPA questions |
| Deletes | Soft delete (`archivedAt`) on main records; hard delete ADMIN-only | Mistakes are recoverable |
| Money | `Decimal(14,2)` + `currency` (THB default, USD). Pipeline totals converted to THB using an ADMIN-set USD→THB rate in Settings | No floating-point money; no live FX dependency |
| Dates | Store `timestamptz` (UTC) and `date` for date-only fields. Display `DD MMM YYYY` in `Asia/Bangkok` via `date-fns-tz` | Per brief |
| UI | Tailwind + shadcn/ui, TanStack Table (server-side paging/sort/filter), Recharts, react-hook-form + Zod | Per brief |
| Exports | `exceljs` for .xlsx; `@react-pdf/renderer` for PDF (Thai font: Sarabun / Noto Sans Thai embedded) | PDF needs an embedded Thai font or Thai renders as boxes |
| Tests | Vitest (policy, validation, business rules, services against a real test Postgres); Playwright (key flows) | |
| Deploy | Docker Compose: `app` + `postgres` (+ named volume, nightly `pg_dump` backup container) | Self-hosted |

---

## 2. Data model

Conventions on every main table: `id` (cuid), `createdAt`, `updatedAt`, `createdById`, `archivedAt?`.
`→` = foreign key. `[]` = many-to-many (join table). `?` = optional.

### People & access
**User** — name, email (unique), passwordHash?, role (`ADMIN | BD | PARTNER | VIEWER`), title?, practiceAreas[], active, canLogin, lastLoginAt?
- `canLogin=false` lets us record lawyers who are speakers / authors / ranked lawyers / pitch team without giving them an account (see Question 3).

**PracticeArea** — name (unique), sortOrder, active. *Seeded with the 12 areas in the brief.*

**Industry** — name (unique), active. *Admin-managed list (seeded with common sectors).*

**Tag** — name (unique). Used on contacts.

**Setting** — key, value (JSON). e.g. `usdToThbRate`, default probabilities per stage.

### Relationships
**Organisation** — nameEn, nameTh?, type (`CLIENT | PROSPECT | REFERRER | FOREIGN_LAW_FIRM | INTERMEDIARY | MEDIA | DIRECTORY | ASSOCIATION`), industry →Industry?, country (ISO-2, default TH), relationshipPartner →User?, status (`ACTIVE | DORMANT | LOST`), isKeyClient, website?, notes?

**Contact** — nameEn, nameTh?, title?, organisation →Organisation?, email?, phone?, linkedinUrl?, owners[] →User, relationshipStrength (1–5), preferredLanguage (`EN | TH | OTHER`), tags[] →Tag, notes?

**MailingConsent** (PDPA) — contact →Contact, list (`NEWSLETTER | CLIENT_ALERTS | EVENT_INVITES`), optedIn, consentDate, withdrawnDate?, source (`WEB_FORM | EVENT_SIGNUP | EMAIL_REPLY | VERBAL | BUSINESS_CARD | IMPORT | OTHER`), evidenceNote?
- Unique (contact, list). Every change audited, so full consent history is retrievable.

**Activity** — type (`MEETING | CALL | LUNCH | EMAIL | EVENT | REFERRAL_GIVEN | REFERRAL_RECEIVED | GIFT`), date, internalAttendees[] →User, contacts[] →Contact, organisation →Organisation?, opportunity →Opportunity?, practiceAreas[], summary, nextAction?, nextActionDue?, owner →User, giftValue? (Decimal, for gift register)

### Pipeline
**Opportunity** — name, organisation →Organisation, source (`REPEAT_CLIENT | REFERRAL | FOREIGN_LAW_FIRM_REFERRAL | RFP_TENDER | EVENT | INBOUND | OTHER`), referrer →Organisation? / referrerContact →Contact?, practiceAreas[], leadPartner →User, team[] →User (OpportunityTeamMember), feeEstimateMin?, feeEstimateMax?, currency, probability (0–100), stage (`LEAD | QUALIFIED | PROPOSAL_PREPARING | SUBMITTED | WON | LOST | ON_HOLD`), conflictStatus (`NOT_REQUESTED | REQUESTED | CLEARED | CONFLICT`), expectedDecisionDate?, competitors (text[]), confidential, outcome?, outcomeReason? (`PRICE | RELATIONSHIP | EXPERTISE | CONFLICT | TIMING | OTHER`), outcomeNote?, closedDate?
- Rules (enforced in Zod **and** a DB check constraint):
  - Moving to WON or LOST requires `outcomeReason` and sets `closedDate`.
  - `feeEstimateMin ≤ feeEstimateMax`.
  - Warn (not block) when moving past QUALIFIED while conflictStatus ≠ CLEARED; block WON if conflictStatus = CONFLICT.

**OpportunityStageChange** — opportunity, fromStage, toStage, changedBy, changedAt. *Feeds win-rate and stage-velocity reports.*

**Pitch** — opportunity →Opportunity, deadline, owner →User, format (`WRITTEN | PRESENTATION | BOTH | EMAIL`), status (`DRAFTING | PARTNER_REVIEW | SUBMITTED`), notes?
**PitchChecklistItem** — pitch, label, done, doneAt?, sortOrder. *Auto-created with: Team CVs, Credentials, Fee proposal, Representative matters, Firm profile. Custom items allowed.*

### Rankings, credentials & awards
**Directory** — name (unique), website?. *Seeded: Legal 500, Chambers & Partners, IFLR1000, Benchmark Litigation, Asialaw, ALB.*

**DirectorySubmission** — directory, year, practiceArea, deadline, owner →User, partnerReviewer →User?, status (`PLANNING | DRAFTING | PARTNER_REVIEW | SUBMITTED | RESEARCH_INTERVIEW | RESULTS_PUBLISHED`), resultTier?, rankedLawyers[] →User, matters[] →RepresentativeMatter, notes?
- Unique (directory, year, practiceArea).

**Referee** — contact →Contact, submission →DirectorySubmission, briefed, briefedDate?, notes?
- Unique (contact, submission).
- `usedInYears` is **computed**, not stored: on adding a referee we look up the same contact in submissions from the previous 2 years (all directories) and show a warning listing them.

**RepresentativeMatter** — title, clientOrganisation →Organisation?, clientDisplayName (e.g. "a Japanese automotive group" — used when anonymised), anonymised, practiceAreas[], value?, currency, year, publishable, confidential, team[] →User, description

**Award** — name, organiser?, category, year, deadline?, owner →User?, practiceAreas[], status (`ENTERED | SHORTLISTED | WON | NOT_WON`), notes?

### Marketing
**Event** — title, date (start/end), format (`IN_PERSON | ONLINE | HYBRID`), venue?, onlineUrl?, practiceAreas[], speakers[] →User, externalSpeakers?, budget?, actualCost?, currency, status (`PLANNING | INVITES_SENT | HELD | CANCELLED`)

**EventInvite** — event, contact, invited (bool), invitedAt?, rsvp (`YES | NO | MAYBE | NO_REPLY`), attended?, followUpOwner →User?, followUpDone
- Unique (event, contact). Inviting checks `EVENT_INVITES` consent and warns if missing/withdrawn.

**Content** — title, type (`CLIENT_ALERT | ARTICLE | GUIDE | LINKEDIN_POST | MEDIA_INTERVIEW | SPEAKING`), authors[] →User, practiceAreas[], channel?, status (`IDEA | DRAFTING | REVIEW | PUBLISHED`), publishDate?, url?, engagementNotes?

**ClientPlan** — organisation, year, objectives, crossSellTargets[] →PracticeArea, reviewMeetingDate?, healthScore (1–5), owner →User
- Unique (organisation, year).

### Work management & system
**Task** — title, dueDate?, owner →User, status (`OPEN | IN_PROGRESS | DONE | CANCELLED`), notes?, plus **one optional link**: opportunityId? / organisationId? / contactId? / pitchId? / submissionId? / eventId? / contentId? / clientPlanId?
- "Polymorphic" link implemented as nullable FKs + DB check constraint "at most one set". Real foreign keys = no orphaned links (better than a free-text `entityType/entityId`).

**AuditLog** — user →User?, action (`CREATE | UPDATE | DELETE | ARCHIVE | RESTORE | LOGIN | LOGIN_FAILED | EXPORT`), entity, entityId, diff (JSON `{field: [old, new]}`), ip?, timestamp. Append-only; no update/delete path in the app. Exports are logged (who exported what).

**Account / Session / VerificationToken** — Auth.js adapter tables (for future Entra ID SSO).

### Access rules (server-side)

| | ADMIN | BD | PARTNER | VIEWER |
|---|---|---|---|---|
| Users & settings | ✅ | — | — | — |
| Create/edit BD records | ✅ all | ✅ all | Own / team only¹ | — |
| Read records | ✅ all | ✅ all non-confidential² | ✅ all non-confidential² | ✅ non-confidential |
| Firm-wide pipeline | ✅ | ✅ | Summary (read-only) | — |
| Confidential opportunity / matter | ✅ | Only if named on team² | Only if lead / on team | ❌ |
| Mailing consent edit | ✅ | ✅ | — | — |
| Audit log | ✅ | — | — | — |
| Exports | ✅ | ✅ | Own records | — |

¹ "Own" = relationship partner / owner / lead partner / team member / attendee on that record.
² Pending Question 2.

Firm-wide pipeline summary for PARTNER = aggregated numbers by stage/practice; confidential opportunities are counted but anonymised ("Confidential – Corporate/M&A").

---

## 3. Folder structure

```
.
├── CLAUDE.md
├── PLAN.md
├── docker-compose.yml          # app + postgres + backup
├── docker-compose.dev.yml      # postgres only, for local dev
├── Dockerfile
├── .env.example
├── prisma/
│   ├── schema.prisma
│   ├── migrations/             # incl. raw SQL: pg_trgm, check constraints
│   └── seed.ts                 # practice areas, directories, industries, admin user, demo data (dev only)
├── public/fonts/               # Sarabun (Thai) for PDF
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (app)/              # authenticated shell (sidebar, top search)
│   │   │   ├── dashboard/
│   │   │   ├── organisations/[id]/
│   │   │   ├── contacts/[id]/
│   │   │   ├── activities/
│   │   │   ├── opportunities/[id]/   # table + kanban
│   │   │   ├── pitches/[id]/
│   │   │   ├── rankings/             # directories, submissions, referees
│   │   │   ├── matters/
│   │   │   ├── awards/
│   │   │   ├── events/[id]/
│   │   │   ├── content/
│   │   │   ├── client-plans/
│   │   │   ├── tasks/
│   │   │   ├── reports/
│   │   │   ├── search/
│   │   │   └── admin/                # users, settings, lookup lists, audit log
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       ├── export/[report]/      # xlsx / pdf
│   │       └── health/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui
│   │   ├── data-table/         # TanStack Table wrapper
│   │   ├── forms/
│   │   └── charts/
│   ├── features/<entity>/      # per entity: schema.ts (Zod), actions.ts, queries.ts, components/
│   ├── server/
│   │   ├── db.ts               # Prisma client
│   │   ├── auth/               # auth config, getCurrentUser, policy.ts, visibility.ts
│   │   ├── audit.ts            # withAudit() transaction helper + diff
│   │   └── export/             # excel.ts, pdf/
│   └── lib/                    # dates (Asia/Bangkok), money, thai (normalise), utils
├── tests/
│   ├── unit/                   # Vitest
│   ├── integration/            # Vitest against test Postgres
│   └── e2e/                    # Playwright
└── scripts/                    # backup, import (CSV/Excel)
```

---

## 4. Routes

| Route | Purpose |
|---|---|
| `/login` | Email + password sign-in |
| `/dashboard` | My tasks & next actions due, my pipeline, upcoming deadlines (pitches, submissions, awards, events), recent activity |
| `/organisations`, `/organisations/new`, `/organisations/[id]` | List (filters: type, status, key client, partner, industry), detail with tabs: contacts, activities, opportunities, client plans, matters |
| `/contacts`, `/contacts/new`, `/contacts/[id]` | List + detail: activities, consents, event history, referee history |
| `/activities`, `/activities/new` | Activity log; quick-log form |
| `/opportunities` | Table and Kanban views; filters by stage, partner, practice, source |
| `/opportunities/new`, `/opportunities/[id]` | Detail: stage history, team, pitches, tasks, activities |
| `/pitches`, `/pitches/[id]` | Pitch tracker + checklist |
| `/rankings`, `/rankings/submissions/[id]` | Directory submission calendar/board; referees with reuse warning |
| `/matters`, `/matters/[id]` | Representative matters (filter publishable / practice / year) |
| `/awards` | Award entries |
| `/events`, `/events/[id]` | Events; invite list, RSVP, attendance, follow-ups |
| `/content` | Content calendar / board |
| `/client-plans`, `/client-plans/[id]` | Key-client plans |
| `/tasks` | My tasks / team tasks |
| `/reports` | Pipeline, win/loss, source analysis, activity by partner, rankings tracker, event ROI, consent list — each exportable to Excel/PDF |
| `/search?q=` | Global Thai/English search across orgs, contacts, opportunities, matters |
| `/admin/users`, `/admin/settings`, `/admin/lists`, `/admin/audit` | ADMIN only |
| `/api/auth/*`, `/api/export/[report]`, `/api/health` | |

---

## 5. Phase checklist

> The brief was cut off after "Phase 1 – Foundation: … auth, roles,". Phases 2–7 below are **my proposal** — please confirm or replace (Question 1).

### Phase 1 — Foundation ✅ (13 Nov 2026)
- [x] Next.js + TS strict + Tailwind + shadcn/ui-style components, ESLint, Prettier
- [x] Docker Compose (app + Postgres + nightly backup), `.env.example`; production image built and smoke-tested
- [x] Full Prisma schema (all entities above) + migrations, incl. `pg_trgm` indexes, check constraints, append-only audit trigger
- [x] Seed: practice areas, directories, industries, first ADMIN (+ demo users with `--demo`)
- [x] Auth.js credentials login, Argon2id hashing, login rate-limit (5 / email / 15 min, 30 / IP), logout, forced password change, session revocation
- [x] RBAC policy + visibility filters + tests for every role × own/not-own × confidential case
- [x] Audit log helper (transactional field-level diff; logins, failed logins, logouts, password resets)
- [x] App shell: sidebar (mobile drawer), top bar, global search box (results page = Phase 2), Thai/date/money helpers
- [x] Admin: users (create, role, practice areas, deactivate, no-login lawyers, reset password), lookup lists, settings (USD→THB rate, stage probabilities), audit log viewer
- [x] Vitest (121 unit + integration tests) and Playwright (8 e2e flows); `npm run check`

### Phase 2 — Relationships ✅ (13 Nov 2026)
- [x] Organisations: list (search EN/TH, type, status, partner, industry, key client, archived), create/edit, detail page (contacts, activity timeline, open tasks), archive/restore
- [x] Contacts: list (search, owner, tag, strength, consent filter), create/edit, detail page, tags (new tags BD/Admin only), owners
- [x] Duplicate warnings on create: organisations by normalised EN/TH name (legal forms stripped) + fuzzy trigram match; contacts by email or name-at-organisation; "create anyway" option
- [x] Mailing consent (PDPA) per list: opt-in date, source, evidence, withdrawal; full history in audit log; BD/Admin only
- [x] Activities: log/edit/archive, contacts + firm attendees + practice areas, organisation inferred from contact, gift value (gift register), next action with due date and done tick
- [x] Tasks: My/Team tasks, quick add on organisation/contact pages, one-click complete
- [x] Global Thai-aware search (organisations + contacts); type-ahead pickers for users/organisations/contacts
- [x] Excel/CSV import (organisations, contacts): template download, preview, duplicate/row-error report, auto-create missing organisations, PDPA confirmation for consent columns, Windows-874 Thai CSV support, one transaction, audited
- [x] Dashboard: my counts, my tasks, my next actions (overdue highlighted), recent firm activity
- [x] Tests: 161 unit + integration, 13 e2e

### Phase 3 — Pipeline ✅ (13 Nov 2026)
- [x] Opportunities: table (filters: status, stage, lead, practice, source, conflict, mine) and Kanban board (drag-and-drop + keyboard "Move to…" menu)
- [x] Stage rules: Won/Lost need a reason (+ outcome notes, decision date); Won blocked while conflict = Conflict; warning to confirm when moving into Proposal/Submitted/Won without clearance; probability reset to stage default (Won 100 / Lost 0); reopening clears outcome
- [x] Stage history (OpportunityStageChange) + audit entries (acknowledged warnings recorded)
- [x] Confidential handling: invisible to non-members everywhere (lists, board, search, pickers, org page, dashboard, linked activities/tasks/pitches); creator must stay a member
- [x] Weighted value in THB (midpoint fee × probability, USD via Settings rate)
- [x] Pitches: deadline (Bangkok time), owner, format, status, 5 standard checklist items + custom items, overdue flags, tasks
- [x] Firm-wide pipeline summary (ADMIN/BD/PARTNER, read-only): by stage, practice area, source win rates, loss reasons, YTD win rate — confidential deals counted, never named
- [x] Activities and tasks can link to opportunities/pitches; organisation page, global search and dashboard ("My pipeline", "Pitch deadlines") show the pipeline
- [x] Demo pipeline in `db:seed -- --demo`
- [x] Tests: 185 unit + integration, 16 e2e

### Phase 4 — Rankings & credentials ✅ (13 Nov 2026)
- [x] Directory submissions: directory × guide year × practice area (unique), deadline with days-left/overdue, owner, partner reviewer, status pipeline, result tier/band, ranked lawyers, linked matters, notes
- [x] Referees: add from contacts, briefed tick (dated), notes, remove; warning (confirm to proceed, audited) if the contact was a referee in the previous two guide years or for another submission the same year; warning stays visible on the referee row; referee history on the contact page
- [x] Representative matters: client or anonymised description, value, year, practice areas, team, publishable/confidential (DB-enforced: confidential ≠ publishable; anonymised needs a description); confidential = team + Head of BD only; linked confidential matters show as a count to others and are preserved when others edit a submission
- [x] Awards: entries with category, organiser, year, deadline, owner, status (entered → shortlisted → won / not won)
- [x] Dashboard "Rankings & awards deadlines" (BD/Admin: whole team; others: their own); matters on organisation pages and in global search
- [x] Dev fix: Turbopack dev filesystem cache disabled (root cause of the recurring reload loop)
- [x] Tests: 205 unit + integration, 19 e2e (flaky selector root-caused: Next's route announcer)

### Phase 5 — Marketing & key clients ✅ (13 Nov 2026)
- [x] Events: date/time (Bangkok), in person / online / hybrid (venue or link required), owner, firm + external speakers, practice areas, budget vs actual, cost per attendee, status
- [x] Invite list: add by contact, by tag or by organisation; PDPA check against EVENT_INVITES consent (confirmable warning, or "only opted-in"); shield marks guests without consent; invited / RSVP / attended / follow-up owner / done, saved instantly; RSVP implies invited; follow-up owners can only tick their own follow-up; event stats; event history on contact pages
- [x] Content pipeline: client alerts, articles, guides, LinkedIn posts, media interviews, speaking; idea → drafting → review → published (publish date required); authors, channel, link, engagement notes
- [x] Client plans: one per client per year; objectives, cross-sell targets, review date, health score 1–5, owner; cross-sell analysis (already instructed / in pipeline / gap) from won and open opportunities the viewer can see; plan shown on organisation page
- [x] Dashboard: upcoming events and "My event follow-ups"
- [x] Tests: 220 unit + integration, 22 e2e

### Phase 6 — Dashboards & reports ✅ (13 Nov 2026)
- [x] Head-of-BD "Firm overview" (Admin/BD) on /reports: key numbers + charts (weighted pipeline by stage, won/lost by quarter, client activity by month and type, pipeline by practice area); confidential deals counted, never named; link from the dashboard
- [x] Seven reports, each on screen + Excel + PDF: Open pipeline · Win/loss analysis · Sources & referrers · Activity by person · Rankings calendar · Event return · Mailing list (PDPA consent)
- [x] Report access by role (Viewer none; consent list Admin/BD only; partners see their own deals/activity); row data always through visibility filters
- [x] Excel: typed numbers and dates, number formats, autofilter, frozen header, generated-by line, notes
- [x] PDF: A4 landscape, embedded Sarabun (SIL OFL) for Latin + Thai, Thai word-wrapping via Intl.Segmenter, page numbers, "confidential" footer
- [x] Every export permission-checked and written to the audit log (action EXPORT, report, parameters, row count)
- [x] Charts follow the validated categorical palette (light + dark), single axis, legend in text colour, "Show data" table under every chart
- [x] Tests: 233 unit + integration, 25 e2e

### Phase 7 — Hardening & go-live ✅ (13 Nov 2026)
- [x] Playwright covers the key flows (25 tests): login/lockout/forced password change, role revocation, org→contact→consent→activity, import, opportunity create → stage rules → pitch → won, board loss, confidential visibility, referee warning, events/PDPA, content, client plans, reports and exports
- [x] Security review (docs/SECURITY.md): static guardrail tests for auth on every page/action/route; CSP, HSTS, COOP added; dependency audit clean (uuid pinned); no unsafe SQL/HTML
- [x] Performance at 10k orgs / 50k contacts / 30k activities (docs/PERFORMANCE.md, `npm run perf`): all screens < 400 ms; PDF capped at 1,000 rows (faster per-cell font choice)
- [x] Docker: slim runtime (standalone + migrator toolkit, 2.1 GB → 0.9 GB); full stack tested end to end incl. Thai PDF export
- [x] Backups: nightly at 02:00 Bangkok (fixed: first backup could run before migrations), on-demand backup, restore tested
- [x] Break-glass admin reset script (audited), tested in the container
- [x] Docs: DEPLOYMENT (IT), ADMIN-GUIDE (Head of BD), SECURITY, PERFORMANCE, ENTRA-ID (Microsoft 365 sign-in — documented, not built)

Each phase ends with: tests green, demo seed data, short summary + screenshots for your review.

---

## 6. Decisions log
| Date | Decision |
|---|---|
| 13 Nov 2026 | Plan approved as-is; defaults below apply. |
| 13 Nov 2026 | Phases 2–7 as proposed in §5 (brief was truncated after Phase 1). |
| 13 Nov 2026 | Confidential records: BD role sees them **only when named on the team** (brief as written). Easy to change in `policy.ts` + `visibility.ts`. |
| 13 Nov 2026 | All firm lawyers live in `User`; `canLogin=false` for those without an account. |
| 13 Nov 2026 | No email sending yet: password resets are done by an ADMIN (temporary password shown once). SMTP/Office 365 can be added later. |
| 13 Nov 2026 | Excel/CSV import for organisations & contacts stays in Phase 2. |
| 13 Nov 2026 | Forms submit via `useFormAction` (keeps typed input on validation errors). |
| 13 Nov 2026 | Phase 2: `nameKey`/`nameThKey` columns on Organisation and `nameKey` on Contact for duplicate detection; `nextActionDone` on Activity. |
| 13 Nov 2026 | Bulk import is BD/Admin only. Partners create records one at a time. |
| 13 Nov 2026 | Activities and tasks are visible to everyone who can see the organisation; they will inherit confidentiality from opportunities in Phase 3. |
| 13 Nov 2026 | Hard delete is not exposed yet (archive/restore only). |
| 13 Nov 2026 | Phase 3: conflict-not-cleared is a confirmable warning, not a block (except Won + Conflict, which is blocked). |
| 13 Nov 2026 | Weighted pipeline = midpoint of fee range × probability, in THB. |
| 13 Nov 2026 | Creating a pitch requires edit rights on the opportunity. Standard checklist items can't be removed. |
| 13 Nov 2026 | Pipeline summary is firm-wide for ADMIN/BD/PARTNER and includes confidential deals as counts only. |
| 13 Nov 2026 | Referee reuse = same contact used in the previous 2 guide years (any directory) or another submission the same year → confirmable warning. |
| 13 Nov 2026 | Submission members (can edit as Partner): owner, partner reviewer, ranked lawyers. |
| 13 Nov 2026 | Guide year is the edition year (e.g. Legal 500 2027 submitted in 2026); new submissions default to next year. |
| 13 Nov 2026 | Event gets an owner (BD coordinator). Members who can edit an event: owner + firm speakers (plus BD/Admin). |
| 13 Nov 2026 | Inviting someone without event-invitation consent is allowed after confirmation (e.g. a personal invitation from the partner) and is audited. |
| 13 Nov 2026 | Client plan editors: plan owner and the organisation's relationship partner (plus BD/Admin). |
| 13 Nov 2026 | Reports: Viewers have none; partners get pipeline, win/loss and activity limited to their own work, plus the rankings calendar; Sources, Events and the PDPA list are BD/Admin only. |
| 13 Nov 2026 | PDF uses the Sarabun font (SIL Open Font License, bundled in public/fonts). |
| 13 Nov 2026 | Microsoft 365 (Entra ID) sign-in: documented in docs/ENTRA-ID.md, not built yet (needs the firm's Azure app registration to test). |
| 13 Nov 2026 | PDF exports capped at 1,000 rows; Excel has no cap. |
| 13 Nov 2026 | Backups nightly at 02:00 Bangkok, 30-day retention; off-server copies are IT's responsibility. |
| 13 Nov 2026 | No in-house IT: host on Render (Singapore) via `render.yaml` — web Standard + Postgres Basic-1GB; Render handles HTTPS and DB backups. Self-hosted Docker remains supported. |
