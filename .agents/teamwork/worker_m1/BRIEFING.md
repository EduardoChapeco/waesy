# BRIEFING — 2026-11-04T04:55:00Z

## Mission
Implement Milestone M1 (Features 1 to 5): Single Sovereign Surface foundations, KpiMetricCard, MiniSparkline, UniversalViewManager, ViewModeSwitcher, useWorkspaceViewMode, database migration for workspace_user_view_preferences, BFF Server Functions, and Vitest suite with 100% genuine code, passing build and tests.

## 🔒 My Identity
- Archetype: worker
- Roles: [implementer, qa, specialist]
- Working directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1
- Original parent: 71cb6393-bf04-4e51-946b-1dd9ac61e734
- Milestone: M1 — Foundations, Primitives & View Preferences Implementation

## 🔒 Key Constraints
- Zero cheat: Genuine code only, maintain real state and real behavior.
- Invariant B.25: 100% parameter destructuring in BFF functions with defensive null/optional handling.
- Anti-Containeritis (DL-31): Single Sovereign Surface, no card inside card.
- Apple HIG & DL-14: Touch targets >= 44x44px (`h-11 min-h-11`).
- Design lint: Zero new P0/P1 violations, pass `--ratchet`.
- Terminal on Windows: Always use `cmd /c` to run commands.
- Mutação Cirúrgica: Use edit_file / replace_file_content for existing files, write_to_file only for new files.

## Current Parent
- Conversation ID: 71cb6393-bf04-4e51-946b-1dd9ac61e734
- Updated: not yet

## Task Summary
- **What to build**: 
  1. `src/components/workspace/mini-sparkline.tsx`
  2. `src/components/workspace/kpi-metric-card.tsx`
  3. `src/components/workspace/index.ts` (export new components)
  4. `src/components/workspace/view-modes/universal-view-manager.tsx`
  5. `src/components/workspace/view-modes/view-mode-switcher.tsx`
  6. `src/components/workspace/view-modes/use-workspace-view-mode.ts`
  7. `src/components/workspace/view-modes/index.ts`
  8. `src/components/workspace/workspace-canonical-toolbar.tsx` (viewSwitcher prop)
  9. `supabase/migrations/20270220030000_workspace_user_view_preferences.sql`
  10. `src/services/workspace-view-preferences.functions.ts`
  11. `src/services/__tests__/workspace-view-preferences.test.ts`
- **Success criteria**:
  - Tests pass: `cmd /c npx vitest run src/services/__tests__/workspace-view-preferences.test.ts`
  - Typecheck passes: `cmd /c npm run typecheck`
  - Build passes: `cmd /c npm run build`
  - Design lint passes: `node scripts/design-lint.mjs --ratchet`
- **Interface contracts**: `PROJECT.md` Section 1, 2, 3
- **Code layout**: `PROJECT.md` § Code Layout

## Key Decisions Made
- Used migration timestamp `20270220030000_workspace_user_view_preferences.sql` to avoid collision with pre-existing `20270220000000` migration.
- MiniSparkline uses pure math cubic Bezier curves in native SVG with `useId()` and CSS variables to avoid external heavy chart dependencies.
- TooltipProvider is wrapped locally inside KpiMetricCard since RootComponent lacks global TooltipProvider.

## Artifact Index
- `.agents/teamwork/worker_m1/DISPATCH.md` — Assignment & constraints
- `.agents/teamwork/worker_m1/BRIEFING.md` — Working memory
- `.agents/teamwork/worker_m1/progress.md` — Liveness & task progress
- `.agents/teamwork/worker_m1/handoff.md` — Final handoff report

## Change Tracker
- **Files modified**: TBD
- **Build status**: Pending
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: `src/services/__tests__/workspace-view-preferences.test.ts`
