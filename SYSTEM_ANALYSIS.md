# Análise do Sistema — Donc ENEM

> Documento gerado em 28/05/2026. Baseado em análise de codebase (frontend + backend).
> Servidor de desenvolvimento não foi iniciado durante esta análise — a análise visual é derivada dos componentes React encontrados no código-fonte.

---

## 1. Visão Geral do Sistema

### Objetivo principal
O **Donc ENEM** é uma plataforma de preparação para o ENEM focada em Português e Redação. O sistema combina aulas estruturadas, correção de redação por IA, jogos de prática rápida, simulados cronometrados e um painel de evolução pessoal.

### Problema que resolve
Estudantes do ENEM têm dificuldade em manter uma rotina consistente de estudo de Português e Redação, e não têm acesso fácil a correção de qualidade com feedback detalhado por competência. O sistema resolve isso combinando gamificação (XP, ranks, streaks), IA para correção e uma trilha de conteúdo organizada.

### Público-alvo
Estudantes do ensino médio e vestibulandos que se preparam para o ENEM, com ênfase nas provas de Linguagens e Redação. Há também um perfil de **administrador** com acesso ao painel de métricas e telemetria de IA.

### Fluxo principal de uso
1. Usuário acessa a landing page e cria uma conta
2. É direcionado ao onboarding e depois ao painel (`/dashboard`)
3. Consulta as métricas (streak, notas, domínio por competência) e a recomendação de próximo passo
4. Assiste aulas, pratica nos jogos e/ou escreve uma redação
5. Envia a redação para correção por IA → recebe nota por competência (C1–C5) e anotações inline no texto
6. Revisa o histórico de redações e evolução ao longo do tempo

### Stack técnica
| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/radix UI, Framer Motion |
| Backend | FastAPI (Python), PostgreSQL, SQLAlchemy ORM |
| Fila assíncrona | Celery + Redis |
| IA | OpenAI via framework `agno` (5 agentes sequenciais) |
| Autenticação | JWT (HS256), armazenado em localStorage + cookie |
| Gamificação (jogos) | Client-side, Zustand com persistência em localStorage |

---

## 2. Estrutura das Páginas e Navegação

### Páginas públicas (marketing)

| Página / Rota | Função | Componentes Principais | Acesso |
|---|---|---|---|
| `/` | Landing page principal | Hero com imagem, features, games demo, pricing preview, CTA | Público |
| `/pricing` | Planos e preços | 3 cards de plano (R$29 / R$59 / R$129), CTA para cadastro | Público |
| `/sobre` | Página institucional | Texto de missão, 3 pilares (Criatividade, Inteligência, Foco) | Público |
| `/plataforma` | Página de apresentação da plataforma | Necessita validação — arquivo presente mas não lido em detalhe | Público |
| `/trilhas` | Apresentação das trilhas de estudo | Necessita validação — arquivo presente mas não lido em detalhe | Público |

### Páginas de autenticação

| Página / Rota | Função | Componentes Principais | Acesso |
|---|---|---|---|
| `/login` | Login com email e senha | Formulário, link para cadastro e recuperação | Não-autenticado |
| `/cadastro` | Criação de conta | Formulário de registro | Não-autenticado |
| `/recuperar-senha` | Recuperação de senha | Formulário de email | Não-autenticado |

### Páginas da área logada (app)

| Página / Rota | Função | Componentes Principais | Acesso |
|---|---|---|---|
| `/dashboard` | Painel central do usuário | 4 métricas, mapa de domínio, próximo passo, atividades recentes, erros recorrentes | Autenticado |
| `/aulas` | Listagem de cursos e módulos | CoursePanel, ModuleAccordion, LessonRow com progresso e XP | Autenticado |
| `/aulas/[id]` | Aula individual | LessonPlayer, resumo da aula, exercícios, XP ao completar | Autenticado |
| `/games` | Hub dos jogos de prática | GamesHub — categorias com cards | Autenticado |
| `/games/[categorySlug]` | Categoria de jogos | CategoryPage — lista de jogos da categoria | Autenticado |
| `/games/[categorySlug]/[gameId]` | Sessão de um jogo específico | GameSession — mecânica interativa do jogo | Autenticado |
| `/redacao` | Editor e análise de redação | EssayEditor, ThemePicker, CorrectionPanel, EssayReadPanel com anotações inline | Autenticado |
| `/redacoes` | Histórico de redações | Lista com filtro, busca, gráfico de evolução, gráfico de competências | Autenticado |
| `/simulados` | Simulado cronometrado | Lista de exames, player de questões, painel de resumo com timer | Autenticado |
| `/onboarding` | Tela de boas-vindas pós-cadastro | 4 cards explicativos, barra de progresso (hardcoded em 42%) | Autenticado |
| `/perfil` | Perfil do usuário | Avatar, nome, email, XP, rank, streak, barra de progresso para próximo rank | Autenticado |
| `/admin` | Painel administrativo | 4 tabs: Visão Geral, Telemetria IA, Usuários, Jogos IA | Admin |

### Navegação e estrutura de layout

**Desktop:** sidebar lateral fixa (288px expandida / 80px colapsada), com ícones animados e texto. Itens: Painel, Aulas, Jogos, Redacao, Historico. Avatar do usuário com nome e rank no rodapé. Botão de logout.

**Mobile:** header fixo com botão de menu → drawer animado deslizante da esquerda.

**Marketing:** layout separado (`MarketingShell`) com header de navegação próprio.

**Rotas protegidas:** todas as rotas em `(app)/` exigem autenticação. O `AppShell` verifica o estado via `AuthContext`. Se `user.role === "admin"`, adiciona o item "Administracao" na sidebar.

**Guard de autenticação:** `AuthContext` em `providers/app-providers.tsx` — ao montar, lê token do localStorage e chama `/auth/me`. Se inválido, redireciona para `/login`.

---

## 3. Informações Exibidas pelo Sistema

### Dashboard (`/dashboard`)
- **4 métricas principais**: Dias em sequência, Melhor nota de redação, Aulas assistidas (com % do percurso), Redações enviadas (com média)
- **Mapa de domínio**: 5 competências ENEM (C1–C5) com nome, label, nota atual (0–200) e barra de progresso
- **Próximo passo recomendado**: card dinâmico — sugere enviar primeira redação (se nenhuma foi enviada), fortalecer competência mais fraca, ou revisar histórico
- **Sugestão de aulas**: até 3 aulas com progresso individual
- **Atividades recentes**: até 4 itens combinando aulas assistidas, simulados feitos e última redação
- **Erros recorrentes**: até 4 padrões de erro identificados pela IA nas correções

**O que falta**: o dashboard não mostra tendência de notas ao longo do tempo (gráfico de evolução), que só aparece em `/redacoes`. Não exibe quantas redações corrigidas existem nem a meta semanal.

### Redação (`/redacao`)
- **Editor**: contador de palavras e parágrafos em tempo real, indicador de salvamento automático
- **Análise**: nota total (0–1000), 5 metros de competência (C1–C5, cada um 0–200), feedback principal (insight), anotações inline no texto classificadas por tipo (erro/acerto) e competência
- **Lista de versões**: badge de status, score, data, botões Ler e Reescrever

**O que falta**: não há explicação clara de o que cada competência significa na tela de análise. Um estudante pode receber "C3 = 80" sem entender o que C3 representa. Também não há comparação com redação anterior na mesma tela.

### Histórico de redações (`/redacoes`)
- Média geral, competência mais fraca, última atividade
- Gráfico de linha de evolução das notas
- Gráfico de barras das competências da última correção
- Lista filtrada (Todas / Rascunhos / Corrigidas) com busca por texto
- Card por redação: status, nota, data, parágrafo/linhas, feedback resumido

### Aulas (`/aulas`)
- Cursos com título, descrição, progresso %, rank do usuário, dificuldade dos exercícios
- Módulos com XP bônus, progresso e badge "concluído"
- Aulas com duração em minutos, ícone de concluído/play, XP individual

### Jogos (`/games`)
- 5 categorias: conectivos, gramática, estrutura, tese, repertório
- Cada categoria: múltiplos jogos
- Sessão de jogo: mecânica interativa (ex: selecionar conectivo correto, montar estrutura textual)
- HUD da sessão: progresso, score, streak de acertos

**O que falta**: não é exibido ao usuário quantas vezes ele já jogou cada jogo, nem qual sua melhor pontuação histórica no card de seleção.

### Simulados (`/simulados`)
- Lista de exames com título, descrição, área, duração
- Durante o simulado: questões com opções, timer visível no header
- Resultado: % de acertos, lista de competências com barra de progresso

**O que falta**: não é mostrado quais questões o usuário errou nem a resposta correta após o simulado. Sem explicações.

### Perfil (`/perfil`)
- Nome, email, iniciais como avatar
- XP total, rank atual, dias de sequência
- Barra de progressão para o próximo rank com XP faltante

**O que falta**: nenhuma configuração de conta (alterar senha, email, preferências). Sem histórico de conquistas. Sem meta diária visível.

### Admin (`/admin`)
- **Visão Geral**: métricas gerais da plataforma + atividade dos últimos 7 dias
- **Telemetria IA**: custos de chamadas OpenAI por período configurável (30 dias padrão), número de correções
- **Usuários**: lista completa de usuários
- **Jogos IA**: jogos gerados por IA, revisão e aprovação

---

## 4. Workflow e Experiência de Uso

### Fluxo 1 — Cadastro e entrada
1. Landing page → botão CTA → `/cadastro`
2. Formulário de registro → JWT retornado → salvo em localStorage + cookie
3. Redirecionamento para `/onboarding`
4. Onboarding mostra 4 cards explicativos estáticos
5. Botão "Abrir painel" → `/dashboard`

**Problemas:**
- O onboarding é completamente estático — a barra de "Progresso inicial" está hardcoded em 42%. Não há ação real que o usuário possa completar para "avançar" no onboarding
- Não há tour interativo nem configuração de perfil (nome, objetivo, nível atual)
- Após o onboarding, o usuário cai no dashboard com todos os dados zerados e sem orientação clara sobre o que fazer

### Fluxo 2 — Escrever e corrigir uma redação (fluxo principal)
1. Acessar `/redacao`
2. Tela inicial: ThemePicker com lista de temas ENEM
3. Selecionar tema → botão "Nova redação" → editor abre
4. Escrever (autosave acontece a cada 900ms após o início)
5. Clicar "Enviar para correção" (mínimo 80 palavras)
6. Tela de espera animada com spinner
7. Redirecionamento automático para a análise
8. Ver nota, competências e anotações inline

**Pontos positivos:**
- Autosave silencioso e não intrusivo
- Tela de espera comunica o que está acontecendo
- Anotações inline são um diferencial real

**Problemas:**
- Se o usuário sai da tela durante a correção (fecha o browser, navega), perde o acompanhamento do resultado
- A correção é **síncrona no frontend** (o `submit()` aguarda resposta) mas usa Celery assíncrono no backend — se o backend demorar mais que ~30s, a requisição pode falhar
- Não há polling de status (`/essays/{id}/job` existe no backend mas não é usado no frontend atual)
- O ThemePicker não exibe o enunciado completo — só título e contexto resumido. Textos de apoio (`supporting_texts`) existem no modelo mas não aparecem na UI

### Fluxo 3 — Jogar um jogo de prática
1. `/games` → escolher categoria → ver lista de jogos
2. Clicar em um jogo → sessão interativa
3. Completar → XP é enviado ao backend via `/games/complete`
4. Progresso é salvo em localStorage

**Problemas:**
- Se o usuário troca de dispositivo ou limpa o browser, todo o progresso dos jogos é perdido
- XP é enviado ao servidor, mas o histórico detalhado de jogadas não — o dashboard não reflete quais jogos foram feitos
- Sem indicação no card do jogo de quantas vezes foi jogado ou melhor score

### Fluxo 4 — Assistir uma aula
1. `/aulas` → expandir módulo → clicar na aula
2. `/aulas/[id]` → LessonPlayer toca o conteúdo
3. Botão "Marcar como concluída" → PUT em `/lessons/{id}/progress`
4. XP é creditado, estado global `user.xp` é atualizado

**Pontos positivos:** simples, linear, claro.

**Problemas:**
- Não há continuidade automática entre aulas — ao concluir uma aula, o usuário precisa navegar manualmente para a próxima
- A aula de vídeo (`LessonPlayer`) — o formato exato do conteúdo das aulas (vídeo? texto? embed?) não foi confirmado nesta análise e **necessita validação**

### Fluxo 5 — Fazer um simulado
1. `/simulados` → ver lista de exames → clicar "Iniciar"
2. Questões aparecem uma abaixo da outra com painel lateral de resumo + timer
3. Clicar "Finalizar" → resultado exibido no painel lateral

**Problema crítico:** após finalizar, não é possível revisar respostas, ver quais questões errou ou ler explicações. O resultado desaparece ao sair da página — não há histórico de simulados acessível.

---

## 5. Design Visual e Identidade

### Paleta e estilo geral
O sistema adota um visual **dark/neutral** com accent primário em azul-índigo (deduzido pela referência a `bg-primary`, `text-primary-foreground`) e accent secundário em amarelo/âmbar (`text-secondary`, referência a "Amarelo como sistema visual" na página Sobre). O fundo usa tons de background escuro com superfícies translúcidas (`bg-background/88`, `bg-card/72`).

### Tipografia
- Fonte sem serifa, provavelmente Inter ou similar (definida globalmente no layout)
- Hierarquia: `text-xs uppercase tracking-[0.14em]` para eyebrows, `text-xl font-semibold tracking-normal` para títulos de seção, `text-2xl/3xl` para valores de métricas, `text-5xl+` para a landing
- Consistente ao longo de todo o app

### Componentes de UI
O sistema usa um design system próprio construído sobre shadcn/radix:
- `Surface` — container padrão com borda sutil, background translúcido, hover implícito
- `PageHeader` — cabeçalho com eyebrow + título + descrição + action slot
- `MetricCard` — card com valor grande, label e ícone
- `EmptyState` — estado vazio padronizado
- `LoadingCard` — skeleton de carregamento

**Consistência:** alta dentro da área logada. A landing page usa componentes diferentes (Aceternity primitives: `HoverGlowCard`, `MovingBorderPanel`, `Reveal`) com efeitos de hover glow e animações mais elaboradas — há uma distinção clara e intencional entre o visual de marketing e o visual de produto.

### Ícones
Lucide Icons — conjunto consistente em todo o app.

### Layout e responsividade
- Desktop: sidebar fixa + content area com max-width 1600px e padding progressivo
- Mobile: header fixo + drawer lateral (md:hidden/md:flex)
- Grids responsivos com `fluid-grid` custom + `[--grid-min]` CSS variable
- Sem breakpoints desnecessários — os grids se adaptam organicamente

### Avaliação geral
O design transmite **profissionalismo moderado** — é coeso, usa boas práticas de hierarquia visual e tem identidade visual presente (dark, primary azul, secondary amarelo). A landing tem mais personalidade que a área logada, que é mais utilitária.

**Inconsistências encontradas:**
- O admin page usa `className="text-2xl font-bold"` diretamente em vez do padrão `PageHeader` + Surface — quebra consistência visual com o restante do app
- A página de onboarding tem uma barra de progresso hardcoded em 42% — parece placeholder que nunca foi substituído por lógica real
- Alguns textos na landing e dashboard têm acentuação incorreta (caracteres especiais omitidos: "correcao" em vez de "correção") — há inconsistência entre textos com e sem acento no codebase

---

## 6. Pontos Fortes

- **Pipeline de redação com versionamento**: o fluxo de escrever, enviar, receber correção, reescrever e comparar versões é bem pensado e diferenciador. O botão "Reescrever a partir desta versão" é uma funcionalidade de valor real.

- **Anotações inline no texto**: ao receber uma correção, o usuário vê trechos destacados no próprio texto com tooltips explicando o problema e a competência afetada. Isso é pedagogicamente superior a apenas exibir uma nota.

- **Autosave silencioso**: o editor salva o rascunho a cada 900ms sem interrução — o usuário nunca perde o que escreveu.

- **Mapa de domínio por competência ENEM**: o dashboard exibe as 5 competências do ENEM com barras de progresso e nota individual, dando ao estudante clareza sobre onde está fraco.

- **Recomendação de próximo passo dinâmica**: o sistema identifica a competência mais fraca e sugere um próximo passo com link direto — lógica simples mas útil.

- **Design system coeso na área logada**: `Surface`, `PageHeader`, `MetricCard` e `EmptyState` são usados consistentemente, criando uma experiência visual unificada.

- **Estados de erro e loading presentes**: LoadingCard (skeleton), EmptyState, e tratamento de erro em todas as páginas principais — o sistema não deixa o usuário com tela branca sem contexto.

- **Responsividade bem implementada**: sidebar colapsável no desktop, drawer no mobile, grids fluidos — funciona em diferentes tamanhos de tela.

- **Gamificação com XP e ranks**: sistema de progressão que incentiva a continuidade do estudo.

- **Admin panel completo**: telemetria de IA com custos, gestão de usuários e aprovação de jogos gerados por IA — útil para o operador do produto.

---

## 7. Pontos Fracos

### Usabilidade

| Problema | Impacto |
|---|---|
| Ao sair da tela durante a correção de redação, o resultado nunca aparece | Usuário fica sem saber se a redação foi corrigida; precisa procurar em `/redacoes` |
| O simulado não tem histórico persistente — ao sair da página, o resultado desaparece | Usuário não consegue revisar erros nem acompanhar evolução em simulados |
| O onboarding é estático e não orienta o usuário a completar uma primeira ação real | Alta taxa provável de abandono nos primeiros minutos; usuário chega ao dashboard com tudo zerado sem saber o que fazer |
| O editor de redação tem muitos estados complexos (tema → rascunho → aguardando → análise → versões) sem guia visual clara do estado atual | Pode confundir o usuário, especialmente na primeira vez |
| A página de perfil não tem configurações de conta | Usuário não consegue alterar senha, email ou preferências de estudo |

### Design

| Problema | Impacto |
|---|---|
| Admin page não usa os componentes padrão (Surface, PageHeader) | Inconsistência visual entre admin e restante do app |
| Textos com e sem acentuação misturados no app | Aparência de produto inacabado, perda de credibilidade |
| Barra de progresso hardcoded em 42% no onboarding | Confunde o usuário — parece dado real mas não é |

### Conteúdo

| Problema | Impacto |
|---|---|
| As competências ENEM (C1–C5) nunca são explicadas na interface | Usuário recebe nota por C3 sem saber o que C3 significa; reduz o valor pedagógico da correção |
| O ThemePicker não exibe textos de apoio (`supporting_texts`) — que existem no modelo | Usuário não tem a motivação contextualizadora do tema como no ENEM real |
| A recuperação de senha não funciona de fato (retorna mensagem genérica sem enviar email) | Usuários que esquecem a senha ficam sem acesso — necessita validação se é intencional |

### Navegação

| Problema | Impacto |
|---|---|
| Ao concluir uma aula, não há botão "Próxima aula" — usuário volta manualmente à listagem | Quebra o fluxo de estudo sequencial |
| O `/onboarding` é acessível a qualquer momento e não tem redirecionamento pós-conclusão | Desorientação; parece um dead end |

### Performance percebida

| Problema | Impacto |
|---|---|
| A correção de redação é síncrona no frontend (espera resposta única) mas assíncrona no backend (Celery) | Se o worker demorar muito, a requisição pode expirar e o usuário vê erro mesmo que a correção eventualmente complete |
| A tela de espera da correção não usa polling — se o usuário navegar para fora, não retorna ao resultado | Experiência fraturada para qualquer usuário que saia da tela durante a correção |

### Organização

| Problema | Impacto |
|---|---|
| Jogos têm progresso apenas no localStorage — troca de dispositivo ou limpeza do cache zera tudo | Usuário perde todos os ganhos; desmotiva o retorno |
| O dashboard não mostra gráfico de evolução de notas — que existe em `/redacoes` mas não aqui | O indicador mais importante de progresso fica escondido em uma sub-página |

---

## 8. O Que Está Faltando

### Funcionalidades ausentes

- **Polling de status da correção**: o backend tem o endpoint `/essays/{id}/job` mas o frontend não o usa. Sem polling, o usuário que sai da tela durante a correção fica sem resultado.
- **Fluxo real de pagamento**: a página de preços exibe 3 planos com valores (R$29 / R$59 / R$129), mas os botões levam para `/cadastro` sem integração com Stripe, PagSeguro ou qualquer gateway. Os planos são puramente informativos hoje.
- **Notificações**: não há sistema de notificação para avisar o usuário que a correção foi concluída (push, email, ou badge na sidebar).
- **Configurações de conta**: sem página de Settings — o usuário não consegue alterar senha, email, preferências de notificação ou meta diária de estudo.
- **Revisão de simulado**: após finalizar um simulado, não há como ver quais questões errou, a resposta correta ou explicações.
- **Histórico de simulados**: as tentativas de exame existem no modelo de dados (`MockExamAttempt`) mas não há página para visualizá-las.
- **Continuidade automática entre aulas**: ao completar uma aula, não aparece o botão de "Próxima aula".
- **Busca global**: não há busca por aulas, jogos ou temas de redação além do filtro local em `/redacoes`.

### Informações que deveriam aparecer mas não aparecem

- **Explicação das competências ENEM (C1–C5)** na tela de análise de redação.
- **Textos de apoio do tema** no ThemePicker (modelo tem `supporting_texts` mas a UI não exibe).
- **Progresso na meta diária** — `daily_goal_minutes` existe no usuário mas não aparece em nenhuma tela.
- **Histórico de XP ganho** — o usuário vê XP total mas não de onde veio.
- **Melhor score histórico por jogo** — não exibido no card de seleção do jogo.
- **Gráfico de evolução** no dashboard (aparece em `/redacoes`, mas deveria estar resumido no painel principal).

### Estados vazios com tratamento ausente ou insuficiente

- **`/simulados` sem histórico**: após fazer um simulado e sair, a página volta ao estado inicial sem indicar tentativas passadas.
- **`/games` sem histórico por jogo**: os cards de jogo não mostram se o usuário já jogou aquele jogo ou qual foi sua última performance.
- **Redações sem temas disponíveis**: se a API de temas retornar lista vazia, o botão "Nova redação" fica desabilitado sem mensagem explicativa.

### Páginas que deveriam existir mas não existem

- **`/settings`**: configurações de conta, senha, email, preferências
- **`/conquistas`** (ou equivalente): lista de conquistas/badges desbloqueados por XP e atividade
- **`/simulados/historico`**: histórico de tentativas de simulado com resultado e performance por competência

---

## 9. Oportunidades de Melhoria

| # | Melhoria | Prioridade | Motivo | Benefício esperado |
|---|---|---|---|---|
| 1 | Implementar polling de status da correção (`/essays/{id}/job`) e exibir resultado mesmo se usuário sair da tela | **Alta** | Bug funcional: usuários que navegam para fora durante a correção ficam sem resultado | Elimina a principal fonte de frustração no fluxo central do produto |
| 2 | Explicar C1–C5 na tela de análise de redação (tooltip ou accordion expandível) | **Alta** | O valor pedagógico da correção é desperdiçado se o aluno não entende o que cada nota significa | Aumenta retenção e uso real do feedback da IA |
| 3 | Adicionar botão "Próxima aula" ao concluir uma aula | **Alta** | Quebra o fluxo sequencial de estudo — sem continuidade automática, muitos alunos param | Melhora engajamento na trilha de aulas |
| 4 | Revisar e corrigir o onboarding: substituir progresso hardcoded por uma primeira ação real | **Alta** | Onboarding atual não orienta e cria desconfiança (barra em 42% sem motivo) | Reduz abandono precoce |
| 5 | Exibir revisão pós-simulado (questões, gabarito, explicações) e persistir histórico | **Alta** | Simulado sem revisão tem valor de aprendizado muito reduzido | Aumenta o valor percebido dos simulados |
| 6 | Sincronizar progresso dos jogos com o servidor (não apenas localStorage) | **Alta** | Usuário perde todo o histórico ao trocar de dispositivo ou limpar cache | Melhora retenção e permite análise de dados de uso dos jogos |
| 7 | Adicionar página de configurações de conta | **Média** | Usuário não pode alterar senha — bloqueio funcional para quem perde acesso | Reduz solicitações de suporte; é expectativa básica de qualquer plataforma |
| 8 | Exibir textos de apoio do tema no ThemePicker | **Média** | O banco de dados tem os textos mas a UI não os usa — dado o ENEM fornece textos motivadores, isso é importante | Mais fidelidade ao formato real do ENEM; melhor preparação |
| 9 | Adicionar gráfico de evolução de notas resumido no dashboard | **Média** | A informação mais motivadora está em `/redacoes`, não no painel principal | Aumenta percepção de progresso já na tela inicial |
| 10 | Mostrar XP/score histórico nos cards de jogo | **Média** | Usuário não sabe se já jogou aquele jogo nem qual seu melhor resultado | Incentiva revisitas e competição interna |
| 11 | Corrigir inconsistências de acentuação no app (textos com/sem acento misturados) | **Média** | Aparência de produto inacabado; prejudica credibilidade com professores e alunos | Melhora percepção de qualidade e profissionalismo |
| 12 | Integrar fluxo real de pagamento para os planos | **Média** | A página de pricing existe mas não converte — os planos são vitrines sem caixa | Viabiliza monetização do produto |
| 13 | Padronizar admin page para usar Surface + PageHeader como o restante do app | **Baixa** | Inconsistência visual interna — não afeta usuários comuns | Melhora manutenibilidade e coerência do design system |
| 14 | Adicionar página de conquistas (badges por XP, sequências, redações corrigidas) | **Baixa** | O sistema de gamificação é incompleto sem reconhecimento de marcos | Aumenta motivação de longo prazo |
| 15 | Adicionar notificação (email ou in-app) quando correção for concluída | **Baixa** | Especialmente útil se o fluxo de polling for implementado | Reduz necessidade de o usuário ficar na tela aguardando |

---

## 10. Recomendações Finais

### Estado atual

O Donc ENEM é um produto com uma **base técnica sólida e uma funcionalidade diferenciada** (correção de redação com IA e anotações inline), mas sofre de lacunas importantes no fluxo central: a correção pode falhar silenciosamente se o usuário sair da tela, o onboarding não orienta, os simulados não têm valor de revisão, e o progresso dos jogos é volátil. O design é coeso na área logada mas tem inconsistências pontuais. A plataforma tem potencial claro, mas está aquém do que promete na landing page.

### Top 3 mudanças prioritárias

1. **Implementar polling de status da correção** (`/essays/{id}/job`): o backend já tem a infraestrutura, o frontend não usa. Essa mudança resolve o principal bug funcional do produto — usuários que saem durante a correção nunca veem o resultado, e isso acontece no fluxo mais importante da plataforma.

2. **Reescrever o onboarding com uma primeira ação real**: substituir os cards estáticos por um fluxo guiado que leve o usuário a completar ao menos uma ação (jogar um jogo, assistir uma aula curta) antes de chegar ao dashboard. A barra hardcoded em 42% deve ser removida imediatamente.

3. **Adicionar explicação das competências ENEM (C1–C5) na tela de análise**: pode ser feito com um tooltip simples. Sem isso, a nota mais importante que o sistema gera — a nota por competência — não tem valor pedagógico para o usuário que não conhece a terminologia do ENEM.

### Direção estratégica

O produto deve evoluir para ser uma **plataforma de rotina**, não apenas uma ferramenta de correção. O maior diferencial já está construído (correção + anotações inline); o que falta é o contexto que faz o usuário voltar todos os dias: metas diárias visíveis, notificações de resultado, continuidade automática entre aulas e histórico completo de simulados. A gamificação (XP, ranks, streaks) está bem estruturada mas desconectada de alguns fluxos (jogos sem histórico real, simulados sem pontuação persistente).

### O que não deve ser mudado

- **Pipeline de correção com agentes sequenciais**: funciona, é diferenciado, é o coração do produto.
- **Sistema de anotações inline no texto corrigido**: excelente diferencial pedagógico — manter e incrementar.
- **Autosave do editor**: silencioso, confiável, bem implementado.
- **Design system coeso** (Surface, PageHeader, EmptyState): consistente e bem construído — continuar usando como base para novas páginas.
- **Estrutura de rotas e separação marketing/app**: clara e bem organizada.
