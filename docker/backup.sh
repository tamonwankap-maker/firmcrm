#!/bin/sh
# Database backups (runs in the `backup` container, TZ=Asia/Bangkok).
#   /backup.sh          → nightly at BACKUP_HOUR:00 (default 02:00), keeping BACKUP_KEEP_DAYS days
#   /backup.sh once     → take one backup now (e.g. before an upgrade)
set -e

backup_now() {
  ts=$(date +%Y%m%d-%H%M%S)
  file="/backups/bdcrm-$ts.dump"
  pg_dump --format=custom --no-owner --file="$file.partial"
  mv "$file.partial" "$file"   # only complete dumps get the final name
  echo "[$(date)] backup written: $file ($(du -h "$file" | cut -f1))"
  find /backups -name 'bdcrm-*.dump' -mtime +"${BACKUP_KEEP_DAYS:-30}" -delete
}

if [ "$1" = "once" ]; then
  backup_now
  exit 0
fi

HOUR="${BACKUP_HOUR:-2}"
echo "[$(date)] nightly backups at $(printf '%02d' "$HOUR"):00, keeping ${BACKUP_KEEP_DAYS:-30} days"
while true; do
  now=$(date +%s)
  # Seconds until the next HOUR:00 today or tomorrow.
  target=$(date -d "$(date +%Y-%m-%d) $(printf '%02d' "$HOUR"):00:00" +%s 2>/dev/null || date -D '%Y-%m-%d %H:%M:%S' -d "$(date +%Y-%m-%d) $(printf '%02d' "$HOUR"):00:00" +%s)
  [ "$target" -le "$now" ] && target=$((target + 86400))
  sleep $((target - now))
  backup_now || echo "[$(date)] BACKUP FAILED" >&2
done
