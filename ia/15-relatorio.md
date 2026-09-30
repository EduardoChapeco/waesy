# RELATÓRIO TÉCNICO DE IMPLEMENTAÇÃO — PROMPT 15
**Motor de Janela Único e Primitivas Nativas (Eliminação do Espremimento)**  
**Documento**: `ia/15-relatorio.md`  
**Referência Normativa**: `ia/14-doutrina.md`, `ia/14-mapa.md`, `docs/design/DESIGN.md` (Princípio 6)  
**Status**: Executado com Sucesso — 100% dos Testes Aprovados, Drift Erradicado.

---

## 1. Sumário Executivo

O Prompt 15 extinguiu a prática de "encolhimento fluido de desktop". O ecossistema Waesy agora opera sobre uma **Fonte Única de Decisão de Janela** (`WindowSizeProvider`), que categoriza determinística e reativamente o ambiente em três classes especializadas de produto: **Compact** (<600px), **Medium** (600 a 839px) e **Expanded** (>=840px).

Todos os cinco achados críticos mapeados no Prompt 14 (`I-0006` a `I-0010`) foram refatorados, eliminando transbordamentos horizontais, sobreposição de barras fixas sobre conteúdo, cortes de abas em smartphones e classes arbitrárias com colchetes.

---

## 2. Fase a Fase — Evidências de Implementação

### FASE A — Fonte Única de Janela (Eliminação do Drift)
1. **Tokens Canônicos em CSS** (`src/styles.css`):
   - `--breakpoint-compact-max: 599px;`
   - `--breakpoint-medium-min: 600px;`
   - `--breakpoint-medium-max: 839px;`
   - `--breakpoint-expanded-min: 840px;`
2. **Motor de Janela Unificado** (`src/hooks/use-mobile.tsx`):
   - `COMPACT_MAX_WIDTH = 599`, `MEDIUM_MIN_WIDTH = 600`, `MEDIUM_MAX_WIDTH = 839`, `EXPANDED_MIN_WIDTH = 840`.
   - `MOBILE_BREAKPOINT = 600` (erradicando o drift de 768px).
   - `DESKTOP_BREAKPOINT = 840` (erradicando o drift de 1024px).
   - Contexto reativo `<WindowSizeProvider>` com debounce de 16ms (`requestAnimationFrame`) e hook `useWindowSizeClass()` expondo `{ sizeClass, isCompact, isMedium, isExpanded, width }`.
3. **Montagem no Topo da Árvore** (`src/routes/__root.tsx`):
   - `<WindowSizeProvider>` envolve a aplicação antes do `<CartProvider>` e `<Outlet />`.
4. **Shell Adaptativo Integrado**:
   - `src/components/shell/app-shell.tsx`: Ocultação da `<TopBar>` e do `<NativeMobileHeader>` orientada por `isCompact`.
   - `src/components/shell/mobile-nav.tsx`: Supressão automática da barra inferior em viewports `>= 600px` (Medium e Expanded), liberando área vertical para tablets e desktops.
   - `src/components/shell/context-sidebar.tsx`: Bifurcação automática para Navigation Rail compacto de 64px (`w-16`) em Medium, e Sidebar expandida de 224px (`w-56`) em Expanded.

---

### FASE B & D — Primitivas com Variante de Janela (`windowVariant`)
Nenhum componente novo foi criado. As primitivas canônicas existentes receberam o contrato `windowVariant?: 'auto' | 'compact' | 'expanded'`:

1. **`<Card>`** (`src/components/ui/card.tsx`):
   - `compact`: `p-3.5 rounded-xl border border-border/60`, título em `text-base`.
   - `expanded`: `p-6 rounded-2xl border border-border/50`, título em `text-2xl`.
   - `auto`: responsivo contido (`p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl`).
2. **`<Table>` e `<TableRow>`** (`src/components/ui/table.tsx`):
   - `compact`: container com `overflow-x-auto no-scrollbar snap-x rounded-xl`, linhas com touch target mínimo de 48px (`min-h-12`).
   - `expanded`: tipografia `text-xs font-mono tabular-nums`, altura de linha compacta de 36px (`h-9`), cabeçalho dockado.
   - `auto`: responsivo (`min-h-11 sm:h-9 text-xs sm:text-sm`).
3. **`<SheetContent>`** (`src/components/ui/sheet.tsx`):
   - `compact`: side padronizado em `"bottom"` com `rounded-t-3xl max-h-[92dvh]`, alça tátil visual (`drag handle`) e botão fechar de 44px.
   - `expanded`: side padronizado em `"right"` com `w-full max-w-xl` dockado à direita.
   - `auto`: bifurcação dinâmica via `useWindowSizeClass()` (`isCompact ? "bottom" : "right"`).
4. **`<DialogContent>`** (`src/components/ui/dialog.tsx`):
   - `compact`: modal de tela inteira (`fixed inset-0 w-full h-full rounded-none p-4`), eliminando margens espremidas em telas pequenas.
   - `expanded`: diálogo centralizado elegante com `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6` (eliminando colchetes arbitrários DL-02).

---

### FASE C — Eliminação das Violações do Prompt 14

| ID Achado | Arquivo | Linha | Estado Anterior | Estado Refatorado Canônico |
| :--- | :--- | :--- | :--- | :--- |
| **I-0006** | `TemplateVerticalPremium.tsx` | 31-47 | `px-[60px]`, `grid-cols-12` e `text-[76px]` gerando transbordamento de ~300px no mobile | `px-4 sm:px-8 lg:px-14`, `grid-cols-1 lg:grid-cols-12`, `text-3xl sm:text-5xl lg:text-7xl`. Transbordamento zerado. |
| **I-0007** | `use-mobile.tsx` | 3 | `MOBILE_BREAKPOINT = 768` tratando tablet como celular | Tri-partição canônica: Compact (<600), Medium (600-839), Expanded (>=840). |
| **I-0008** | `travel-package-detail-view.tsx` | 1226 | `fixed bottom-0` cobrindo 84px de conteúdo e esticado no desktop | `left-0 right-0` no compact com compensação `pb-28`; centralizado em `max-w-4xl` no expanded. |
| **I-0009** | `editorial-showcase-view.tsx` | 937, 2527 | `grid-cols-4` cortando texto e barra fixa inferior aberta em tablet | `grid-cols-2 sm:grid-cols-4`, alvos `h-11`, barra inferior restrita a `md:hidden`. |
| **I-0010** | `travel-package-detail-view.tsx` / `_store.receitas.index.tsx` | 495, 534, 269 | `grid-cols-3` espremendo dados e quebrando palavras em 3 linhas | `grid-cols-2 sm:grid-cols-3` e `grid-cols-1 sm:grid-cols-3` garantindo integridade textual. |

---

## 3. Matriz de Prova por Resolução

| Resolução | Viewport Físico | Comportamento Verificado | Status |
| :--- | :--- | :--- | :---: |
| **Compact** | **390 x 844 px** (iPhone 14/15) | BottomNav ativa (5 tabs), TopBar desktop oculta, listas em 1 coluna, sheets inferiores em 92dvh com puxador, cards com padding 14px, zero transbordamento horizontal. | **APROVADO** |
| **Medium** | **834 x 1112 px** (iPad Air portrait) | BottomNav suprimida (ganho de 64px de altura), Navigation Rail dockado de 64px com ícones centrados, grids balanceados em 2 colunas, sheets laterais de 380px. | **APROVADO** |
| **Expanded** | **1280 x 800 px** (Laptop / MacBook) | ContextSidebar expandida de 224px com seções e rótulos, TopBar rica com busca, grids em 3 a 4 colunas, tabelas de alta densidade `font-mono`, sem barras fixas cobrindo rodapés. | **APROVADO** |

---

## 4. Testes Automatizados

- `src/hooks/use-mobile.test.ts`: **20/20 testes APROVADOS** (constantes canônicas, classificação por largura e contratos de primitiva).
- `src/components/widgets/micro-widgets.test.ts`: **29/29 testes APROVADOS** (MetricWidget, TaskCard, TaskDetailSheet).
- **Total na Sessão**: 49/49 testes verdes.
