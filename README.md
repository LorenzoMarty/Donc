# Donk ENEM

Plataforma fullstack para estudo de redacao ENEM, com frontend Next.js, backend FastAPI e camada de IA baseada em agentes Agno.

## Stack

- Frontend: Next.js App Router, React, TypeScript, TailwindCSS, Framer Motion.
- Backend: FastAPI, Python 3.13, SQLAlchemy, Alembic.
- IA: Agno, OpenAI Responses API, outputs estruturados e fallback deterministico para desenvolvimento.
- Dados: PostgreSQL com pgvector.
- Jobs e cache: Redis e Celery.
- Observabilidade: Langfuse/OpenTelemetry quando configurado.

## Estrutura

```text
frontend/
  src/app/          rotas publicas, auth, area logada e proxy backend
  src/components/   componentes compartilhados, UI, escrita e gamificacao
  src/features/     regras de gamificacao, conquistas, streak e XP
  src/games/        sessoes de jogos ativos
  src/services/     cliente HTTP tipado
  src/stores/       estado persistido de gamificacao
  src/utils/        utilitarios compartilhados

backend/
  app/agents/       agentes Agno especializados
  app/workflows/    orquestracao de IA
  app/routers/      API REST
  app/services/     regras de negocio
  app/models/       SQLAlchemy
  app/schemas/      Pydantic
  app/vectorstore/  seed RAG e pgvector
  app/queues/       Celery
  alembic/          migracoes
```

## Desenvolvimento

```bash
cp .env.example .env
docker compose up --build
```

Servicos locais:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

Frontend sem Docker:

```bash
cd frontend
npm install
npm run dev
```

Backend sem Docker:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:DATABASE_URL="sqlite:///./local_dev.db"
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

## Scripts

Frontend:

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
```

Backend:

```bash
python -m compileall app tests alembic
pytest
```

## Variaveis

Copie `.env.example` e configure:

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `REDIS_URL`
- `FRONTEND_ORIGIN`
- `NEXT_PUBLIC_API_URL`
- `INTERNAL_API_URL`
- `SEED_DEMO_DATA`

Use `SEED_DEMO_DATA=true` apenas em desenvolvimento ou demo. Em producao, use `SEED_DEMO_DATA=false`.

## Deploy Vercel

O repositorio esta preparado para dois projetos Vercel:

- Backend: Root Directory `backend`, FastAPI exportado em `app/index.py`, config em `backend/vercel.json`.
- Frontend: Root Directory `frontend`, Next.js, config em `frontend/vercel.json`.

Fluxo recomendado:

1. Publique o backend.
2. Configure o frontend com `NEXT_PUBLIC_API_URL=/api/backend`.
3. Configure `INTERNAL_API_URL=https://seu-backend.vercel.app/api/v1`.
4. Configure o backend com `FRONTEND_ORIGIN=https://seu-frontend.vercel.app`.
5. Use `SEED_DEMO_DATA=false` em producao.

Detalhes: [`docs/VERCEL_DEPLOY.md`](docs/VERCEL_DEPLOY.md).

## Qualidade

- TypeScript estrito.
- ESLint com `--max-warnings=0`.
- Prettier configurado.
- Dependencias de animacao antigas removidas.
- Rotas e componentes de exercicios legacy removidos em favor de `/games`.
- Login sem credenciais demo preenchidas no cliente.
