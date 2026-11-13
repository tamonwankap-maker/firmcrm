# Security review (Phase 7, 13 Nov 2026)

## Summary
No open high or medium findings. Items below were checked; fixes made during the review are marked **fixed**.

| Area | Status |
|---|---|
| Authentication | Argon2id hashes; 12+ character policy; generic "incorrect email or password"; lockout after 5 failures per email / 30 per IP in 15 min; forced password change for temporary passwords; 10-hour sessions; immediate revocation on role change, deactivation or password reset (`sessionVersion`). |
| Authorisation | One policy module (`policy.ts`) + row-level visibility filters; 67 policy unit tests (every role × own/not-own × confidential); **static guardrail tests** fail the build if any page, server action or route handler skips authentication (**added**). Confidential records return "not found" to non-members (no existence leak) across lists, search, pickers, reports, exports and linked records. |
| Input handling | Zod validation on the server for every action; Thai/Unicode normalisation; no raw SQL string building (`$queryRaw` tagged templates only); no `dangerouslySetInnerHTML`; uploads limited to 5 MB / 5,000 rows, .xlsx/.csv only. |
| CSRF / open redirects | Server actions are origin-checked by Next.js; `callbackUrl` / `returnTo` accept same-site paths only. |
| Headers | CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`…), HSTS in production, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP; `X-Powered-By` removed (**CSP/HSTS/COOP added**). Note: CSP allows inline scripts because Next.js uses them; a nonce-based CSP is possible later. |
| Audit | Every change, sign-in, failed sign-in, logout, password reset and export is logged in the same transaction; the audit table is append-only (database trigger). |
| PDPA | Consent per list with date, source, evidence and withdrawal; consent changes audited; mailing-list export only lists active opt-ins and is audited; event invitations warn on missing consent; import requires confirmation that consent columns are genuine. |
| Dependencies | `npm audit --omit=dev`: 0 vulnerabilities (**`uuid` pinned to 11.1.1** to clear an advisory via exceljs). |
| Secrets | None in the repository; configuration validated at start-up; `.env` git-ignored. |
| Container | Runs as non-root user; database not published outside Docker; health check exposes no details. |
| Backups | Nightly, retained 30 days, restore tested (**fixed**: the first backup used to run before migrations and could be empty). |

## Recommendations (not blocking go-live)
1. Put the app behind HTTPS only (see DEPLOYMENT.md) and restrict access to the firm network or VPN if possible.
2. Move to Microsoft 365 sign-in (ENTRA-ID.md) so leavers lose access when their M365 account is disabled, and MFA applies.
3. Copy backups off the server daily.
4. Review **Admin › Audit log** for `LOGIN_FAILED` spikes and large `EXPORT`s monthly.
5. Re-run `npm audit` and update dependencies quarterly.
