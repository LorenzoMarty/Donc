# Arquitetura

## Visao Geral

O projeto e dividido em dois servicos independentes:

- `frontend`: Next.js App Router, TypeScript, TailwindCSS, tema claro/escuro, shell autenticado e proxy same-origin para a API.
- `backend`: FastAPI em layout `src`, SQLAlchemy, Pydantic, JWT, Celery, Redis, PostgreSQL/pgvector e agentes de IA.

## Backend

Camadas principais:

- `config`: settings, JWT e hashing de senha.
- `database`: engine, sessao e base declarativa.
- `routes`: endpoints REST por dominio.
- `services`: regras de negocio.
- `repositories`: consultas SQLAlchemy reutilizaveis.
- `schemas`: contratos Pydantic e envelope padrao.
- `middlewares`: erros globais e logs estruturados de excecoes.
- `agents`, `workflows`, `memory`, `vectorstore`, `queues`, `telemetry`: recursos de IA, RAG, jobs e observabilidade.

Dominios expostos:

- Auth e usuario atual
- Dashboard
- Aulas, cursos e progresso
- Exercicios
- Redacoes, temas, historico, versoes e correcoes
- Simulados
- Admin
- IA sincronizada, jobs assincronos e stream de status

Todas as rotas JSON usam o contrato:

```json
{ "success": true, "message": "", "data": {} }
```

Erros de aplicacao, HTTP e validacao usam:

```json
{ "success": false, "message": "", "error": "" }
```

## Frontend

Camadas principais:

- `app`: rotas, route handlers, layouts, loading e error boundary.
- `components`: UI compartilhada e componentes de dominio.
- `contexts`: auth e toasts globais.
- `lib`: ambiente e client HTTP com interceptacao de erros.
- `services`: APIs por dominio.
- `types`: contratos TypeScript.
- `features`, `games`, `stores`, `utils`: estado e regras de experiencia.

O navegador chama `/api/backend/*`. O route handler do Next repassa para `INTERNAL_API_URL`, mantendo a API same-origin para o usuario e reduzindo problemas de CORS.

## Seguranca

- Senhas com bcrypt e pre-hash SHA-256.
- JWT assinado por `JWT_SECRET_KEY`.
- CORS limitado por `FRONTEND_ORIGIN`.
- Rotas protegidas por middleware/proxy no frontend e dependencias no backend.
- Rotas administrativas exigem papel `admin`.
- Rate limit de endpoints de IA.
- Headers de seguranca no Next.js.
