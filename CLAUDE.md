# CLAUDE.md — Law Firm BD CRM

Business Development CRM for a full-service Thai law firm. **Read PLAN.md first**; it is the source of truth for the data model, routes and phase checklist. Update PLAN.md checkboxes and the Decisions log as work completes.

**Next.js 16 is newer than most training data — read `AGENTS.md` and the bundled docs in `node_modules/next/dist/docs/` before using an unfamiliar API.** Notable: `params`/`searchParams`/`cookies()` are async; `middleware` is now `proxy`; `PageProps<"/route">` types come from `next typegen`.

## Scope guard
BD ONLY. Do **not** build billing, time recording, matter/document management, or full conflict checking. Conflict check = a status field on Opportunity (`NOT_REQUESTED | REQUESTED | CLEARED | CONFLICT`). If a request drifts outside scope, stop and ask.

## Working style
- Work in phases (see PLAN.md). Stop and summarise at the end of each phase; do not start the next phase without approval.
- Small, reviewable commits. Never commit secrets or `.env`.
- When a requirement is ambiguous, ask; record the decision in PLAN.md ("Decisions" section).

## Stack
Next.js 16 (App Router, `cacheComponents` off) · TypeScript strict · PostgreSQL 16 + Prisma 7 (adapter-pg; client generated to `src/generated/prisma`) · Tailwind 4 + shadcn/ui-style components in `src/components/ui` · Auth.js v5 (beta) · Zod · TanStack Table · Recharts · exceljs · @react-pdf/renderer · Vitest · Playwright · Docker Compose.

## Commands
```bash
docker compose -f docker-compose.dev.yml up -d   # local Postgres (+ bdcrm_test, bdcrm_e2e databases)
cp .env.example .env                             # then fill AUTH_SECRET etc.
npm install                                      # also runs prisma generate
npm run db:deploy                                # apply migrations
npm run db:seed -- --demo                        # lookups + first admin + demo users (password DemoPass2026!)
npm run dev                                      # http://localhost:3000
npm run db:migrate -- --name <change>            # create a new migration after editing schema.prisma
npm run typecheck && npm run lint
npm test                                         # Vitest: unit + integration (uses bdcrm_test)
npm run e2e -- --trace off                       # Playwright (uses bdcrm_e2e, starts its own server on :3100)
npm run check                                    # typecheck + lint + test — must pass before every commit
npm run perf                                     # performance checks against bdcrm_perf (see docs/PERFORMANCE.md)
docker compose up -d --build                     # production stack (app + db + backup)
```
- The Turbopack dev filesystem cache is disabled in `next.config.ts` (it caused an endless reload loop after restarts). If a reload loop ever recurs: stop `npm run dev`, delete `.next/`, restart.
- Never give two inputs on one page the same `id` (e.g. a filter bar and a form both using `status`); prefix filter ids with `filter-`.
- Docker image = Next standalone output + `/app/tools` (Prisma CLI, tsx, `prisma/`, generated client) used by `docker/entrypoint.sh` for migrate + seed. Anything the seed or `prisma/admin-reset.ts` imports must be copied in the `migrator` stage.
- `prisma migrate reset` refuses to run when invoked by an AI agent unless the user explicitly consents. Don't work around it; tests wipe their own `_test`/`_e2e` databases via guarded TRUNCATE.

## Coding rules

### Security & access (non-negotiable)
1. **Every** page, server action and route handler starts with `requireUser()` / `requirePageRole()` (`src/server/auth/`) and checks `can()`/`assertCan()` from `policy.ts`. Layouts do not protect actions. UI hiding is cosmetic only.
2. All list/read queries for Opportunity, RepresentativeMatter (and any entity with `confidential`) use the visibility filter from `src/server/auth/visibility.ts`. Never write a raw `findMany` on these without it. Anything linking to an opportunity (activities, tasks, pitches, pickers) must re-check visibility of the linked id server-side; load with `loadVisibleOpportunity()` so hidden and missing records look identical ("not found").
3. Confidential records: visible only to ADMIN and named team members (lead partner / team). VIEWER never sees them. In aggregates for non-authorised users, count them but anonymise.
4. Never trust IDs or roles from the client. Re-load the record server-side and check ownership.
5. Every mutation goes through `withAudit()` in `src/server/audit.ts` so the change and its AuditLog row are written in one transaction. AuditLog is append-only (DB trigger). Pass `before`/`after` snapshots; never include `passwordHash`.
6. Exports are permission-checked and audited.
6a. `tests/unit/security-guardrails.test.ts` statically checks that every page, server action and route handler authenticates — keep it passing; add new public endpoints to its allow-list only with a reason.
7. Passwords: Argon2id. No secrets in code; config via env vars validated by `getEnv()` (lazy, checked at boot in `src/instrumentation.ts`). Never read env or touch the DB at module top level — `next build` runs without secrets.

### Data & validation
8. Zod schemas live in `src/features/<entity>/schema.ts` and are shared by the form (client) and the action (server). Validate on the server always. Server actions return `ActionResult` via `runAction()` (`src/server/actions/result.ts`); throw `UserFacingError` for business-rule messages.
8a. Client forms use `useFormAction()` (`src/components/forms/use-form-action.ts`), not `<form action>`, so typed input survives validation errors. Use the `Field` component for label + error.
9. Business rules (e.g. Won/Lost requires `outcomeReason`; fee min ≤ max; referee reuse warning) live in the feature's service layer **and** are unit-tested. Hard invariants also get a DB check constraint.
10. Money: Prisma `Decimal` + `currency` field. Never JS floats for money. Format with `src/lib/money.ts`.
11. Dates: store UTC (`timestamptz`) / `date` for date-only. Display only via `src/lib/dates.ts` → `DD MMM YYYY`, timezone `Asia/Bangkok`.
12. Thai text: normalise all user text with `.normalize('NFC')` + trim before save (`src/lib/thai.ts`). Search with `ILIKE` on trigram-indexed columns (both `nameEn` and `nameTh`). Never rely on word-splitting for Thai.
13. Schema changes only via new Prisma migrations. Never edit an applied migration. **Declare every index in `schema.prisma`** (trigram: `@@index([col(ops: raw("gin_trgm_ops"))], type: Gin, map: "...")`) — Prisma drops indexes it doesn't know about. Only check constraints/triggers live in raw SQL. Always read the generated migration before applying.
14. Soft delete via `archivedAt`; default queries exclude archived records.

### Code style
15. TypeScript strict; no `any`, no `@ts-ignore` without a comment explaining why.
16. Server Components by default; `"use client"` only where interactivity is needed.
17. Feature folders: `src/features/<entity>/` with `schema.ts` (Zod), `service.ts` (mutations: permission check + `withAudit`; testable without Next), `queries.ts` (reads, always through visibility filters), `actions.ts` (thin `"use server"` wrappers: parse → service → revalidate/redirect), `facts.ts` (membership for `can()`, importable by components), `components/`. Shared UI in `src/components`. Enum labels live in `src/features/labels.ts`.
17a. Pickers (`src/components/forms/picker.tsx`) for users/organisations/contacts; list pages use GET filter forms (`FilterBar`) and server-side paging.
18. Data tables use the shared TanStack wrapper with server-side pagination/sort/filter.
18a. Reports live in `src/features/reports/definitions/*` and are registered in `registry.ts`; one `ReportResult` drives the screen, Excel and PDF. New reports: declare `roles`, use visibility filters, add a test. Exports go only through `/api/export/[report]` (audited).
18b. Charts use `ReportChart` and the `--series-1…8` tokens in fixed order (validated palette; never cycle or invent colours), one value axis, legend text in text colour, and keep the "Show data" table.
19. English UI copy; keep strings in components simple (i18n may come later — avoid string concatenation for sentences).
20. Accessible forms (labels, keyboard navigation, visible focus).

### Testing
21. Every policy rule has a unit test covering each role × (own / not own) × (confidential / not).
22. Integration tests run against a real Postgres test DB (not mocks) — especially Thai search and visibility filters.
23. New business rule → new test in the same commit.
24. Playwright covers the key flows; run with `--trace off` unless debugging. E2E tests share one seeded database and run serially: never change or lock a demo user another spec relies on (use `bd2@` for role changes, a throwaway email for lockout). Wait for navigation/server-action responses before asserting. Prefer `getByRole(..., { name })` over `getByText` for page titles/names — Next's hidden route announcer repeats the page title and makes `getByText` flaky.

## Domain glossary
- **Relationship partner**: partner responsible for a client organisation.
- **Lead partner**: partner leading an opportunity/pitch.
- **Directory submission**: annual submission to Legal 500 / Chambers etc. per practice area.
- **Referee**: client contact nominated to be interviewed by a directory researcher. Avoid reusing the same referee within 2 years.
- **PDPA**: Thailand's Personal Data Protection Act — mailing list consent must be recorded with date and source.
