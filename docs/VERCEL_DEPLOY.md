# Deploy na Vercel

Este repositorio tem dois servicos:

- `frontend/`: app Next.js.
- `backend/`: API FastAPI.

A forma mais simples e previsivel e criar dois projetos na Vercel, um apontando para `backend/` e outro para `frontend/`.

## 1. Banco de dados

Crie um Postgres gerenciado, por exemplo Neon, Supabase ou Vercel Marketplace.

Use uma URL compativel com SQLAlchemy/psycopg:

```text
postgresql+psycopg://user:password@host:5432/database?sslmode=require
```

## 2. Backend FastAPI

Crie um projeto Vercel para o backend:

- Root Directory: `backend`
- Framework Preset: FastAPI ou Other, caso a autodeteccao ja encontre o app
- Build Command: vazio
- Output Directory: vazio

Variaveis de ambiente:

```text
DATABASE_URL=postgresql+psycopg://user:password@host:5432/database?sslmode=require
JWT_SECRET_KEY=um-segredo-forte
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
FRONTEND_ORIGIN=https://seu-frontend.vercel.app
ENVIRONMENT=production
```

O arquivo `backend/app/index.py` exporta `app` para a autodeteccao do FastAPI na Vercel.

Depois do deploy, valide:

```text
https://seu-backend.vercel.app/health
```

## 3. Frontend Next.js

Crie outro projeto Vercel para o frontend:

- Root Directory: `frontend`
- Framework Preset: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`

Variaveis de ambiente:

```text
NEXT_PUBLIC_API_URL=/api/backend
INTERNAL_API_URL=https://seu-backend.vercel.app/api/v1
```

Com essa configuracao, o navegador chama `/api/backend` no proprio dominio do frontend, e o route handler do Next.js repassa a requisicao para `INTERNAL_API_URL`.

## 4. Ordem recomendada

1. Publique o backend.
2. Copie a URL publica do backend.
3. Configure `INTERNAL_API_URL` no projeto do frontend.
4. Publique o frontend.
5. Atualize `FRONTEND_ORIGIN` no backend com a URL final do frontend.
6. Rode um redeploy do backend.

## 5. Observacoes

- Nao configure `NEXT_PUBLIC_API_URL` com a URL direta do backend se quiser manter o proxy same-origin.
- Para previews do frontend, o proxy evita CORS porque o browser fala apenas com o dominio do proprio frontend.
- Se quiser liberar acesso direto do browser para mais de um dominio, use `FRONTEND_ORIGIN` com valores separados por virgula.
