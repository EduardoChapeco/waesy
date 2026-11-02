# SPEC-TURISMO-FULL-CANVAS-DOSSIER-REFACTOR — Refatoração Arquitetural Clean Tech (Full-Canvas Kanban, Ficha 360° Dossier & Sub-Módulos)

## 1. Contexto e Escopo
Refatoração profunda de UI/UX e engenharia de layout para os módulos operacionais de Turismo e Motor de Kanban Compartilhado do Waesy, erradicando o esmagamento de telas, a poluição de cabeçalhos múltiplos e a compressão do Sheet lateral, sem remover ou alterar nenhuma regra de negócio, cálculo financeiro, API ou sub-módulo existente.

## 2. Requisitos em Sintaxe EARS

- **REQ-01 (Ubiquitous - Full-Canvas Kanban Desktop):**
  THE SYSTEM SHALL renderizar o Kanban de Turismo e o Motor de Kanban Compartilhado em viewport widescreen blindada no desktop (`>= 840px`), ocupando 100% da largura e altura útil do `<main>` sem restrição `max-w-7xl` quando em modo Kanban, mantendo cabeçalho fixo compacto e rolagem vertical exclusiva dentro de cada coluna (`flex-1 min-h-0 overflow-y-auto`).

- **REQ-02 (State-Driven - Bifurcação Mobile do Kanban):**
  WHILE a viewport for compacta (`< 600px`), THE SYSTEM SHALL substituir o trilho horizontal multi-coluna por um seletor de fase estilo Segmented Control no topo, exibindo exclusivamente a coluna ativa em `w-full` com cards táteis e alvos mínimos de 44px (`h-11 min-h-11`).

- **REQ-03 (Event-Driven - Ficha Completa do Lead 3 Colunas):**
  WHEN o operador clicar em um `LeadCard`, THE SYSTEM SHALL abrir o `SheetContent` lateral com variante de largura expandida (`size="dossier"` / `size="2xl"` no desktop cobrindo até `max-w-7xl`, e `100dvh` fullscreen no mobile), preservando a estrutura de 3 colunas (Formulário Inicial à esquerda, 9 abas operacionais ao centro e Transição de Fase / Ações à direita) sem compressão de inputs.

- **REQ-04 (Ubiquitous - Estética Squircle e Tipografia Tabular):**
  THE SYSTEM SHALL aplicar superfícies squircle (`rounded-2xl`), bordas sutis de token (`border-border/50`), barra de topo colorida por estágio no cabeçalho de cada coluna, tipografia `tabular-nums font-mono` para valores financeiros e destaque de comissão em verde esmeralda (`text-emerald-600 dark:text-emerald-400`).

- **REQ-05 (Unwanted Behavior - Zero Perda Funcional e Conformidade Design Lint):**
  IF qualquer alteração for realizada nos componentes do escopo, THEN THE SYSTEM SHALL preservar 100% das 9 abas da Ficha do Lead, os 16 sub-módulos de turismo, o mapa de assentos de ônibus, o estúdio de propostas e a conciliação de comissões, mantendo zero violações P0/P1 no `scripts/design-lint.mjs --ratchet` (proibido uso de valores arbitrários entre colchetes DL-02, cores literais DL-01 ou espaçamentos fora da grade de 4px DL-03).

## 3. Inventário de Arquivos no Escopo Atômico
1. `src/components/ui/sheet.tsx` — Adição da variante `size="dossier"` para impedir que `md:max-w-2xl lg:max-w-3xl` esmague o Sheet de 3 colunas.
2. `src/components/workspace/workspace-shell.tsx` — Desbloqueio de `max-w-7xl` e controle de viewport para rotas full-canvas (`/workspace/turismo`, `/workspace/crm`, `/workspace/turismo/embarques`).
3. `src/routes/workspace.turismo.index.tsx` — Refatoração do Sub-Header unificado, Full-Canvas Kanban Desktop + Segmented Stage Selector Mobile, e Ficha do Lead de 3 colunas e 9 abas.
4. `src/components/tourism/crm/LeadCard.tsx` — Refinamento visual Squircle (temperatura semântica, metadados limpos, valor + comissão em `tabular-nums`).
5. `src/components/workspace/kanban/full-viewport-kanban.tsx` & `src/components/workspace/kanban/niche-kanban-board.tsx` — Motor compartilhado de Kanban com barra superior de fase, rolagem vertical isolada e bifurcação mobile.
6. `src/routes/workspace.turismo.embarques.tsx` & `src/components/tourism/groups/bus-seat-map.tsx` — Polimento Squircle no Cockpit de Embarques e Mapa de Poltronas.
7. `src/routes/workspace.turismo.comissoes.tsx` — Cartões de KPI financeiro e tabela de conciliação em `tabular-nums`.

## 4. Invariantes e Evidências de Verificação
- `npm run typecheck` -> Exit Code 0.
- `npm run build` -> Exit Code 0.
- `node scripts/design-lint.mjs --ratchet` -> 0 novas violações P0/P1.
- `npm test` -> 100% dos testes passando.
