# Handoff Report — Explorer Survey R1 (Design System Governance & Lint)

## 1. Observation

### 1.1 Execução de Ferramentas e Comandos de Auditoria
- **Execução do Design Lint com flag `--changed`:**
  - Comando: `node scripts/design-lint.mjs --changed`
  - Resultado: Exit Code 0. Arquivos inspecionados: 41. Total de violações: 155.
  - Distribuição: P0: 44 | P1: 59 | P2: 29 | P3: 23. Arquivos com débito: 8 de 41.
  - Arquivos acusados:
    1. `src/routes/_store.diretorio.index.tsx` (31 violações: 3 P0, 20 P1, 4 P2, 4 P3)
    2. `src/routes/_store.empregos.index.tsx` (36 violações: 8 P0, 18 P1, 3 P2, 7 P3)
    3. `src/routes/_store.eventos.tsx` (66 violações: 18 P0, 22 P1, 19 P2, 7 P3)
    4. `src/routes/_store.noticias.index.tsx` (15 violações: 8 P0, 3 P1, 1 P2, 3 P3)
    5. `src/services/directory.functions.ts` (1 violação: 1 P0)
    6. `src/services/jobs.functions.ts` (3 violações: 3 P0)
    7. `src/services/news.functions.ts` (2 violações: 2 P0)
    8. `src/services/mining/event-harvester.ts` (1 violação: 1 P0)
- **Execução do Design Lint com flag `--ratchet` (Varredura Completa):**
  - Comando: `node scripts/design-lint.mjs --ratchet`
  - Resultado: Exit Code 1 (FALHA NA CATRACA).
  - Verbatim output:
    ```
    FALHA NA CATRACA (REGRESSÃO DETECTADA): Nenhuma violação nova pode entrar!
    Total Geral: Baseline 18727 -> Atual 18827 (+100)
    Severidade P1: Baseline 8475 -> Atual 8608 (+133)
    Regra DL-02: Baseline 5206 -> Atual 5273 (+67)
    Regra DL-03: Baseline 84 -> Atual 159 (+75)
    Regra DL-14: Baseline 314 -> Atual 318 (+4)
    Regra DL-27: Baseline 1230 -> Atual 1232 (+2)
    Regra DL-30: Baseline 265 -> Atual 268 (+3)
    Módulo routes/store: Baseline 3231 -> Atual 3275 (+44)
    ```

### 1.2 Inspeção Estrutural de `scripts/design-lint.mjs`
- **DL-04 Regex e Falha de Escopo (Linha 199 e 321):**
  - Código: `const importantRegex = /!important|(?:^|[\s"'`])!(?:[a-zA-Z0-9_-]+)/g;`
  - Efeito: Avaliado linha a linha sem restrição a CSS ou atributos `className`.
  - Capturas literais observadas:
    - `src/services/directory.functions.ts:389`: ` !listing` (expressão `if (!listing)`)
    - `src/services/jobs.functions.ts:134`: ` !jobRes` (expressão `if (!jobRes)`)
    - `src/services/jobs.functions.ts:392`: ` !app`
    - `src/services/jobs.functions.ts:440`: ` !employee`
    - `src/services/news.functions.ts:967`: ` !article`
    - `src/services/news.functions.ts:1075`: ` !sponsor`
    - `src/services/mining/event-harvester.ts:43`: ` !scrape`
    - `src/routes/_store.diretorio.index.tsx:240`: ` !isLoading`
    - `src/routes/_store.empregos.index.tsx:71`: ` !search`
    - `src/routes/_store.eventos.tsx:388`: ` !matchesDesc`
    - `src/routes/_store.noticias.index.tsx:191`: ` !searchQuery`
  - Medição empírica via script `analyze_dl04.mjs`:
    - Total de ocorrências no codebase: 1.764
    - Operações booleanas JavaScript (`!variable`): **1.746** (99% falso-positivos)
    - Especificidade CSS / Tailwind real (`!important` ou `!utility` em classes): **18**

- **DL-15 Linha Única vs JSX Multi-linha (Linha 460):**
  - Código: `if ((line.includes('onClick') || line.includes('<button')) && !line.includes('focus-visible:') && !line.includes('<Button'))`
  - Efeito: Em qualquer elemento JSX com quebra de linha onde `<Button` está numa linha e `onClick` está em linha subsequente (ex: `src/routes/_store.diretorio.index.tsx:247`), a linha com `onClick` dispara violação P0 mesmo o botão sendo `<Button>` do design system.
  - Medição empírica: 2.537 ocorrências de falso-positivo causadas por janela de quebra de linha.

- **Regras Não Implementadas no Linter:**
  - Em `.designlintrc.json` e `docs/design/DESIGN.md`, constam DL-10 (font size cardinality), DL-16 (contraste texto >= 4.5:1), DL-17 (contraste controle >= 3:1), DL-20 (subtítulo redundante) e DL-22 (truncamento de lista). Nenhuma dessas regras possui código validador em `scripts/design-lint.mjs`.

### 1.3 Inspeção de Tokens e CSS (`docs/design/tokens.json` e `src/styles.css`)
- **Tokens Canônicos:** `tokens.json` reside em `docs/design/tokens.json` e possui as 3 camadas normativas:
  - Primitiva: cores neutras (0 a 950), feedback (red, green, amber, blue), space (0 a 16), radius (none, sm, md, lg, full), motion, elevation, z-index (0 a 50).
  - Semântica: surface (canvas, card, subtle, muted), text (primary, secondary, muted, inverse), border (default, subtle, control, focus), feedback, layout.
  - Componente: button, input, card, badge, table, dialog, sheet.
- **Padrão em `src/styles.css`:** Mapeia `@theme inline` com classes semânticas. Porém:
  - Não declara classe utilitária canônica para micro-tipografia abaixo de 12px.
  - Como consequência, desenvolvedores declararam `text-[10px]` e `text-[11px]` mais de 3.000 vezes em todo o projeto.

### 1.4 Inspeção de Primitivas em `src/components/ui/`
- `src/components/ui/button.tsx`:
  - Linha 9: `transition-all` (DL-27 P3) e `active:scale-[0.98]` (DL-02 P1).
  - Linha 31: `size.default` define `px-5.5` (viola grade 4px DL-03).
  - Linha 32, 34, 35: `size.sm` (`h-9`), `size.icon` (`size-10`), `size.iconSm` (`size-8`) possuem alvos abaixo de 44px (`h-11`) em mobile (DL-14).
  - Linha 82: `<svg className="animate-spin size-4 shrink-0" ...` sem `motion-reduce:animate-none` (DL-28).
- `src/components/ui/empty-state.tsx`:
  - Linha 34, 35: `min-h-[220px]`, `min-h-[300px]` (DL-02 P1).
  - Linha 53, 57: `<Button ... className="... h-10 ...">` (40px < 44px, DL-14 P1).
- `src/components/ui/chart.tsx` e `image-cropper-dialog.tsx`:
  - Cores hexadecimais literais fora de token: `#ccc`, `#fff`, `#09090b`, `#ffffff`, `rgba(0, 0, 0, 0.75)` (DL-01 P1).

### 1.5 Inspeção Detalhada das 4 Rotas Modificadas
1. **`src/routes/_store.diretorio.index.tsx` (31 violações):**
   - 3 falso-positivos DL-04 (` !isLoading` em L240, L264, L292).
   - 1 falso-positivo DL-15 em L247 (`onClick` de `<Button size="sm">`).
   - 18 classes arbitrárias DL-02: `w-[300px]` (L187, L207), `text-[11px]` (L337, L468, L473), `text-[10px]` (L347, L422, L430, L479, L497, L503), `min-h-[440px]`, `max-h-[450px]` (L396), `aspect-[16/9]` (L403), `max-w-[110px]` (L497), `min-h-[140px]` (L559, L585), `text-[9px]` (L579).
   - 2 gradientes decorativos DL-08: `bg-gradient-to-br` (L412), `bg-gradient-to-t` (L418).
   - 2 durações acima de 300ms DL-26: `duration-500` (L409, L569).
   - 5 transições genéricas DL-27: `transition-all` (L366, L372, L396, L539, L559).
   - Matriz de 4 Estados: Possui loading (`isLoading`), empty state (`EmptyState`) e error handling, mas prejudicada pelos falsos positivos DL-04.

2. **`src/routes/_store.empregos.index.tsx` (36 violações):**
   - 4 falso-positivos DL-04 (` !search`, ` !isLoading` em L71, L247, L271, L288).
   - 5 falso-positivos/gaps DL-15 (`onClick` em botões multi-linha L163, L165, L254, L439, L455).
   - 15 classes arbitrárias DL-02: `min-w-[290px]`, `max-w-[340px]` (L209, L229), `aspect-[16/9]` (L319), `text-[10px]` (L338, L342, L350, L394, L414, L537), `text-[11px]` (L376), `max-w-[140px]` (L414), `min-h-[128px]` (L486), `text-[9px]` (L517).
   - 2 alvos de toque < 44px DL-14: `h-9` em botões interativos (L148, L154).
   - 2 gradientes decorativos DL-08: `bg-gradient-to-br` (L328), `bg-gradient-to-t` (L334).
   - 1 duração acima de 300ms DL-26: `duration-500` (L325).
   - 7 transições genéricas DL-27: `transition-all` (L166, L312, L440, L453, L464, L486, L558).

3. **`src/routes/_store.eventos.tsx` (66 violações):**
   - 15 emojis Unicode na interface DL-23: `🎟`, `🎸`, `🤠`, `🥁`, `🍔`, `🎭`, `🛍`, `🎓`, `🎈`, `🏷` (L30 a L47).
   - 6 falso-positivos DL-04: ` !matchesDesc`, ` !matchesLoc`, ` !isError` (L388, L753, L782, L863, L922).
   - 10 violações DL-15 (L596, L598, L613, L616, L648, L692, L695, L709, L711, L766).
   - 12 classes arbitrárias DL-02: `text-[10px]` (L627, L814, L884, L944), `text-[11px]` (L720, L833, L843, L902, L912), `min-w-[290px]`, `max-w-[340px]` (L799), `min-h-[136px]` (L929).
   - 6 cores literais preto/branco DL-18: `bg-black`, `text-white` (L814, L820, L884, L889).
   - 2 alvos de toque móveis < 44px DL-14: `h-8`, `h-9` (L963).
   - 1 sombra decorativa DL-07: `shadow-sm` em botão de aba (L619).
   - 2 gradientes decorativos DL-08: `bg-gradient-to-t` (L811, L882).
   - 3 durações acima de 300ms DL-26: `duration-500` (L806, L877, L935).
   - 6 transições genéricas DL-27: `transition-all` (L617, L650, L696, L799, L870, L929).
   - 1 animação sem motion-reduce DL-28 (L1).
   - 2 overflow horizontal sem contexto de scroll DL-30: `overflow-x-auto` (L607, L644).

4. **`src/routes/_store.noticias.index.tsx` (15 violações):**
   - 6 falso-positivos DL-04: ` !searchQuery` (L191, L214, L266, L289, L312, L335).
   - 2 falso-positivos DL-15: L152, L155 em botões de categorias.
   - 3 classes arbitrárias DL-02: `aspect-[2.35/1]`, `aspect-[2.6/1]`, `aspect-[21/9]` (L222).
   - 1 duração acima de 300ms DL-26: `duration-700` (L226).
   - 2 transições genéricas DL-27: `transition-all` (L157, L215).
   - 1 overflow horizontal DL-30: `overflow-x-auto` (L147).
   - **Grave Omissão de Matriz de 4 Estados (DL-11):** Não renderiza `<Skeleton>` durante buscas ou carregamento de categorias (`isSearching`), causando layout shift e violando o critério de aceitação de 4 estados.

---

## 2. Logic Chain

1. **A partir da Observação 1.1 e 1.2:**
   - O linter visual `scripts/design-lint.mjs` é executado com escopo indiscriminado (`include: ["src/**/*.{tsx,ts,jsx,js,css}"]`), avaliando arquivos puros de backend como `src/services/jobs.functions.ts` e `src/services/mining/event-harvester.ts`.
   - A regex de DL-04 (`/(?:^|[\s"'`])!(?:[a-zA-Z0-9_-]+)/g`) busca `!` precedido de espaço ou aspas sem verificar se está dentro de um atributo `className` ou arquivo CSS.
   - Portanto, 1.746 de 1.764 ocorrências no projeto (99%) são operadores lógicos JavaScript legítimos (`if (!jobRes)`, `!isLoading && ...`). Isso gera 44 bloqueadores P0 artificiais na saída de `--changed` e impede qualquer entrega limpa.

2. **A partir da Observação 1.2 (DL-15):**
   - A regra DL-15 verifica estritamente se a mesma linha que contém `onClick` contém `<Button` ou `focus-visible:`. Como a convenção padrão de formatação JSX quebra propriedades em múltiplas linhas, o linter gera milhares de falsos positivos em botões canônicos do Design System.

3. **A partir da Observação 1.1 (Falha do Ratchet):**
   - A execução completa com `--ratchet` falha com Exit Code 1 acusando +100 violações globais e +133 violações P1.
   - O motivo é duplo: (a) a introdução de novos arquivos em `src/services/mining/` dispara falsos positivos P0 de DL-04; e (b) as quatro rotas modificadas em `routes/store` acumulam 67 novas violações de classes arbitrárias (DL-02), alvos de toque < 44px (DL-14) e espaçamentos (DL-03).

4. **A partir da Observação 1.3 e 1.4 (Consumo de Tokens e Primitivas):**
   - Os tokens semânticos em `docs/design/tokens.json` e `src/styles.css` estão bem fundamentados, mas não oferecem utilitários oficiais para tamanhos menores que 12px (`text-xs`), incentivando o uso repetido de `text-[10px]` e `text-[11px]`.
   - As próprias primitivas em `src/components/ui/` (`empty-state.tsx`, `button.tsx`) violam a grade de 4px (`px-5.5`) e o piso móvel de 44px (`h-10` e `h-9`).

5. **A partir da Observação 1.5 (Rotas Modificadas):**
   - Além dos falsos positivos do linter, existem dívidas reais e tangíveis de acessibilidade e design nas 4 rotas:
     - 15 emojis literais em `_store.eventos.tsx` violando B.8 e DL-23.
     - Botões com `h-8` e `h-9` violando o piso móvel de 44px (DL-14).
     - Cores literais `bg-black text-white` violando DL-18.
     - Ausência de `<Skeleton>` na rota `_store.noticias.index.tsx` violando a matriz de 4 estados.

---

## 3. Caveats

1. **Escopo Read-Only:** Como Explorer, nenhum código de produção foi alterado neste ciclo. Apenas foram gerados relatórios e scripts de auditoria em `.agents/teamwork/explorer_survey_r1/`.
2. **Impacto do Ajuste no Linter:** Se o script `scripts/design-lint.mjs` for corrigido para filtrar falsos positivos de DL-04 e DL-15, o total de violações na baseline congelada cairá drasticamente (de 18.727 para ~11.500). Isso exigirá a execução subsequente de `npm run lint:design:update-baseline` (ou `node scripts/design-lint.mjs --update-baseline`) para recalibrar a catraca com dados limpos.
3. **Escopo de Rotas Não Modificadas:** A auditoria aprofundou-se nas rotas ativas em `git status` (`diretorio`, `empregos`, `eventos`, `noticias`). Rotas de admin e workspace possuem débitos residuais históricos pré-existentes na baseline.

---

## 4. Conclusion

O ecossistema visual de R1 encontra-se em um estado crítico de bloqueio com causa-raiz tripla bem delimitada:
1. **Defeito no Motor do Linter (`scripts/design-lint.mjs`):** A regex de DL-04 criminaliza código booleano JavaScript/TypeScript normal gerando 99% de falsos positivos (1.746 casos), e DL-15 falha ao analisar JSX multi-linha (2.537 falsos positivos).
2. **Dívida Real de Implementação nas 4 Rotas Modificadas:** Existem 54 violações reais de DL-02 (classes arbitrárias), 15 emojis (DL-23), 4 controles móveis com toque < 44px (DL-14), 6 gradientes decorativos (DL-08) e falta de Skeleton na rota de notícias.
3. **Bloqueio da Catraca de CI:** O comando `node scripts/design-lint.mjs --ratchet` bloqueia entregas devido ao aumento de violações em `routes/store` (+44) e `services` (+7 falsos positivos).

### Plano Recomendado de Execução (Milestone 1 — Tarefas Atômicas)

| Tarefa | Arquivos Afetados | Ação Específica | Impacto |
| :--- | :--- | :--- | :--- |
| **T1. Refinamento de DL-04 e DL-15 no Linter** | `scripts/design-lint.mjs` | Restringir DL-04 para atributos `className` / arquivos `.css` ou prefixos Tailwind reais (`!(?:p|m|bg|text|border|h|w)-`). Em DL-15, inspecionar contexto de bloco JSX para não sinalizar `<Button>`. | Elimina ~4.200 falsos positivos P0 imediatos no repositório. |
| **T2. Saneamento de Rotas: Diretório** | `src/routes/_store.diretorio.index.tsx` | Substituir `w-[300px]` por `w-72`/`w-80`, `text-[10px]/text-[11px]` por `text-xs`, `aspect-[16/9]` por `aspect-video`, remover gradientes e ajustar durações. | 0 violações em `diretorio.index.tsx`. |
| **T3. Saneamento de Rotas: Empregos** | `src/routes/_store.empregos.index.tsx` | Elevar alvos de botões de `h-9` para `h-11` (44px), remover colchetes `min-w-[290px]`, `text-[10px]`, e padronizar transições. | 0 violações em `empregos.index.tsx`. |
| **T4. Saneamento de Rotas: Eventos** | `src/routes/_store.eventos.tsx` | Substituir 15 emojis por ícones Phosphor/Lucide, trocar `bg-black/text-white` por `bg-foreground text-background`, elevar controles para `h-11`, remover `shadow-sm`. | 0 violações em `eventos.tsx`. |
| **T5. Saneamento de Rotas: Notícias & Matriz 4-Estados** | `src/routes/_store.noticias.index.tsx` | Adicionar `<Skeleton>` estruturado para `isSearching` e carregamento de categorias, remover aspect ratios arbitrários e limitar transições a 200ms. | 100% conformidade com matriz de 4 estados. |
| **T6. Ajuste de Primitivas no Design System** | `src/components/ui/button.tsx`, `empty-state.tsx`, `skeleton.tsx` | Ajustar `empty-state` para `min-h-56` e botões `h-11`; ajustar `button.tsx` de `px-5.5` para `px-6`; adicionar `motion-reduce:animate-none` no spinner e skeleton. | Blindagem das primitivas fundamentais. |
| **T7. Recalibração da Baseline e Catraca** | `design-lint.baseline.json`, `docs/design/LINT_DASHBOARD.md` | Executar `node scripts/design-lint.mjs --update-baseline` e verificar `node scripts/design-lint.mjs --ratchet` retornando Exit Code 0. | Desbloqueia entregas e PRs no CI. |

---

## 5. Verification Method

Para verificar independentemente os achados deste relatório:

1. **Reproduzir os Falsos Positivos de DL-04:**
   ```bash
   node .agents/teamwork/explorer_survey_r1/analyze_dl04.mjs
   ```
   *Condição de validação:* Exibirá ~1.746 operações booleanas JavaScript classificadas incorretamente contra 18 ocorrências reais de CSS.

2. **Verificar Violações nos Arquivos Modificados:**
   ```bash
   node .agents/teamwork/explorer_survey_r1/analyze_changed.mjs
   ```
   *Condição de validação:* Exibirá a listagem exata de linhas, severidades e matches nas 4 rotas e nos 4 arquivos de serviço/mineração.

3. **Verificar a Falha Atual da Catraca:**
   ```bash
   node scripts/design-lint.mjs --ratchet
   ```
   *Condição de validação:* Falhará com Exit Code 1 indicando regressão de +100 violações em relação à baseline congelada.

4. **Verificar a Ausência do Skeleton na Rota de Notícias:**
   Inspecionar `src/routes/_store.noticias.index.tsx`: verificar que a busca assíncrona (`isSearching`) não renderiza componente `<Skeleton>` enquanto carrega artigos de categorias selecionadas.
