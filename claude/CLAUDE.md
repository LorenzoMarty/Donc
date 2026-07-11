# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com o código neste repositório.

## Visão Geral do Projeto

**Donc ENEM** — Plataforma de preparação para Português e Redação do ENEM. Frontend: Next.js 16 (App Router). Backend: FastAPI + PostgreSQL. Pipeline de correção de redações com IA usando OpenAI via framework `agno`.

---

## Política de Trabalho do Claude

<!-- regras-claude v2026-06-12 -->
Regras obrigatórias para trabalhar nos projetos:

0. Idioma — usuário pt-BR; código/docs do projeto em inglês.
1. Análise mínima — leia só o relevante à tarefa.
2. Doc antes de código — dúvida? Leia o `claude/CLAUDE.md` e o contexto do projeto no Obsidian
   (ponteiro em `## Contexto no Obsidian`) primeiro.
   Porquê: doc condensa decisões que o código não explica; explorar código custa 10x mais.
3. Doc sincronizada — ao concluir, registre o contexto no Obsidian (skill `claude-obsidian`) e
   atualize o que for impactado.
4. Escopo fechado — só o pedido; achado importante vira observação, não refactor.
5. Sem dependência nova sem justificar.
6. Sem presunção — doc incompleta + código não confirma = declare incerteza.
7. Sem mudança silenciosa — fluxo/API/auth/persistência: avise explicitamente.
8. Alerte antes de destruir — migração/reset/limpeza: impacto antes de executar.

> Nota sobre as duas camadas de CLAUDE.md: a raiz tem um `CLAUDE.md` curto que só faz
> `@claude/CLAUDE.md` para reativar o auto-load. O arquivo real de instruções é
> **`claude/CLAUDE.md`** — edite-o lá, não na raiz.
<!-- /regras-claude -->

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
`02 - Projetos/Donc ENEM/` (hub `Donc ENEM.md` + `Arquitetura.md` + `Decisões.md` + `Registros/`).
Gravado/atualizado pela skill `claude-obsidian` (regra 3). Para dúvidas sobre o sistema, leia este
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
- `src/app/(app)/` — rotas protegidas via `AppShell` (`dashboard`, `redacao`, `redacoes`, `aulas`, `games`, `simulados`, `conquistas`, `trilhas`, `perfil`, `onboarding`, `admin`)
- `src/app/(auth)/` — login/cadastro/recuperação; `src/app/` raiz — marketing
- `src/features/gamification/` — XP, ranks, streaks (client-side, localStorage via Zustand)
- `src/games/` — definições estáticas dos jogos; `src/games/_engines/` — engines interativos
- `src/game-pages/` — UI de sessão de jogo (`GameSession` roteia por `game.engine`)
- `src/components/shared/` — AppShell, EssayEditor, LessonPlayer, charts
- `src/components/ui/` — primitivos shadcn/radix; formulários usam `Input`/`Textarea`/`Select`/`Field`/`Modal` compartilhados (nunca `<input>` cru)
- `src/lib/http-client.ts` — `apiFetch<T>()` (Bearer token + desempacota `ApiEnvelope<T>`); `src/services/api.ts` re-exporta tudo

Detalhes (sidebar, primitivos de formulário, categorias de jogos): registro `2026-06-11-enxugamento-claude-md` no Obsidian (`02 - Projetos/Donc ENEM/Registros/`).

### Autenticação
Token em `localStorage` (`access_token`) + cookie (SSR/middleware). `AuthContext` + `useAuth()` (com `refresh()`) em `providers/app-providers.tsx`. Backend: JWT (HS256) via `python-jose`; `get_current_user` lê header ou cookie; `require_admin` verifica `UserRole.ADMIN`. `AppError` usa códigos como `not_authenticated`, `invalid_token`. Conta: `PATCH /auth/me` (editar nome) e `POST /auth/change-password` (senha atual + nova; erros `invalid_current_password`/`password_unchanged`). `UserRead` expõe `created_at`.

### Página de Perfil (`/perfil`)
Híbrido "Raio-X do escritor" + conta. Diagnóstico: notas por competência + evolução (charts de `components/shared/charts.tsx`), pontos fracos, erros recorrentes, recomendações e repertórios via `GET /ai/learning-profile` (expõe `StudentLearningProfile`; vazio com `has_data=false` para aluno sem redação) fundidos com `GET /dashboard` pelo transformador puro `features/profile/writer-xray.ts`. Grid dos 7 hubs cognitivos (`useGameStore.adaptive`). Conta editável (nome/senha via Modais). Aparência mantida. NÃO duplica o dashboard (sem lista de tarefas/metas).

### Estrutura do Backend
Padrão **Routes → Services → Repositories**:
- `src/routes/` — routers FastAPI (auth, dashboard, lessons, exercises, essays, exams, ai, admin, games)
- `src/services/` — lógica de negócio (EssayService, AuthService, AIService, GameService, DashboardService, ExamService, ExerciseService, LessonService, RankService, StreakService, `ai_telemetry`, `seed`)
- `src/repositories/` — queries SQLAlchemy; `src/models/` — ORM; `src/schemas/` — Pydantic

Todas respostas usam `ApiEnvelope<T>`: `{ success, message, data, error? }` via `src/schemas/common.py`.

### Pipeline de IA (Correção de Redações)
Assíncrona via Celery:
1. Frontend faz polling em `/api/v1/essays/{id}/job`
2. Task `correct_essay` chama `CorrectionOrchestratorWorkflow.correct()`
3. 5 agentes em sequência: `ThesisAgent` → `GrammarAgent` → `RepertoireAgent` → `ENEMCompetencyAgent` → `EssayCorrectionAgent`
4. Todos estendem `AgnoAgentRunner` (`src/agents/base.py`), framework `agno` + OpenAI
5. Sem `OPENAI_API_KEY` ou falha do agno → valor `fallback` configurado (degradação graciosa)
6. Após correção, `update_learning_profile()` atualiza `StudentLearningProfile`

### Observabilidade de IA (Langfuse tracing)
Langfuse SDK v4 + OpenLIT (integração nativa do agno), inicializado por `configure_ai_telemetry()` em `telemetry/langfuse.py`. Sem `LANGFUSE_*`, vira no-op. Cada correção = um trace (`essay_correction`) com os 5 agentes como spans-filhos; PII protegida (`capture_message_content=False` + `mask`). Detalhes (gotcha do `tracer=`, propagação OTel, flush): registros `2026-06-10-langfuse-tracing` e `2026-06-11-enxugamento-claude-md` no Obsidian.

### Custos de IA (telemetria)
Cada chamada grava `AIInteractionLog` (`ai_interaction_logs`) com `model`, tokens e `cost_micro_usd` (micro-USD; tabela de preços em `src/config/ai_pricing.py`, fonte única `build_interaction_log()` em `services/ai_telemetry.py`). Conversão R$ via PTAX/BCB (`services/fx_rate.py`). Painel admin agrega por workflow/modelo/dia/top-users. Detalhes: registro `2026-06-10-custos-ia-brl` no Obsidian.

### Jogos (Client-side)
XP, streaks e progresso **totalmente client-side** — `useGameStore` (Zustand, localStorage `donk.games.v1`). Definições estáticas em `src/games/`; campo `engine` roteia no `GameSession` (13 engines: quiz, timed-rush, classify, order, fill-blank, sequence, text-surgery, essay-collapse, artificiality, argument-escalation, duel, corrector, survival).

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

### Migrações do Banco
`Base.metadata.create_all()` no startup cria tabelas; Alembic gerencia schema em produção. `_ensure_paragraph_count_columns()` no startup é guarda manual da coluna `paragraph_count`.
