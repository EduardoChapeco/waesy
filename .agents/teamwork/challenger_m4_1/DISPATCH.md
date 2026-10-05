# DISPATCH — Challenger M4 (Continuous Mining Engines Consolidation)

## Role & Mission
You are Challenger M4 for Milestone 4.
Your mission is to perform adversarial, empirical verification of the mining engines refactoring, ensuring zero geographic leaks, zero fake data, and 100% test pass rate.

## Authoritative Context
- User Request: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md` (header `## 2026-10-04T03:35:00Z`)
- Project Architecture: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\PROJECT.md`
- Worker Handoff: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m4\handoff.md`

## Adversarial Verification Tasks
1. **Multi-State City Resolution & Zero BBOX Leak**:
   - Empirically verify that unresolvable cities yield `state: undefined` and return empty `[]` from Overpass, NEVER Chapecó coordinates or Chapecó establishments.
   - Verify that queries for cities outside SC (e.g., Curitiba/PR, Passo Fundo/RS, Londrina/PR, Campinas/SP) resolve the correct state and never leak `"SC"`.
   - Verify that Nominatim state name resolution maps states correctly without corruption ("Paraná" -> "PR", "Santa Catarina" -> "SC", "Rio Grande do Sul" -> "RS").
2. **Automated Test Suites**:
   - Run: `npx vitest run src/services/mining/` (verify 100% pass rate).
   - Run: `npx vitest run src/lib/mining/circuit-breaker.test.ts` (verify 100% pass rate).
   - Run: `npx vitest run src/services/copilot-fsm.test.ts` (verify 100% pass rate).
   - Run: `npx vitest run src/services/copilot-pipeline-boundaries.test.ts` (verify 100% pass rate).
3. **Design-Lint Ratchet**:
   - Run: `node scripts/design-lint.mjs --ratchet` (verify ratchet PASS, 0 new violations).
   - Run: `node scripts/design-lint.mjs --changed` (verify changed files are clean).

## CRITICAL OPERATING CONSTRAINTS (PROIBIÇÃO ABSOLUTA)
- NEVER run `npm run typecheck` or `npm run build` under any circumstances.

## Output Requirements
Deliver your report with verdict (**APPROVE** or **REQUEST_CHANGES**) in:
`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\challenger_m4_1\handoff.md`
Notify parent orchestrator (`d28f856c-9966-4ad5-80d8-b7dba7b1979c`) via `send_message`.
