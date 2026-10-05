# Soft Handoff — Orchestrator Generation 1 -> Generation 2

## Milestone State
- **Step 0: Survey & Scope Decomposition**: COMPLETED. `PROJECT.md` created with 17 features assigned across 6 milestones.
- **Milestone 1 (Storage Governance, Media Triad, Mock & Unsplash Purge)**: COMPLETED & GATE PASSED. All verifiers approved, Forensic Auditor reported CLEAN. DEC-015 logged in `docs/design/DECISIONS.md`.
- **Milestone 2 (BFF Multi-Tenant Isolation, Fiscal Allowlists, BOM Deduction & Idempotency)**: EXPLORATION COMPLETE.
  - Explorer M2_1, M2_2, and M2_3 delivered comprehensive reports and exact git diffs.
  - Ready for immediate dispatch of Worker M2.
- **Milestone 3 (15 Niches & 4 Macro-Archetypes TanStack Routes)**: PLANNED.
- **Milestone 4 (Mobile HIG Anti-Jank vs Desktop Bento Grid, Regra B.8)**: PLANNED.
- **Milestone 5 (Edge Telemetry Cloudflare Pages & PWA)**: PLANNED.
- **Milestone 6 (Final Verification, Design-Lint & E2E Validation)**: PLANNED.

---

## Active Subagents
- None. All 17 subagents have completed and delivered their handoff reports.

---

## Key Findings & Specifications for Milestone 2 Implementation

### 1. Multi-Tenant Isolation & IDOR Fixes (from Explorer M2_1)
- Report: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_1\handoff.md`
- **`src/services/admin-catalog.functions.ts:2395, 2426`**:
  - `saveStoreComplementGroup`: enforce `.eq("store_id", identity.store_id)` on update.
  - `deleteStoreComplementGroup`: enforce `.eq("store_id", identity.store_id)` on delete.
- **`src/services/service-orders.functions.ts:138`**:
  - `updateServiceOrderStatus`: enforce `.eq("store_id", identity.store_id)` on OS update to prevent cross-store tampering.
- **`src/services/events.functions.ts:995-1420`**:
  - Add canonical helper `assertEventAccess` validating that the requested event ID belongs to the authenticated user's organization before executing privileged deletes (`deleteEventTask`, `deleteEventBudget`, `deleteEventSector`, `deleteEventPartner`, `deleteEventLineup`, `deleteEventDocument`).
- **`src/services/billing.functions.ts:13, 37`**:
  - Pass `storeId` into `assertStoreAccess(identity, storeId)` in `getStoreInvoices` and `createInvoice`.
- **`src/services/store.functions.ts:532`**:
  - Add `await requireAdmin()` to `executeHardRefresh`.
- **`src/services/billing-ledger.functions.ts:23, 142`**:
  - Protect `recordOrderMicroFee` and `recordSubscriptionMonthlyFee` with strict server identity authorization.

### 2. Closed Allowlists & Fiscal Data Leakage Elimination (from Explorer M2_2)
- Report: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_2\handoff.md`
- **`src/services/unified-listing.functions.ts`**:
  - Decouple `rawAttrs` (for internal logic like `inclusions` and `pix_discount_percent`) from sanitized public `attrs`.
  - Completely purge `cost_cents`, `margin_percent`, `markup_percent`, and `fiscal_profile` by omitting or assigning `undefined` in public DTOs (do NOT set to `null` which leaks keys into JSON).
- **`src/services/catalog.functions.ts:123, 850`**:
  - Sanitize cards and variants using `sanitizePublicProductAttributes`.
- **`src/services/product.functions.ts:152`**:
  - Sanitize variants using `sanitizePublicProductAttributes`.
- **`src/services/classifieds.functions.ts`**:
  - Sanitize public classifieds endpoints (`getPublicClassifiedById`, `getAdsByStoreId`, `getPublicClassifieds`) to prevent leakage of internal fields (`ai_instructions`, unvetted specs).

### 3. BOM Automatic Deduction & Service Orders Idempotency (from Explorer M2_3)
- Report: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_3\handoff.md`
- **PostgreSQL Constraint Fix**:
  - In `src/services/pdv.functions.ts` and `src/services/service-orders.functions.ts`, change `movement_type: "loss"` to `movement_type: "sale"`. The PostgreSQL check constraint `stock_movements_movement_type_check` rejects `'loss'` and only accepts `('purchase', 'sale', 'reserve', 'release', 'return', 'exchange_in', 'exchange_out', 'adjustment', 'transfer', 'damage')`.
- **Schema Conformity Fix**:
  - In `src/services/service-orders.functions.ts:160`, delete `previous_stock` and `new_stock` properties from the `stock_movements.insert` payload (these columns do not exist in the DB and cause silent failures).
- **Canonical BOM Matching in `src/services/pdv.functions.ts:407-456`**:
  - Eliminate fragile `ilike` substring search. Match ingredients hierarchically by `variant_id` UUID > `sku` > `product_id` > exact title.
  - Decrement `product_location_inventories` in addition to `product_variants.stock_on_hand`.
- **Two-Layer Idempotency in `src/services/service-orders.functions.ts`**:
  - Check previous status (`wasAlreadyConcluded`) before triggering stock deduction.
  - Query immutable ledger `stock_movements` for existing deductions (`reference_type = 'service_order'`, `reference_id = order_id`).
  - Add `"completed"` to the allowed status enum in Zod.

---

## Remaining Work & Immediate Next Steps for Successor
1. **Spawn Worker M2** (`teamwork_preview_worker`) with:
   - Working directory: `.agents/teamwork/teamwork_preview_worker_m2/`
   - Inputs: exact diffs from M2_1, M2_2, and M2_3 handoffs.
   - Mandatory integrity warning verbatim.
   - Verification commands: `npx vitest run src/services/unified-listing.functions.test.ts`, targeted tests for modified services, and `node scripts/design-lint.mjs`.
   - **PROIBIÇÃO ABSOLUTA**: Never execute `npm run typecheck` or `npm run build`.
2. **Collect Worker M2 handoff** and inspect results.
3. **Dispatch M2 Verifiers**:
   - 2 Reviewers (`teamwork_preview_reviewer`): one for multi-tenant security/fiscal allowlist, one for BOM & stock idempotency.
   - 2 Challengers (`teamwork_preview_challenger`): empirical adversarial verification.
   - 1 Forensic Auditor (`teamwork_preview_auditor`): integrity inspection.
4. **Evaluate Gate 2** in `GATE_STATUS.md`.
5. **Advance to Milestone 3** upon passing Gate 2.

---

## Key Artifacts
- Master Plan: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\PROJECT.md`
- Verbatim Request: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md`
- Gate Status: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\orchestrator_1\GATE_STATUS.md`
- Decisions Log: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\docs\design\DECISIONS.md` (DEC-015 logged)
- M2_1 Handoff: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_1\handoff.md`
- M2_2 Handoff: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_2\handoff.md`
- M2_3 Handoff: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_3\handoff.md`
