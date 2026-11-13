#!/bin/sh
# Apply pending migrations, seed lookup data / first admin (idempotent), then start the server.
set -e
cd /app/tools
echo "→ Applying database migrations"
./node_modules/.bin/prisma migrate deploy
echo "→ Seeding lookup data"
./node_modules/.bin/tsx prisma/seed.ts
cd /app
echo "→ Starting BD CRM"
exec node server.js
