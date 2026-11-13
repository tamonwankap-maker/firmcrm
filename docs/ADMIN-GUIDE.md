# Admin guide — for the Head of BD

This guide covers the things only an **Admin** can do, plus good habits for running the CRM.

## Your first sign-in
1. Open the address IT gives you (e.g. `https://crm.yourfirm.co.th`) and sign in with the email and temporary password IT set up.
2. You will be asked to choose a new password (at least 12 characters, with a letter and a number).

## Roles at a glance

| Role | For | Can |
|---|---|---|
| **Admin** | Head of BD | Everything, including users, lists, settings and the audit log. Sees confidential records. |
| **BD** | BD managers / coordinators | Create and edit all BD records, import data, run all reports, manage PDPA consent. Sees confidential deals only if named on the team. |
| **Partner** | Partners | Create records; edit those they own, lead or are on the team for; see the firm-wide pipeline summary; run reports on their own work. |
| **Viewer** | Associates | Read only. Never sees confidential records. No reports. |

## Adding people — Admin › Users
- **Add user**: name, email, role, practice areas. A temporary password is shown **once** — give it to the person directly (not by email if you can avoid it).
- **Lawyers who don't use the CRM** (speakers, ranked lawyers, pitch team members): untick *Can sign in*. They can be selected in forms but cannot log in.
- **Changing someone's role** signs them out immediately so the new role applies straight away.
- **Leavers**: open the user and untick *Active*. Their history stays; they are signed out at once. Don't delete people.
- **Forgotten password**: open the user → *Reset password*. They get a new temporary password and must change it.
- You cannot remove your own admin access, and the CRM always keeps at least one active admin.

## Lists and settings
- **Admin › Lists**: practice areas, industries and directories. Rename freely; *deactivate* instead of deleting so old records keep their labels.
- **Admin › Settings**: the USD→THB rate used for pipeline totals (update monthly) and the default win probability for each stage.

## Confidential work
- Tick **Confidential** on an opportunity or representative matter to restrict it to you and the people named on it (lead partner and team).
- Everyone else won't see it anywhere — lists, search, reports, exports — and a direct link shows "Page not found". Pipeline totals still count it, anonymously.

## PDPA — mailing consent
- Record consent on each contact (Contacts › contact › *Mailing consent*): list, date, source and evidence. Record withdrawals the same way.
- For a mailing, use **Reports › Mailing list (PDPA consent)** and export to Excel. It only contains people with an active opt-in for that list.
- When inviting people to events, the CRM warns if someone has no event-invitation consent. Only continue if there is another lawful basis (e.g. a personal invitation from their partner).
- Every consent change and every export is in the audit log.

## Importing data
- **Organisations › Import** (or Contacts › Import): download the template, fill it in, upload, check the preview (duplicates and errors are listed with row numbers), then import.
- Only tick consent columns "Yes" where the person really opted in — you'll be asked to confirm.

## Audit log — Admin › Audit log
Filter by record type, action, user and date. Worth a monthly look at:
- `LOGIN_FAILED` — repeated failures may mean someone is guessing passwords (accounts lock for 15 minutes after 5 failures).
- `EXPORT` — who exported which report, with how many rows.

## If something goes wrong
- **Someone is locked out**: wait 15 minutes, or reset their password.
- **You are locked out and no other admin exists**: ask IT to run the break-glass command in `docs/DEPLOYMENT.md` (§ *Locked out*). It makes you admin again with a temporary password and is recorded in the audit log.
- **Data entered by mistake**: most records can be *archived* and restored. The audit log shows exactly what changed and when.
- **Backups**: IT keeps nightly backups for 30 days (see `docs/DEPLOYMENT.md`).
