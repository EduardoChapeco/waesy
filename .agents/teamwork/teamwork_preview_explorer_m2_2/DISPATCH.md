# Explorer M2_2 Dispatch: Closed Allowlists & Fiscal Data Leakage Elimination

## Objective
Analyze the exact code modifications needed for:
1. `src/services/unified-listing.functions.ts:65-67, 125-131`: purge `cost_cents`, `margin_percent`, `markup_percent`, and `fiscal_profile` from public DTOs in `mapDatabaseRowToUnifiedListing`.
2. `src/services/catalog.functions.ts:123`: sanitize `attributes` in `listPublishedProducts` / `explodeProductToCards` using `PUBLIC_SPEC_ALLOWLIST`.
3. `src/services/product.functions.ts:152`: sanitize variant attributes using `sanitizePublicProductAttributes`.
4. `src/services/classifieds.functions.ts`: ensure public endpoints (`getPublicClassifiedById`, `getAdsByStoreId`) do not leak unvetted internal attributes.
5. Inquire endpoints `master-catalog.functions.ts:18, 83` and `central-knowledge.functions.ts:1050` regarding fiscal classification queries.

## Deliverable
Write your report with exact diffs to `.agents/teamwork/teamwork_preview_explorer_m2_2/handoff.md`.
PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build`.

## 2026-10-03T22:16:02Z
You are Explorer M2_2 (Closed Allowlists & Fiscal Data Leakage Elimination).
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_2
Read the original request at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project master plan at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\PROJECT.md
Read Explorer 2 survey findings in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md
Read your dispatch instructions in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_2\DISPATCH.md
And repository rules in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\AGENTS.md

CRITICAL CONSTRAINTS:
1. READ-ONLY exploration. Do NOT edit source code files.
2. PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
3. Write your report to: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_2\handoff.md
4. Notify orchestrator parent via send_message when complete.

INVESTIGATION SCOPE:
- Detailed diffs for `src/services/unified-listing.functions.ts:65-67, 125-131` to completely purge `cost_cents`, `margin_percent`, `markup_percent`, and `fiscal_profile` from public DTOs.
- Detailed diffs for `src/services/catalog.functions.ts:123` and `src/services/product.functions.ts:152` to sanitize `attributes` via `PUBLIC_SPEC_ALLOWLIST`.
- Audit classifieds public endpoints for attribute leakage.
