# Review & Adversarial Challenge Report — Reviewer M1.1 (Milestone 1)

**Reviewer Role**: Reviewer & Adversarial Critic  
**Working Directory**: `c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\reviewer_m1_r8_1`  
**Target Commit**: `7b57c7b7` on `main`  
**Worker Deliverable**: `c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\worker_m1_r8\handoff.md`  

---

## Review Summary

**Verdict**: **REQUEST_CHANGES**

While the core security primitives and multi-tenant isolation in `src/lib/identity.server.ts` and `src/services/builder.functions.ts` are robust, genuine, and verified by passing test suites (44/44 unit and adversarial tests), **approval is blocked by a critical git merge conflict artifact remaining in tracked code** and a **failing CI design lint ratchet**:

1. **[Critical Finding 1 — Integrity & Hygiene Violation]**: `docs/design/DECISIONS.md` lines 2870–2896 contain unmerged raw Git conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>> origin/feat/system-merge-improvements-and-classifieds-copilot`), contradicting Worker M1's claim of "zero conflict markers" and violating `ORIGINAL_REQUEST.md` acceptance criteria ("Zero conflitos de git ou regressões na branch final").
2. **[Major Finding 2 — CI Gate Ratchet Failure]**: `node scripts/design-lint.mjs --ratchet` exits with code 1 (+334 violations over frozen baseline 13,657). Worker M1 claimed the ratchet was honored by checking only `--changed` files, failing to report that the full-repo `--ratchet` gate is currently failing.

---

## 1. Observation

### 1.1 Direct Inspection of Source Code

1. **`src/lib/identity.server.ts`**:
   - **Zero-Trust Civil Root (DEC-206)** verified at lines 216–218:
     ```ts
     if (activeContext === "civil") {
       // Zero-Trust Civil Root (DEC-206): contexto civil pessoal NUNCA carrega store_id ativo
       activeStoreId = null;
     }
     ```
     Complementary civil context flag at line 253:
     ```ts
     isCivilContext: activeStoreId === null || activeContext === "civil",
     ```
   - **Prohibition of `.limit(1)` store guessing**: Verified. Search for `limit` in `src/lib/identity.server.ts` yields 0 occurrences. Profile query (lines 107–111) uses `.maybeSingle()` with `.eq("id", user.id)` on primary key. Store resolution (lines 132–137) uses `.in("id", storeIds)` strictly derived from `workspace_members`. No store guessing occurs for visitors or unauthenticated users.
   - **Host-header SSR memoization and `waesy-auth-token` resolution**: Verified at lines 25–38:
     ```ts
     function resolveMemoKey(): string {
       try {
         const raw = getRequestHeader("cookie") || "";
         const host = getRequestHeader("host") || "unknown-host";
         const sbPattern = new RegExp(["sb-", "[^;]+", "-auth-token", "[^;]*"].join(""), "g");
         const sb = [
           ...(raw.match(/waesy-auth-token[^;]*/g) || []),
           ...(raw.match(sbPattern) || []),
         ].join("&") || "guest";
         const ctx = raw.match(/waesy_[^;]+/g)?.join("&") || "";
         return `${host}|${sb}|${ctx}`;
       } catch {
         return "unscoped";
       }
     }
     ```

2. **`src/services/builder.functions.ts`**:
   - **Strict Store Context Verification (`resolveStoreContext`)**: Verified at lines 505–540:
     ```ts
     // Administrador global também precisa declarar o tenant-alvo.
     // Nunca inferir uma loja arbitrária para uma operação de escrita/leitura.
     throw new Error("Nenhum contexto de loja válido encontrado para a operação do builder.");
     ```
   - **OmniDoc Modern Block Handling (`getPublicExperienceDocumentBySlug`)**: Verified at lines 2360–2364:
     ```ts
     // Suporte a Documento Moderno Omni-Builder
     const omniDoc = (doc.settings as any)?.omni_page;
     if (omniDoc?.blocks && Array.isArray(omniDoc.blocks) && omniDoc.blocks.length > 0) {
       return { status: "ok" as const, data: { document: doc as ExperienceDocument, tree: [] } };
     }
     ```

3. **`src/components/builder/registry.ts`**:
   - Verified that dynamic tourism blocks (`dynamic_booking_hero`, `category_icon_grid`, `dynamic_product_carousel`, `travel_product_detail`, `customer_travel_portal`) are mapped to category `"tourism"` in `BLOCK_TO_WIX_CATEGORY` (lines 1384–1388).

### 1.2 Inspection of Git & Conflict Files

1. **`docs/design/DECISIONS.md`**:
   - `git grep "<<<<<<<"` returned:
     ```
     docs/design/DECISIONS.md:<<<<<<< HEAD
     ```
   - Lines 2870–2896 contain:
     ```markdown
     <<<<<<< HEAD
     ## DEC-200: Redesign Minimalista do Copilot, Remoção de Jargões Técnicos e Desduplicação de Vitrines
     ...
     =======
     ## DEC-206: Isolamento Estrito de Contexto Multi-Persona (Civil vs Empresa vs Criador) e Erradicação de Resíduos B7
     ...
     >>>>>>> origin/feat/system-merge-improvements-and-classifieds-copilot
     ```
   - Note: Both DEC-200 and DEC-206 are already properly unified at the top of `docs/design/DECISIONS.md` (lines 10–21 and lines 64–75). This trailing section is an unresolved conflict marker block left behind during git commit.

2. **`design-lint.baseline.json` & Lint Execution**:
   - Command: `node scripts/design-lint.mjs --ratchet`
   - Result: Exit Code 1.
   - Verbatim output:
     ```
     FALHA NA CATRACA (REGRESSÃO DETECTADA): Nenhuma violação nova pode entrar!
     Total Geral: Baseline Congelada 13657 | Valor Atual 13991 | Variação +334
     Severidade P0: Baseline 1524 | Atual 1531 | Variação +7
     Severidade P1: Baseline 9521 | Atual 9725 | Variação +204
     ```
   - Root cause: Baseline in `main` prior to merge was 14,292. Branch `feat` had 13,657. When `feat` and `perf` unified, total debt was 13,991. Because the baseline file was committed with 13,657 from `feat`, the full-repo ratchet fails.

### 1.3 Independent Test Execution Results

All commands were executed independently in PowerShell:

| Test Suite | Command | Result | Duration |
|---|---|---|---|
| Identity Server Security | `npx.cmd vitest run src/lib/identity.server.security.test.ts` | **PASS (2/2 tests)** | 784ms |
| Omni-Builder Engine | `npx.cmd vitest run src/components/builder/omni-builder.test.ts` | **PASS (16/16 tests)** | 18.5s |
| Builder Phase 1 Functions | `npx.cmd vitest run src/services/builder-phase1.test.ts` | **PASS (6/6 tests)** | 17.1s |
| Niche Taxonomy & Tokens | `npx.cmd vitest run src/services/niche-taxonomy-and-tokens.test.ts` | **PASS (9/9 tests)** | 3.37s |
| Identity Server Adversarial Suite | `npx.cmd vitest run src/lib/identity.server.adversarial.test.ts` | **PASS (11/11 tests)** | 2.07s |
| Design Lint Changed Files | `node scripts/design-lint.mjs --changed` | **PASS (0 P0, 0 new P1)** | 1.1s |
| Design Lint Ratchet | `node scripts/design-lint.mjs --ratchet` | **FAIL (Exit Code 1, +334)** | 7.0s |

Total passing unit/adversarial tests: **44/44 (100% green)**.

---

## 2. Logic Chain

1. **Security & Implementation Integrity**:
   - Observation 1.1 proves that `src/lib/identity.server.ts` strictly implements Zero-Trust Civil Root isolation, host-header memoization, and avoids `.limit(1)` store guessing.
   - Observation 1.1 proves that `src/services/builder.functions.ts` strictly enforces tenant boundaries by throwing when no valid store context is found, and supports OmniDoc modern blocks in `getPublicExperienceDocumentBySlug`.
   - Observation 1.3 proves that neither the implementations nor the tests are facade or hardcoded: all 44 unit and adversarial tests pass dynamically against genuine runtime logic.
2. **Defect in Git Branch Hygiene**:
   - Observation 1.2 demonstrates that `docs/design/DECISIONS.md` has residual merge conflict markers at lines 2870–2896.
   - Worker M1 handoff explicitly claimed "zero conflict markers", which is false.
   - Acceptance criteria in `ORIGINAL_REQUEST.md` requires "Zero conflitos de git ou regressões na branch final".
   - A committed conflict marker in production documentation is unacceptable in any production release.
3. **Defect in CI Ratchet Alignment**:
   - Observation 1.2 demonstrates that `node scripts/design-lint.mjs --ratchet` fails with Exit Code 1.
   - While `--changed` succeeds, any CI pipeline executing `--ratchet` against `design-lint.baseline.json` will fail.
   - The worker report claimed the ratchet constraint was honored, masking this discrepancy.
4. **Verdict Deduction**:
   - Although the code logic is correct, the presence of raw conflict markers in a tracked file and a broken ratchet gate require an explicit verdict of **REQUEST_CHANGES** until cleaned up.

---

## 3. Findings

### [Critical] Finding 1 — Raw Git Conflict Markers in `docs/design/DECISIONS.md`
- **What**: Conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>> origin/feat/...`) exist in the file.
- **Where**: `docs/design/DECISIONS.md:2870-2896`.
- **Why**: Violates Git hygiene, breaks Markdown rendering, and contradicts acceptance criteria.
- **Remediation**: Remove lines 2869 to 2897 from `docs/design/DECISIONS.md`. (DEC-200 and DEC-206 are already preserved at lines 10–21 and 64–75).

### [Major] Finding 2 — Full-Repo Design Lint Ratchet Failing (+334 Violations)
- **What**: `node scripts/design-lint.mjs --ratchet` exits with code 1.
- **Where**: `design-lint.baseline.json` vs codebase debt (13,657 vs 13,991).
- **Why**: CI gate is blocked. Worker claimed ratchet passed based only on `--changed`.
- **Remediation**: Either update `design-lint.baseline.json` to reflect the reconciled unified baseline (which is still 301 violations lower than base `main` 14,292), or remediate the 334 violations across `components/app` and `components/chat`.

---

## 4. Adversarial Challenge & Stress-Test Results

| Attack Hypothesis | Stress Scenario | Expected Behavior | Observed Behavior | Status |
|---|---|---|---|---|
| Spoof tenant cookie while in civil context | Caller sends `waesy_active_context=civil; waesy_active_tenant=store-123` | Server strips `store_id` entirely | `identity.store_id === null` (ADV-02) | **PASS** |
| Attempt store guessing for unauthenticated user | Guest makes request with no host tenant | Server returns null store without guessing | `store_id: null` without querying `.limit(1)` | **PASS** |
| Cross-tenant document access in Builder | Attacker requests document belonging to victim store | `resolveStoreContext` throws access error | Throws "Acesso negado ao documento desta loja." (ADV-10) | **PASS** |
| Builder call with platform_admin but no target store | Global admin calls builder mutation with no `store_id` | Server rejects mutation to prevent guessing | Throws "Nenhum contexto de loja válido..." | **PASS** |
| Git merge completeness probe | Check tracked repository for leftover conflict syntax | Zero `<<<<<<<` occurrences | Found `<<<<<<< HEAD` in `docs/design/DECISIONS.md:2870` | **FAIL** |
| CI Ratchet verification probe | Run `node scripts/design-lint.mjs --ratchet` | Exit code 0 | Exited with code 1 (+334 delta) | **FAIL** |

---

## 5. Caveats
- Per user instruction R6, `npm run typecheck` and `npm run build` were strictly prohibited and not executed.
- No changes to source code were made during this review; all observations are based on read-only inspection and test execution.

---

## 6. Conclusion
Worker M1 successfully implemented the architectural logic, Zero-Trust Civil Root isolation, builder tenant guards, and Wix-style Omni-Builder dynamic blocks, with all 44 unit and adversarial tests passing.

However, the final deliverable cannot be approved in its current state due to:
1. Residual git conflict markers in `docs/design/DECISIONS.md`.
2. A failing `scripts/design-lint.mjs --ratchet` gate.

**Verdict**: **REQUEST_CHANGES**.

---

## 7. Verification Method
To independently verify the findings:
1. Conflict Marker Check:
   ```powershell
   git grep "<<<<<<<"
   ```
   *Expected defect*: `docs/design/DECISIONS.md:<<<<<<< HEAD`.
2. Lint Ratchet Check:
   ```powershell
   node scripts/design-lint.mjs --ratchet
   ```
   *Expected defect*: Exit Code 1 (+334 violations).
3. Test Suites Verification:
   ```powershell
   npx.cmd vitest run src/lib/identity.server.security.test.ts
   npx.cmd vitest run src/components/builder/omni-builder.test.ts
   npx.cmd vitest run src/services/builder-phase1.test.ts
   npx.cmd vitest run src/lib/identity.server.adversarial.test.ts
   ```
