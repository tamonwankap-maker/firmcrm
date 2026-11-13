# Putting the CRM online with Render (no IT needed)

Render runs the CRM and its database for you: HTTPS, server updates and daily database backups are handled by them.
Everything below is done in a web browser. Allow about 45 minutes the first time.

**Before you start**
- The code must already be in your GitHub repository (`tamonwankap-maker/firmcrm`).
- The managing partner has agreed to hosting client data with an outside provider in Singapore (PDPA cross-border transfer — check with whoever handles data protection at the firm).
- Have a company credit card ready (Render's paid plans are needed: free plans sleep and the free database expires).

---

## Step 1 — Create your Render account (5 min)
1. Go to **https://render.com** → **Get Started**.
2. Choose **Sign up with GitHub** and sign in with the GitHub account that owns `firmcrm`.
3. When GitHub asks, allow Render to access **only the `firmcrm` repository**.
4. In Render: your name (top right) → **Account Settings** → turn on **Two-factor authentication**. Do the same in GitHub (Settings → Password and authentication). These two accounts now protect your client data.
5. Render: **Billing** → add the company card.

## Step 2 — Create the CRM from the blueprint (10 min + ~15 min waiting)
1. In the Render dashboard: **New +** → **Blueprint**.
2. Pick the **firmcrm** repository. Render finds the file `render.yaml` and shows two items:
   - **firmcrm** — the web app (Singapore)
   - **firmcrm-db** — the database (Singapore)
3. Give the blueprint a name, e.g. *BD CRM*.
4. Render asks for two values:
   - **SEED_ADMIN_EMAIL** — your own work email (you will be the first admin).
   - **SEED_ADMIN_PASSWORD** — a temporary password: at least 12 characters with a letter and a number. You'll change it at first sign-in.
5. Click **Apply** / **Deploy Blueprint**.
6. Wait. The first build takes about 10–15 minutes. When **firmcrm** shows **Live** (green), it's ready.

If Render shows an error instead, copy the red message (or take a screenshot) and send it to me — most first-time issues are a one-line change.

## Step 3 — First sign-in (5 min)
1. Click **firmcrm** in Render. At the top you'll see its address, e.g. `https://firmcrm.onrender.com`. Open it.
2. Sign in with the email and temporary password from Step 2.
3. Choose your own password when asked.
4. Bookmark the address.

## Step 4 — Your own web address (optional, 15 min)
To use `crm.yourfirm.co.th` instead of `…onrender.com`:
1. Render → **firmcrm** → **Settings** → **Custom Domains** → **Add Custom Domain** → type `crm.yourfirm.co.th`.
2. Render shows a **CNAME** record. Send it to whoever manages your firm's website / domain (the web agency or the domain registrar account) and ask them to add it.
3. Within an hour Render shows the domain as **Verified** and the padlock (HTTPS) is issued automatically.

## Step 5 — Set up the CRM
Follow `docs/ADMIN-GUIDE.md`: add your colleagues (Admin › Users), set the USD→THB rate (Admin › Settings), then import your Excel lists (Organisations › Import, then Contacts › Import).

---

## Looking after it (≈15 minutes a month)

| When | What | Where |
|---|---|---|
| Monthly | Check backups exist (one per day) | Render → **firmcrm-db** → **Recovery** (or **Backups**) |
| Monthly | Look for odd sign-in failures and big exports | CRM → Admin › Audit log (filter *LOGIN_FAILED*, *EXPORT*) |
| Monthly | Check the bill | Render → **Billing** |
| When people leave | Untick *Active* on their user | CRM → Admin › Users |
| When I (or a developer) improve the CRM | Nothing — Render redeploys automatically when code is pushed to GitHub | Render → firmcrm → **Events** shows each deploy |

**Restoring data** (accidental mass deletion etc.): Render's database **Recovery** page can restore to a point in time — this creates a copy of the database. Ask a developer to switch the app to it; don't try it alone the first time.

**Locked out with no other admin**: Render → **firmcrm** → **Shell**, then paste:

```
cd /app/tools && ./node_modules/.bin/tsx prisma/admin-reset.ts your.email@yourfirm.co.th
```

It prints a temporary password and records the action in the audit log.

## Plans and cost
`render.yaml` chooses the **Standard** web plan (2 GB memory) and the **Basic 1 GB** database, both in Singapore. Check today's prices at render.com/pricing. To save money with a small team you can switch the web service to **Starter** (Render → firmcrm → Settings → Instance Type); PDF exports of long lists may then be slower.
