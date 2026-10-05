# Progress — Explorer M2_3

- **Status**: Deep investigation completed; formulating handoff report
- **Last visited**: 2026-10-03T22:23:15Z
- **Subtasks completed**:
  1. [x] Inspected `src/services/pdv.functions.ts` lines 407-456:
     - Found fragile `.ilike("title", `%${bomItem.name}%`)` matching.
     - Found invalid `movement_type: "loss"`, which violates PostgreSQL check constraint `stock_movements_movement_type_check` (`movement_type IN ('purchase', 'sale', 'reserve', 'release', 'return', 'exchange_in', 'exchange_out', 'adjustment', 'transfer', 'damage')`).
     - Found missing multi-location stock adjustment (`product_location_inventories`) for BOM ingredients.
     - Found lack of tenant isolation on `parentProduct` query.
  2. [x] Inspected `src/services/service-orders.functions.ts` lines 143-179:
     - Found invalid `movement_type: "loss"` (violates DB check constraint).
     - Found invalid columns `previous_stock` and `new_stock` in `stock_movements.insert`, which causes PostgreSQL/PostgREST schema rejection.
     - Found failure in idempotency: because the insert threw an error caught by `try/catch`, 0 rows were inserted in `stock_movements`, so subsequent updates found 0 rows and attempted re-deduction.
     - Found lack of transition check (`wasAlreadyConcluded`), meaning setting "delivered" multiple times re-triggered deduction if insert had succeeded.
     - Found missing "completed" status in Zod schema and handler.
  3. [x] Inspected online checkout BOM handling:
     - Discovered `process_checkout_transaction_v2` and `checkout.functions.ts` currently do NOT have ANY BOM deduction for composite products.
     - Designed `consumeOrderBomItems` helper and integration into `checkout.functions.ts`.
