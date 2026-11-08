# Waesy Platform E2E Test Infrastructure & Test Suite Specification

## 1. Test Philosophy & Opaque-Box Methodology

The Waesy End-to-End (E2E) Test Suite is designed under the **opaque-box testing philosophy**:
- **Requirement-Driven**: Every test case is derived strictly from user requirements in `ORIGINAL_REQUEST.md`, architectural specifications in `PROJECT.md`, and regulatory invariants in `AGENTS.md`.
- **Decoupled from Implementation Internals**: Tests interact with public contracts, schemas, Server Functions (BFF), API boundaries, route trees, and user-facing state transitions. They do not depend on internal private methods or transient component internals.
- **Authoritative Derivation**: Expected outputs are derived from documented domain models, RFC specifications, mathematical invariants (e.g. 0% commission + R$ 0,99 fixed fee, 3-minute waiting timer, WCAG 2.2 AA contrast ratios), and Zod contract schemas.
- **Progressive Testability & Isolation**: Tests run in isolation with hermetic setup and teardown, avoiding test execution order coupling, memory leaks, or database collisions.

---

## 2. Test Architecture & Runner Commands

### Runner & Environment
- **Test Runner**: Vitest 4.x with Node environment and TypeScript path alias support (`@/*` mapping to `src/*`).
- **Configuration**: `vitest.config.ts` configured with `include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{test,spec}.{ts,tsx}"]`.
- **Execution Engine**:
  ```powershell
  # Full E2E Test Suite Execution
  cmd /c npx vitest run tests/e2e

  # Specific Tier Executions
  cmd /c npx vitest run tests/e2e/tier1-features
  cmd /c npx vitest run tests/e2e/tier2-boundary
  cmd /c npx vitest run tests/e2e/tier3-combinations
  cmd /c npx vitest run tests/e2e/tier4-scenarios
  cmd /c npx vitest run tests/e2e/routes
  ```

### Directory Structure
```
tests/e2e/
├── harness/
│   ├── e2e-contract-harness.ts        # Reusable domain contracts and mocks
│   └── test-fixtures.ts              # Canonical fixtures (Belasis salon, retail, mobility)
├── tier1-features/
│   ├── tier1-design-foundations.test.ts   # Features 1, 2, 3 (>=15 tests)
│   ├── tier1-view-preferences.test.ts     # Features 4, 5 (>=10 tests)
│   ├── tier1-operational-views.test.ts    # Features 6, 7, 8, 9, 10 (>=25 tests)
│   ├── tier1-backend-wiring.test.ts       # Features 11, 12, 13, 14, 15 (>=25 tests)
│   ├── tier1-mobile-ergonomics.test.ts    # Features 16, 17, 18, 19 (>=20 tests)
│   └── tier1-quality-gates.test.ts        # Features 20, 21, 22, 23, 24 (>=25 tests)
├── tier2-boundary/
│   └── tier2-boundaries.test.ts           # Corner cases, empty states, limits, multi-tenant
├── tier3-combinations/
│   └── tier3-combinations.test.ts         # Multi-step combinations & transitions
├── tier4-scenarios/
│   └── tier4-real-world-scenarios.test.ts # End-to-end real world business workflows
└── routes/
    └── route-inventory.test.ts            # Audit and invariant tests across 446 routes
```

---

## 3. Systematic 4-Tier Test Suite Design

### Tier 1: Feature Coverage (>=5 test cases per feature for 24 features)
Covers all 24 features inventoried in `PROJECT.md` with at least 5 distinct test cases per feature (total >=120 test cases):

1. **Feature 1: Single Sovereign Surface Tokens & Foundations (DL-31)**
   - 1.1 Single layer surface shell validation (card within card detection).
   - 1.2 Padding non-accumulation rule across nested containers.
   - 1.3 Decorative shadow elimination in application surfaces.
   - 1.4 Visual noise reduction (90% achromatic silence palette).
   - 1.5 Semantic badge translucency (10% opacity, 20% border).

2. **Feature 2: Belasis/Trello Canonical Metric & View Primitives**
   - 2.1 KpiMetricCard schema validation and required props.
   - 2.2 MiniSparkline trend projection (up, down, neutral).
   - 2.3 ViewModeSwitcher control rendering and mode options.
   - 2.4 Ultra-concise action labels (<= 3 words, no AI-smell).
   - 2.5 Tabular numbers font formatting (`font-mono tabular-nums`).

3. **Feature 3: Polymorphic UniversalViewManager Component**
   - 3.1 Table mode rendering and column structure.
   - 3.2 Kanban mode column stages and card rendering.
   - 3.3 Cards mode squircle layout and metadata display.
   - 3.4 Keyboard navigation shortcut switching (`1`, `2`, `3`).
   - 3.5 Loading skeleton and empty state handling.

4. **Feature 4: Database Migration & BFF for View Preferences**
   - 4.1 `WorkspaceViewPreferenceSchema` Zod validation for valid modules.
   - 4.2 Multi-tenant isolation (`store_id` enforcement in preferences).
   - 4.3 Default fallback view preference when no record exists.
   - 4.4 Upsert idempotency of user view preferences.
   - 4.5 Filter and column settings JSON payload integrity.

5. **Feature 5: Vitest Suite for View Preferences Contract**
   - 5.1 Rejection of invalid module identifiers.
   - 5.2 Rejection of invalid view mode enums.
   - 5.3 Sort direction validation (`asc` | `desc` | null).
   - 5.4 Defensive handling of missing optional parameters (B.25).
   - 5.5 Tenant mismatch error handling.

6. **Feature 6: Flexible View Modes for Agenda & Appointments**
   - 6.1 Agenda table view: high-density scheduling grid.
   - 6.2 Agenda kanban view: status columns (`scheduled`, `confirmed`, `in_service`, `completed`).
   - 6.3 Agenda cards view: contact cards with quick actions.
   - 6.4 URL query parameter synchronization (`?view=kanban`).
   - 6.5 Date-range filtering and appointment slot reservation.

7. **Feature 7: Flexible View Modes for Customers / CRM**
   - 7.1 Customers table view: corporate tabular presentation.
   - 7.2 Customers kanban view: lead funnel stages.
   - 7.3 Customers cards view: customer profile cards with phone formatting.
   - 7.4 Multi-selection and bulk action dispatching.
   - 7.5 Customer search query filtering across views.

8. **Feature 8: Flexible View Modes for Orders & Dispatch**
   - 8.1 Orders table view: financial and accounting breakdown.
   - 8.2 Orders kanban view: operational pipeline stages.
   - 8.3 Orders cards view: dispatch package cards.
   - 8.4 Fixed fee R$ 0,99 calculation validation (B.23).
   - 8.5 Status transition audit timestamps.

9. **Feature 9: Flexible View Modes for Tasks & Projects**
   - 9.1 Unified task table view with priorities and assignees.
   - 9.2 Unified task kanban view by workflow state.
   - 9.3 Unified task cards view with checklist progress.
   - 9.4 Removal of duplicate `my-day` tab and unified view persistence.
   - 9.5 Task completion toggle and archived task filtering.

10. **Feature 10: Kanban Defaults Extension for Domains**
    - 10.1 Default stages definition for `appointments`.
    - 10.2 Default stages definition for `orders`.
    - 10.3 Default stages definition for `customers`.
    - 10.4 Niche-specific stage overrides (e.g. gastronomy, salon, clinic).
    - 10.5 Stage order indexing and color metadata invariants.

11. **Feature 11: Static Elements Remediation in Vitrines & Hotpages**
    - 11.1 Dynamic query to `marketplace_surfaces` replacing static arrays.
    - 11.2 Removal of hardcoded emojis in hotpages headers.
    - 11.3 Elimination of fake review star counters on unrated stores (B.33).
    - 11.4 CMS bilateral configuration contract validation (B.20).
    - 11.5 Aspect ratio CSS stabilization to prevent CLS (B.32).

12. **Feature 12: Institutional Pages Backend Connection**
    - 12.1 Dynamic content retrieval for `/about` and `/sobre`.
    - 12.2 Dynamic content retrieval for `/contact` and `/contato`.
    - 12.3 Privacy policy content synchronization from database.
    - 12.4 Fallback handling for unpublished pages.
    - 12.5 SEO and metadata hydration from CMS records.

13. **Feature 13: Appointment Status Audit Fields Hardening**
    - 13.1 `completed_at` and `completed_by` persistence on completion.
    - 13.2 `no_show_marked_at` and `no_show_marked_by` persistence on no-show.
    - 13.3 `cancelled_at`, `cancelled_by`, and `cancellation_reason` persistence.
    - 13.4 Audit trail immutability and history logging.
    - 13.5 Defensive handling when optional user identifier is omitted.

14. **Feature 14: Real WMS Picking & PDV Kitchen Wiring**
    - 14.1 Order picking checklist state sync with `wms.functions.ts`.
    - 14.2 Barcode/SKU verification during picking operations.
    - 14.3 Kitchen Display System (KDS) card updates via `pdv.functions.ts`.
    - 14.4 Preparation timer and alert thresholds in KDS.
    - 14.5 Handover from kitchen to dispatch queue.

15. **Feature 15: Static Arrays & Fallbacks Purge in Workspace**
    - 15.1 Dynamic automation rule loading from database.
    - 15.2 B2B partner taxonomy dynamic synchronization.
    - 15.3 CMS page template dynamic retrieval without hardcoded mocks.
    - 15.4 Tourism operator and destination dynamic schema queries.
    - 15.5 Zero fake images in public user listings (B.33).

16. **Feature 16: Touch Targets & Mobile Ergonomics Floor (DL-14)**
    - 16.1 Minimum touch target size >= 44x44px (`h-11 min-h-11`).
    - 16.2 Keyboard focus ring `:focus-visible` compliance on interactive controls.
    - 16.3 Mobile header and utility cluster button target floor.
    - 16.4 Bottom bar button height compliance.
    - 16.5 Rejection of touch targets below 44px in mobile viewports.

17. **Feature 17: Bottom Sheets Conversion & Safe-Areas**
    - 17.1 Mobile dialog conversion to 100dvh Bottom Sheet.
    - 17.2 Top safe-area padding (`pt-safe-modal` / `pt-safe`) compliance.
    - 17.3 Hardware notch avoidance for dismiss controls (`top-safe`).
    - 17.4 Bottom safe-area clearance (`pb-safe`) for scroll containers.
    - 17.5 Pull-to-dismiss gesture threshold handling.

18. **Feature 18: Thumb Zone Bottom Actions vs Desktop Header**
    - 18.1 Mobile primary actions anchored in sticky bottom zone (`sticky bottom-safe`).
    - 18.2 Z-index separation (floating bar at `z-30`, dialog overlay at `z-50`).
    - 18.3 Desktop action header placement without bottom floating bar.
    - 18.4 Absence of screen-bottom occlusion for cards and lists.
    - 18.5 Single primary action rule (`variant="default"` at most once per view).

19. **Feature 19: DOM Bifurcation via useWindowSizeClass**
    - 19.1 Mobile viewport (<640px) triggers compact layout branch.
    - 19.2 Desktop viewport (>=840px) triggers expanded layout branch.
    - 19.3 Medium viewport (640-839px) triggers medium layout branch.
    - 19.4 Zero duplicate DOM node generation (`block md:hidden` avoidance).
    - 19.5 Dynamic resize transition stability.

20. **Feature 20: Dual-Track E2E Test Suite Creation (Tiers 1-4)**
    - 20.1 Test harness isolation and mock identity contracts.
    - 20.2 Execution validation of all test tiers.
    - 20.3 Coverage of all 446 platform routes.
    - 20.4 Verification of multi-tenant boundaries across suites.
    - 20.5 Test execution deterministic repeatability.

21. **Feature 21: TypeScript Compilation Quality Gate**
    - 21.1 Contract types match Zod DTO schemas.
    - 21.2 No untyped parameters or implicit any in BFF interfaces.
    - 21.3 Router search parameter validation types.
    - 21.4 Component prop interface completeness.
    - 21.5 Strict null check compliance in operational services.

22. **Feature 22: Production Build Quality Gate**
    - 22.1 Client/server boundary leak prevention.
    - 22.2 Dynamic imports and code splitting validation.
    - 22.3 CSS token consumption from `tokens.json` and `styles.css`.
    - 22.4 Worker bundle entry point validation.
    - 22.5 Asset emission budget compliance.

23. **Feature 23: Design Lint Ratchet Quality Gate**
    - 23.1 DL-04 (`!important`) zero tolerance validation.
    - 23.2 DL-15 (`:focus-visible`) presence on interactive elements.
    - 23.3 DL-16/17 Contrast ratio >= 4.5:1 text, >= 3:1 controls.
    - 23.4 DL-31 Containeritis elimination.
    - 23.5 DL-32 Grid within grid elimination.

24. **Feature 24: Adversarial Hardening (Tier 5) & Victory Audit**
    - 24.1 Cross-tenant data injection attack rejection.
    - 24.2 Corrupted payload and SQL/script injection defense.
    - 24.3 3-minute waiting timer telemetria edge cases (B.24).
    - 24.4 Customer debt ledger Zero-Trust barrier enforcement.
    - 24.5 Idempotency guard under concurrent duplicate requests.

---

### Tier 2: Boundary & Corner Cases
- **Empty States**: Validates honest empty states when zero appointments, zero customers, zero orders, or zero tasks are returned. Prohibits fake placeholder lists.
- **Maximum Density & Scale**: Validates behavior under 1,000+ records, deep filter chains, and high-volume data streams.
- **Multi-Tenant Boundaries**: Enforces strict `store_id` tenant isolation. Verifies that Tenant A cannot read, mutate, or affect view preferences or data of Tenant B.
- **Malformed Inputs & Boundary Values**: Negative prices, empty strings, null timestamps, non-UUID keys, and invalid enums.

### Tier 3: Cross-Feature Combinations
- **Mode Toggle & Persistence**: User switches view mode (`table` -> `kanban` -> `cards`), preference is saved to DB via BFF, URL query string is updated to `?view=kanban`, and page reload restores the user preference.
- **Full Operational Lifecycle Transition**:
  - Customer registration -> Appointment booking -> Status progression (`scheduled` -> `confirmed` -> `in_service` -> `completed` with audit fields) -> Billing record creation.
- **Commerce Lifecycle Transition**:
  - Store catalog order -> WMS picking verification -> PDV kitchen status advance -> Delivery fee fixed R$ 0,99 ledger check.

### Tier 4: Real-World Application Scenarios
- **Scenario 1: Belasis/Avec Salon Operational Journey**:
  - Complete salon day-in-the-life: Receptionist views morning agenda in Kanban mode, re-arranges appointment, switches to Table view for end-of-day revenue reconciliation, completes services with explicit staff attribution (`completed_by`).
- **Scenario 2: Retail & Kitchen Delivery (iFood/PDV)**:
  - Multi-item order placed on vitrine, displayed on PDV kitchen screen, marked ready, picked with barcode check in WMS, and dispatched with fixed R$ 0,99 fee.
- **Scenario 3: Urban Mobility & Courier (Waesy Go)**:
  - Ride request, GPS telemetria arrival, 3-minute passenger wait countdown, cancel on no-show, CPF debt recording in `customer_debt_ledger`, Zero-Trust barrier blocking subsequent ride requests until debt settlement.
- **Scenario 4: Multi-Tenant Enterprise Administration**:
  - Enterprise with 3 independent branch stores, role permissions matrix, independent view modes and stage configurations per branch, zero cross-tenant contamination.

---

## 4. Route Inventory Coverage (446 Routes)
The test suite audits the completeness, structure, and integrity of all 446 routes in `src/routes/`:
- **Workspace Routes (189 routes)**: Backoffice, CRM, Agenda, Orders, WMS, PDV, Finance, Tourism, Settings.
- **Vitrine & Public Store Routes (165 routes)**: Catalogs, showcases, hotpages, classifieds, departments.
- **Account & Civil Routes (64 routes)**: User profiles, orders history, security, appointments, tickets.
- **Platform Root & Utility Routes (28 routes)**: Auth, onboarding, checkout, search, legal, system.
