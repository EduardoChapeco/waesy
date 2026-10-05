# Progress — Explorer M2_2

- Last visited: 2026-10-03T22:24:00Z
- Status: Investigation complete. Preparing 5-component handoff report.
- Phase: Report generation & synthesis.
- Key outcomes:
  1. Identified root cause of Vitest failure in `unified-listing.test.ts` (attributes sanitized too early, dropping `inclusions` and `payment_config`).
  2. Prepared surgical diff for `mapDatabaseRowToUnifiedListing` purging `cost_cents`, `margin_percent`, `markup_percent`, and `fiscal_profile` via `undefined` and decoupling `rawAttrs` from `attrs`.
  3. Prepared surgical diff for `catalog.functions.ts:123, 850` to sanitize card and variant attributes via `sanitizePublicProductAttributes`.
  4. Prepared surgical diff for `product.functions.ts:152` to sanitize variant attributes via `sanitizePublicProductAttributes`.
  5. Audited classifieds endpoints (`getPublicClassifiedById`, `getAdsByStoreId`, `getPublicClassifieds`) and designed `sanitizePublicClassifiedAttributes` to prevent attribute and `ai_instructions` leakage.
  6. Evaluated `master-catalog.functions.ts` and `central-knowledge.functions.ts` fiscal classification queries.
