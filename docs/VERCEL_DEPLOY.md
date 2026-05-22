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
JWT_SECRET_KEY=um-segredo-forte
FRONTEND_ORIGIN=https://app-redacao-five.vercel.app
ENVIRONMENT=production

# opcionais
OPENAI_API_KEY=sk-...
SEED_DEMO_DATA=true
```

No Supabase, use a connection string do projeto em `DATABASE_URL`. O backend tambem aceita URLs `postgresql://...` e `postgres://...`; elas sao normalizadas automaticamente para o driver `psycopg`.

Valide:

```text
https://app-redacao-back.vercel.app/health
```

## Frontend

Configuracao do projeto:

- Root Directory: `frontend`
- Framework Preset: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`

Variaveis:

```text
NEXT_PUBLIC_SITE_URL=https://app-redacao-five.vercel.app
INTERNAL_API_URL=https://app-redacao-back.vercel.app/api/v1
```

Com essa configuracao, o browser fala com o proprio dominio do frontend e o Next.js repassa para o backend. `NEXT_PUBLIC_API_URL` ja usa `/api/backend` por padrao.

## Ordem de publicacao

1. Publique o backend.
2. Configure `INTERNAL_API_URL` no frontend com `https://app-redacao-back.vercel.app/api/v1`.
3. Publique o frontend.
4. Atualize `FRONTEND_ORIGIN` no backend com `https://app-redacao-five.vercel.app`.
5. Faça redeploy do backend.
