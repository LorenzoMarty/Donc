# Donk ENEM

Aplicacao fullstack para estudo de Redacao ENEM com frontend Next.js, backend FastAPI, PostgreSQL/pgvector, Redis, Celery e agentes de IA.

## Estrutura

```text
frontend/
  src/app/          rotas App Router, layouts, loading/error e proxy API
  src/components/   UI reutilizavel, shell, escrita, secoes e jogos
  src/contexts/     auth e toasts globais
  src/features/     gamificacao, XP, streak e conquistas
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

Validações por serviço:

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run build
cd backend && python -m pytest
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

O Dockerfile do frontend usa build standalone do Next.js. O Dockerfile do backend inicia `uvicorn src.main:app` com porta dinamica.
