# Progress — explorer_m1_2

Last visited: 2026-11-04T04:44:00Z

## Status
- [x] Initial setup & briefing update (DISPATCH.md, BRIEFING.md, progress.md)
- [x] Step 1: Examine existing toolbars, kanban, table, and workspace views:
  - Inspected `src/components/workspace/workspace-canonical-toolbar.tsx` (Tier 1 & Tier 2 layout, tabs vs view modes)
  - Inspected `src/components/workspace/kanban/full-viewport-kanban.tsx` (FullViewportKanban props & column rendering)
  - Inspected `src/components/workspace/kanban/niche-kanban-board.tsx` (NicheKanbanBoard & card layout)
  - Inspected `src/components/ui/table.tsx` (TableWindowVariant, TableRow heights min-h-11 sm:h-9)
  - Inspected workspace routes: `workspace.pedidos.index.tsx`, `workspace.clientes.index.tsx`, `workspace.tarefas.tsx`, `workspace.agenda.index.tsx`
  - Inspected `src/design-system/components/segmented-control.tsx` and `src/components/workspace/module-action-header.tsx`
- [x] Step 2: Component design for `UniversalViewManager<T>`:
  - Polymorphic generic props `<T>`
  - Renderers: table, kanban, cards
  - Loading skeleton state (auto-fallback for table, kanban, cards + custom renderSkeleton)
  - Empty state (auto-fallback with EmptyState + custom emptyState)
  - Error state (auto-fallback with ErrorState + onRetry)
  - Single Sovereign Surface (DL-31) compliance
- [x] Step 3: Component design for `ViewModeSwitcher`:
  - Segmented control / pill switcher (Apple HIG)
  - Icons (`List`, `Kanban`, `LayoutGrid`) from Lucide
  - Keyboard shortcuts listener (`1`=table, `2`=kanban, `3`=cards) with input/textarea focus guard
  - Accessibility & WCAG 2.2 AA / AAA (ARIA roles `radiogroup`/`radio`, `:focus-visible:ring-2`, touch target >=44px `min-h-11`)
  - Motion tokens & reduced motion compliance (`motion-reduce:transition-none`, DL-28)
- [x] Step 4: URL query synchronization (`?view=table|kanban|cards`) with TanStack Router & local storage / BFF fallback
  - Designed custom hook `useWorkspaceViewMode`
  - TanStack Router search param schema and `navigate({ search: ..., replace: true })`
  - LocalStorage persistence with multi-tenant key `waesy_view_pref_${module}_${storeId}`
- [x] Step 5: Downstream Worker instructions & concrete code specifications in `handoff.md` and `test_spec_universal_view_modes.tsx`
- [x] Step 6: Write handoff.md and send message to parent orchestrator
