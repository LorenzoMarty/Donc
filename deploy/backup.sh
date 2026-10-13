#!/usr/bin/env bash
# Backup diario do Postgres: dump comprimido local (14 dias) + copia off-site opcional via rclone.
# Cron (root, 03:15):  15 3 * * * cd /opt/donc && ./deploy/backup.sh >> /var/log/donc-backup.log 2>&1
set -euo pipefail
umask 077  # dump tem dados de alunos: so o dono le

cd "$(dirname "$0")/.."
# shellcheck source=/dev/null
set -a; source .env.production; set +a

BACKUP_DIR="${BACKUP_DIR:-/var/backups/donc}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/donc-$STAMP.sql.gz"
mkdir -p "$BACKUP_DIR"

# pipefail: se o pg_dump falhar o script sai aqui; o trap apaga o arquivo parcial.
trap 'rm -f "$FILE"' ERR
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner | gzip > "$FILE"

# Dump vazio/truncado = falha silenciosa do pipe; recusa e apaga.
if [ "$(stat -c %s "$FILE")" -lt "${BACKUP_MIN_BYTES:-1024}" ]; then
  echo "backup suspeito (muito pequeno), removendo: $FILE" >&2
  rm -f "$FILE"
  exit 1
fi

trap - ERR
find "$BACKUP_DIR" -name 'donc-*.sql.gz' -mtime +14 -delete

if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
  # Off-site: criptografe no remote (ex. rclone crypt) — o dump tem dados pessoais.
  rclone copy "$FILE" "$BACKUP_RCLONE_REMOTE"
fi
echo "ok: $FILE"
