# BD CRM

Business Development CRM for a full-service Thai law firm: relationships, pipeline, pitches, directory rankings, events and content. BD only — no billing, time recording or matter management.

See **PLAN.md** (scope, data model, phases) and **CLAUDE.md** (conventions for developers).

| Document | For |
|---|---|
| [docs/HOSTING-RENDER.md](docs/HOSTING-RENDER.md) | **No IT team:** put the CRM online with Render, step by step |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | IT: install on your own server, HTTPS, backups/restore, upgrades, monitoring |
| [docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md) | Head of BD: users, roles, confidential work, PDPA, imports, audit log |
| [docs/SECURITY.md](docs/SECURITY.md) | Security review and recommendations |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Performance at 50,000 contacts |
| [docs/ENTRA-ID.md](docs/ENTRA-ID.md) | Adding Microsoft 365 sign-in |

## Run in production (Docker)

Requirements: a Linux server with Docker and Docker Compose.

```bash
cp .env.example .env
```

Edit `.env`:

- `AUTH_SECRET` — generate with `openssl rand -base64 48`
- `POSTGRES_PASSWORD` — a long random password
- `AUTH_URL` — the address users type in the browser, e.g. `https://crm.yourfirm.co.th`
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — the first admin (Head of BD); they must change the password at first sign-in

```bash
docker compose up -d --build
```

- The app listens on port 3000 (`APP_PORT`). Put it behind your HTTPS reverse proxy (nginx, IIS, Azure Application Gateway…).
- Migrations run automatically on start.
- Database backups are written nightly (02:00 Bangkok) to `./backups` and kept for `BACKUP_KEEP_DAYS` (default 30). Copy them off the server. Restore steps: docs/DEPLOYMENT.md.
- Health check: `GET /api/health`

## Develop locally

```bash
docker compose -f docker-compose.dev.yml up -d
cp .env.example .env          # set AUTH_SECRET and SEED_ADMIN_PASSWORD
npm install
npm run db:deploy && npm run db:seed -- --demo
npm run dev
```

Demo logins (password `DemoPass2026!`): `bd@example.com`, `partner@example.com`, `partner2@example.com`, `viewer@example.com`.

Run `npm run check` (types, lint, unit + integration tests) and `npm run e2e -- --trace off` before committing.

## Troubleshooting

- **Dev page keeps refreshing by itself**: fixed by turning off Turbopack's dev cache in `next.config.ts`. If it ever recurs, stop `npm run dev`, delete the `.next` folder and start again.
