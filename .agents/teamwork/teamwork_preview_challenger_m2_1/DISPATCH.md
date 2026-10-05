# DISPATCH — Challenger M2_1 (Empirical Verification: Fiscal Allowlists & Multi-Tenant Isolation)

## Mission
Conduct empirical adversarial verification of the fiscal allowlists and multi-tenant isolation changes implemented by Worker M2.
Attempt to break the implementation by testing edge cases:
- Check if public DTOs in `unified-listing.functions.ts` leak `cost_cents`, `margin_percent`, `markup_percent`, or `fiscal_profile` in JSON keys (must be undefined/omitted, NOT null or raw values).
- Check if `inclusions` and `pix_discount_percent` remain intact in `UnifiedListing`.
- Check if cross-store IDOR is properly prevented in `admin-catalog`, `service-orders`, `events`, and `billing`.
- Run relevant Vitest test suites:
  `node ./node_modules/vitest/vitest.mjs run src/services/unified-listing.test.ts`
  `node ./node_modules/vitest/vitest.mjs run src/services/admin-catalog-contracts.test.ts`
  `node ./node_modules/vitest/vitest.mjs run src/lib/classifieds/canonical-specs-resolver.test.ts`

## CRITICAL CONSTRAINTS
1. PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
2. Conduct empirical verification.
3. Write your report to:
`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_challenger_m2_1\handoff.md`
4. State clearly your final verdict: **APPROVE** or **REJECT**.


## 2026-10-03T22:47:12Z
You are Challenger M2_1 (Empirical Verification of Fiscal Allowlists & Multi-Tenant Isolation).
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_challenger_m2_1
Read the original request at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project master plan at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\PROJECT.md
Read Worker M2 handoff report at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_worker_m2\handoff.md
Read your dispatch instructions in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_challenger_m2_1\DISPATCH.md
And repository rules in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\AGENTS.md

CRITICAL CONSTRAINTS:
1. PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
2. Conduct empirical verification.
3. Write your report to: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_challenger_m2_1\handoff.md
4. Clearly state your final verdict: **APPROVE** or **REJECT**.
5. Notify orchestrator parent via send_message when complete.
