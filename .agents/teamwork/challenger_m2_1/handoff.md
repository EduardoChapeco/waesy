# HANDOFF — Challenger 1 (Milestone 2: Empirical Stress Test City Resolution & Zod Parity)

- **Date**: 2026-10-04T11:48:00Z
- **Role**: Challenger 1 (`teamwork_preview_challenger`)
- **Parent Orchestrator ID**: `d28f856c-9966-4ad5-80d8-b7dba7b1979c`
- **Verdict**: **APPROVE**

---

## 1. Observation

Direct empirical evidence obtained across all tested targets without executing `npm run typecheck` or `npm run build`:

### 1.1 City Helper & Resolution (`src/lib/city-helper.ts`)
1. **Normalization (`normalizeActiveCity`)**:
   - Lines 8-18 define `EXCLUDED_CITIES`: `"global"`, `"all"`, `"todas"`, `"todas as cidades"`, `"todas-as-cidades"`, `"todos"`, `"indefinida"`, `"undefined"`, `"null"`.
   - Lines 24-32 implement trimmed, lower-case checking and non-string guards:
     ```ts
     if (!rawCity || typeof rawCity !== "string") return undefined;
     const trimmed = rawCity.trim();
     if (!trimmed) return undefined;
     if (EXCLUDED_CITIES.has(trimmed.toLowerCase())) {
       return undefined;
     }
     return trimmed;
     ```
2. **Resolution Pipeline (`resolveActiveCity`)**:
   - Lines 40-152 implement a multi-tiered hierarchy:
     - Tier 1: `searchParams.city` parsed via `normalizeActiveCity`.
     - Tier 1b: `context.searchCity` fallback.
     - Tier 2 (Client/Browser): `document.cookie` (`waesy_city`), then `localStorage` (`waesy_master_location`).
     - Tier 3 (Server/SSR): `context.cookie`, then TanStack Start `getCookie("waesy_city")`, then request header `cookie`, then `context.cfCity`, then Cloudflare header `cf-ipcity`.
   - All `decodeURIComponent` calls are protected by `try ... catch` blocks preventing any URI malformed crash.

### 1.2 Zod Schema Definitions Across BFF Services
Empirically inspected across all target services in `src/services/`:
1. `src/services/jobs.functions.ts` (line 50):
   ```ts
   export const listPublicJobs = createServerFn({ method: "GET" })
     .validator(
       z.object({
         ...
         city: z.string().optional(),
       }).optional()
     )
   ```
2. `src/services/directory.functions.ts` (line 48):
   ```ts
   export const getPublicDirectory = createServerFn({ method: "GET" })
     .validator(
       z.object({
         ...
         city: z.string().optional(),
       }).optional()
     )
   ```
3. `src/services/classifieds.functions.ts` (line 52):
   ```ts
   export const getPublicClassifieds = createServerFn({ method: "GET" })
     .validator(
       z.object({
         ...
         city: z.string().optional(),
       }).optional()
     )
   ```
4. `src/services/search.functions.ts` (lines 29, 414):
   ```ts
   const federatedSearchInput = z.object({
     ...
     city: z.string().optional(),
   });
   export const federatedSearch = createServerFn({ method: "GET" })
     .validator(federatedSearchInput)
   ```
5. Additional parity confirmed in `src/services/events.functions.ts` (line 612), `src/services/banner.functions.ts` (line 107), and `src/services/news.functions.ts` (line 79).

### 1.3 Empirical Test Execution Results
Executed test commands via terminal:
1. `cmd /c "node --experimental-strip-types scripts/audit-city-indexing.test.mjs"`:
   - Output: `TOTAL TESTS: 132 | PASSED: 132 | FAILED: 0`. Exit Code: 0.
   - Tested all 24 case-permutations of exclusions, edge cases (`null`, `undefined`, numbers, empty, arrays, booleans, SQL injection strings, XSS payloads).
   - Tested cookie parsing with malformed URI encoding, multi-cookie headers, Cloudflare headers, and priority ordering.
   - Tested live Zod schemas: validated that valid strings succeed, optional fields allow omission, and numbers/booleans/arrays are rejected.
2. `cmd /c "npx vitest run src/lib/city-helper.test.ts"`:
   - Output: `1 passed (1), 7 tests passed`. Duration: 1.11s. Exit Code: 0.
3. `cmd /c "npx vitest run src/services/mining-forensic-quality.test.ts src/services/unified-integrations-and-mining.test.ts"`:
   - Output: `2 passed (2), 12 tests passed`. Duration: 2.20s. Exit Code: 0.
4. `cmd /c "node scripts/design-lint.mjs --ratchet"`:
   - Output: `CATRACA APROVADA: Zero regressões visuais em relação à baseline congelada`. Exit Code: 0.

---

## 2. Logic Chain

1. **Premise 1 (Edge Cases & Normalization)**:
   - From Observation 1.1, `normalizeActiveCity` verifies input types before trimming and tests against a comprehensive lowercase Set (`EXCLUDED_CITIES`).
   - The test harness tested all boundary inputs: empty string, whitespace only, control chars (`\t\n\r`), null, numbers, boolean, objects, arrays, and adversarial strings. All invalid or excluded inputs reliably returned `undefined`. Valid cities (including composite city/state strings like `"Concórdia - SC"` and accented cities like `"Florianópolis"`) returned properly trimmed strings.
2. **Premise 2 (Resolution Resilience)**:
   - From Observation 1.1, `resolveActiveCity` handles missing cookies, multi-cookie headers, URI malformed encodings, and Cloudflare headers with strict error containment. No unhandled exceptions occurred in 132 automated test scenarios.
3. **Premise 3 (BFF Contract Parity)**:
   - From Observation 1.2, every single target BFF service (`jobs`, `directory`, `classifieds`, `search`) as well as auxiliary services (`events`, `banner`, `news`) explicitly implements `city: z.string().optional()`.
   - The input contracts accept queries without a city (preserving backward compatibility) and enforce type safety against malformed input payloads.
4. **Premise 4 (Worker Claims vs. Independent Verification)**:
   - Worker M2 claimed 12/12 passing mining tests and zero design lint ratchet regressions.
   - Independent test runs in Observation 1.3 confirmed both claims verbatim (12/12 unit tests green, Catraca aprovada with 0 regressions).
5. **Conclusion**:
   - The implementation satisfies all acceptance criteria of Milestone 2 with zero regressions and zero broken invariants.

---

## 3. Caveats

1. **Behavioral Design Nuance**: In `resolveActiveCity`, if a user possesses a valid browser cookie `waesy_city=Chapecó` and visits a URL with `?city=Global` or `?city=Todas`, `normalizeActiveCity` filters `"Global"` to `undefined`. Because `normalized` is undefined, `resolveActiveCity` falls through to the existing cookie and returns `"Chapecó"`. This is intended within the cascading fallback architecture (where non-cities trigger fallbacks rather than a hard unsetting of cookies); in the UI, selecting "Global" in the `LocationMasterPill` explicitly sets `waesy_city=Global` (which causes the cookie itself to resolve to undefined) and invalidates the router.
2. **Prohibition Compliance**: In accordance with system instructions, `npm run typecheck` and `npm run build` were never executed. Verification was carried out using focused unit testing, Node test execution, Vitest, and deterministic static analysis.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 2 (Active City Contextual Indexing) is robust, resilient to adversarial inputs, and exhibits 100% Zod contract parity across all public discovery and BFF endpoints. All empirical checks passed with Exit Code 0. The orchestrator may proceed to the next milestone.

---

## 5. Verification Method

To independently reproduce this verification:

1. **Run the Empirical Test Harness**:
   ```cmd
   node --experimental-strip-types scripts/audit-city-indexing.test.mjs
   ```
   *Expected outcome*: 132 tests passed, 0 failed, Exit Code 0.

2. **Run the City Helper Vitest Suite**:
   ```cmd
   cmd /c "npx vitest run src/lib/city-helper.test.ts"
   ```
   *Expected outcome*: 1 test file passed, 7 tests passed, Exit Code 0.

3. **Run the Mining Forensic Suite**:
   ```cmd
   cmd /c "npx vitest run src/services/mining-forensic-quality.test.ts src/services/unified-integrations-and-mining.test.ts"
   ```
   *Expected outcome*: 2 test files passed, 12 tests passed, Exit Code 0.

4. **Verify Design Lint Catraca**:
   ```cmd
   node scripts/design-lint.mjs --ratchet
   ```
   *Expected outcome*: `CATRACA APROVADA: Zero regressões visuais em relação à baseline congelada`, Exit Code 0.
