# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com o código neste repositório.

## Visão Geral do Projeto

**Donc ENEM** — Plataforma de preparação para Português e Redação do ENEM. Frontend: Next.js 16 (App Router). Backend: FastAPI + PostgreSQL. Pipeline de correção de redações com IA usando OpenAI via framework `agno`.

---

## Política de Trabalho do Claude

Regras 0-8 vivem no global (`~/.claude/CLAUDE.md`, seção "Política de Trabalho do Claude"). Regra 3
usa skill `claude-obsidian` neste projeto (corrigido de `knowledge-manager`, que é camada de contexto
por projeto, não registro de decisões/arquitetura).

> Nota sobre as duas camadas de CLAUDE.md: a raiz tem um `CLAUDE.md` curto que só faz
> `@.claude/CLAUDE.md` para reativar o auto-load. O arquivo real de instruções é
> **`.claude/CLAUDE.md`** — edite-o lá, não na raiz.

### Regras específicas deste projeto

- Não rodar a skill `analyze-system` (gera `SYSTEM_ANALYSIS.md` na raiz) para tarefas pequenas ou
  localizadas — só quando a tarefa exigir entender o sistema inteiro.
- Gate de verificação antes de declarar concluído: frontend → `npm run quality` (lint + typecheck
  + test, rodar de dentro de `frontend/` com caminho absoluto, o cwd não persiste entre comandos);
  backend → `.\quality.ps1`. Não rodar tsc/lint/vitest avulsos em série — o gate já cobre tudo.
- Mudança com superfície de runtime (tela, rota, pipeline): verificar no browser/chamada real
  antes de encerrar, não apenas por leitura de código.

---

## Contexto no Obsidian

O contexto que cresce (registros de tarefa, arquitetura, decisões) vive no vault **E_Mind**, em
`02 - Projetos/Donc/` (hub `Donc.md` + `Arquitetura.md` + `Decisões.md` + `Registros/`).
Gravado/atualizado pela skill `knowledge-manager` (regra 3). Para dúvidas sobre o sistema, leia este
arquivo e o contexto lá antes de explorar código (regra 2). **Não** recriar `claude/docs/` no repo.

---

## Comandos

### Frontend (`frontend/`)
```bash
npm run dev          # dev server :3000
npm run build / lint / typecheck / format
npm run test         # Vitest (unit + stores); test:coverage p/ cobertura
npm run test:e2e     # Playwright smoke (antes: test:e2e:install uma vez)
npm run quality      # lint + typecheck + test (gate local)
```

### Backend (`backend/`)
```bash
.venv\Scripts\activate          # ativar venv (Windows PowerShell)
uvicorn src.main:app --reload   # dev server :8000
celery -A src.queues.celery_app:celery_app worker --loglevel=INFO
alembic upgrade head            # migrações
pytest / pytest --cov           # testes
.\quality.ps1                   # prospector + pytest --cov (gate local)
```
> Deps de qualidade/teste: `python -m pip install -r requirements-dev.txt`. Guia: `docs/testing.md`.
> Testes em `tests/` (`unit/`, `integration/`, `fixtures/`). Config: `pyproject.toml`, `.prospector.yaml`.

### Stack completa via Docker
`docker compose up` — db (pgvector), redis, backend, worker, frontend.

---

## Arquitetura

### Fluxo de Requisições
No Docker/produção, a rota Next.js `app/api/backend/[...path]/route.ts` faz proxy de `/api/backend/*` → `http://backend:8000/api/v1/*`, repassando headers de auth e cookies — frontend nunca chama backend diretamente. Em dev local sem Docker, `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` dá acesso direto.

### Estrutura do Frontend
- `src/app/(app)/` — rotas protegidas via `AppShell` (`dashboard`, `redacao`, `redacoes`, `aulas`, `games`, `perfil`, `onboarding`, `admin`). `trilhas` existe só como página de marketing pública em `src/app/(marketing)/trilhas/` — não há `simulados`/`conquistas` no app.
- `src/app/(auth)/` — login/cadastro/recuperação; `src/app/` raiz — marketing
- `src/features/gamification/` — XP, ranks, streaks (client-side, localStorage via Zustand)
- `src/games/` — definições estáticas dos jogos; `src/games/_engines/` — engines interativos
- `src/game-pages/` — UI de sessão de jogo (`GameSession` roteia por `game.engine`)
- `src/components/shared/` — AppShell, EssayEditor, LessonPlayer, charts
- `src/components/ui/` — primitivos shadcn/radix; formulários usam `Input`/`Textarea`/`Select`/`Field`/`Modal` compartilhados (nunca `<input>` cru)
- `src/lib/http-client.ts` — `apiFetch<T>()` (Bearer token + desempacota `ApiEnvelope<T>`); `src/services/api.ts` re-exporta tudo

Detalhes (sidebar, primitivos de formulário, categorias de jogos): registro `2026-06-11-enxugamento-claude-md` no Obsidian (`02 - Projetos/Donc/Registros/`).

### Interação multi-input (mouse, touch, caneta/stylus)
Padrões obrigatórios pra qualquer manipulação direta nova (drag, seleção, gestos) — evita reintroduzir
os problemas mapeados na auditoria de UX multi-input (2026-08-16):

- **Pointer Events, nunca mouse/touch separados.** `onPointerDown/Move/Up/Cancel` cobre mouse, touch e
  caneta com o mesmo código. Nunca adicionar `onMouseUp`/`onTouchStart` em paralelo no mesmo fluxo de
  manipulação direta. Referências corretas no código: Dock arrastável e marca-texto em
  `components/writing/essay-editor.tsx` (`handleDragPointerDown/Move/Up`, `setPointerCapture`) e
  `hooks/useMarkOnSelection.ts` (`onPointerUp` cobre Apple Pencil/Safari, que não dispara `mouseup`).
- **Drag-and-drop**: sensors do dnd-kit centralizados em `games/_engines/useDragSensors.ts` — nunca
  configurar `PointerSensor`/`KeyboardSensor` direto num engine novo, sempre importar esse hook. Área
  de arraste é o card/item inteiro (decisão de produto, 2026-08-18 — não handle isolado): aplique
  `attributes`+`listeners` de `useSortable`/`useDraggable` direto no elemento raiz do item, com
  `touch-action: none` (`touch-none`) nele, e só spread os listeners quando o item não estiver
  `disabled`. Trade-off aceito: em listas verticais isso conflita com rolar a página no touch/tablet
  (`activationConstraint.distance` do sensor reduz mas não elimina o atrito).
- **Alvo de toque mínimo 44×44** (`h-11 w-11` no Tailwind) em qualquer controle voltado ao aluno.
- **Affordance nunca só em `:hover`** — todo indicador funcional relevante precisa de estado
  sempre-visível (ou opacidade base) + `group-focus-visible`, hover só intensifica.
- **`useCoarsePointer()`/`useHoverCapable()`** (`hooks/useMediaQuery.ts`) — única fonte de verdade pra
  decisões de comportamento por tipo de input (ex.: pular `autoFocus` em touch pra não abrir teclado
  virtual antes da hora). Nunca decidir isso por largura de tela.
- **Modal vira bottom sheet abaixo de `sm`** automaticamente (`components/ui/modal.tsx`) — mesmo
  componente, não criar uma variante mobile separada por tela.
- **Timers de jogo**: folga fixa `games/_engines/timing.ts#INPUT_GRACE_MS` entre o cronômetro chegar a
  zero e o timeout valer — absorve latência de input de touch/caneta sem mudar a duração exibida.

### Autenticação
Token em `localStorage` (`access_token`) + cookie (SSR/middleware). `AuthContext` + `useAuth()` (com `refresh()`) em `providers/app-providers.tsx`. Backend: JWT (HS256) via `python-jose`; `get_current_user` lê header ou cookie; `require_admin` verifica `UserRole.ADMIN`. `AppError` usa códigos como `not_authenticated`, `invalid_token`. Conta: `PATCH /auth/me` (editar nome) e `POST /auth/change-password` (senha atual + nova; erros `invalid_current_password`/`password_unchanged`). `UserRead` expõe `created_at`.

### Página de Perfil (`/perfil`)
Híbrido "Raio-X do escritor" + conta. Diagnóstico: notas por competência + evolução (charts de `components/shared/charts.tsx`), pontos fracos, erros recorrentes, recomendações e repertórios via `GET /ai/learning-profile` (expõe `StudentLearningProfile`; vazio com `has_data=false` para aluno sem redação) fundidos com `GET /dashboard` pelo transformador puro `features/profile/writer-xray.ts`. Grid dos 7 hubs cognitivos (`useGameStore.adaptive`). Conta editável (nome/senha via Modais). Aparência mantida. NÃO duplica o dashboard (sem lista de tarefas/metas).

### Estrutura do Backend
Padrão **Routes → Services → Repositories**:
- `src/routes/` — routers FastAPI (auth, dashboard, lessons, exercises, essays, exams, ai, admin, games)
- `src/services/` — lógica de negócio (EssayService, AuthService, AIService, GameService, DashboardService, ExamService, ExerciseService, LessonService, ProgressionService, StreakService, `ai_telemetry`, `seed`)
- `src/repositories/` — queries SQLAlchemy; `src/models/` — ORM; `src/schemas/` — Pydantic

Todas respostas usam `ApiEnvelope<T>`: `{ success, message, data, error? }` via `src/schemas/common.py`.

### Pipeline de IA (Correção de Redações)
Assíncrona via Celery (fallback síncrono no próprio request quando Redis/worker não respondem —
ver `enqueue_correct_essay()` em `src/queues/jobs.py`):
1. Frontend faz polling em `/api/v1/essays/{id}/job`
2. Task `correct_essay` chama `CorrectionOrchestratorWorkflow.correct()` (`src/workflows/correction.py`)
3. Pipeline v2 real: `PreProcessor` → `EliminationGateAgent` (corte precoce em nota zero) → 6
   analisadores em paralelo via `ThreadPoolExecutor` (`ThemeAnalyzerAgent`, `ThesisAnalyzerAgent`,
   `RepertoireAnalyzerV2Agent`, `ArgumentationAnalyzerAgent`, `InterventionAnalyzerAgent`,
   `GrammarAnalyzerV2Agent`) → `CompetencyScorer` → `ScoreAuditor` → `OutputMapper`
4. Agentes estendem `AgnoAgentRunner` (`src/agents/base.py`), framework `agno` + OpenAI
5. Sem `OPENAI_API_KEY` ou falha do agno → `FallbackCorrectionProvider` (`src/agents/correction/fallback.py`,
   degradação graciosa)
6. Após correção, `update_learning_profile()` atualiza `StudentLearningProfile`

> Nota histórica: um pipeline v1 (`ThesisAgent`/`GrammarAgent`/`RepertoireAgent`/`ENEMCompetencyAgent`/
> `EssayCorrectionAgent`, orquestrado por `agents/orchestrator`) existiu antes do v2 e foi removido do
> código por estar sem uso — se você encontrar essa descrição em documentação antiga, está desatualizada.

### Observabilidade de IA (Langfuse tracing)
Langfuse SDK v4 + OpenLIT (integração nativa do agno), inicializado por `configure_ai_telemetry()` em `telemetry/langfuse.py`. Sem `LANGFUSE_*`, vira no-op. Cada correção = um trace (`essay_correction`) com os agentes do pipeline v2 como spans-filhos; PII protegida (`capture_message_content=False` + `mask`). Detalhes (gotcha do `tracer=`, propagação OTel, flush): registros `2026-06-10-langfuse-tracing` e `2026-06-11-enxugamento-claude-md` no Obsidian.

### Custos de IA (telemetria)
Cada chamada grava `AIInteractionLog` (`ai_interaction_logs`) com `model`, tokens e `cost_micro_usd` (micro-USD; tabela de preços em `src/config/ai_pricing.py`, fonte única `build_interaction_log()` em `services/ai_telemetry.py`). Conversão R$ via PTAX/BCB (`services/fx_rate.py`). Painel admin agrega por workflow/modelo/dia/top-users. Detalhes: registro `2026-06-10-custos-ia-brl` no Obsidian.

### Jogos (Client-side)
XP, streaks e progresso **totalmente client-side** — `useGameStore` (Zustand, localStorage `donk.games.v1`). Definições estáticas em `src/games/`; campo `engine` roteia no `GameSession` (13 engines: quiz, timed-rush, classify, order, fill-blank, sequence, text-surgery, essay-collapse, artificiality, argument-escalation, duel, corrector, survival).

> XP/nível de **conta** (`User.xp`/`User.level` no backend) foi removido temporariamente (rollback de
> gamificação, não substituição) — ver seção seguinte. O XP client-side do `useGameStore` **não foi
> afetado** por essa remoção; são sistemas independentes. `POST /games/complete` continua existindo
> (o front chama fire-and-forget) mas não persiste mais XP de conta, só confirma o recebimento.

Fonte cognitiva principal: `useGameStore.adaptive` (EWMA por **7 hubs**; registro `HUBS` em `features/gamification/symptoms.ts`, núcleo puro em `adaptive.ts`). Engines emitem via `recordCognitiveOutcome`; nota qualitativa S/A/B/C (nunca "% de acerto"). Navegação hub-first: "Atividades" → `GamesHub` (7 hubs) → `games/treino/[symptomId]`. `useGameStore.skills` é legado (só compat). IA de reescrita: `POST /ai/evaluate-rewrite` (fallback heurístico).

Detalhe completo (engines, payloads, contrato de missão, como criar missão nova): registro `2026-06-11-enxugamento-claude-md` + `Arquitetura.md` no Obsidian.

### Variáveis de Ambiente
| Variável | Finalidade |
|---|---|
| `DATABASE_URL` | PostgreSQL (normaliza prefixo `postgres://`) |
| `JWT_SECRET_KEY` | Assinatura JWT |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Features de IA (app funciona sem); modelo padrão `gpt-5.5` |
| `REDIS_URL` | Broker do Celery |
| `NEXT_PUBLIC_API_URL` | Base da API no frontend (`/api/backend` no Docker, direta em dev) |
| `INTERNAL_API_URL` | Destino do proxy server-side (padrão `http://127.0.0.1:8000/api/v1`) |
| `SEED_DEMO_DATA` | Seed demo no startup (padrão `true`) |
| `ENABLE_PGVECTOR` | Extensão vector + seed da base de conhecimento |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_HOST` | Tracing Langfuse (off se ausentes) |
| `USD_BRL_FALLBACK_RATE` / `USD_BRL_RATE_TTL_HOURS` | Cotação USD→BRL quando PTAX falha (padrão `5.40`) / TTL do cache (padrão `6`) |
| `OPENAI_FALLBACK_MODEL` | Modelo usado se `OPENAI_MODEL` falhar (padrão `gpt-4o-mini`) |
| `OPENAI_IMAGE_MODEL` | Modelo de geração de imagem (padrão `gpt-image-1`) |
| `OPENAI_EMBEDDING_MODEL` / `OPENAI_EMBEDDING_DIMENSIONS` | Modelo/dimensões de embedding para a base pgvector (padrão `text-embedding-3-small` / `1536`) |
| `AI_SYNC_TIMEOUT_SECONDS` | Nome legado: timeout de toda chamada OpenAI (não só do fallback síncrono), padrão `45` |
| `ENABLE_AGENTOS` | Liga a integração AgentOS do framework `agno` (padrão `false`) |
| `AI_COST_CENTS_PER_1K_TOKENS` | Legado: fallback de custo pra linhas antigas sem `cost_micro_usd` (padrão `0.5`) |
| `AI_RATE_LIMIT_PER_MINUTE` | Limite de chamadas de IA por usuário por minuto (padrão `20`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Validade do JWT de acesso (padrão 7 dias) |
| `SEED_ADMIN_PASSWORD` | Senha do admin de demonstração no seed (padrão só para dev local — sempre sobrescreva fora de dev) |

### XP e progressão de conta (removidos temporariamente)
`User.xp`/`User.level`, `LearningReward` e `RankService`/dificuldade adaptativa por xp foram removidos
do backend (models, schemas, services, rotas) — rollback de gamificação, não substituição por outro
sistema. Redações, simulados, exercícios, aulas e jogos continuam funcionando normalmente sem XP;
exercícios/atividades não são mais filtrados por dificuldade (todas aparecem). Isso **não afeta** o XP
client-side de `useGameStore` (seção "Jogos" acima), que é um sistema separado e continua ativo.

### Migrações do Banco
Alembic é a **única** estratégia de evolução de schema em produção (`alembic upgrade head`, rodado
explicitamente no deploy — precisa ser um passo real do pipeline). `Base.metadata.create_all()` no
startup (`src/main.py`) só roda fora de produção (`settings.environment != "production"`), como
conveniência para dev local/testes sem passo de migração manual. Não há mais guarda manual de coluna
(`_ensure_runtime_columns`) — todo o schema, incluindo os campos de `ai_interaction_logs` que só
existiam via guarda, está coberto por migrations (`alembic/versions/0001` a `0009`).
