# SPEC-20261114 — Refatoração End-to-End do Design Lint e Conformidade Visual do Ecossistema Waesy

- **Status:** Aprovada para Execução
- **Data:** 2026-11-14
- **Escopo:** Engine de Design Lint (`scripts/design-lint.mjs`, `scripts/design-lint.test.mjs`, `.designlintrc.json`), Design Tokens / Utilitários Canônicos (`src/styles.css`, `docs/design/tokens.json`), Remediação Integral de Violações (`src/components/`, `src/routes/`, `src/services/`, `src/lib/`), Baseline e Dashboard (`design-lint.baseline.json`, `design-lint.report.json`, `docs/design/LINT_DASHBOARD.md`).
- **Preceito de Proteção:** Preservar integralmente alterações paralelas existentes no working tree descritas em `docs/audits/WAESY_E2E_REFACTOR_LEDGER_2026-11-14.md`, atuando exclusivamente com edição cirúrgica (`edit_file`) em pontos de estilo, tokens, responsividade, acessibilidade e estados de UI.

---

## 1. Diagnóstico Inicial Verificado (Baseline Pré-Refatoração)

1. **Performance do Motor (`scripts/design-lint.mjs`):** Varredura completa sobre 2.779 arquivos em `src/` leva entre 80s e 110s (violando o SLA de `< 10s` definido em `.agents/skills/design-lint/SKILL.md`), causada principalmente por:
   - Execução de `parseJsxTags` e `hasTopLevelJsxAttribute` em arquivos `.ts` puros sem JSX (`airports-catalog.ts`, `routeTree.gen.ts`, `*.functions.ts`), onde generics TypeScript `Record<K, V>` disparam captura falsa de tags JSX.
   - Loop caractere-a-caractere em `hasTopLevelJsxAttribute` alocando `tagContent.slice(index).match(new RegExp(...))` a cada posição.
2. **Falsos Positivos e Lacunas do Linter:**
   - `DL-01`: Entidades numéricas HTML (`&#123;`, `&#160;`) e números curtos de pedido/referência (`#8596`, `#8921`) capturados por `hexRegex`; fixtures de testes unitários e motores não-UI.
   - `DL-02`: Seletores variantes do Tailwind CSS (`group-[...]`, `peer-[...]`, `has-[...]`, `in-[...]`, `not-[...]`) e padrões de regex em strings não-JSX (ex.: `bsk-[A-Za-z0-9]`) tratados como classes arbitrárias.
   - `DL-07`: Definições de variáveis `--shadow-(sm|md|lg)` e regra de supressão `.shadow-sm { box-shadow: none; }` no próprio `src/styles.css` sinalizadas como violação.
   - Escopo de regras UI/JSX aplicado indistintamente sobre arquivos `.test.ts(x)` e arquivos de dados/BFF não visuais.
3. **Dívida Real de UI/Sistema de Design (632 ocorrências pré-limpeza):**
   - `DL-01` (359), `DL-02` (93), `DL-03` (56), `DL-05` (33), `DL-12` (21), `DL-33` (16), `DL-14` (12), `DL-11` (10), `DL-18` (10), `DL-13` (9), `DL-07` (7), `DL-30` (3), `DL-28` (2), `DL-29` (1), `DL-04` (0).
   - Baseline desatualizada (`design-lint.baseline.json` registrava 747 violações / 720 P1).

---

## 2. Requisitos Funcionais e Arquiteturais (Sintaxe EARS)

### 2.1 Motor do Design Lint e Performance
- **REQ-EARS-01 [Performance]:** When `scripts/design-lint.mjs` scans all source files in `src/`, the linter engine shall eliminate O(n^2) per-character `RegExp` allocations in `hasTopLevelJsxAttribute` and skip JSX/Tailwind inspection on non-UI `.ts` files, completing the full repository scan in less than 10 seconds.
- **REQ-EARS-02 [Precisão DL-01]:** Where an HTML numeric entity (`&#\d+;`) or non-CSS hash reference appears outside color declarations, the `DL-01` matcher shall exclude numeric HTML entities and keep strict detection of CSS hex (`#rgb`, `#rrggbb`, `#rrggbbaa`) and `rgb()`/`hsl()` literals across UI components, routes, and stylesheets.
- **REQ-EARS-03 [Precisão DL-02]:** Where a Tailwind pseudo-selector or state variant (`group-[...]`, `peer-[...]`, `has-[...]`, `in-[...]`, `not-[...]`, `aria-[...]`, `data-[...]`, `supports-[...]`) or non-class regular expression literal appears, the `DL-02` analyzer shall exclude valid Tailwind variant selectors and restrict arbitrary class matching to UI/JSX/style class contexts.
- **REQ-EARS-04 [Precisão DL-07]:** While auditing `src/styles.css`, the `DL-07` analyzer shall permit token neutralization declarations (`--shadow-*: none`) and explicit shadow reset classes while enforcing zero decorative `shadow-(sm|md|lg|xl|2xl)` in UI application surfaces outside overlay/modal contexts.
- **REQ-EARS-05 [Escopo de Testes & BFF]:** While running lint across `src/`, test files (`*.test.ts`, `*.test.tsx`, `__tests__/`) and non-rendering pure TypeScript data/backend modules without JSX/CSS classes shall not trigger JSX-component rules or block unit-test color/assertion fixtures, while preserving full enforcement on all `.tsx` routes/components/hooks and `src/styles.css` (zero silent allowlist inflation for UI files).
- **REQ-EARS-06 [Cobertura de Testes do Linter]:** When any detection refinement or edge-case filter is added to `scripts/design-lint.mjs`, the suite `scripts/design-lint.test.mjs` shall include both positive (must detect violation) and negative (must allow valid syntax) unit test cases.

### 2.2 Remediação Completa do Codebase (Waves A–E)
- **REQ-EARS-07 [Semântica & Tokens — DL-33 / DL-18 / DL-01]:** Whenever UI components, routes, or canvas helpers use raw `amber-*` classes, literal `bg-white`/`bg-black`/`text-white` (except documented media overlays), or hardcoded hex/RGB colors, the system shall replace them with semantic tokens (`--warning`, `--warning-strong`, `bg-card`, `bg-foreground`, `text-background`, `text-foreground`, CSS variables or canonical utilities in `src/styles.css`) preserving light and dark theme contrast (`>= 4.5:1`).
- **REQ-EARS-08 [Grade de 4px & Classes Arbitrárias — DL-03 / DL-02]:** Whenever UI layouts or components contain half-step spacings (`*-0.5`, `*-1.5`, `*-2.5`, `*-3.5`) or bracket arbitrary classes (`aspect-[...]`, `left-[...]`, `min-w-[...]`, `h-[calc(...)]`, `w-[100mm]`, etc.), the system shall normalize them to strict 4px Tailwind multiples (`1`, `2`, `3`, `4`) or canonical semantic `@utility` classes in `src/styles.css` (e.g. `thermal-label-sheet`, `aspect-a4`, `left-1/2 top-1/2`, etc.).
- **REQ-EARS-09 [Alvos Táteis, Movimento, Sombras, Grids & Scroll — DL-14 / DL-28 / DL-07 / DL-29 / DL-30]:**
  - When interactive buttons/controls in UI surfaces measure below 44px on mobile/primary actions, the system shall enforce `h-11 min-h-11` (or `size-11`).
  - When `animate-*` classes are applied, the system shall guard animations with `motion-reduce:animate-none` (or `motion-safe:`).
  - When decorative `shadow-sm/md/lg` appears outside overlays, the system shall remove it in favor of flat 1px border layering.
  - When responsive multi-column grids (`grid-cols-3`) appear without mobile collapse, the system shall adopt `grid-cols-1 sm:grid-cols-3` or responsive breakpoints.
  - When horizontal tables or tab strips use `overflow-x-auto`, the system shall wrap or annotate them with canonical scrollable container patterns (`waesy-tab-strip`, `<ScrollContainer>` / semantic table scroller).
- **REQ-EARS-10 [Estilos Inline — DL-05]:** Whenever static inline `style={{ ... }}` attributes appear (padding, width, fixed layout), the system shall convert them to Tailwind utility classes; whenever dynamic CMS/tenant hex colors drive theme previews, swatch chips, or canvas projections, the system shall bind CSS custom properties (`--preview-color`, `--brand-*`) or semantic token mappings cleanly without static style drift.
- **REQ-EARS-11 [Matriz Completa de Estados — DL-11 / DL-12 / DL-13]:** Where async data queries (`useQuery`) or collection renders (`.map`) exist in flagged UI components and routes, the interface shall explicitly handle:
  - Loading state with structural `<Skeleton />` (`DL-11`).
  - Empty state with honest `<EmptyState />` or conditional empty feedback (`DL-12`).
  - Error state with `<ErrorState />` / recoverable retry feedback (`DL-13`).

### 2.3 Governança, Baseline e Prova Final
- **REQ-EARS-12 [Catraca Zero & Artefatos]:** After all fixes across engine and codebase are complete, the system shall regenerate `design-lint.baseline.json`, `design-lint.report.json`, and `docs/design/LINT_DASHBOARD.md` with `P0 = 0` and `P1 = 0`, pass `node scripts/design-lint.mjs --ratchet` cleanly, and record the architectural decision in `docs/design/DECISIONS.md`.

---

## 3. Invariantes e Gates de Aceite

1. **Zero falsificação de conformidade:** Proibido adicionar novos diretórios de componentes de UI ao `allowlist` de `.designlintrc.json` ou desabilitar regras para ocultar defeitos reais. Exceções inline (`design-lint-ignore`) permanecem estritamente restritas a comentários técnicos documentados quando matematicamente inevitáveis (ex.: renderização dinâmica de cor cadastrada pelo usuário em canvas/artboard).
2. **Integridade de Builds & Tipos:**
   - `node scripts/design-lint.test.mjs` -> Exit 0, 100% passed.
   - `node scripts/design-lint.mjs --ratchet` -> Exit 0, tempo `< 10s`, `P0: 0`, `P1: 0`.
   - `node scripts/contrast-audit.mjs` -> Exit 0.
   - `npm run check:tokens` -> Exit 0.
   - `npm run audit:buttons:test` & `npm run audit:buttons` -> Exit 0.
   - `npm run typecheck` -> Exit 0.
   - `npm test` -> Sem novas falhas / suíte aprovada.
   - `npm run build` -> Exit 0.
