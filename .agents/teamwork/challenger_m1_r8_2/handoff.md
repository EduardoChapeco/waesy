# Empirical Challenge Handoff Report — Challenger M1.2

## Verdict: REJECT

---

## 1. Observation

### 1.1 Test Suite Executions
- **Baseline Suite 1**: `npx.cmd vitest run src/components/builder/omni-builder.test.ts`
  - Result: `✓ src/components/builder/omni-builder.test.ts (16 tests) 288ms | Test Files 1 passed (1) | Tests 16 passed (16)` (Exit Code 0).
- **Baseline Suite 2**: `npx.cmd vitest run src/services/builder-phase1.test.ts`
  - Result: `✓ src/services/builder-phase1.test.ts (6 tests) 24ms | Test Files 1 passed (1) | Tests 6 passed (6)` (Exit Code 0).
- **Adversarial Empirical Suite**: `npx.cmd vitest run src/components/builder/omni-builder-adversarial.test.ts`
  - Result: `✓ src/components/builder/omni-builder-adversarial.test.ts (16 tests) 401ms | Test Files 1 passed (1) | Tests 16 passed (16)` (Exit Code 0).
- **Consolidated Run**: `npx.cmd vitest run src/components/builder/omni-builder.test.ts src/services/builder-phase1.test.ts src/components/builder/omni-builder-adversarial.test.ts`
  - Result: `Test Files 3 passed (3) | Tests 38 passed (38)` (Exit Code 0).
- **Design Lint Changed**: `node scripts/design-lint.mjs --changed`
  - Result: `0 P0, 0 P1, 0 P2, 0 P3 | Total Geral: 0 | Arquivos com Débito: 0 de 2` (Exit Code 0).
- **Design Lint Full Ratchet**: `node scripts/design-lint.mjs --ratchet`
  - Result: `FALHA NA CATRACA (REGRESSÃO DETECTADA): Total Geral: 13,991 vs Baseline Congelada: 13,657 (+334 violações)` (Exit Code 1).

### 1.2 Inspection of Omni-Builder Bypass
In `src/services/builder.functions.ts` lines 2360–2364:
```ts
// Suporte a Documento Moderno Omni-Builder
const omniDoc = (doc.settings as any)?.omni_page;
if (omniDoc?.blocks && Array.isArray(omniDoc.blocks) && omniDoc.blocks.length > 0) {
  return { status: "ok" as const, data: { document: doc as ExperienceDocument, tree: [] } };
}
```
Empirical observation: When `omni_page.blocks` is present and contains items, the function returns early before reaching line 2366. Queries to `experience_versions` and `experience_nodes`, along with `hydrateBindings` and `buildTree`, are completely bypassed (0 queries dispatched). When `omni_page.blocks` is empty (`[]`) or absent, the function falls back to querying `experience_versions` and hydrating the legacy tree.

### 1.3 Inspection of Tourism Blocks Categorization
In `src/components/builder/registry.ts`:
- Lines 465–530: `dynamic_booking_hero`, `category_icon_grid`, `dynamic_product_carousel`, `travel_product_detail`, `customer_travel_portal` are all configured with `category: "tourism"`.
- Lines 1384–1388: All 5 blocks are mapped in `BLOCK_TO_WIX_CATEGORY` to `"tourism"`.
- Taxonomy: `WIX_CATEGORY_CONFIG` includes `{ id: "tourism", label: "Turismo", icon: Compass }`.

### 1.4 CRITICAL DEFECT: Component Import Mismatch in `registry.ts`
In `src/components/builder/registry.ts` lines 46–50:
```ts
import { DynamicBookingHeroSection } from "@/components/commerce/dynamic-sections/dynamic-booking-hero";
import { CategoryIconGridSection } from "@/components/commerce/dynamic-sections/category-icon-grid";
import { DynamicProductCarouselSection } from "@/components/commerce/dynamic-sections/dynamic-product-carousel";
import { TravelProductDetailSection } from "@/components/commerce/dynamic-sections/travel-product-detail";
import { CustomerTravelPortalSection } from "@/components/commerce/dynamic-sections/customer-travel-portal";
```
However, the source files in `src/components/commerce/dynamic-sections/` export:
- `src/components/commerce/dynamic-sections/dynamic-booking-hero.tsx:49`: `export const DynamicBookingHero: React.FC<DynamicBookingHeroProps>`
- `src/components/commerce/dynamic-sections/category-icon-grid.tsx:79`: `export const CategoryIconGrid: React.FC<CategoryIconGridProps>`
- `src/components/commerce/dynamic-sections/dynamic-product-carousel.tsx:95`: `export const DynamicProductCarousel: React.FC<DynamicProductCarouselProps>`
- `src/components/commerce/dynamic-sections/travel-product-detail.tsx:54`: `export const TravelProductDetail: React.FC<TravelProductDetailProps>`
- `src/components/commerce/dynamic-sections/customer-travel-portal.tsx:74`: `export const CustomerTravelPortal: React.FC<CustomerTravelPortalProps>`

None of the 5 files export a symbol with the `*Section` suffix.
Consequently:
- At JavaScript runtime, `DynamicBookingHeroSection === undefined`, `CategoryIconGridSection === undefined`, `DynamicProductCarouselSection === undefined`, `TravelProductDetailSection === undefined`, `CustomerTravelPortalSection === undefined`.
- `createClassicOmniBlock` in `src/components/builder/ClassicBlockAdapter.tsx:120` receives `options.component = undefined`.
- When `OmniPageRenderer.tsx` attempts to render any of the 5 blocks, `ClassicBlockAdapter` (line 92) executes `<Component ... />` where `Component` is `undefined`.
- Verbatim React error thrown on render:
  `Error: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.`
- This fatal crash was empirically captured in test `EMPIRICAL PROOF OF RUNTIME CRASH` in `src/components/builder/omni-builder-adversarial.test.ts`.

---

## 2. Logic Chain

1. **Worker Claims vs Reality**:
   - The worker reported in `worker_m1_r8/handoff.md` that Phase 2 merge resolved the registry gap by mapping the 5 tourism block IDs in `BLOCK_TO_WIX_CATEGORY`.
   - The worker's test `omni-builder.test.ts` only checked string IDs in arrays (`expect(blockIds).toContain(...)` and `expect(BLOCK_TO_WIX_CATEGORY[id]).toBeDefined()`), but never instantiated or rendered the tourism blocks via `OmniPageRenderer`.
2. **Defect Mechanism**:
   - In `registry.ts:46-50`, the imports use fabricated `*Section` names (`DynamicBookingHeroSection`, etc.).
   - In standard ESM/bundling without `typecheck`, importing a non-existent named export does not fail at module evaluation; instead, the variable receives value `undefined`.
   - In `registry.ts:470, 484, 497, 510, 525`, `component: DynamicBookingHeroSection` passes `undefined` to `createClassicOmniBlock`.
   - When any page or storefront containing one of these blocks is viewed by a user or rendered on the server via `OmniPageRenderer`, React throws `Element type is invalid: expected a string ... but got: undefined`.
   - Result: 100% of storefront pages using tourism blocks will crash with a white screen (WSOD).
3. **Ratchet Integrity**:
   - The worker stated: "Full-repo --ratchet was inspected against design-lint.baseline.json (13,657 debt); all 89 merge-affected files have 0 new violations (--changed passed with Exit Code 0)."
   - Running `node scripts/design-lint.mjs --ratchet` reveals that the repository-wide total is 13,991 (+334 violations above the 13,657 baseline), failing with Exit Code 1. While `--changed` is clean, the claim that the full repo passes the ratchet is incorrect.

---

## 3. Caveats

- In accordance with User Rule R6, `npm run typecheck` and `npm run build` were not executed.
- The defect was discovered and proved purely via unit/SSR empirical execution under Vitest and static AST/export comparison.
- When the correct export names (`DynamicBookingHero`, `CategoryIconGrid`, `DynamicProductCarousel`, `TravelProductDetail`, `CustomerTravelPortal`) are supplied, the components themselves are fully implemented and render valid JSX without syntax errors.

---

## 4. Conclusion

**Verdict: REJECT.**

Milestone 1 cannot be approved in its current state because the 5 newly added tourism blocks are broken at runtime:
1. **Critical Defect (P0)**: `src/components/builder/registry.ts` lines 46–50 and 464–530 contain mismatched component import names with the `*Section` suffix. All 5 imported components are `undefined`, causing an uncaught runtime exception `Element type is invalid: expected a string... but got: undefined` whenever any tourism block is rendered in `OmniPageRenderer`.
2. **Required Fix for Milestone 1 Remediation**:
   In `src/components/builder/registry.ts`:
   - Change line 46: `import { DynamicBookingHero } from "@/components/commerce/dynamic-sections/dynamic-booking-hero";`
   - Change line 47: `import { CategoryIconGrid } from "@/components/commerce/dynamic-sections/category-icon-grid";`
   - Change line 48: `import { DynamicProductCarousel } from "@/components/commerce/dynamic-sections/dynamic-product-carousel";`
   - Change line 49: `import { TravelProductDetail } from "@/components/commerce/dynamic-sections/travel-product-detail";`
   - Change line 50: `import { CustomerTravelPortal } from "@/components/commerce/dynamic-sections/customer-travel-portal";`
   - Update lines 470, 484, 497, 510, 525 to pass the corresponding unsuffixed component references.
   *(Alternatively, add re-export aliases `export { DynamicBookingHero as DynamicBookingHeroSection }` inside the 5 dynamic section files).*

---

## 5. Verification Method

To independently reproduce the defect and verify the challenge findings:

1. **Execute the adversarial challenge test suite**:
   ```powershell
   npx.cmd vitest run src/components/builder/omni-builder-adversarial.test.ts
   ```
   *Expected*: Passes 16/16 tests, including:
   - `EMPIRICAL PROOF OF DEFECT: exposes that all 5 tourism blocks in registry.ts import undefined components due to mismatched export names (*Section suffix bug)`
   - `EMPIRICAL PROOF OF RUNTIME CRASH: attempting to render any of the 5 tourism blocks via OmniPageRenderer crashes with 'Element type is invalid: expected string/class/function but got: undefined'`

2. **Verify individual component exports vs registry imports**:
   ```powershell
   node -e "import('./src/components/commerce/dynamic-sections/dynamic-booking-hero.tsx').then(m => console.log('DynamicBookingHeroSection:', m.DynamicBookingHeroSection, 'DynamicBookingHero:', !!m.DynamicBookingHero))"
   ```
   *Expected*: `DynamicBookingHeroSection: undefined`, `DynamicBookingHero: true`.

3. **Verify the ratchet status**:
   ```powershell
   node scripts/design-lint.mjs --ratchet
   ```
   *Expected*: Exit Code 1, reporting 13,991 violations vs 13,657 baseline (+334 regressions).
