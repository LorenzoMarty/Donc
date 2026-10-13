#!/usr/bin/env bash
# Restaura um dump do backup.sh. Uso: ./deploy/restore.sh /var/backups/donc/donc-AAAAMMDD-HHMMSS.sql.gz [db_destino]
# Sem db_destino restaura num banco de TESTE (donc_restore_test): assim o backup e validado sem
# tocar na producao. Para restaurar na producao de verdade, passe o nome real do banco.
set -euo pipefail

FILE="${1:?informe o arquivo .sql.gz}"
cd "$(dirname "$0")/.."
set -a; source .env.production; set +a
TARGET="${2:-donc_restore_test}"
COMPOSE="docker compose --env-file .env.production -f docker-compose.prod.yml"

$COMPOSE exec -T db psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$TARGET\""
$COMPOSE exec -T db psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$TARGET\""
gunzip -c "$FILE" | $COMPOSE exec -T db psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$TARGET" -q

echo "restaurado em $TARGET; usuarios:"
$COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$TARGET" -tAc "select count(*) from users"
