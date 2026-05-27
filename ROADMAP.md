# ROADMAP.md

Planejamento de refatorações, correções e evoluções do projeto Donc ENEM.

---

## 🔴 Crítico (Segurança / Bugs de Produção)

### [SEC-1] Remover segredos do repositório ✅
- `JWT_SECRET_KEY=change-this-secret-before-production` está no `.env` versionado
- `OPENAI_API_KEY=` vazio expõe estrutura de variáveis
- **Fix:** adicionar `.env` ao `.gitignore`, criar `.env.example` com placeholders

### [SEC-2] Mover `access_token` para cookie `httpOnly`
- Atualmente: `localStorage.setItem("access_token", token)` em `providers/app-providers.tsx`
- `localStorage` acessível via XSS — qualquer script injetado rouba o token
- **Fix:** backend emite cookie `httpOnly; Secure; SameSite=Strict` no login. Frontend abandona leitura do localStorage para o token. Manter cookie duplicado atual apenas durante transição.

### [SEC-3] `SEED_DEMO_DATA=true` como padrão ✅
- Cria usuários/conteúdo demo em toda inicialização em produção
- **Fix:** mudar padrão para `false` em `settings.py`, ativar explicitamente só em dev

---

## 🟠 Alta Prioridade (Arquitetura / Bugs Funcionais)

### [ARCH-1] Dois fontes de verdade para XP ✅
- `User.xp` no backend e `useGameStore.xp` no localStorage são **independentes**
- Dashboard mostra XP do backend; jogos mostram XP local — valores divergem
- **Fix:**
  1. Criar endpoint `POST /api/v1/games/complete` que recebe `{ game_id, score, accuracy, duration_seconds }` e retorna XP ganho + novo total
  2. `useGameStore.completeGame()` chama endpoint ao terminar sessão (fire-and-forget se offline)
  3. `User.xp` passa a ser fonte única de verdade; store local vira cache otimista

### [ARCH-2] Pipeline de correção sequencial desnecessário ✅
- `ThesisAgent`, `GrammarAgent`, `RepertoireAgent` rodam um por vez mas são **independentes**
- Só `ENEMCompetencyAgent` depende dos três anteriores
- **Fix:** paralelizar os 3 primeiros com `concurrent.futures.ThreadPoolExecutor` em `CorrectionOrchestratorWorkflow.correct()`. Redução estimada ~60% na latência total

### [ARCH-3] Migração manual `_ensure_paragraph_count_columns()` no startup ✅
- Função em `main.py` roda `inspect(engine)` a cada inicialização para checar colunas
- Adiciona latência no startup e é código de migração disfarçado
- **Fix:** criar Alembic migration adequada, remover a função do lifespan

### [ARCH-4] Perda de progresso dos jogos ao limpar localStorage ✅
- Todo histórico de jogos, XP e streak some se usuário limpar browser ou trocar dispositivo
- Depende de [ARCH-1] para solução completa
- **Fix parcial:** exportar/importar progresso como JSON enquanto [ARCH-1] não está pronto

---

## 🟡 Média Prioridade (UX / Performance)

### [UX-1] Polling de correção → tempo real
- Frontend faz polling em `/essays/{id}/job` com intervalo fixo
- Usuário não sabe qual agente está rodando
- **Fix:** SSE (`text/event-stream`) no endpoint de status, emitindo eventos por agente: `{ agent: "GrammarAgent", status: "running" }`. Frontend exibe progresso por etapa.

### [UX-2] Feedback de erros da API inconsistente ✅
- `ApiClientError` captura `message`/`detail`/`code` mas UI em vários lugares só mostra toast genérico
- **Fix:** padronizar handler de erro no `http-client.ts` para mapear `code` → mensagem amigável em PT-BR

### [PERF-1] `inspect(engine)` no startup (ver [ARCH-3]) ✅
- Mesmo depois de remover `_ensure_paragraph_count_columns`, revisar outros acessos síncronos no lifespan

---

## 🟢 Baixa Prioridade (Qualidade / DX)

### [TEST-1] Cobertura de testes zerada ✅
- `pytest` instalado mas sem testes visíveis além do setup
- **Priorizar:**
  1. `CorrectionOrchestratorWorkflow` — lógica mais crítica, com mock dos agentes
  2. Rotas de auth (`POST /auth/login`, `POST /auth/register`)
  3. `apiFetch` + unwrap de `ApiEnvelope` no frontend (jest/vitest)

### [DX-1] Sem validação de email no cadastro
- `POST /auth/register` aceita qualquer string como email (Pydantic valida formato mas não envia verificação)
- **Fix:** enviar email de verificação via serviço transacional (Resend/SendGrid). Bloquear acesso a rotas protegidas até verificação.

### [DX-2] `openai_model: str = "gpt-5.5"` hardcoded em settings ✅
- Modelo pode mudar; fallback para modelo mais barato em caso de erro de quota não existe
- **Fix:** adicionar `openai_fallback_model` nas settings, tentar fallback em `AgnoAgentRunner._run_structured` se receber erro 429/quota

### [DX-3] Logs de agentes sem nível estruturado ✅
- `AIInteractionLog` salva `status: "success"|"error"` e `latency_ms` mas não salva tokens usados (campo `token_count=0` hardcoded)
- **Fix:** extrair `usage.total_tokens` da resposta do agno/OpenAI e persistir. Habilita análise de custo real.

### [REFACTOR-1] `src/services/api.ts` é só re-export ✅ (avaliado: manter)
- Arquivo só faz re-export de outros módulos — não adiciona abstração
- **Decisão:** 12 consumers importam deste barrel; remover exigiria atualizar todos. Custo não justifica. Manter.

---

## 📦 Bibliotecas Recomendadas

| Biblioteca | Finalidade | Status |
|---|---|---|
| `sonner` | Toasts modernos com fila, dismiss, promise support. Substitui `toast-context.tsx` manual. | ✅ Instalado + `<Toaster />` em providers |
| `@radix-ui/react-tooltip` | Tooltips acessíveis. Usado nas anotações inline da correção (hover). | ✅ Instalado + `<TooltipProvider />` em providers |
| `@tanstack/react-query` | Cache de dados da API, refetch automático, loading/error states declarativos. Substitui `useEffect + apiFetch` em todas as páginas. | 🔜 Planejado |
| `vaul` | Drawer mobile nativo para menus/painéis em telas pequenas. | 🔜 Planejado |
| `cmdk` | Command palette (Cmd+K) para navegação rápida entre redações, aulas e jogos. | 🔜 Planejado |

---

## 📋 Backlog (Funcionalidades Novas)

- [ ] **Reescrita assistida:** após correção, agente sugere parágrafo reescrito linha a linha
- [ ] **Histórico de versões visual:** diff entre versões da redação (já existe `EssayVersion` no backend)
- [ ] **Ranking entre usuários:** tabela de líderes por XP (dados já existem em `User.xp`)
- [ ] **Modo offline:** service worker para jogos funcionarem sem internet
- [ ] **Notificações de streak:** lembrete via browser notification se usuário não jogou no dia

---

## Ordem de Execução Sugerida

```
SEC-1 → SEC-3 → ARCH-3 → TEST-1 (auth) → ARCH-1 → SEC-2 → ARCH-2 → UX-1 → resto
```

SEC primeiro porque não quebra nada. ARCH-3 antes de ARCH-1 limpa débito sem risco. ARCH-2 depois de ter testes.
