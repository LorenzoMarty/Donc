# Testes & Qualidade — Donc ENEM

Guia único para rodar testes, lint, análise estática e cobertura no frontend e no backend.

---

## Visão geral

| Camada | Ferramentas | Comando único |
|---|---|---|
| Frontend | ESLint, `tsc`, **Vitest** (+ RTL), **Playwright** (E2E) | `npm run quality` |
| Backend | **Prospector** (+ bandit), **pytest** (+ cov), black/isort/mypy | `.\quality.ps1` |

Fluxos críticos cobertos: **perfil adaptativo** (eventos cognitivos, weaknessSignals, mastery,
recomendações, persistência), **hubs de sintoma** (7 hubs, contrato das missões), **engines
cognitivos** (feedback S/A/B/C), e o **smoke E2E** hub-first ponta a ponta.

---

## Frontend (`frontend/`)

### Instalar dependências
```bash
npm install
# uma vez, para o E2E baixar o navegador:
npm run test:e2e:install
```

### Comandos
```bash
npm run lint           # ESLint (--max-warnings=0)
npm run typecheck      # next typegen + tsc --noEmit
npm run test           # Vitest (unit + integração de stores) — modo run
npm run test:watch     # Vitest em watch
npm run test:coverage  # Vitest com cobertura (gamification + stores)
npm run test:e2e       # Playwright smoke (sobe backend+frontend isolados)
npm run quality        # lint + typecheck + test  (gate local)
```

### O que é testado (Vitest, `src/**/*.test.ts`)
- `features/gamification/adaptive.test.ts` — perfil inicial, `applyEvent` (EWMA), eventos
  cognitivos, `gradeToSeverity`, `eventsForOutcome`, `deriveHubsFromTags`, `recommendHub`,
  `dominantWeakness`, `masteryForHub`, ponte legada.
- `features/gamification/hubs.test.ts` — os 7 hubs existem com label pt-BR/descrição; toda missão
  tem `hubs`/`skills`/`possibleEvents` (contrato via `enrichGame`); categorias seguem como
  agrupamento interno.
- `features/gamification/snapshots.test.ts` — snapshots **pequenos** anti-regressão (lista de
  hubs, formato do `AdaptiveProfile`, saída da recomendação, metadados das missões, feedback).
- `stores/game-store.test.ts` — `recordCognitiveOutcome` atualiza o perfil, persistência em
  `localStorage` (`donk.games.v1`, `version: 2`), compat legada, `completeGame`.
- `games/_engines/grade.test.ts` — sistema qualitativo S/A/B/C (nunca "correto/errado").

### E2E (Playwright, `e2e/smoke.spec.ts`)
Smoke ponta a ponta: autentica via API (injeta token/cookie), abre a home **hub-first**, valida os
7 hubs e o treinador adaptativo, entra na missão recomendada, responde rodadas, vê o feedback
qualitativo, finaliza, confirma que os **sinais cognitivos foram gravados** e que o estado
**persiste após reload**. O `playwright.config.ts` sobe um backend FastAPI isolado (sqlite + seed
demo) na porta 8001 e o frontend (build de produção) na 3100 — não depende do `npm run dev` local.

---

## Backend (`backend/`)

### Instalar dependências (no venv)
```powershell
.venv\Scripts\activate
python -m pip install -r requirements-dev.txt
```

### Comandos
```powershell
python -m pytest                 # todos os testes
python -m pytest tests/unit      # só unitários
python -m pytest tests/integration  # só integração
python -m pytest --cov           # com cobertura (relatório no terminal)
python -m prospector             # análise estática + bandit (segurança)
python -m black src ; python -m isort src   # formatação
python -m mypy src               # tipagem (gradual)
.\quality.ps1                    # prospector + pytest --cov (gate local)
```

### Estrutura de testes (`backend/tests/`)
- `tests/unit/` — validação pura de schemas/regras (sem app/DB). Marcador `@pytest.mark.unit`.
- `tests/integration/` — health check e fluxos de API com `TestClient` + sqlite. Marcador
  `@pytest.mark.integration`.
- `tests/fixtures/` — payloads e credenciais demo reutilizáveis.
- Demais `tests/test_*.py` — auth, dashboard, IA, admin, correção, streak, learning (já existentes).

### Prospector
Config em `backend/.prospector.yaml`. Foca em **lógica/segurança/código morto** (pyflakes, pylint
de erro, mccabe, dodgy, bandit). Formatação fica com black/isort, por isso o ruído estilístico
(comprimento de linha, CRLF) está desligado. Saída esperada: ~0 achados, exceto o aviso
**informativo** de JWT secret placeholder em `src/config/settings.py` (lembrete para definir
`JWT_SECRET_KEY` real antes de produção).

---

## Pipeline local completo (antes de abrir PR)

```bash
# 1) Frontend
cd frontend
npm run quality          # lint + typecheck + Vitest
npm run test:e2e         # smoke E2E (precisa do navegador instalado uma vez)

# 2) Backend
cd ../backend
.\quality.ps1            # prospector + pytest --cov
```

---

## Falhas comuns

| Sintoma | Causa / correção |
|---|---|
| `Vitest cannot be imported in a CommonJS module` ao rodar Playwright | Rode o E2E **dentro de `frontend/`** (`cd frontend`). O `testMatch` é `*.spec.ts`; testes Vitest são `*.test.ts`. |
| E2E redireciona para `/login` | CORS: o backend precisa de `FRONTEND_ORIGIN` com a origem do frontend (o `playwright.config.ts` já injeta `http://localhost:3100`). |
| E2E: "Another next dev server is already running" | O E2E usa **build + `next start`** (não `next dev`), via `NEXT_DISABLE_STANDALONE=1`. Não rode o E2E apontando para o `next dev`. |
| `prospector` lento (~2 min) | Normal: roda pylint+bandit sobre `src/`. |
| `pytest` falha em `host 'db'` | É o backend de **dev** apontando para o Postgres do Docker. Os testes usam sqlite via `tests/conftest.py` — rode `python -m pytest`, não o servidor de dev. |
| Cobertura baixa em `telemetry`/`vectorstore` | Módulos opcionais (IA/observabilidade) exercitados só com chaves/serviços externos. |

---

## Critérios de aceite (gate)
- `npm run quality` verde (lint + typecheck + Vitest).
- `npm run test:e2e` smoke passa.
- `.\quality.ps1` verde (prospector sem erros críticos + pytest com cobertura).
