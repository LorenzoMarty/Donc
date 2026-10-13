# Deploy de produção (VPS único)

Stack: Caddy (HTTPS automático) → frontend Next.js → backend FastAPI, com Postgres (pgvector), Redis e worker Celery.
Tudo em `docker-compose.prod.yml`; só o Caddy publica portas (80/443).

## Primeira vez

1. VPS Ubuntu/Debian (~2 vCPU / 4 GB). Aponte o DNS (registro A/AAAA) do domínio para o IP.
2. Como root no VPS: `curl -fsSL https://raw.githubusercontent.com/<org>/<repo>/main/deploy/setup-vps.sh | bash` (ou copie o script).
   Ele ativa o firewall (só 22/80/443), cria 2 GB de swap e instala o Docker.
3. `git clone <repo> /opt/donc && cd /opt/donc`
4. `cp .env.production.example .env.production` e preencha **todos** os valores (segredos novos, nunca os de dev).
   O backend recusa subir em produção com `JWT_SECRET_KEY` fraco, `SEED_DEMO_DATA=true` ou `FRONTEND_ORIGIN` em localhost.
5. `./deploy/deploy.sh` — builda, roda `alembic upgrade head` (serviço `migrate`, passo explícito) e sobe tudo.
6. Crie o primeiro admin (o seed demo não roda em produção): ver "Primeiro admin" abaixo.

## Deploys seguintes

- No VPS: `./deploy/deploy.sh [branch|tag|sha]` (padrão `main`).
- Pelo GitHub: Actions → **Deploy** → *Run workflow* (secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`, `DEPLOY_KNOWN_HOSTS` = saída de `ssh-keyscan -H <host>`).
- Rollback: `./deploy/deploy.sh <sha anterior>`. Migrations só andam para frente: se a release ruim trouxe migration, restaure o backup antes.

## Primeiro admin

Registre uma conta pelo site e promova no banco:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "update users set role='ADMIN' where email='voce@exemplo.com'"
```

## Backup e restore

- Diário às 03:15: `15 3 * * * cd /opt/donc && ./deploy/backup.sh >> /var/log/donc-backup.log 2>&1` (root).
  Guarda 14 dias em `/var/backups/donc`. Para cópia off-site, instale `rclone`, configure um remote e preencha `BACKUP_RCLONE_REMOTE`.
- Testar um backup (restaura num banco descartável, não toca a produção):
  `./deploy/restore.sh /var/backups/donc/donc-<data>.sql.gz` — deve imprimir o número de usuários.
- Restaurar de verdade: `CONFIRM_RESTORE=<banco> ./deploy/restore.sh <arquivo> <banco>` (pare backend/worker antes). O off-site deve ser criptografado (ex. `rclone crypt`): o dump tem dados de alunos.

## Limites do VPS

Cada serviço tem `mem_limit` (somam ~3,4 GB) e o swap de 2 GB absorve picos. Se o worker for morto por falta de memória
(`docker compose ... ps`), reduza `--concurrency` ou suba o plano do VPS.
