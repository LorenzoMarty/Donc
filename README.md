# Donc

Plataforma de preparacao para Portugues e Redacao do ENEM. Frontend em Next.js 16 (App Router),
backend em FastAPI + PostgreSQL/pgvector, fila assincrona via Celery/Redis e pipeline de correcao
de redacoes com agentes de IA (framework `agno` + OpenAI).

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, Zustand, Vitest, Playwright |
| Backend | FastAPI, SQLAlchemy, Pydantic, Alembic, Celery |
| Dados | PostgreSQL (extensao `pgvector`), Redis |
| IA | `agno` (agentes), OpenAI, Langfuse (tracing opcional) |

## Estrutura

```text
frontend/
  src/app/          rotas App Router, layouts, loading/error e proxy API
  src/components/   UI reutilizavel, shell, escrita, secoes e jogos
  src/contexts/     auth e toasts globais
  src/features/     gamificacao, XP e streak
  src/lib/          ambiente e client HTTP
  src/services/     servicos por dominio
  src/stores/       estado persistido
  src/types/        contratos TypeScript da API
  src/utils/        utilitarios compartilhados

backend/
  src/agents/       agentes especializados de IA
  src/config/       settings e seguranca
  src/database/     engine, sessao e base SQLAlchemy
  src/routes/       endpoints REST por dominio
  src/services/     regras de negocio
  src/repositories/ acesso a dados
  src/schemas/      DTOs Pydantic de entrada e saida
  src/middlewares/  tratamento global de erros
  src/vectorstore/  RAG e pgvector
  src/queues/       Celery e jobs assincronos
  alembic/          migracoes
```

## Requisitos

- Node.js 22
- Python 3.12+ ou 3.13
- Docker e Docker Compose para o ambiente completo

## Desenvolvimento

```bash
cp .env.example .env
docker compose up --build
```

`docker-compose.yml` sobe 4 servicos: `db` (Postgres 16 + pgvector), `backend` (FastAPI/Python
3.13), `worker` (Celery) e `frontend` (Next.js/Node 22).

Servicos:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

Sem Docker:

```bash
npm --prefix frontend install
npm run dev:frontend
```

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:DATABASE_URL="sqlite:///./local_dev.db"
python -m uvicorn src.main:app --reload --port 8000
```

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run start:backend
npm run start:frontend
```

Gate de qualidade por servico (lint + typecheck + testes):

```bash
npm --prefix frontend run quality   # eslint + typegen/tsc + vitest
cd backend && .\quality.ps1         # prospector + pytest --cov
```

## Contrato da API

Respostas de sucesso:

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

Erros:

```json
{
  "success": false,
  "message": "Mensagem legivel",
  "error": "error_code"
}
```

O frontend centraliza chamadas em `frontend/src/lib/http-client.ts` e desempacota `data` automaticamente.

## Variaveis de ambiente

Use `.env.example` para Docker/local. Para Vercel, use os exemplos por servico:

- `backend/.env.example`
- `frontend/.env.example`

Em producao, configure:

- `DATABASE_URL` com Postgres gerenciado
- `JWT_SECRET_KEY` com segredo forte
- `FRONTEND_ORIGIN=https://app-redacao-five.vercel.app`
- `INTERNAL_API_URL=https://app-redacao-back.vercel.app/api/v1`
- `OPENAI_API_KEY` se quiser IA real

Para Supabase, use a connection string do projeto em `DATABASE_URL`.
Mantenha `ENABLE_PGVECTOR=false` se o banco ainda nao tiver a extensao `vector`.

## Deploy

Frontend:

- Vercel com Root Directory `frontend`
- Build Command `npm run build`
- `INTERNAL_API_URL=https://app-redacao-back.vercel.app/api/v1`

Backend:

- Railway, Render ou Vercel com Root Directory `backend`
- Entrada ASGI `src.main:app`
- Porta dinamica via `PORT`
- Vercel usa `backend/vercel.json` e `src/index.py`
- `buildCommand` do `backend/vercel.json` roda `alembic upgrade head` automaticamente antes do
  backend subir — toda migration nova precisa estar commitada em `alembic/versions/` antes do
  deploy, não é mais um passo manual separado.

## Runbook: deploy quebrado / migration / rollback

**Deploy do backend falhou no passo de migration (`alembic upgrade head`):**
1. Veja o log do build na Vercel — o erro do Alembic aparece ali (migration com SQL inválido,
   conflito de schema, ou banco inacessível).
2. Se for erro de SQL na migration nova: corrija a migration, commit novo, redeploy — não edite
   uma migration já aplicada em produção.
3. Se for banco inacessível: confira `DATABASE_URL` nas env vars do projeto na Vercel.
4. O deploy não promove pra produção se o build falhar — a versão anterior continua no ar.

**Reverter uma migration manualmente** (ex.: migration aplicou mas o app quebrou por outro motivo):
```bash
alembic downgrade -1   # roda contra o DATABASE_URL do ambiente-alvo
```
Depois, reverta o código (rollback de versão, ver abaixo) — código velho não deve rodar contra
schema novo nem vice-versa por mais tempo que o necessário.

**Rollback de versão no Vercel:**
1. No dashboard do projeto (frontend ou backend), aba "Deployments".
2. Ache o último deployment saudável, clique em "..." → "Promote to Production".
3. Se o rollback envolve reverter uma migration de schema também, rode o `alembic downgrade`
   acima **antes** de promover o deployment antigo — código antigo esperando schema antigo.

**Deploy do frontend falhou em `npm ci` (lockfile fora de sincronia):**
Rode `npm install` dentro de `frontend/` localmente (não na raiz do monorepo — o workspace da raiz
mascara o problema), confira o diff de `frontend/package-lock.json`, commit, redeploy.

O Dockerfile do frontend usa build standalone do Next.js. O Dockerfile do backend inicia `uvicorn src.main:app` com porta dinamica.
