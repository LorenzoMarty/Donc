# Deploy na Vercel

Use dois projetos Vercel: um para `backend/` e outro para `frontend/`.

## Backend

Configuracao do projeto:

- Root Directory: `backend`
- Build Command: vazio
- Output Directory: vazio
- Entrada: `src/index.py`, configurada em `backend/vercel.json`

Variaveis:

```text
DATABASE_URL=postgresql+psycopg://user:password@host:5432/database?sslmode=require
DATABASE_CONNECT_TIMEOUT_SECONDS=5
JWT_SECRET_KEY=um-segredo-forte
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
REDIS_URL=redis://default:senha@host:6379/0
SEED_DEMO_DATA=false
FRONTEND_ORIGIN=https://seu-frontend.vercel.app
ENVIRONMENT=production
```

Valide:

```text
https://seu-backend.vercel.app/health
```

## Frontend

Configuracao do projeto:

- Root Directory: `frontend`
- Framework Preset: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`

Variaveis:

```text
NEXT_PUBLIC_SITE_URL=https://seu-frontend.vercel.app
NEXT_PUBLIC_API_URL=/api/backend
INTERNAL_API_URL=https://seu-backend.vercel.app/api/v1
```

Com essa configuracao, o browser fala com o proprio dominio do frontend e o Next.js repassa para o backend.

## Ordem de publicacao

1. Publique o backend.
2. Configure `INTERNAL_API_URL` no frontend com a URL publica do backend.
3. Publique o frontend.
4. Atualize `FRONTEND_ORIGIN` no backend com a URL final do frontend.
5. Faça redeploy do backend.
