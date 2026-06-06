# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com o código neste repositório.

## Visão Geral do Projeto

**Donc ENEM** — Plataforma de preparação para Português e Redação do ENEM. Frontend: Next.js 16 (App Router). Backend: FastAPI + PostgreSQL. Pipeline de correção de redações com IA usando OpenAI via framework `agno`.

---

## Política de Trabalho do Claude

Regras obrigatórias para trabalhar neste repositório:

0. **Sempre responder em português (pt-BR).** Toda comunicação com o usuário deve ser em
   português brasileiro, independentemente do idioma da pergunta.

1. **Analisar o sistema só quando necessário.** Não rode análise completa (ex.: skill
   `analyze-system`, varredura ampla do código, `SYSTEM_ANALYSIS.md`) para tarefas pequenas ou
   localizadas. Análise ampla só quando a tarefa realmente exigir entender o sistema inteiro.

2. **Resolver dúvidas pela documentação primeiro.** Qualquer dúvida sobre o sistema
   (arquitetura, estrutura, comandos, decisões) deve ser respondida lendo **este `claude/CLAUDE.md`
   e os documentos em `claude/docs/`** antes de explorar o código. Só investigue o código se a
   resposta não estiver documentada.

3. **Documentar ao concluir.** Após terminar uma tarefa, registre o que mudou em `claude/docs/`
   (um arquivo por tarefa, ver `claude/docs/README.md`) e **atualize este `claude/CLAUDE.md`
   sempre que necessário** — quando arquitetura, estrutura de pastas, comandos, rotas ou decisões
   relevantes mudarem.

> Nota: a raiz tem um `CLAUDE.md` curto que só faz `@claude/CLAUDE.md` — isso reativa o auto-load.
> O arquivo real de instruções é **este** (`claude/CLAUDE.md`); edite-o aqui, não na raiz.

---

## Comandos

### Frontend (`frontend/`)
```bash
npm run dev          # servidor de desenvolvimento em :3000
npm run build        # build de produção
npm run lint         # eslint --max-warnings=0
npm run typecheck    # next typegen && tsc --noEmit
npm run format       # prettier --write .
```

### Backend (`backend/`)
```bash
# Ativar venv primeiro
.venv\Scripts\activate          # Windows PowerShell

uvicorn src.main:app --reload   # servidor de desenvolvimento em :8000
celery -A src.queues.celery_app:celery_app worker --loglevel=INFO  # worker assíncrono
alembic upgrade head            # executar migrações do banco
pytest                          # rodar testes
```

### Stack completa via Docker
```bash
docker compose up               # inicia db (pgvector), redis, backend, worker, frontend
```

---

## Arquitetura

### Fluxo de Requisições
No Docker/produção, a rota Next.js `app/api/backend/[...path]/route.ts` faz proxy de todas as chamadas de `/api/backend/*` → `http://backend:8000/api/v1/*`. Frontend nunca chama backend diretamente — passa sempre por esse handler que repassa headers de auth e cookies.

Em dev local sem Docker, `.env` define `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` para acesso direto ao backend.

### Estrutura do Frontend
- `src/app/(app)/` — rotas protegidas, envolvidas por `AppShell` via `(app)/layout.tsx`. Rotas:
  `dashboard`, `redacao`, `redacoes`, `aulas`, `games`, `simulados`, `conquistas`, `trilhas`,
  `perfil`, `onboarding`, `admin`.
- `src/app/(auth)/` — páginas de login/cadastro/recuperação de senha
- `src/app/` (raiz) — páginas de marketing (landing, `pricing`, `sobre`, `plataforma`, `trilhas`)
- `src/features/gamification/` — XP, ranks, streaks dos jogos (apenas client-side, persistido em localStorage via Zustand)
- `src/games/` — definições estáticas dos jogos por categoria (`connectives`, `grammar`,
  `structure`, `repertoire`, `thesis`, `competencies`, `challenges`). Cada `index.ts` exporta
  `GameDefinition[]`. `src/games/_engines/` contém os componentes de engine interativos
  reutilizáveis (`TimedRushSession`, `ClassifyDragSession`, `OrderSession`, `FillBlankSession`).
- `src/game-pages/` — componentes de UI de sessão de jogo (CategoryPage, GameSession, etc.).
  `GameSession` roteia por `game.engine` para o componente certo.
- `src/components/shared/` — componentes reutilizáveis (AppShell, EssayEditor, LessonPlayer, charts)
  - `app-shell.tsx`: sidebar desktop. Nav **não** tem "Histórico" — a rota `/redacoes` existe mas é
    acessada via Painel/Perfil. Quando recolhida, a logo comprimida vira a seta de expandir no hover
    de qualquer ponto da sidebar (`group` no `<aside>` + `group-hover`). Estado persiste em
    `localStorage` (`sidebar-collapsed`).
- `src/components/ui/` — primitivos shadcn/radix (Badge, Button, Card, etc.). Formulários usam os
  primitivos compartilhados `Input`/`Textarea`/`Select`/`Field` (label+hint+erro+contador) e o
  `Modal` (props `icon`/`size`/`footer` + animação de entrada). Use-os nos formulários do admin
  em vez de `<input>`/`<select>` crus.
- `src/stores/game-store.ts` — Zustand store com persistência para XP/streak/progresso dos jogos
- `src/lib/http-client.ts` — `apiFetch<T>()` adiciona Bearer token do localStorage + desempacota `ApiEnvelope<T>`
- `src/services/api.ts` — re-exporta `apiFetch`, `authApi` e todos os tipos da API

### Autenticação
Token armazenado em `localStorage` (`access_token`) e em cookie (para SSR/middleware). `AuthContext` + hook `useAuth()` (em `providers/app-providers.tsx`) gerencia login/cadastro/logout e hidrata o usuário no mount. `AppError` no backend usa códigos como `not_authenticated`, `invalid_token`.

### Estrutura do Backend
Segue padrão **Routes → Services → Repositories**:
- `src/routes/` — routers FastAPI (auth, dashboard, lessons, exercises, essays, exams, ai, admin, games)
- `src/services/` — lógica de negócio (EssayService, AuthService, AIService, GameService,
  DashboardService, ExamService, ExerciseService, LessonService, RankService, StreakService,
  `ai_telemetry` p/ custo/uso de IA, `seed` p/ dados demo)
- `src/repositories/` — queries SQLAlchemy (UserRepository, EssayRepository, etc.)
- `src/models/` — modelos ORM SQLAlchemy
- `src/schemas/` — schemas Pydantic de request/response

Todas respostas usam formato `ApiEnvelope<T>`: `{ success, message, data, error? }` via `src/schemas/common.py`.

Auth: JWT (HS256) via `python-jose`. Dependência `get_current_user` lê token do header `Authorization` ou cookie `access_token`. `require_admin` depende de `get_current_user` e verifica `UserRole.ADMIN`.

### Pipeline de IA (Correção de Redações)
Correção é assíncrona via Celery:
1. Frontend faz polling em `/api/v1/essays/{id}/job` para verificar status
2. Task Celery `correct_essay` chama `CorrectionOrchestratorWorkflow.correct()`
3. Workflow executa 5 agentes em sequência: `ThesisAgent` → `GrammarAgent` → `RepertoireAgent` → `ENEMCompetencyAgent` → `EssayCorrectionAgent`
4. Todos agentes estendem `AgnoAgentRunner` (`src/agents/base.py`) que usa framework `agno` + OpenAI
5. Se `OPENAI_API_KEY` ausente ou agno falhar, agentes retornam valor `fallback` configurado (degradação graciosa)
6. Após correção, `update_learning_profile()` atualiza `StudentLearningProfile` para rastrear competências fracas e erros recorrentes

### Jogos (Client-side)
XP, streaks e progresso dos jogos são **totalmente client-side** — sem chamadas ao backend. `useGameStore` (Zustand + chave localStorage `donk.games.v1`) rastreia tudo. Definições dos jogos ficam como TypeScript estático em `src/games/`.

**Engines** (campo `engine` em `GameDefinition`, roteado por `GameSession`):
- `quiz`/`choice` — múltipla escolha (render inline no `GameSession`).
- `timed-rush` — rodada infinita cronometrada (combo/strike/timer); usa `questions`.
- `classify` — arrastar itens para baldes (dnd-kit); usa `classify` (buckets + items).
- `order` — ordenar frases por rodada (dnd-kit sortable); usa `order.rounds`.
- `fill-blank` — digitar resposta com normalização tolerante; usa `fillBlank.rounds`.
- `sequence` — montagem da redação (`EssayAssemblySession`, específico do `essay-assembly`).

Há 7 categorias no hub, cada uma com ≥3 atividades. Para criar uma atividade nova, adicione uma
`GameDefinition` ao `index.ts` da categoria com o `engine` e o payload correspondente — não é
preciso tocar nos componentes de engine.

### Variáveis de Ambiente
| Variável | Finalidade |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL (normalizada automaticamente do prefixo `postgres://`) |
| `JWT_SECRET_KEY` | Chave de assinatura JWT |
| `OPENAI_API_KEY` | Necessária para features de IA; app funciona sem ela |
| `OPENAI_MODEL` | Padrão: `gpt-5.5` |
| `REDIS_URL` | Broker do Celery |
| `NEXT_PUBLIC_API_URL` | URL base da API no frontend (`/api/backend` no Docker, URL direta em dev local) |
| `INTERNAL_API_URL` | Destino do proxy server-side (padrão: `http://127.0.0.1:8000/api/v1`) |
| `SEED_DEMO_DATA` | Popula usuários/conteúdo demo no startup (padrão: `true`) |
| `ENABLE_PGVECTOR` | Habilita extensão vector + seed da base de conhecimento |

### Migrações do Banco
Backend cria tabelas automaticamente via `Base.metadata.create_all()` no startup. Alembic (`alembic.ini`) gerencia migrações de schema em produção. Função `_ensure_paragraph_count_columns()` no startup é guarda de migração manual para coluna `paragraph_count`.
