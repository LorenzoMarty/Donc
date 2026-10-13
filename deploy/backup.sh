#!/usr/bin/env bash
# Backup diario do Postgres: dump comprimido local (14 dias) + copia off-site opcional via rclone.
# Cron (root, 03:15):  15 3 * * * cd /opt/donc && ./deploy/backup.sh >> /var/log/donc-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; source .env.production; set +a

BACKUP_DIR="${BACKUP_DIR:-/var/backups/donc}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/donc-$STAMP.sql.gz"
mkdir -p "$BACKUP_DIR"

docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner | gzip > "$FILE"

# Dump vazio/truncado = falha silenciosa do pipe; recusa e apaga.
if [ "$(stat -c %s "$FILE")" -lt "${BACKUP_MIN_BYTES:-1024}" ]; then
  echo "backup suspeito (muito pequeno), removendo: $FILE" >&2
  rm -f "$FILE"
  exit 1
fi

find "$BACKUP_DIR" -name 'donc-*.sql.gz' -mtime +14 -delete

if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
  rclone copy "$FILE" "$BACKUP_RCLONE_REMOTE"
fi
echo "ok: $FILE"
