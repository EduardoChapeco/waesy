# BRIEFING — 2026-10-03T21:12:00Z

## Mission
Conduct a comprehensive read-only forensic survey of Waesy BFF Contracts, Server Functions, Zod Schemas, SSR Authorization, Public Allowlists, Quick AI Onboarding pipeline, and BOM/Inventory transacting logic.

## 🔒 My Identity
- Archetype: explorer
- Roles: survey, forensic analysis, BFF contracts, server functions, Zod schemas, business logic
- Working directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_survey_2
- Original parent: c9b7f840-de13-40ec-9aef-bf41b37256c2
- Milestone: Explorer 2 Survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância
- Do NOT modify any source code files
- Use read-only tools and write only inside working directory

## Current Parent
- Conversation ID: c9b7f840-de13-40ec-9aef-bf41b37256c2
- Updated: not yet

## Investigation State
- **Explored paths**: `src/lib/server-access.ts`, `src/lib/identity.server.ts`, `src/lib/auth-guards.server.ts`, `src/lib/identity-core.ts`, `src/lib/supabase.ts`, `src/services/catalog.functions.ts`, `src/services/product.functions.ts`, `src/services/classifieds.functions.ts`, `src/services/unified-listing.functions.ts`, `src/services/master-catalog.functions.ts`, `src/services/central-knowledge.functions.ts`, `src/services/admin-catalog.functions.ts`, `src/services/workspace-catalog.functions.ts`, `src/services/magic-onboarding.functions.ts`, `src/services/onboarding-pipeline.server.ts`, `src/services/api-orchestrator.functions.ts`, `src/services/pdv.functions.ts`, `src/services/service-orders.functions.ts`, `src/services/cart.functions.ts`, `src/services/checkout.functions.ts`, `src/services/store.functions.ts`, `src/services/billing.functions.ts`, `src/services/billing-ledger.functions.ts`, `src/services/events.functions.ts`, `src/services/addresses.functions.ts`, `supabase/migrations/`
- **Key findings**:
  1. Service_role RLS bypass: In mutations where `getServerClient()` is used, queries filtering only by primary key `id` without `store_id` (e.g. `service_orders.functions.ts:137`, `admin-catalog.functions.ts:2421`, `events.functions.ts:1002,1117,1192,1265,1343`) allow cross-tenant access.
  2. IDOR in `billing.functions.ts`: `assertStoreAccess` called without `data.storeId`, allowing cross-tenant read/write of invoices.
  3. Public endpoints missing auth: `executeHardRefresh` (`store.functions.ts:529`), `recordOrderMicroFee` (`billing-ledger.functions.ts:23`).
  4. Fiscal data leaks: `unified-listing.functions.ts` (`getUnifiedListingById` and `searchUnifiedListings`) leaks `cost_cents`, `margin_percent`, `markup_percent`, and `fiscal_profile` publicly; `catalog.functions.ts` and `product.functions.ts` leak un-sanitized variant attributes; `classifieds.functions.ts` (`getPublicClassifiedById` and `getAdsByStoreId`) returns `select("*")` with raw attributes; `master-catalog.functions.ts` and `central-knowledge.functions.ts` expose public NCM/CEST search.
  5. Zero usage of `.strict()` across all Zod schemas in `src/services/` and `src/lib/`; frequent use of `z.record(z.any())` for `attributes`.
  6. Quick AI Onboarding pipeline integrates Firecrawl + Steel.dev + Gemini 2.5 Flash across 5 squads, but persistence in `stores`, `brand_kits`, `brand_dna_profiles`, `briefings` is sequential rather than in an ACID database transaction.
  7. BOM deduction: PDV fuzzy-matches BOM ingredients by title `ilike` and records as `loss` without row locking; Service Orders deduct parts on `delivered` without idempotency check or locking; Online checkout does not deduct composite BOM ingredients.
  8. Cart and Checkout: Real-time cart calculations and checkout RPC `process_checkout_transaction_v2` strictly enforce integer cent math and avoid floating point inaccuracies.
- **Unexplored areas**: None within the assigned survey scope.

## Key Decisions Made
- All 6 investigation mandates thoroughly inspected and documented with concrete file/line evidence.

## Artifact Index
- DISPATCH.md — Task dispatch and instructions
- BRIEFING.md — Persistent situational awareness
- progress.md — Heartbeat and progress tracking
- handoff.md — 5-component comprehensive survey report
