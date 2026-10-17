# Investigation Handoff Report — Explorer M1.2

## 1. Observation

### 1.1 Direct Inspection of `src/components/builder/registry.ts`
In `src/components/builder/registry.ts` lines 46–50:
```ts
46: import { DynamicBookingHeroSection } from "@/components/commerce/dynamic-sections/dynamic-booking-hero";
47: import { CategoryIconGridSection } from "@/components/commerce/dynamic-sections/category-icon-grid";
48: import { DynamicProductCarouselSection } from "@/components/commerce/dynamic-sections/dynamic-product-carousel";
49: import { TravelProductDetailSection } from "@/components/commerce/dynamic-sections/travel-product-detail";
50: import { CustomerTravelPortalSection } from "@/components/commerce/dynamic-sections/customer-travel-portal";
```

In `src/components/builder/registry.ts` lines 464–530:
- Line 469: `component: DynamicBookingHeroSection,` (block `dynamic_booking_hero`)
- Line 484: `component: CategoryIconGridSection,` (block `category_icon_grid`)
- Line 497: `component: DynamicProductCarouselSection,` (block `dynamic_product_carousel`)
- Line 510: `component: TravelProductDetailSection,` (block `travel_product_detail`)
- Line 525: `component: CustomerTravelPortalSection,` (block `customer_travel_portal`)

### 1.2 Direct Inspection of Dynamic Section Files in `src/components/commerce/dynamic-sections/`
Inspection of the 5 component files confirms their verbatim exported symbols:
1. `dynamic-booking-hero.tsx:49`:
   `export const DynamicBookingHero: React.FC<DynamicBookingHeroProps> = ({`
   (Symbol `DynamicBookingHeroSection` is **NOT exported**).
2. `category-icon-grid.tsx:79`:
   `export const CategoryIconGrid: React.FC<CategoryIconGridProps> = ({`
   (Symbol `CategoryIconGridSection` is **NOT exported**).
3. `dynamic-product-carousel.tsx:95`:
   `export const DynamicProductCarousel: React.FC<DynamicProductCarouselProps> = ({`
   (Symbol `DynamicProductCarouselSection` is **NOT exported**).
4. `travel-product-detail.tsx:54`:
   `export const TravelProductDetail: React.FC<TravelProductDetailProps> = ({`
   (Symbol `TravelProductDetailSection` is **NOT exported**).
5. `customer-travel-portal.tsx:74`:
   `export const CustomerTravelPortal: React.FC<CustomerTravelPortalProps> = ({`
   (Symbol `CustomerTravelPortalSection` is **NOT exported**).

### 1.3 Architectural Reference: `src/components/commerce/experience-renderer.tsx`
In `src/components/commerce/experience-renderer.tsx` lines 86–90 and 122–126:
```ts
86: import { DynamicBookingHero } from "./dynamic-sections/dynamic-booking-hero";
87: import { CategoryIconGrid } from "./dynamic-sections/category-icon-grid";
88: import { DynamicProductCarousel } from "./dynamic-sections/dynamic-product-carousel";
89: import { TravelProductDetail } from "./dynamic-sections/travel-product-detail";
90: import { CustomerTravelPortal } from "./dynamic-sections/customer-travel-portal";
```
and
```ts
122:   dynamic_booking_hero: DynamicBookingHero,
123:   category_icon_grid: CategoryIconGrid,
124:   dynamic_product_carousel: DynamicProductCarousel,
125:   travel_product_detail: TravelProductDetail,
126:   customer_travel_portal: CustomerTravelPortal,
```
The canonical commerce experience renderer already consumes the unsuffixed names successfully.

### 1.4 Runtime Execution & Crash Trace
In `src/components/builder/ClassicBlockAdapter.tsx` lines 120 and 92:
- `createClassicOmniBlock` receives `options.component = undefined`.
- `ClassicBlockAdapter` attempts to evaluate `<Component {...data} ... />`.
- Verbatim exception thrown during render:
  ```
  Error: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
  ```

### 1.5 Adversarial Test Status (`src/components/builder/omni-builder-adversarial.test.ts`)
The suite currently passes 16/16 tests because Challenger M1.2 wrote:
- Line 134–138: `expect((dynamicBookingHeroModule as any).DynamicBookingHeroSection).toBeUndefined();`
- Line 507: `expect(() => renderToStaticMarkup(...)).toThrow(/Element type is invalid.*got: undefined/);`
These were formulated as defect-proving assertions. When the components are correctly resolved, these two tests must be transitioned from defect-proving to fix-verifying assertions.

---

## 2. Logic Chain

1. **Import Divergence**:
   - `registry.ts` lines 46–50 import symbols with the `*Section` suffix (`DynamicBookingHeroSection`, etc.).
   - This was modeled after other blocks in the same file (e.g., `SpecialistTeamGridSection`, `NewsletterCaptureSection`).
   - However, the 5 tourism files in `src/components/commerce/dynamic-sections/` were developed without the `*Section` suffix.
2. **Silent Module Loading & Runtime Failure**:
   - In ES modules and Vite bundling without full typecheck enforcement during execution, importing an undefined named export does not fail at load time; the variable evaluates to `undefined`.
   - `options.component` is stored as `undefined` inside the registry object.
   - When `OmniPageRenderer` attempts to render any page containing one of these 5 blocks, React crashes with `Element type is invalid ... got: undefined`.
3. **Double-Layer Remediation Strategy**:
   - To guarantee complete immunity and prevent any future regression, remediation must be applied at two layers:
     - **Layer 1 (Canonical Source)**: Update `src/components/builder/registry.ts` to import and assign the actual component names (`DynamicBookingHero`, `CategoryIconGrid`, `DynamicProductCarousel`, `TravelProductDetail`, `CustomerTravelPortal`).
     - **Layer 2 (Defense-in-Depth & Backward Compatibility)**: Add re-export aliases in each of the 5 dynamic section files (`export const DynamicBookingHeroSection = DynamicBookingHero;`), ensuring both naming conventions are valid everywhere.
     - **Layer 3 (Test Parity)**: Update `src/components/builder/omni-builder-adversarial.test.ts` so that Test 1.7 asserts both names are defined valid functions, and Test 3.6 asserts all 5 blocks render without throwing and produce valid HTML markup.

---

## 3. Caveats

- In strict compliance with User Rule R6, neither `npm run typecheck` nor `npm run build` was executed.
- Static SSR execution via `renderToStaticMarkup` in Vitest was used to prove runtime safety.
- The 5 dynamic section components do not access browser-only globals (`window`, `document`, `navigator`) during top-level render, guaranteeing safe server-side rendering (SSR) in Cloudflare Pages.

---

## 4. Conclusion & Drop-in Remediation Specification

### Action Plan for Implementer (Worker M1 Iteration 2)

#### Modification 1: `src/components/builder/registry.ts`
**Lines 46–50:**
```diff
<<<<
-import { DynamicBookingHeroSection } from "@/components/commerce/dynamic-sections/dynamic-booking-hero";
-import { CategoryIconGridSection } from "@/components/commerce/dynamic-sections/category-icon-grid";
-import { DynamicProductCarouselSection } from "@/components/commerce/dynamic-sections/dynamic-product-carousel";
-import { TravelProductDetailSection } from "@/components/commerce/dynamic-sections/travel-product-detail";
-import { CustomerTravelPortalSection } from "@/components/commerce/dynamic-sections/customer-travel-portal";
====
+import { DynamicBookingHero } from "@/components/commerce/dynamic-sections/dynamic-booking-hero";
+import { CategoryIconGrid } from "@/components/commerce/dynamic-sections/category-icon-grid";
+import { DynamicProductCarousel } from "@/components/commerce/dynamic-sections/dynamic-product-carousel";
+import { TravelProductDetail } from "@/components/commerce/dynamic-sections/travel-product-detail";
+import { CustomerTravelPortal } from "@/components/commerce/dynamic-sections/customer-travel-portal";
>>>>
```

**Lines 469, 484, 497, 510, 525:**
```diff
<<<<
-    component: DynamicBookingHeroSection,
====
+    component: DynamicBookingHero,
>>>>
```
```diff
<<<<
-    component: CategoryIconGridSection,
====
+    component: CategoryIconGrid,
>>>>
```
```diff
<<<<
-    component: DynamicProductCarouselSection,
====
+    component: DynamicProductCarousel,
>>>>
```
```diff
<<<<
-    component: TravelProductDetailSection,
====
+    component: TravelProductDetail,
>>>>
```
```diff
<<<<
-    component: CustomerTravelPortalSection,
====
+    component: CustomerTravelPortal,
>>>>
```

---

#### Modification 2: Export Aliases in the 5 Dynamic Section Files

1. `src/components/commerce/dynamic-sections/dynamic-booking-hero.tsx` (append to end of file):
```ts
// Export alias for compatibility with builder registry
export const DynamicBookingHeroSection = DynamicBookingHero;
```

2. `src/components/commerce/dynamic-sections/category-icon-grid.tsx` (append to end of file):
```ts
// Export alias for compatibility with builder registry
export const CategoryIconGridSection = CategoryIconGrid;
```

3. `src/components/commerce/dynamic-sections/dynamic-product-carousel.tsx` (append to end of file):
```ts
// Export alias for compatibility with builder registry
export const DynamicProductCarouselSection = DynamicProductCarousel;
```

4. `src/components/commerce/dynamic-sections/travel-product-detail.tsx` (append to end of file):
```ts
// Export alias for compatibility with builder registry
export const TravelProductDetailSection = TravelProductDetail;
```

5. `src/components/commerce/dynamic-sections/customer-travel-portal.tsx` (append to end of file):
```ts
// Export alias for compatibility with builder registry
export const CustomerTravelPortalSection = CustomerTravelPortal;
```

---

#### Modification 3: Test Alignment in `src/components/builder/omni-builder-adversarial.test.ts`

**Test 1.7 (Lines 125–146):**
```ts
    it("verifies all 5 tourism blocks export valid component functions matching registry imports", () => {
      // Verify both canonical and alias names are exported as valid React components
      expect(dynamicBookingHeroModule.DynamicBookingHero).toBeDefined();
      expect(typeof dynamicBookingHeroModule.DynamicBookingHero).toBe("function");
      expect((dynamicBookingHeroModule as any).DynamicBookingHeroSection).toBeDefined();

      expect(categoryIconGridModule.CategoryIconGrid).toBeDefined();
      expect(typeof categoryIconGridModule.CategoryIconGrid).toBe("function");
      expect((categoryIconGridModule as any).CategoryIconGridSection).toBeDefined();

      expect(dynamicProductCarouselModule.DynamicProductCarousel).toBeDefined();
      expect(typeof dynamicProductCarouselModule.DynamicProductCarousel).toBe("function");
      expect((dynamicProductCarouselModule as any).DynamicProductCarouselSection).toBeDefined();

      expect(travelProductDetailModule.TravelProductDetail).toBeDefined();
      expect(typeof travelProductDetailModule.TravelProductDetail).toBe("function");
      expect((travelProductDetailModule as any).TravelProductDetailSection).toBeDefined();

      expect(customerTravelPortalModule.CustomerTravelPortal).toBeDefined();
      expect(typeof customerTravelPortalModule.CustomerTravelPortal).toBe("function");
      expect((customerTravelPortalModule as any).CustomerTravelPortalSection).toBeDefined();
    });
```

**Test 3.6 (Lines 471–509):**
```ts
    it("verifies all 5 tourism blocks render successfully via OmniPageRenderer without runtime errors", () => {
      const tourismBlockIds = [
        "dynamic_booking_hero",
        "category_icon_grid",
        "dynamic_product_carousel",
        "travel_product_detail",
        "customer_travel_portal",
      ];

      for (const blockId of tourismBlockIds) {
        const testDoc: OmniPageDocument = {
          schemaVersion: 1,
          page_id: `page-test-${blockId}`,
          slug: `test-${blockId}`,
          title: `Teste ${blockId}`,
          theme: {
            primaryColor: "var(--primary)",
            backgroundColor: "var(--background)",
            textColor: "var(--foreground)",
            fontFamily: "Inter",
            borderRadius: "xl",
          },
          blocks: [
            {
              id: `blk-${blockId}`,
              type: blockId,
              config: getSiteBlockById(blockId).defaultProps,
            },
          ],
        };

        // All 5 blocks must render valid HTML markup without throwing Element type is invalid
        expect(() => {
          const html = renderToStaticMarkup(
            React.createElement(OmniPageRenderer, { document: testDoc })
          );
          expect(html).toBeTruthy();
          expect(html.length).toBeGreaterThan(0);
        }).not.toThrow();
      }
    });
```

---

## 5. Verification Method

To independently verify the fix after implementation:

1. **Execute Vitest Suites**:
   ```powershell
   npx.cmd vitest run src/components/builder/omni-builder-adversarial.test.ts src/components/builder/omni-builder.test.ts src/services/builder-phase1.test.ts
   ```
   *Expected Result*: All 3 test files pass 38/38 tests with Exit Code 0.

2. **Verify Design Lint on Modified Files**:
   ```powershell
   node scripts/design-lint.mjs --changed
   ```
   *Expected Result*: 0 P0, 0 P1, 0 P2, 0 P3 violations with Exit Code 0.

3. **Verify Node Module Import Parity**:
   ```powershell
   node -e "const r = require('./src/components/builder/registry.ts'); console.log('Blocks count:', r.SITE_BUILDER_BLOCKS.length);"
   ```
   *Invalidation Condition*: Any tourism block having `component === undefined` or throwing `Element type is invalid` during `OmniPageRenderer` rendering.
