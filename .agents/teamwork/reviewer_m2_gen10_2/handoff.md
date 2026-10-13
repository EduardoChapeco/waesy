# Handoff Report — Reviewer M2.2 (Milestone 2 Quality & Adversarial Review)

## 1. Observation

### A. Verification of Bottom Sheet Conversions
1. `src/components/classifieds/catalog/classified-filter-sheet.tsx`:
   - Line 3: Imported `Sheet, SheetContent, SheetHeader, SheetTitle` from `@/components/ui/sheet`.
   - Line 123: Rendered `<SheetContent side="bottom" className="w-full sm:max-w-lg max-h-overlay-max p-0 flex flex-col rounded-t-lg border-t border-border bg-background outline-none sm:mx-auto">`.
   - Lines 129–131: Embedded iOS grab handle `<div className="pt-3 pb-1 flex justify-center shrink-0"><div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" /></div>`.
   - Line 604: CTA button enforces 44px minimum touch target `h-11 min-h-11` and `:focus-visible:ring-2`.

2. `src/components/location/location-master-pill.tsx`:
   - Lines 8–9: Imported `Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription` and `useWindowSizeClass`.
   - Line 440: Evaluated `const { isCompact } = useWindowSizeClass();`.
   - Lines 739–771: On `isCompact` (<640px), renders `<Sheet side="bottom">` with `<SheetContent side="bottom" className="p-0 overflow-hidden bg-background max-h-overlay-max flex flex-col rounded-t-lg border-t border-border outline-none">` and iOS grab handle (`w-12 h-1.5`).
   - Lines 773–800: On desktop/expanded (>=640px), preserves `<Dialog>` with centered modal ergonomics.

3. `src/components/common/action-auth-guard-modal.tsx`:
   - Line 5: Imported `Sheet, SheetContent` and `useWindowSizeClass`.
   - Line 31: Evaluated `const { isCompact } = useWindowSizeClass();`.
   - Lines 78–87: On `isCompact`, renders `<Sheet side="bottom">` with `<SheetContent side="bottom" className="p-5 rounded-t-lg border-t border-border bg-background flex flex-col gap-4 outline-none">` and iOS grab handle (`w-12 h-1.5`).
   - Lines 58–73: Preserves `returnUrl: currentPath` with 44px buttons (`h-11 min-h-11`).
   - *Observation detail*: Lines 41–42 use raw `<h3>` instead of `SheetTitle`/`DialogTitle`, which can trigger a Radix accessibility warning in browser console.

4. `src/components/common/share-modal.tsx`:
   - Line 4: Imported `Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription` and `useWindowSizeClass`.
   - Line 25: Evaluated `const { isCompact } = useWindowSizeClass();`.
   - Lines 127–146: On `isCompact`, renders `<Sheet side="bottom">` with `<SheetContent side="bottom">` and iOS grab handle (`w-12 h-1.5`).
   - Lines 49–94: Responsive channels grid `grid-cols-2 sm:grid-cols-4` with 44px buttons (`min-h-11`), focus rings, and purged `text-[11px]` to `text-xs font-semibold`.

5. `src/components/commerce/quick-create-modal.tsx` & `src/components/shell/global-menu-hub.tsx`:
   - Converted to `<Sheet side="bottom">` with iOS grab handle and 44px buttons (`h-11 min-h-11`).

### B. Verification of `_store.buscar.tsx` FacetedSearchSheet Integration
1. Lines 657–658: Connected `DiscoveryControlBar` filter button:
   ```tsx
   onFilterClick={() => setIsFilterSheetOpen(true)}
   activeFiltersCount={activeFiltersCount}
   ```
2. Lines 1056–1077: Mounted `<FacetedSearchSheet>`:
   ```tsx
   <FacetedSearchSheet
     isOpen={isFilterSheetOpen}
     onClose={() => setIsFilterSheetOpen(false)}
     facets={facetedFacets}
     selectedCategories={selectedCategories}
     selectedNiches={selectedNiches}
     selectedMinPrice={selectedMinPrice}
     selectedMaxPrice={selectedMaxPrice}
     selectedSort={selectedSort}
     totalResultsCount={total}
     onApplyFilters={handleApplyFilters}
     onResetFilters={() => {
       setSelectedCategories([]);
       setSelectedNiches([]);
       setSelectedMinPrice(undefined);
       setSelectedMaxPrice(undefined);
       setSelectedSort("relevance_telemetry");
       if (input.trim()) {
         handleSearch(input.trim());
       }
     }}
   />
   ```
3. Line 675: Purged microfont from `text-[11px]` to `text-xs font-semibold` with focus ring.
4. *Adversarial Defect Found (Stale Closure on Filter Reset)*:
   In `onResetFilters` (lines 1067–1076), `setSelectedCategories([])`, `setSelectedNiches([])`, `setSelectedMinPrice(undefined)`, `setSelectedMaxPrice(undefined)`, and `setSelectedSort("relevance_telemetry")` are scheduled asynchronously by React. Immediately afterwards on line 1074, `handleSearch(input.trim())` is called synchronously in the exact same tick. In `handleSearch(q)` (lines 565–573), `searchFacetedCatalog` reads `selectedCategories`, `selectedNiches`, `selectedMinPrice`, `selectedMaxPrice`, and `selectedSort` from the closure variables. As a result, the immediate re-query executes with **stale (pre-reset) filters**.

### C. Verification of Lateral Dead Space Purge
1. `src/routes/_store.agendar.index.tsx` line 224: `<div className="w-full max-w-5xl mx-auto px-0 sm:px-4 md:px-0 space-y-6 pb-24">`.
2. `src/routes/_store.agenda.tsx` line 374: `<div className="px-0 sm:px-4 md:px-0 space-y-5 py-3 sm:py-4">`.
3. `src/routes/_store.afiliados.tsx` line 417: `<div className="max-w-5xl mx-auto px-0 sm:px-4 md:px-0 py-3 sm:py-6">`.
4. `src/routes/_store.conta.avaliacoes.tsx` line 197: `<div className="w-full max-w-2xl mx-auto pb-24 px-0 sm:px-4 md:px-0">`.
5. `src/routes/_store.conta.ingressos.tsx` line 298: `<div className="w-full max-w-2xl mx-auto pb-24 px-0 sm:px-4 md:px-0">`.
6. `src/routes/_store.conta.notificacoes.tsx` line 150: `<div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">`.
7. `src/routes/_store.conta.entregador.tsx` line 403: `<div className="w-full max-w-5xl mx-auto space-y-6 pb-24 px-0 sm:px-4 md:px-0">`.

### D. Verification of Canonical Header Height (Invariant B.26) & Desktop Inpage Pairing
1. `src/components/navigation/native-mobile-header.tsx`:
   - Line 81: Container set to `h-11 min-h-11` (44px canonical height B.26).
   - Lines 88, 121, 130, 178, 192: Back, search input, clear button, search trigger, filter trigger all adhere to 44px (`h-11 min-h-11` / `size-11 min-h-11 min-w-11`) and `:focus-visible:ring-2`.
   - Line 207: Dual prop support `{rightActions || rightAction}`.
2. `src/components/shell/app-shell.tsx`:
   - Lines 92–138: Exported `checkHasCustomPageMobileHeader(pathname)` eliminates double headers for `/faq` and all 17 `/conta/*` sub-routes.
3. Desktop inpage headers (`hidden md:flex`) paired across 7 routes: `_store.faq.tsx`, `_store.conta.entregador.tsx`, `_store.conta.pedidos.$id.tsx`, `_store.diretorio.index.tsx`, `_store.eventos.tsx`, `_store.empregos.index.tsx`, `_store.conta.atividade.tsx`.
4. *Adversarial Finding (Non-canonical Caller Button)*:
   In `src/routes/_store.conta.pedidos.$id.tsx:240`, the mobile button passed to `rightActions` retains `h-8.5` (34px), violating Invariant B.26 and DL-14 on mobile.

### E. CLI Verifications & Design Lint Ratchet
1. Design Lint Ratchet command:
   ```powershell
   node scripts/design-lint.mjs --ratchet
   ```
   - Result: Exit Code 0.
   - Output: `CATRACA ATIVA: Débito visual reduzido em 95 violações!`
2. Adversarial Diff Lint (`node scripts/verify-m2-challenger-lint.mjs`):
   - Comparing `59f3a418~1` to `59f3a418` across the 25 code files:
   - **5 brand-new P1 violations of DL-03** were introduced:
     - `src/routes/_store.conta.pedidos.$id.tsx:265`: `px-2.5 py-0.5` (violates 4px grid)
     - `src/routes/_store.agenda.tsx:706`: `py-0.5` (violates 4px grid)
     - `src/routes/_store.agenda.tsx:780`: `py-0.5` (violates 4px grid)
     - `src/routes/_store.agendar.index.tsx:557`: `py-0.5` (violates 4px grid)
   - Total violations in `_store.conta.pedidos.$id.tsx` increased from 20 to 21 (+1 P1).
3. Test Suites Executed:
   - `npx vitest run src/components/location/location-master-pill.test.ts src/routes/__tests__/apple-hig-design.test.ts`: 2 passed (7 tests).
   - `npx vitest run src/components/ui/ src/routes/__tests__/route-integrity-w10.test.ts src/routes/__tests__/store-route-loaders.test.ts`: 6 passed (26 tests).
   - `npx vitest run src/components/navigation/native-mobile-header.adversarial.test.tsx src/components/shell/app-shell-mobile-header.adversarial.test.ts src/routes/__tests__/faceted-search-adversarial.test.ts`: 3 passed (45 tests).
   - Total: 78 tests passing (100% green).
4. DEC-207 verified in `docs/design/DECISIONS.md:2871-2878`.

### F. Integrity Audit
- No hardcoded test stubs or falsified expected outputs.
- No dummy/facade implementations; bottom sheets and faceted search contain full responsive logic and event handling.
- No evidence of self-certifying work without genuine independent verification.
- **Integrity Status: PASS (No integrity violations detected).**

---

## 2. Logic Chain

1. Observations A, C, D, and E show that the vast majority of Milestone 2 requirements were genuinely and effectively implemented: `<Sheet side="bottom">` conversions, iOS grab handles, 44px canonical headers, double-header elimination via `checkHasCustomPageMobileHeader`, and lateral dead space purge (`px-0 sm:px-4 md:px-0`).
2. However, Observation B demonstrates a functional defect: in `src/routes/_store.buscar.tsx:1067-1076`, `onResetFilters` calls `handleSearch(input.trim())` synchronously immediately after scheduling asynchronous state updates (`setSelectedCategories([])`, etc.). `handleSearch` reads filters from closure variables, transmitting stale filter state to the backend API upon reset.
3. Observation E demonstrates that while the repository-wide ratchet passed due to debt reductions elsewhere, commit `59f3a418` introduced 5 new P1 violations of rule DL-03 (`px-2.5` and `py-0.5`) across 3 modified files (`_store.conta.pedidos.$id.tsx:265`, `_store.agenda.tsx:706,780`, `_store.agendar.index.tsx:557`). Rule DL-03 explicitly forbids spacings outside the 4px modular grid and is classified as P1 (Merge Blocking) in `AGENTS.md` B.4 and B.8.
4. Observation D demonstrates that in `src/routes/_store.conta.pedidos.$id.tsx:240`, a button passed to `NativeMobileHeader rightActions` retains `h-8.5` (34px), which does not satisfy the canonical 44px touch target floor (Invariant B.26).
5. Therefore, while the architectural structure is solid and free of integrity cheats, these defects must be rectified before merging to prevent technical debt accumulation and broken filter resets.

---

## 3. Caveats

- `node scripts/design-lint.mjs --ratchet` technically exited with code 0 because the repository total visual debt decreased by 95 net violations. However, the mandate requires that modified files do not introduce new P1 violations.
- In accordance with project instructions, `npm run typecheck` and `npm run build` were not executed during this review turn. Pre-existing TypeScript errors in unrelated builder modules remain scheduled for Milestone 5.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

The worker must apply a focused micro-commit addressing the following 3 items:

1. **Fix Stale Closure on Reset in `src/routes/_store.buscar.tsx` (Lines 1067–1076)**:
   - Call `handleApplyFilters({ categories: [], niches: [], minPrice: undefined, maxPrice: undefined, sort: "relevance_telemetry" })` directly inside `onResetFilters`, or pass explicit cleared filter arguments to `handleSearch` to prevent sending stale closure values to `searchFacetedCatalog`.
2. **Purge 5 new DL-03 (P1) spacing violations in 3 files**:
   - `src/routes/_store.conta.pedidos.$id.tsx:265`: Replace `px-2.5 py-0.5` with canonical tokens (e.g. `px-2 py-1` or `px-3 py-1`).
   - `src/routes/_store.agenda.tsx:706,780`: Replace `py-0.5` with `py-1`.
   - `src/routes/_store.agendar.index.tsx:557`: Replace `py-0.5` with `py-1` or `py-0`.
3. **Harmonize Touch Target in `src/routes/_store.conta.pedidos.$id.tsx:240`**:
   - Replace `h-8.5` with `h-11 min-h-11` on the companion modal button to comply with Invariant B.26.

---

## 5. Verification Method

To independently verify the resolution of these findings:

1. **Verify No New DL-03 Violations**:
   ```powershell
   node scripts/verify-m2-challenger-lint.mjs
   ```
   Must report `Files with increased P0/P1 count: 0` and `Files with brand-new P0/P1 violations: 0`.

2. **Verify Design Lint Ratchet**:
   ```powershell
   node scripts/design-lint.mjs --ratchet
   ```
   Must exit with code 0.

3. **Verify Vitest Suites**:
   ```powershell
   npx vitest run src/routes/__tests__/faceted-search-adversarial.test.ts
   npx vitest run src/components/location/location-master-pill.test.ts src/routes/__tests__/apple-hig-design.test.ts
   npx vitest run src/components/navigation/native-mobile-header.adversarial.test.tsx src/components/shell/app-shell-mobile-header.adversarial.test.ts
   ```
   All tests must pass green with Exit Code 0.
