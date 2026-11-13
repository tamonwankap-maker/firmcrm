# syntax=docker/dockerfile:1
# Production image for the BD CRM (Next.js standalone output + a small migrator toolkit).

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ── deps: everything needed to build ──
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# ── build ──
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ── migrator: just enough to run `prisma migrate deploy` and the idempotent seed at start-up ──
FROM base AS migrator
WORKDIR /tools
RUN echo '{"name":"bd-crm-migrator","private":true}' > package.json \
  && npm install --omit=dev --no-audit --no-fund \
     prisma@7.10.1 @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1 pg tsx dotenv @node-rs/argon2 \
  && npm cache clean --force
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src/server/auth/argon.ts ./src/server/auth/argon.ts
COPY --from=build /app/src/generated ./src/generated

# ── runtime ──
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=migrator --chown=app:app /tools ./tools
COPY --chown=app:app docker/entrypoint.sh ./entrypoint.sh
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./entrypoint.sh"]
