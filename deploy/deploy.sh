#!/usr/bin/env bash
# Deploy repetivel, roda no VPS: atualiza o codigo, builda, migra (servico `migrate`) e sobe.
# Uso: ./deploy/deploy.sh [branch-tag-ou-sha]   (padrao: main)
# Rollback: ./deploy/deploy.sh <sha anterior>. Migrations so andam para frente: se a release ruim
# trouxe migration, restaure o backup (deploy/restore.sh) antes de voltar o codigo.
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env.production ] || { echo ".env.production ausente" >&2; exit 1; }

REF="${1:-main}"
git fetch --quiet --tags origin
git checkout --quiet "$REF"
git merge --quiet --ff-only "origin/$REF" 2>/dev/null || true

COMPOSE="docker compose --env-file .env.production -f docker-compose.prod.yml"
$COMPOSE up -d --build --remove-orphans
$COMPOSE ps

for _ in $(seq 1 30); do
  if $COMPOSE exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" >/dev/null 2>&1; then
    echo "deploy ok"
    exit 0
  fi
  sleep 5
done
echo "backend nao ficou saudavel; veja: $COMPOSE logs --tail=100 backend migrate" >&2
exit 1
