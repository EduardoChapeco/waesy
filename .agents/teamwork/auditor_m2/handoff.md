# FORENSIC AUDIT REPORT — Milestone 2 (Active City Contextual Indexing)

- **Date**: 2026-10-04T11:45:00Z
- **Auditor**: Forensic Auditor M2 (`auditor_m2`)
- **Parent Orchestrator ID**: `d28f856c-9966-4ad5-80d8-b7dba7b1979c`
- **Work Product**: Milestone 2 Implementation by `worker_m2` (Active City Contextual Indexing)
- **Authoritative Request**: `ORIGINAL_REQUEST.md` (header `## 2026-10-04T03:35:00Z`)
- **Profile / Integrity Mode**: General Project / Development Mode
- **Final Verdict**: **CLEAN**

---

## 1. Executive Forensic Summary

| Forensic Verification Check | Result | Evidence Summary |
| :--- | :---: | :--- |
| **Check 1: Zero Mocks / Synthetic Data** | **PASS** | `surface-cms.functions.ts` lines 281–298 purged of hardcoded metrics (`rating: 4.9`, `review_count: 120`, etc.), replaced with safe mapping from `settings`. (Legacy note: line 897 predates M2). |
| **Check 2: Authentic Zod Schemas** | **PASS** | `jobs`, `directory`, `classifieds`, `search` include `city: z.string().optional()` in Zod validator and execute genuine database filtering with normalization blocklists. |
| **Check 3: Location Propagation** | **PASS** | `crawler-sources.functions.ts` persists `region` and `city` to `crawl_queue.metadata`. `automated-harvest.ts` persists `city: targetCity` and `state: "SC"` into `news_articles`. |
| **Check 4: Build / Typecheck Prohibition** | **PASS** | `npm run typecheck` and `npm run build` were NOT run. Workspace `dist/` timestamp verified unchanged (2026-10-03). |
| **Check 5: No Facades / Cheating** | **PASS** | Independent test execution verified 100% green: `vitest run src/services/mining/` (12/12 pass), `vitest run src/services/m2-adversarial-empirical.test.ts` (14/14 pass), `node scripts/design-lint.mjs --ratchet` (Exit Code 0). |

---

## 2. 5-Component Forensic Analysis

### 2.1 Observation

1. **Purge of Synthetic Mocks in `src/services/surface-cms.functions.ts`**:
   Lines 281–298 of `src/services/surface-cms.functions.ts`:
   ```ts
   // Previously:
   // rating: 4.9,
   // review_count: 120,
   // distance_km: 1.2,
   // is_open: true,
   // delivery_time_min: "Disponível",
   // Now:
   rating: typeof settings.rating === "number" ? settings.rating : undefined,
   review_count: typeof settings.review_count === "number" ? settings.review_count : undefined,
   distance_km: typeof settings.distance_km === "number" ? settings.distance_km : undefined,
   is_open: typeof settings.is_open === "boolean" ? settings.is_open : undefined,
   delivery_time_min: typeof settings.delivery_time_min === "string" ? settings.delivery_time_min : undefined,
   ```
   City filtering was applied to `storesQuery` (line 276: `storesQuery.ilike("city", "%" + cleanCity + "%")`) and `allProducts` filtered against store city.

2. **Legacy Code Observation at Line 897 of `surface-cms.functions.ts`**:
   In `getProceduralInfiniteFeedPage` (line 897), the following remains:
   ```ts
   rating: 5.0,
   review_count: 24,
   distance_km: 1.1,
   is_open: true,
   delivery_time_min: "Disponível",
   ```
   Forensic Git inspection (`git log -1 -S "rating: 5.0"`) confirms this was authored in commit `0f63f23c` on Oct 2, 2026 (`feat(S07-S09): desacoplamento de lib em modulos de dominio...`), predating Milestone 2. Worker M2 did not create, modify, or relocate these values.

3. **Authentic Zod Schemas & Backend Filtering**:
   - `src/services/jobs.functions.ts:50`: `city: z.string().optional()` present in `listPublicJobs` validator. Line 78 filters:
     `query = query.or("location_city.ilike." + c + ",location.ilike." + c)` with exclusion of reserved values ("todos", "Todas", "Global", "all").
   - `src/services/directory.functions.ts:48`: `city: z.string().optional()` present in `getPublicDirectory` validator. Line 68 filters:
     `query = query.ilike("city", "%" + data.city.trim() + "%")`. Exposes `city, state, is_crawled, source` in `DirectoryListingDTO`.
   - `src/services/classifieds.functions.ts:52`: `city: z.string().optional()` present in `getPublicClassifieds` validator. Line 91 filters:
     `query = query.or("city.ilike." + cCity + ",location_text.ilike." + cCity)`. `city, state` selected from database.
   - `src/services/search.functions.ts:29`: `city: z.string().optional()` present in `federatedSearchInput`. Lines 155–348 filter products (`stores!inner`), events, classifieds, and stores using `normalizedCity`.

4. **Provenance & Location Propagation**:
   - `src/services/crawler-sources.functions.ts:255, 286`: `crawl_queue.metadata` stores `region: source.region` and `city: (source.config as any)?.city || source.region || undefined`.
   - `src/services/mining/automated-harvest.ts:241-242`: `news_articles.insert` stores `city: targetCity` and `state: "SC"`. Telemetry recorded in `scraper_audit_log`.

5. **Build / Typecheck Prohibition Adherence**:
   - `dist/` directory timestamp is `2026-10-03 13:20:11` (yesterday).
   - `.tsbuildinfo` does not exist.
   - No build or typecheck commands were executed during this session.

6. **Empirical Independent Test Verification**:
   - `cmd /c "npx vitest run src/services/mining/"`:
     `Test Files: 2 passed (2) | Tests: 12 passed (12) | Duration: 1.72s`.
   - `cmd /c "npx vitest run src/services/m2-adversarial-empirical.test.ts"`:
     `Test Files: 1 passed (1) | Tests: 14 passed (14) | Duration: 1.85s`.
   - `node scripts/design-lint.mjs --ratchet`:
     `CATRACA APROVADA: Zero regressões visuais em relação à baseline congelada.` Exit Code: 0.
   - `node scripts/design-lint.mjs --changed`:
     Exit Code: 0.

### 2.2 Logic Chain

1. Observations 1 and 2 establish that the worker legitimately removed hardcoded values (`rating: 4.9`, `review_count: 120`, etc.) from `getModularSurfaceFeed`. No synthetic values were re-introduced or moved to new functions.
2. Observation 3 establishes that all four mandated BFF services (`jobs`, `directory`, `classifieds`, `search`) have genuine, typed Zod schemas and implement functional SQL query filters (`ilike` / `or`), preventing parameter stripping by RPC boundaries.
3. Observation 4 proves that crawler provenance (`city`, `region`, `state`) is retained end-to-end through the mining ingestion pipeline and persisted into both `crawl_queue` and `news_articles`.
4. Observation 5 verifies that the strict negative constraint (`PROIBIÇÃO ABSOLUTA: Proibido executar npm run typecheck ou npm run build`) was respected by the worker.
5. Observation 6 confirms via direct independent test runs that the implementation produces genuinely passing tests without test tampering or facade mocks.
6. Under Development Integrity Mode (per `ORIGINAL_REQUEST.md`), there are zero instances of prohibited patterns (no hardcoded test outputs, no facade stubs, no fabricated verification logs).

### 2.3 Caveats

- **Legacy Debt at `surface-cms.functions.ts:897`**: As uncovered during Git forensics, line 897 in `getProceduralInfiniteFeedPage` contains `rating: 5.0, review_count: 24, distance_km: 1.1, delivery_time_min: "Disponível"`. This was introduced on Oct 2, 2026 in commit `0f63f23c` and was outside the scope of Milestone 2 (lines 270–310). It is recommended that a future cleanup task sanitize `getProceduralInfiniteFeedPage` using the same `settings` mapping applied in `getModularSurfaceFeed`.
- **Runtime Cloudflare Header Simulation**: While `cf-ipcity` resolution logic was verified statically and unit-tested in `city-helper.ts`, live production resolution depends on Cloudflare Edge environment headers.

### 2.4 Conclusion

The work product delivered for Milestone 2 (Active City Contextual Indexing) is authentic, functionally complete, and free of integrity violations under Development Mode. All five forensic verification checks passed.

**Verdict: CLEAN**

### 2.5 Verification Method

To independently reproduce this verification:
1. Verify mock purge:
   ```powershell
   git diff src/services/surface-cms.functions.ts
   ```
2. Verify Zod schemas:
   ```powershell
   git diff src/services/jobs.functions.ts src/services/directory.functions.ts src/services/classifieds.functions.ts src/services/search.functions.ts
   ```
3. Run Vitest mining suite:
   ```powershell
   cmd /c "npx vitest run src/services/mining/"
   ```
4. Run Design Lint ratchet:
   ```powershell
   node scripts/design-lint.mjs --ratchet
   ```
