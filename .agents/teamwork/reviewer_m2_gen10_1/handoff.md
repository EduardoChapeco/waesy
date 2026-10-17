# Handoff Report — Reviewer M2.1 (Milestone 2)

## 1. Observation

### Verification of Commit 59f3a418
- Commit: `59f3a418e75bf467942c5b88a5dd558b0261ee54`
- Message: `feat(m2): mobile nativization, canonical header height B.26, bottom sheets and anti-jank ergonomics`
- Scope: 28 files changed (+776, -550).

### Invariant B.26 Canonical Height & Navigation Controls
1. `src/components/navigation/native-mobile-header.tsx`:
   - Line 77: Safe area top inset normalized with `pt-safe` replacing arbitrary classes.
   - Line 81: Header container height pinned to `h-11 min-h-11 w-full min-w-0` (44px canonical height B.26) replacing `h-12 sm:h-14`.
   - Line 83, 88: Back button `size-11 min-h-11 min-w-11` with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`.
   - Line 121: Search input `h-11 min-h-11` with `focus-visible:ring-2 focus-visible:ring-primary`.
   - Line 130: Close search button `size-11 min-h-11 min-w-11` with `focus-visible:ring-2 focus-visible:ring-primary`.
   - Line 169, 178: Search trigger button `size-11 min-h-11 min-w-11` with `focus-visible:ring-2 focus-visible:ring-primary`.
   - Line 192: Filter trigger button `size-11 min-h-11 min-w-11` with `focus-visible:ring-2 focus-visible:ring-primary`.
   - Line 207: Dual action prop support `{rightActions || rightAction}`.
   - Line 200: Counter badge updated from `text-[9px]` to `text-xs font-bold leading-none` and `min-w-4 h-4 px-1`.

2. `src/components/shell/app-shell.tsx`:
   - Lines 92–138: Exported and unified `checkHasCustomPageMobileHeader(pathname: string): boolean`.
   - Cleans pathname via `const clean = pathname.replace(/\/+$/, "") || "/"`.
   - Explicitly matches `/faq` in `exactCustomRoutes`.
   - Explicitly matches all 17 `/conta/*` subroutes (`/conta/atividade`, `/conta/avaliacoes`, `/conta/enderecos`, `/conta/entregador`, `/conta/financas`, `/conta/salvos`, `/conta/trocas`, `/conta/conversas`, `/conta/agendamentos`, `/conta/classificados`, `/conta/negociacoes`, `/conta/comissoes`, `/conta/curriculo`, `/conta/empresa`, `/conta/ingressos`, `/conta/notificacoes`, `/conta/pedidos`).
   - Line 293: `const hasCustomPageMobileHeader = checkHasCustomPageMobileHeader(location.pathname);`.
   - Line 302: `shouldRenderGlobalNativeMobileHeader = ... && !hasCustomPageMobileHeader ...`.
   - Redundant global mobile header is eradicated on custom-headed subroutes.

3. `src/components/shell/mobile-nav.tsx`:
   - Line 171: Bottom safe area container `fixed bottom-0 inset-x-0 z-40 pb-safe pb-16`.
   - Lines 206, 221, 245, 261: All navigation tab links and buttons implement `h-12` (48px >= 44px min), `active:scale-95`, and `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.
   - Typography updated to `text-xs font-semibold` across all labels.
   - Lines 110–160: Virtual keyboard detection (`focusin`, `focusout`, `visualViewport.resize`) hides dock during input typing.

4. Bottom Sheets Conversion:
   - `src/components/commerce/quick-create-modal.tsx`: Refactored to `<SheetContent side="bottom" className="max-h-overlay-max ... rounded-t-3xl">`, iOS grab handle, 44px buttons, semantic buttons with focus rings.
   - `src/components/shell/global-menu-hub.tsx`: Configured with `<SheetContent side="bottom" className="h-overlay-max max-h-overlay-max ... rounded-t-3xl">`, iOS grab handle (`w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto my-3`), 44px buttons (`h-11`).
   - `src/components/location/location-master-pill.tsx`: Responsive modal bifurcated via `useWindowSizeClass()`: uses `<Sheet side="bottom">` on `isCompact` (<640px) with iOS grab handle and `<Dialog>` on desktop.
   - `src/components/common/action-auth-guard-modal.tsx`: Bifurcated via `useWindowSizeClass()`: `<Sheet side="bottom">` on `isCompact` with grab handle, preserved `returnUrl`.
   - `src/components/common/share-modal.tsx`: Bifurcated via `useWindowSizeClass()`: `<Sheet side="bottom">` on `isCompact` with grab handle, responsive channels grid `grid-cols-2 sm:grid-cols-4`, 44px buttons.
   - `src/components/classifieds/catalog/classified-filter-sheet.tsx`: Converted from `Dialog` to `<Sheet side="bottom">` with iOS grab handle.

5. Dead Filter Connection in `_store.buscar.tsx`:
   - Lines 657, 1057–1078: Mounted `<FacetedSearchSheet>` controlled by `isFilterSheetOpen`, wired to active facets (`categories`, `niches`, `minPrice`, `maxPrice`, `sort`), `handleApplyFilters` and `onResetFilters`.
   - Line 675: Purged microfont to `text-xs font-semibold` with focus rings.

### Desktop Inpage Pairing Across 7 Affected Routes
1. `src/routes/_store.faq.tsx` (Lines 35–40):
   - Added `<div className="hidden md:flex items-center justify-between border-b border-border/40 pb-4 pt-2 mb-6 max-w-3xl mx-auto px-4 md:px-6">`.
2. `src/routes/_store.conta.entregador.tsx` (Lines 406–414):
   - Added `<div className="hidden md:flex items-center justify-between pb-4 border-b border-border/40">` with `WAESY GO` badge; paired with `<NativeMobileHeader mobileOnly />`.
3. `src/routes/_store.conta.pedidos.$id.tsx` (Lines 257–283):
   - Added `<div className="hidden md:flex items-center justify-between pb-4 border-b border-border/40 mb-6">` with companion action button (`h-11 min-h-11`); paired with `<NativeMobileHeader mobileOnly />`.
4. `src/routes/_store.diretorio.index.tsx` (Lines 124–129):
   - Added `<div className="hidden md:flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 border-b border-border/40">`; paired with `<NativeMobileHeader mobileOnly />`.
5. `src/routes/_store.eventos.tsx` (Lines 575–580):
   - Added `<div className="hidden md:flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 border-b border-border/40">`; paired with `<NativeMobileHeader mobileOnly />`.
6. `src/routes/_store.empregos.index.tsx` (Lines 127–132):
   - Added `<div className="hidden md:flex items-center justify-between pt-2 pb-4 border-b border-border/40">`; paired with `<NativeMobileHeader mobileOnly />`.
7. `src/routes/_store.conta.atividade.tsx` (Lines 163–170):
   - Refactored header to `<div className="hidden md:flex items-center justify-between gap-4 border-b pb-4">`; paired with `<NativeMobileHeader mobileOnly />`.

### CLI Test Executions & Ratchet Results
1. Command: `npx.cmd vitest run src/components/location/location-master-pill.test.ts src/routes/__tests__/apple-hig-design.test.ts`
   - Result: 2 passed (2), 7 tests passed (100% green).
2. Command: `npx.cmd vitest run src/routes/__tests__/route-integrity-w10.test.ts src/routes/__tests__/store-route-loaders.test.ts`
   - Result: 2 passed (2), 6 tests passed (100% green).
3. Command: `node scripts/design-lint.mjs --ratchet`
   - Result: Exit Code 0, 0 new P0/P1 violations, visual debt reduced by 95 violations across the codebase.
4. Architectural Decision:
   - DEC-207 registered in `docs/design/DECISIONS.md` (Lines 2871–2878).

---

## 2. Logic Chain

1. *Observation 1* verifies that interactive navigation controls and headers in `NativeMobileHeader` strictly adhere to the Invariant B.26 height requirement (`h-11 min-h-11`), eliminating arbitrary heights and bracketed classes.
2. *Observation 2* demonstrates that `checkHasCustomPageMobileHeader` cleanly encapsulates sub-route pattern matching. By inspecting `exactCustomRoutes` and `prefixCustomRoutes` (including `/faq` and all 17 `/conta/*` subroutes), `AppShell` correctly suppresses the outer mobile header, preventing double headers.
3. *Observation 3* confirms that each of the 7 routes pairs a mobile-only native header (`mobileOnly` = `md:hidden`) with a dedicated desktop inpage header (`hidden md:flex`), guaranteeing responsive layout coherence on both mobile (<768px) and desktop (>=768px).
4. *Observation 4* confirms modal ergonomics: viewports <640px now receive bottom sheets with iOS grab handles (`w-10 h-1` / `w-12 h-1.5`) and max heights (`max-h-overlay-max`), eliminating centered desktop modal reachability issues.
5. *Observation 5* confirms that the previously non-functional search filter in `_store.buscar.tsx` is now fully operational via `FacetedSearchSheet`.
6. Independent Vitest execution confirms all 13 unit/integration tests pass with 0 failures, and Design Lint confirms ratchet compliance with 95 fewer violations.
7. Active inspection for integrity violations revealed no hardcoded test stubs, no dummy facades, no shortcuts, and no fabricated artifacts.

---

## 3. Caveats

- Background typecheck revealed pre-existing syntax errors in `src/components/admin/builder/builder-add-panel-3col.tsx` from commit `681128b9` (Oct 9, 2026), unrelated to Milestone 2. None of the 28 files modified in Milestone 2 introduced any TypeScript errors. Full typecheck and build validation remain scheduled for Milestone 5 as defined in `PROJECT.md`.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 2 (commit `59f3a418`) successfully delivers all required mobile nativization, canonical height (Invariant B.26), safe area insets, focus rings, app shell double header eradication, and desktop inpage pairing without regressions.

---

## 5. Verification Method

To independently reproduce and verify this review:

1. **Check Git Commit**:
   ```powershell
   git show --stat 59f3a418
   ```
   Expect 28 files changed (+776, -550).

2. **Execute Vitest Suites**:
   ```powershell
   npx.cmd vitest run src/components/location/location-master-pill.test.ts src/routes/__tests__/apple-hig-design.test.ts
   npx.cmd vitest run src/routes/__tests__/route-integrity-w10.test.ts src/routes/__tests__/store-route-loaders.test.ts
   ```
   Expect 4 test files, 13 tests passed, exit code 0.

3. **Execute Design Lint Ratchet**:
   ```powershell
   node scripts/design-lint.mjs --ratchet
   ```
   Expect exit code 0 and confirmation of reduced visual debt.

4. **Verify Route Pairing & Invariant B.26**:
   Inspect `src/components/shell/app-shell.tsx` line 92 (`checkHasCustomPageMobileHeader`), `src/components/navigation/native-mobile-header.tsx` line 81 (`h-11 min-h-11`), and the 7 routes for `hidden md:flex`.
