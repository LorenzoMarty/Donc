# Escalas de cor por accent — design

**Data**: 2026-08-01
**Status**: implementado

## Problema

O app tem um seletor de "cor de destaque" (`/perfil` → `AccentSettings`, `src/lib/accent.ts`) com 6
opções (Verde/Azul/Roxo/Laranja/Vermelho/Teal), mas dois problemas quebram a promessa de
personalização:

1. **`applyAccent()` só sobrescreve 3 variáveis flat** (`--primary`/`--ring`/`--accent`) via HSL
   computado em runtime a partir do hex — sem escala de tons. Só o Verde tem uma escala completa
   (`--green-50..900`, hand-curated em `globals.css`); as outras 5 cores não têm equivalente, então
   qualquer lugar que precise de um tom mais escuro/claro do accent (hover, superfície escura,
   sombra) cai de volta pro verde ou fica sem variação nenhuma.
2. **4 telas têm banner "hero" com `bg-[#12351d]` hardcoded direto no JSX** (`aulas/page.tsx`,
   `redacao/page.tsx`, `game-pages/games/GamesHub.tsx`, `onboarding/page.tsx` — este último no
   fundo inteiro da tela, não só um card) — verde bem escuro, fora do sistema de token
   inteiramente. Não importa qual accent o usuário escolha, essas superfícies ficam sempre verde
   escuro.

Confirmado com o usuário: resolver os dois problemas juntos, incluindo o onboarding completo
(maior escopo que os outros 3 — banner isolado vs. tela inteira com paleta coordenada).

## Arquitetura

### 1. Escalas de cor hand-curated para as 5 cores novas

Mesma abordagem do `--green-50..900` existente: 10 passos por cor (`50` a `900`), definidos como
tripla HSL fixa em `globals.css`. Gerados por fórmula (script Python, não à mão) mas **fixos** no
arquivo — não computados em runtime — respeitando a escolha do usuário de "escala fixa por cor,
igual ao verde".

**Método**: cada cor mantém o H (matiz) e S (saturação) exatos do hex já usado em `ACCENT_OPTIONS`
hoje. O L (luminosidade) do passo `500` é o L exato do hex original — preserva o swatch que o
usuário já vê ao escolher a cor. Os outros 9 passos aplicam o mesmo delta de L que a escala do
verde usa relativo ao seu próprio `500` (`+56, +51, +42, +28, +12, 0, -6, -13, -20, -26`),
clampado em `[6, 97]`.

Valores finais (H S% L%):

```css
--blue-50: 210 100% 97%;
--blue-100: 210 100% 97%;
--blue-200: 210 100% 94%;
--blue-300: 210 100% 80%;
--blue-400: 210 100% 64%;
--blue-500: 210 100% 52%; /* #0a84ff — igual ao swatch atual */
--blue-600: 210 100% 46%;
--blue-700: 210 100% 39%;
--blue-800: 210 100% 32%;
--blue-900: 210 100% 26%; /* #004285 */

--purple-50: 258 90% 97%;
--purple-100: 258 90% 97%;
--purple-200: 258 90% 97%;
--purple-300: 258 90% 94%;
--purple-400: 258 90% 78%;
--purple-500: 258 90% 66%; /* #8b5cf6 */
--purple-600: 258 90% 60%;
--purple-700: 258 90% 53%;
--purple-800: 258 90% 46%;
--purple-900: 258 90% 40%; /* #410ac2 */

--orange-50: 32 89% 97%;
--orange-100: 32 89% 97%;
--orange-200: 32 89% 90%;
--orange-300: 32 89% 76%;
--orange-400: 32 89% 60%;
--orange-500: 32 89% 48%; /* #e6820e */
--orange-600: 32 89% 42%;
--orange-700: 32 89% 35%;
--orange-800: 32 89% 28%;
--orange-900: 32 89% 22%; /* #6a3b06 */

--red-50: 358 75% 97%;
--red-100: 358 75% 97%;
--red-200: 358 75% 97%;
--red-300: 358 75% 87%;
--red-400: 358 75% 71%;
--red-500: 358 75% 59%; /* #e5484d */
--red-600: 358 75% 53%;
--red-700: 358 75% 46%;
--red-800: 358 75% 39%;
--red-900: 358 75% 33%; /* #931519 */

--teal-50: 173 80% 96%;
--teal-100: 173 80% 91%;
--teal-200: 173 80% 82%;
--teal-300: 173 80% 68%;
--teal-400: 173 80% 52%;
--teal-500: 173 80% 40%; /* #14b8a6 */
--teal-600: 173 80% 34%;
--teal-700: 173 80% 27%;
--teal-800: 173 80% 20%;
--teal-900: 173 80% 14%; /* #07403a */
```

**Verificação de contraste** (WCAG, texto branco sobre o tom `900` — uso principal em banners
escuros): green 13.14:1, blue 9.92:1, purple 10.26:1, orange 9.37:1, red 8.89:1, teal 11.64:1.
Todos acima do mínimo AAA (7:1); o atual `#12351d` hardcoded tem 13.52:1 — sem perda de legibilidade
em nenhuma cor.

### 2. Variáveis semânticas "accent ativo"

10 novas custom properties em `:root` (`globals.css`), com Verde como default (mantém o
comportamento atual até o usuário trocar o accent):

```css
--accent-50: var(--green-50);
--accent-100: var(--green-100);
--accent-200: var(--green-200);
--accent-300: var(--green-300);
--accent-400: var(--green-400);
--accent-500: var(--green-500);
--accent-600: var(--green-600);
--accent-700: var(--green-700);
--accent-800: var(--green-800);
--accent-900: var(--green-900);
```

Componentes que precisam de um tom do accent ativo (não só o `--primary` flat) usam
`hsl(var(--accent-300))`, `hsl(var(--accent-900))` etc.

### 3. `src/lib/accent.ts` — reescrita

- `AccentOption` ganha campo `key: string` (`"green" | "blue" | "purple" | "orange" | "red" |
  "teal"`), um por opção existente em `ACCENT_OPTIONS` (mesmos 6 hex, mesma ordem/label).
- `applyAccent(hex)`: resolve a `key` a partir do hex (lookup em `ACCENT_OPTIONS`, fallback pra
  `"green"` se não bater com nenhuma opção conhecida — antes o fallback só validava formato hex,
  agora precisa ser uma das 6 chaves conhecidas, já que a escala só existe pras 6). Para cada passo
  `50..900`, seta `--accent-{step}` para `var(--{key}-{step})`. Continua setando `--primary`,
  `--ring`, `--accent` (agora apontando pra `var(--{key}-500)` em vez de HSL computado — resultado
  visual idêntico ao atual, já que `500` é ancorado no hex original).
- `hexToHslTriplet` removida (não é mais necessária — sem cálculo de HSL em runtime).
- `ACCENT_INIT_SCRIPT` (snippet anti-flash, roda antes da pintura, sem imports): reescrito pra fazer
  só lookup de string + `setProperty`, sem a função `hexToHsl` embutida — mais simples que a versão
  atual.
- `normalizeAccent`: valida contra as 6 chaves conhecidas (via hex), não só formato de hex
  genérico — mantém o comportamento de fallback pro default em caso de valor corrompido no
  localStorage.
- Armazenamento (`ACCENT_KEY`/localStorage) continua guardando o **hex**, não a key — sem migração
  necessária para usuários que já escolheram um accent antes dessa mudança.

### 4. Telas corrigidas (hardcoded → token)

| Arquivo | Antes | Depois |
|---|---|---|
| `aulas/page.tsx` | `bg-[#12351d]` (banner), `text-[#12351d]`/`fill-[#12351d]` (pill/ícone brancos) | `bg-[hsl(var(--accent-900))]`, `text-[hsl(var(--accent-900))]`/`fill-[hsl(var(--accent-900))]` |
| `redacao/page.tsx` | mesmo padrão | mesmo padrão |
| `game-pages/games/GamesHub.tsx` | mesmo padrão (só o banner — `HUB_TINTS` não muda, ver exclusões) | mesmo padrão |
| `onboarding/page.tsx` | `bg-[#12351d]` (fundo inteiro), `text-[#8ee0a3]`/`bg-[#8ee0a3]`/`border-[#8ee0a3]` (kicker, progress bar, borda/preenchimento de opção selecionada, botão CTA, círculo de check, ícone do tour), `text-[#12351d]` (texto escuro sobre o CTA claro e sobre o check), `fill="#2f9e44"` (laço do mascote SVG), `fill="#12351d"` (olhos do mascote SVG) | `bg-[hsl(var(--accent-900))]`; `#8ee0a3` → `hsl(var(--accent-300))` (validado: HSL 135°57%72% vs green-300 131°55%68%, visualmente equivalente); `text-[#12351d]` → `text-[hsl(var(--accent-900))]`; mascote: laço → `hsl(var(--accent-500))`, olhos → `hsl(var(--accent-900))` |

### 5. Fora de escopo (investigado, não é o mesmo bug)

- `GamesHub.tsx` `HUB_TINTS` — array de 7 cores fixas, uma por hub cognitivo (diferenciação
  categórica entre hubs, não decoração de marca). Trocar isso quebraria a linguagem visual que
  distingue os hubs entre si.
- `src/lib/mark-tools.ts` (`MARK_TOOL_STYLE`/`PEN_SWATCHES`) — kit de marca-texto com 4 cores fixas
  (amarelo/verde/azul/rosa), deliberadamente independente do accent (como um estojo de canetas
  real).
- `essay-editor.tsx` `#26241f` — tinta neutra (quase preta, não verde) do texto da redação.
- `--success`/`--warning`/`--destructive` em `globals.css` — permanecem fixos (verde/laranja/
  vermelho semânticos). Convenção padrão de design system: "sucesso" deve continuar reconhecível
  como verde mesmo com um accent vermelho ativo, para não confundir feedback de sistema com o tema
  escolhido pelo usuário.

## Critério de concluído

- Trocar o accent em `/perfil` reflete, em runtime real (não só leitura de código): nos 4 banners
  hero (aulas/redação/GamesHub/onboarding) e em toda a paleta coordenada do onboarding.
- Nenhuma tela mostra verde hardcoded quando um accent diferente está ativo — exceto os itens da
  seção "Fora de escopo" acima, que são intencionalmente fixos.
- Contraste texto-branco-sobre-fundo mantido (verificado por cálculo, ≥8.9:1 em todas as 6 cores).
- `npm run quality` (lint + typecheck + test) verde para os arquivos tocados por esta mudança —
  nota: o repo tem trabalho em andamento não relacionado (`highlights-store`/`floating-post-its`)
  já quebrando o gate completo antes desta tarefa; isolar a verificação aos arquivos tocados aqui.
- Verificação visual real: abrir `/perfil`, trocar accent, navegar pras 4 telas e confirmar
  mudança de cor (dev server + inspeção de DOM/HTML, já que a extensão do Chrome não está
  conectada nesta sessão).

## Implementado (2026-08-01)

Executado via `superpowers:subagent-driven-development` — plano em
`docs/superpowers/plans/2026-08-01-accent-color-scales.md`, ledger completo em
`.superpowers/sdd/2026-08-01-accent-color-scales/progress.md`.

**Tasks concluídas** (todas com review de subagente independente antes de fechar):
1. Escalas de cor (`--blue/purple/orange/red/teal-50..900`) + `--accent-50..900` semânticas em
   `globals.css` — commit `df6ff29`, review limpo.
2. Reescrita de `src/lib/accent.ts` (TDD, 7 testes novos em `accent.test.ts`) — commit `b6e4051`,
   review limpo.
3. Verificação intermediária (dev server sobe sem erro) — sem código, feito direto na sessão de
   controle.
4. Hero banners de `aulas`/`redacao`/`GamesHub` — commit `c52b6e8`, review inicial limpo.
5. Onboarding completo (15+ pontos) — commit `3cf9fc9`, review limpo; o implementador ainda pegou
   um 7º ponto (`text-[#8ee0a3]` no ícone do `CTAStepBody`) que o brief da task tinha subcontado.
6. Verificação final — ver "Gap encontrado" abaixo.

**Gap encontrado e corrigido na verificação final (Task 6):** o brief original da Task 4 só listava
ocorrências de `#12351d`, mas as mesmas 3 telas também tinham `#8ee0a3` (kicker de texto claro em
`aulas:109`, `redacao:184`, `GamesHub:97`) e uma borda com opacidade (`GamesHub:113`,
`border-[#8ee0a3]/40`) — falha do plano, não do implementador. Corrigido num round de fix (commit
`8edfc69`), com re-review escopada confirmando os 4 pontos endereçados e nenhuma quebra nova.
Isso reforça a importância do grep de auditoria completo no Task 6, que não fazia parte do escopo
individual de nenhuma task anterior.

**Resultado da verificação (Task 6, honesto sobre o que foi e não foi confirmado):**
- ✅ Grep global (`#12351d`/`#8ee0a3`) nos 4 arquivos-alvo: zero ocorrências remanescentes.
- ✅ Suite de testes completa: 14 arquivos, 103/103 passando (incluindo os 7 novos de
  `accent.test.ts`).
- ✅ Typecheck completo (`npm run typecheck`) e lint completo (`npm run lint --max-warnings=0`):
  ambos limpos, exit code 0 — o trabalho alheio (`highlights-store`/`floating-post-its`) que
  quebrava o gate no início desta sessão não aparece mais nesta verificação (parece ter sido
  resolvido em paralelo por fora desta tarefa).
- ❌ **Verificação visual real em browser não foi possível nesta sessão**: a extensão do Chrome
  (`mcp__claude-in-chrome__*`) não respondeu (timeout) em duas tentativas separadas, e o dev server
  local teve instabilidade de processo no ambiente Windows/PowerShell desta máquina (processo saía
  logo após reportar "Ready", sem ficar ouvindo na porta). Não afirmo confirmação visual porque ela
  não aconteceu de fato.
- Evidência indireta que compensa parcialmente a lacuna acima: 3 reviews de subagente independentes
  fizeram verificação linha-a-linha de cada substituição contra o diff real (não só confiaram no
  relato do implementador); os testes de `accent.test.ts` verificam o comportamento real de
  `applyAccent()` contra `document.documentElement.style`/`localStorage` (DOM real via jsdom, não
  mock); e o contraste WCAG de cada cor no tom `900` foi calculado matematicamente na fase de design
  (todas ≥8.9:1, acima do mínimo AAA).

**Recomendação para o usuário:** antes de considerar 100% fechado, vale abrir `/perfil` no navegador
manualmente, trocar o accent pra Azul ou Roxo, e conferir visualmente as 4 telas — a lacuna acima é
a única verificação que não pôde ser feita nesta sessão.

## Revisão final de branch + fix wave (2026-08-01)

A revisão final (subagente em Opus, whole-branch) aprovou a feature (**"Ready to merge: Yes"**), mas
achou 2 findings **Important** — não bugs, qualidade visual — na fórmula de geração das 5 escalas
novas: pra Roxo e Vermelho (L% base alto), a fórmula original (delta absoluto, clampado) produzia
degraus claros quase idênticos entre si (`--purple-50/100/200` todos ~97%) e o degrau 300 (usado
como "texto claro sobre fundo escuro" nos kickers) ficava quase sem cor perceptível
(`--purple-300` em 94% L). O tom 900 também variava de "escuridão" entre cores — Roxo só chegava a
40% L, não lia como banner escuro de verdade.

**Corrigido** (commit `307a619`, re-review confirmou os 3 achados endereçados sem quebra nova):
recalculada a fórmula pra interpolação proporcional (não delta absoluto) — todo tom 900 agora
converge pra exatamente L=14% em todas as 6 cores (mesmo "peso" escuro do banner, consistente entre
temas), e os tons claros (50-400) ficam espaçados proporcionalmente entre a base e 97% de
luminosidade, sem clampar em duplicatas. Contraste recalculado e **melhorou** em relação à primeira
versão: branco-sobre-900 agora 13.8-18.5:1 (AAA folgado) em todas as 6 cores; o combo "texto no tom
300 sobre fundo no tom 900" (usado nos kickers) agora 7.7-8.6:1 em todas as 6 (era 5.8:1 no Azul
antes — abaixo do ideal). Também corrigidos no mesmo fix: `AccentOption.key` estreitado pra union
type (evita CSS var inválida silenciosa por typo) e `accent.test.ts` ganhou `beforeEach` de limpeza
(suíte deixa de depender de ordem de execução).

**Achados Minor deferidos** (não bloqueiam merge, registrados no ledger
`.superpowers/sdd/2026-08-01-accent-color-scales/progress.md` pra referência futura): escalas novas
não expostas como classes Tailwind (`bg-accent-900` etc.) — hoje só valor arbitrário
`bg-[hsl(var(--accent-900))]`, funciona mas sem validação de typo em build; mudança de tom do banner
verde padrão (`#12351d` → `#0f3817`) não foi destacada como "mudança visual" em nenhum lugar, embora
imperceptível; drift de arredondamento entre a cor do swatch do seletor e a cor de fato aplicada
(também imperceptível); um passo do plano original (repoint de `--primary`/`--ring` pra
`--accent-500` direto em `globals.css`) foi pulado — o resultado ficou bom mesmo assim (o
`applyAccent()` já sobrescreve via inline style), só não foi comentado no ledger na hora.

O reviewer final também fez, por conta própria, uma verificação real em Chromium headless
confirmando que a cadeia `--accent-N` → `var()` resolve corretamente inclusive dentro de atributos
de apresentação SVG (`fill="hsl(var(--accent-500))"`) e repinta ao trocar o accent — fechando boa
parte da lacuna de "verificação visual real" que ficou em aberto na sessão de implementação.
