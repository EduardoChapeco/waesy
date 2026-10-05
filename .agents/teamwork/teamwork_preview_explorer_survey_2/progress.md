# Progress — Explorer 2 (BFF Contracts, Server Functions, Zod Schemas & Business Logic)

Last visited: 2026-10-03T21:12:30Z

## Status
- [x] Initialized BRIEFING.md and DISPATCH.md
- [x] Surveyed `src/services/` file catalog (162 `*.functions.ts` files + support modules)
- [x] In-depth audit of SSR authorization (`getServerIdentity`, `requireAdmin`, `assertStoreAccess`)
  - Identified critical service_role RLS bypasses where mutations delete/update by `id` without scoping by `store_id` (e.g. `service_orders`, `store_complement_groups`, `eventos_*`).
  - Identified IDOR risks where `assertStoreAccess` does not receive `data.storeId` (e.g. `billing.functions.ts`).
  - Identified public unauthenticated endpoints executing sensitive database actions (e.g. `executeHardRefresh` in `store.functions.ts`, `recordOrderMicroFee` in `billing-ledger.functions.ts`).
- [x] Audited Zod schemas and perimeter input validation
  - Zero usage of `.strict()` across all service files.
  - Frequent usage of `z.record(z.any())` or `z.record(z.unknown())` for `attributes`, allowing arbitrary untyped payloads.
- [x] Audited Closed Allowlists for public queries & fiscal leaks
  - Confirmed `PUBLIC_SPEC_ALLOWLIST` exists in `product.functions.ts` for product details, but variant attributes (`v.attributes`) bypass it.
  - Confirmed `catalog.functions.ts` (`listPublishedProducts`) returns raw `attributes` without allowlist sanitization.
  - Found public leak in `unified-listing.functions.ts` (`getUnifiedListingById` and `searchUnifiedListings`) which explicitly returns `cost_cents`, `margin_percent`, `markup_percent`, and `fiscal_profile` to anonymous public callers.
  - Found `master-catalog.functions.ts` and `central-knowledge.functions.ts` expose unauthenticated endpoints searching NCM, CEST, and tribute rates.
  - Found `classifieds.functions.ts` (`getPublicClassifiedById` and `getAdsByStoreId`) returns `select("*")` including raw `attributes`.
- [x] Audited Quick AI Onboarding pipeline
  - Inspected Firecrawl scrape, Steel.dev screenshot, and native fetch fallback in `onboarding-pipeline.server.ts`.
  - Verified 5 AI squads (`runDesignSquad`, `runCopySquad`, `runPrSquad`, `runBusinessStrategistSquad`, `runMarketAnalystSquad`) + Judge (`runConsolidationAndJudge`).
  - Verified default LLM configuration uses `gemini-2.5-flash` in `api-orchestrator.functions.ts`.
  - Analyzed persistence into `stores`, `brand_kits`, `brand_dna_profiles`, `briefings`, `store_business_model_canvas`: identified that persistence is sequential rather than an ACID database transaction.
- [x] Audited BOM deduction logic in Service Orders and POS counter sales
  - POS counter sales (`src/services/pdv.functions.ts`): deducts BOM ingredients based on `ilike` title matching against `bill_of_materials` array in parent product attributes; records `stock_movements` as `"loss"`; lacks concurrency locking.
  - Service Orders (`src/services/service-orders.functions.ts`): deducts parts when marked `"delivered"`; lacks idempotency checks and concurrency locking; can result in double deduction.
  - Online checkout (`process_checkout_transaction_v2`): only deducts the product variant itself; does not deduct BOM ingredients for composite products.
- [x] Audited Cart and Checkout inventory validation and cent arithmetic
  - Real-time cart calculations in `cart.functions.ts` use integer cents (`totalCents`, `lineTotalCents`).
  - Checkout atomic RPC `process_checkout_transaction_v2` uses strict inventory checks, advisory locks, and integer cent math.
- [x] Compiled comprehensive 5-component handoff report (`handoff.md`)
