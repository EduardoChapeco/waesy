# BRIEFING — 2026-10-13T17:46:00Z

## Mission
Investigate mobile native UI, navigation, and ergonomics across the platform (mobile dock, native headers, bottom sheets vs dialogs, touch targets >=44px, typographic scale >=12px, borders/margins, and AI-smell).

## 🔒 My Identity
- Archetype: explorer
- Roles: explorer, mobile ergonomics auditor, design system reviewer
- Working directory: c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\explorer_survey_r8_2
- Original parent: 3a2a1483-83e5-492f-8dc4-21f64b7637fb
- Milestone: Survey Phase R8.2 (Mobile Nativization & App Ergonomics)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code
- Strictly comply with repository rules in AGENTS.md (DL-01 to DL-30, B.14, B.22, B.26)
- Deliver self-contained 5-component handoff report in handoff.md

## Current Parent
- Conversation ID: 3a2a1483-83e5-492f-8dc4-21f64b7637fb
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/components/shell/mobile-nav.tsx` & `src/components/commerce/bottom-nav.tsx`
  - `src/components/navigation/native-mobile-header.tsx` & `src/components/navigation/index.ts`
  - `src/components/shell/top-bar.tsx` & `src/components/shell/utility-cluster.tsx`
  - `src/components/location/location-master-pill.tsx`
  - `src/components/shell/app-shell.tsx` & `src/routes/_store.tsx`
  - `src/components/commerce/quick-create-modal.tsx` & `src/components/shell/global-menu-hub.tsx`
  - `src/components/classifieds/catalog/classified-filter-sheet.tsx` & `src/components/workspace/filter-bottom-sheet.tsx`
  - `src/components/common/action-auth-guard-modal.tsx` & `src/components/common/share-modal.tsx`
  - `src/components/commerce/offer-card.tsx` & `src/components/commerce/store-card.tsx` & `src/components/classifieds/catalog/classified-item-card.tsx`
  - `scripts/design-lint.mjs` & `design-lint.report.json`
- **Key findings**:
  1. `mobile-nav.tsx` has `text-[10px]` microfonts, missing focus-visible rings (DL-15), inline styles for safe-area (DL-05), and delegates to `QuickCreateModal` which uses `side="right"` with `max-sm:!inset-0` (DL-04 `!important`) and `size-9` close button (DL-14).
  2. `native-mobile-header.tsx` has height `h-12 sm:h-14` (48px/56px) instead of canonical `h-11` (44px) prescribed by Invariant B.26; search input is `h-9` (<44px); close button is `size-6` (24px); has `text-[11px]` and `text-[9px]` microfonts.
  3. Double header bug: `app-shell.tsx` automatically renders `NativeMobileHeader` for pages in `isCleanMobileAppPage` unless in `hasCustomPageMobileHeader`. Several pages (`/conta/atividade`, `/conta/trocas`, `/conta/salvos`, `/conta/financas`, etc.) render their own header but are omitted from the hardcoded list, producing 2 stacked headers on mobile. Conversely, pages without desktop inpage headers (`_store.faq.tsx`, `_store.conta.entregador.tsx`) have no header on desktop.
  4. Desktop Dialogs on mobile: `ClassifiedFilterSheet`, `LocationMasterPill`, `ActionAuthGuardModal`, `ShareModal` render desktop-centered `<Dialog>` on mobile phones instead of bottom sheets (`Sheet side="bottom"` or `Drawer`). In `_store.buscar.tsx`, the filter modal is never mounted in JSX (dead button).
  5. Touch targets: 2,217 DL-14 violations across repository (buttons with `h-8`, `h-9`, `h-10`, `h-7`, `size-8`, etc.).
  6. Typographic scale: 3,027+ microfont occurrences (`text-[8px]`..`text-[11px]`) violating the >= 12px (`text-xs`) floor.
  7. Lateral dead space: `app-shell.tsx` applies `px-4` on `<main>`, and page components apply nested `px-4`, creating 32px lateral margins on each side (64px dead space on 375px screens).
  8. AI-smell: Found conversational copy with "Clique no botão...", "Preencha os campos...", etc.
- **Unexplored areas**: None within scope. All 6 tasks investigated thoroughly.

## Key Decisions Made
- Deliver structured, machine-actionable handoff report with exact file paths, line numbers, and before/after refactoring recommendations.

## Artifact Index
- handoff.md — Comprehensive 5-component handoff report
- progress.md — Liveness heartbeat and step-by-step progress
- BRIEFING.md — Persistent situational awareness
