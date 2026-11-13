# Deployment guide (for IT)

The BD CRM is a single Docker Compose stack: **app** (Next.js), **db** (PostgreSQL 16) and **backup** (nightly `pg_dump`). It is self-hosted; no data leaves your server.

## 1. Server

| | Minimum | Recommended (≈100 users, 50k contacts) |
|---|---|---|
| CPU / RAM | 2 vCPU / 4 GB | 4 vCPU / 8 GB |
| Disk | 20 GB | 50 GB SSD (database + 30 days of backups) |
| OS | Any Linux with Docker Engine 24+ and Docker Compose v2 | Ubuntu 24.04 LTS |

Open only HTTPS (443) to users, via your reverse proxy. Port 3000 (the app) should be reachable from the proxy only. The database is not exposed outside Docker.

## 2. First installation

```bash
git clone <your repository> bd-crm && cd bd-crm
cp .env.example .env
```

Edit `.env`:

| Variable | Value |
|---|---|
| `POSTGRES_PASSWORD` | long random password (`openssl rand -base64 32`) |
| `AUTH_SECRET` | `openssl rand -base64 48` — keep it secret; changing it signs everyone out |
| `AUTH_URL` | the address users open, e.g. `https://crm.yourfirm.co.th` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | the first admin (Head of BD). They must change the password at first sign-in. Only used when no admin exists. |
| `APP_PORT` | port published on the host (default 3000) |
| `BACKUP_KEEP_DAYS` / `BACKUP_HOUR` | backup retention (default 30 days) and time (default 02:00 Bangkok) |

```bash
docker compose up -d --build
docker compose ps            # app and db should be "healthy"
docker compose logs -f app   # shows migrations, seed and "Starting BD CRM"
```

Database migrations run automatically every time the app starts.

## 3. HTTPS reverse proxy

Terminate TLS in front of the app (nginx, IIS ARR, Azure Application Gateway, Traefik…). Forward the original host and protocol. nginx example:

```nginx
server {
  listen 443 ssl http2;
  server_name crm.yourfirm.co.th;
  ssl_certificate     /etc/ssl/crm.crt;
  ssl_certificate_key /etc/ssl/crm.key;
  client_max_body_size 8m;               # Excel imports up to 5 MB

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 120s;             # large PDF exports
  }
}
server { listen 80; server_name crm.yourfirm.co.th; return 301 https://$host$request_uri; }
```

The app sends security headers itself (CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy). Sign-in cookies are marked Secure when `AUTH_URL` is https.

## 4. Backups and restore

- The `backup` container writes `./backups/bdcrm-YYYYMMDD-HHMMSS.dump` every night at `BACKUP_HOUR` and deletes dumps older than `BACKUP_KEEP_DAYS`.
- **Copy `./backups` off the server** (file server, Azure Blob, tape) — a backup on the same disk is not a backup.
- Take a backup now (e.g. before an upgrade):

```bash
docker compose exec backup /bin/sh /backup.sh once
```

Restore (stop the app first so nobody writes during the restore):

```bash
docker compose stop app
docker compose exec -T db psql -U bdcrm -d postgres -c 'DROP DATABASE bdcrm;' -c 'CREATE DATABASE bdcrm OWNER bdcrm;'
docker compose exec -T db pg_restore -U bdcrm -d bdcrm --no-owner < backups/bdcrm-YYYYMMDD-HHMMSS.dump
docker compose start app
```

Test a restore into a scratch database at least once a quarter (replace `bdcrm` with `restore_test` in the commands above, then compare row counts).

## 5. Upgrades

```bash
docker compose exec backup /bin/sh /backup.sh once   # safety backup
git pull
docker compose up -d --build                          # migrations apply on start
docker compose logs -f app
```

Rolling back code after a migration needs the safety backup — migrations are forward-only.

## 6. Monitoring

- Health check: `GET /api/health` → `{"status":"ok"}` (200) or 503 if the database is unreachable. Docker already uses it.
- Logs: `docker compose logs app`, `docker compose logs backup` (look for `BACKUP FAILED`).
- The in-app **Admin › Audit log** records every change, sign-in, failed sign-in, password reset and export.

## 7. Locked out (break-glass)

If no admin can sign in, make a user admin again with a temporary password (shown once, audited):

```bash
docker compose exec -w /app/tools app ./node_modules/.bin/tsx prisma/admin-reset.ts head.of.bd@yourfirm.com
```

## 8. Email

The app does not send email yet: password resets are done by an admin. Adding Office 365 / SMTP notifications is a small change if wanted later.

## 9. Microsoft 365 sign-in

See `docs/ENTRA-ID.md`.
