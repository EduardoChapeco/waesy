# BRIEFING — 2026-10-03T22:23:45Z

## Mission
Investigate BOM automatic deduction in PDV sales and service orders idempotency, plus online checkout BOM handling, and produce precise diffs and forensic analysis.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_3
- Original parent: c9b7f840-de13-40ec-9aef-bf41b37256c2
- Milestone: M2 (BFF Multi-Tenant Protection, Fiscal Allowlist & BOM)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement / do NOT modify source code files
- PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância
- Write report to: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_3\handoff.md
- Notify orchestrator parent via send_message when complete
- Adhere strictly to AGENTS.md rules

## Current Parent
- Conversation ID: c9b7f840-de13-40ec-9aef-bf41b37256c2
- Updated: 2026-10-03T22:16:02Z

## Investigation State
- **Explored paths**:
  - `src/services/pdv.functions.ts` (lines 300-480)
  - `src/services/service-orders.functions.ts` (lines 1-194)
  - `src/services/checkout.functions.ts` (lines 1-606)
  - `src/services/canonical-stock-ledger.functions.ts` & `canonical-stock-ledger.test.ts`
  - `src/components/admin/catalog/product-bom-card.tsx`
  - `supabase/migrations/0002_catalog.sql` & live database constraint `stock_movements_movement_type_check` via MCP `execute_sql`
  - `supabase/migrations/20261115040000_update_process_checkout_v2_order_number_and_rates.sql`
- **Key findings**:
  1. Live DB constraint `stock_movements_movement_type_check` strictly enforces: `movement_type = ANY (ARRAY['purchase', 'sale', 'reserve', 'release', 'return', 'exchange_in', 'exchange_out', 'adjustment', 'transfer', 'damage'])`. Any insert with `"loss"` is rejected by Postgres!
  2. `pdv.functions.ts:407-456` uses fragile `ilike("title", `%${bomItem.name}%`)` instead of matching `variant_id` / `sku` / `product_id`, uses invalid `movement_type: "loss"`, misses `product_location_inventories` sync, and lacks tenant isolation.
  3. `service-orders.functions.ts:143-179` had invalid `movement_type: "loss"` AND non-existent columns `previous_stock` and `new_stock`, causing insert failure. Because errors were swallowed in catch, 0 movements were written, breaking the idempotency guard `existingDeductions` on subsequent runs. Also lacks check for previous status `wasAlreadyConcluded` and lacks `"completed"` in Zod enum.
  4. Online checkout completely lacks BOM deduction in both `process_checkout_transaction_v2` (SQL) and `checkout.functions.ts` (TypeScript).
- **Unexplored areas**: None within the assigned M2_3 scope.

## Key Decisions Made
- Canonical BOM matching hierarchy: `variant_id` > `sku` > `product_id` > exact name > sanitized fuzzy name fallback.
- Movement type classification: use `"sale"` (with `reference_type: "bom_consumption"` in PDV/checkout and `reference_type: "service_order"` in OS) conforming to existing PostgreSQL check constraint and `canonical-stock-ledger`.
- Service order idempotency: double-layer protection via pre-update status check (`isConclusionStatus && !wasAlreadyConcluded`) and ledger query (`existingDeductions.length === 0`), fixing table schema columns (`previous_stock`/`new_stock` purged).
- Online checkout BOM architecture: created modular `consumeOrderBomItems` specification.

## Artifact Index
- DISPATCH.md — Dispatch instructions and mission constraints
- BRIEFING.md — Situational awareness and persistent memory
- progress.md — Liveness heartbeat and investigation progress
- handoff.md — 5-Component forensic report with exact diffs
