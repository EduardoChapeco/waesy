## 2026-10-03T22:29:29Z
You are Worker M2 (Implementation: BFF Multi-Tenant Isolation, Fiscal Allowlists & BOM Deduction).
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_worker_m2
Read the original request at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project master plan at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\PROJECT.md
Read your dispatch task at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_worker_m2\DISPATCH.md
Read the full handoff reports and exact diffs at:
- c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_1\handoff.md
- c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_2\handoff.md
- c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_3\handoff.md
And repository rules in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\AGENTS.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL CONSTRAINTS:
1. PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
2. Usar validação semântica, `node scripts/design-lint.mjs`, testes Vitest pontuais nos arquivos tocados (`npx vitest run src/services/unified-listing.functions.test.ts`) e git diff.
3. Documentar decisões em docs/design/DECISIONS.md (como DEC-016).

TASKS TO EXECUTE:
1. Apply multi-tenant isolation diffs from Explorer M2_1 handoff:
   - `src/services/admin-catalog.functions.ts:2395, 2426`: enforce `.eq("store_id", identity.store_id)` on `saveStoreComplementGroup` and `deleteStoreComplementGroup`.
   - `src/services/service-orders.functions.ts:138`: enforce `.eq("store_id", identity.store_id)` on `updateServiceOrderStatus`.
   - `src/services/events.functions.ts:995-1420`: add `assertEventAccess` helper to validate event ownership before executing `deleteEventTask`, `deleteEventBudget`, `deleteEventSector`, `deleteEventPartner`, `deleteEventLineup`, `deleteEventDocument`.
   - `src/services/billing.functions.ts:13, 37`: pass `storeId` / `data.storeId` into `assertStoreAccess`.
   - `src/services/store.functions.ts:532`: add `await requireAdmin()` to `executeHardRefresh`.
   - `src/services/billing-ledger.functions.ts:23, 142`: protect `recordOrderMicroFee` and `recordSubscriptionMonthlyFee` with strict identity verification.

2. Apply closed allowlists & fiscal leakage purge diffs from Explorer M2_2 handoff:
   - `src/services/unified-listing.functions.ts`: decouple `rawAttrs` from sanitized `attrs`, completely purge `cost_cents`, `margin_percent`, `markup_percent`, and `fiscal_profile` by omitting or assigning `undefined` in public DTOs.
   - `src/services/catalog.functions.ts:123, 850`: sanitize cards and variants using `sanitizePublicProductAttributes`.
   - `src/services/product.functions.ts:152`: sanitize variants using `sanitizePublicProductAttributes`.
   - `src/services/classifieds.functions.ts`: sanitize public classifieds endpoints.

3. Apply BOM deduction & idempotency diffs from Explorer M2_3 handoff:
   - In `src/services/pdv.functions.ts` and `src/services/service-orders.functions.ts`: change `movement_type: "loss"` to `movement_type: "sale"` to satisfy PostgreSQL `stock_movements_movement_type_check`.
   - In `src/services/service-orders.functions.ts`: delete `previous_stock` and `new_stock` properties from `stock_movements.insert`. Add two-layer idempotency (`wasAlreadyConcluded` status check + query `stock_movements` ledger). Add `"completed"` to status enum.
   - In `src/services/pdv.functions.ts:407-456`: eliminate fragile `ilike` substring search. Match ingredients hierarchically (`variant_id` UUID > `sku` > `product_id` > exact title) and sync `product_location_inventories`.

4. Run verification:
   - `npx vitest run src/services/unified-listing.functions.test.ts`
   - `node scripts/design-lint.mjs`
   - Document decision in `docs/design/DECISIONS.md` (DEC-016).

5. Write completion report to:
   `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_worker_m2\handoff.md`
   Notify orchestrator parent via `send_message` when done.
