# Explorer M2_1 Dispatch: Multi-Tenant Isolation & IDOR Fixes

## Objective
Analyze the exact code modifications needed for:
1. Cross-tenant mutation bypass in `admin-catalog.functions.ts:2411-2425` (`deleteStoreComplementGroup`) and lines 2391-2397 (`saveStoreComplementGroup`): ensure `.eq("store_id", identity.store_id)` is strictly applied.
2. `service-orders.functions.ts:109-140` (`updateServiceOrderStatus`): ensure `.eq("store_id", identity.store_id)` is applied on `service_orders` updates.
3. `events.functions.ts:995-1420` (`deleteEventTask`, `deleteEventBudget`, etc.): ensure `.eq("store_id", identity.store_id)` or workspace access check is applied.
4. `billing.functions.ts:26-60` (`createInvoice`) and lines 6-24 (`getStoreInvoices`): pass `data.storeId` into `assertStoreAccess(identity, ["owner", "admin"], data.storeId)` to eliminate IDOR.
5. Endpoints needing authentication: `store.functions.ts:529` (`executeHardRefresh`), `billing-ledger.functions.ts:23, 108` (`recordOrderMicroFee`, `recordSubscriptionMonthlyFee`).

## Deliverable
Write your report with exact diffs to `.agents/teamwork/teamwork_preview_explorer_m2_1/handoff.md`.
PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build`.

## 2026-10-03T22:16:02Z
You are Explorer M2_1 (BFF Multi-Tenant Isolation & IDOR Fixes).
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_1
Read the original request at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project master plan at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\PROJECT.md
Read Explorer 2 survey findings in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md
Read your dispatch instructions in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_1\DISPATCH.md
And repository rules in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\AGENTS.md

CRITICAL CONSTRAINTS:
1. READ-ONLY exploration. Do NOT edit source code files.
2. PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
3. Write your report to: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_1\handoff.md
4. Notify orchestrator parent via send_message when complete.

INVESTIGATION SCOPE:
- Detailed diffs to enforce `.eq("store_id", identity.store_id)` on `admin-catalog.functions.ts:2411-2425` and `service-orders.functions.ts:109-140` and `events.functions.ts:995-1420`.
- Detailed diff to eliminate IDOR in `billing.functions.ts:37, 15` by passing `data.storeId` into `assertStoreAccess`.
- Detailed diff to add authentication/authorization to `store.functions.ts:529` (`executeHardRefresh`) and `billing-ledger.functions.ts:23, 108`.
