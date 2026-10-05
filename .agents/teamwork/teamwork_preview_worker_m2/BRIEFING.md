# BRIEFING — 2026-10-03T22:45:00Z

## Mission
Implement BFF Multi-Tenant Isolation, Fiscal Allowlists & BOM Deduction across services with zero regressions, verified by vitest, design-lint, and semantic validation.

## 🔒 My Identity
- Archetype: Worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_worker_m2
- Original parent: c9b7f840-de13-40ec-9aef-bf41b37256c2
- Milestone: M2 (Implementation)

## 🔒 Key Constraints
- PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
- Usar validação semântica, `node scripts/design-lint.mjs`, testes Vitest pontuais nos arquivos tocados (`npx vitest run src/services/unified-listing.functions.test.ts`) e git diff.
- Documentar decisões em docs/design/DECISIONS.md (como DEC-016).
- Não quebrar contratos públicos e manter integridade de multi-tenant e ledger.

## Current Parent
- Conversation ID: c9b7f840-de13-40ec-9aef-bf41b37256c2
- Updated: 2026-10-03T22:45:00Z

## Task Summary
- **What to build**:
  1. Multi-tenant isolation fixes across `admin-catalog.functions.ts`, `service-orders.functions.ts`, `events.functions.ts`, `billing.functions.ts`, `store.functions.ts`, `billing-ledger.functions.ts`.
  2. Fiscal allowlists and sanitization across `unified-listing.functions.ts`, `catalog.functions.ts`, `product.functions.ts`, `classifieds.functions.ts`.
  3. BOM stock deduction and idempotency in `pdv.functions.ts` and `service-orders.functions.ts`.
- **Success criteria**:
  - All multi-tenant enforcement active.
  - Zero fiscal leakages in public APIs.
  - BOM deduction uses `movement_type: "sale"`, hierarchical matching, idempotency ledger query, and eliminates invalid columns.
  - Vitest test suite passes 100% (57/57 tests green across 7 files).
  - Design lint runs cleanly.
  - DEC-016 recorded in `docs/design/DECISIONS.md`.
- **Interface contracts**: PROJECT.md, AGENTS.md
- **Code layout**: src/services/

## Key Decisions Made
- Multi-tenant isolation enforced in `admin-catalog.functions.ts`, `service-orders.functions.ts`, `events.functions.ts`, and `billing-ledger.functions.ts`.
- `rawAttrs` separated from sanitized `attrs` in `unified-listing.functions.ts`, curing the 2 Vitest regression failures while purging `cost_cents`, `margin_percent`, `markup_percent`, and `fiscal_profile` via `undefined`.
- Public catalog cards, catalog variants, and product variants guarded by `sanitizePublicProductAttributes`.
- Public classified endpoints sanitized via `sanitizePublicClassifiedAttributes`.
- BOM deductions corrected from invalid `movement_type: "loss"` to valid `movement_type: "sale"`, invalid columns removed, 2-layer idempotency implemented in OS, and hierarchical matching added in PDV.

## Change Tracker
- **Files modified**:
  - `src/services/admin-catalog.functions.ts` (enforced `store_id` in complement groups update)
  - `src/services/service-orders.functions.ts` (multi-tenant check, 2-layer idempotency, `movement_type: sale`, status `completed`)
  - `src/services/events.functions.ts` (`assertEventAccess` helper protecting task, budget, sector, partner, lineup, document deletions)
  - `src/services/billing-ledger.functions.ts` (identity check, store access assertion, and cycle idempotency for monthly subscriptions)
  - `src/services/unified-listing.functions.ts` (`rawAttrs` decoupling and `undefined` fiscal purge)
  - `src/services/catalog.functions.ts` (sanitized cards and variants with `sanitizePublicProductAttributes`)
  - `src/services/product.functions.ts` (sanitized variants with `sanitizePublicProductAttributes`)
  - `src/services/classifieds.functions.ts` (sanitized public ads with `sanitizePublicClassifiedAttributes`)
  - `src/services/pdv.functions.ts` (hierarchical BOM resolution, `movement_type: sale`, multi-location inventory sync)
  - `docs/design/DECISIONS.md` (recorded DEC-016 / DEC-175)
- **Build status**: Vitest tests passing 57/57 (100% green)
- **Pending issues**: None

## Quality Status
- **Build/test result**: 57 passed / 0 failed (7 test suites)
- **Lint status**: `node scripts/design-lint.mjs` executed cleanly
- **Tests added/modified**: Validated all existing test suites for touched files

## Loaded Skills
- Standard repository rules applied per AGENTS.md.

## Artifact Index
- DISPATCH.md — Assignment instructions
- progress.md — Realtime execution progress and liveness heartbeat
- handoff.md — Final 5-component report
