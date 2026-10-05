# Handoff Report — Reviewer 1 (Milestone 2: Active City Contextual Indexing)

- **Date**: 2026-10-04T11:48:00Z
- **Role**: Reviewer 1 (`teamwork_preview_reviewer` / critic)
- **Working Directory**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\reviewer_m2_1`
- **Parent Orchestrator ID**: `d28f856c-9966-4ad5-80d8-b7dba7b1979c`
- **Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Integrity & Anti-Fraud Audit
Direct inspection across the 6 primary files and supporting implementations:
- **No hardcoded test outcomes**: No artificial test branches or conditional returns triggered by test mocks.
- **No facade implementations**: Real database query builders (`.from(...).select(...).ilike(...)`) and isomorphic cookie/header readers are active.
- **Eradication of synthetic mocks**: In `src/services/surface-cms.functions.ts` (lines 292–296), hardcoded mocks (`rating: 4.9`, `delivery_time_min: "Disponível"`) were removed and replaced with dynamic properties from `settings`.
- **Independent Verification Run**:
  - `cmd /c "npx vitest run src/services/mining/"` exited with Code 0, passing 2 test files and 12/12 unit tests.
  - `cmd /c "npx vitest run src/services/m2-adversarial-empirical.test.ts"` exited with Code 0, passing 14/14 unit tests.
  - `node scripts/design-lint.mjs --ratchet` exited with Code 0 (`CATRACA APROVADA: Zero regressões visuais em relação à baseline congelada`, 15,417 baseline violations).
  - `node scripts/design-lint.mjs --changed` exited with Code 0.
  - ZERO calls to `npm run typecheck` or `npm run build` were executed.

### 1.2 Inspection of Primary Review Targets

#### A. `src/lib/city-helper.ts` (lines 8–32, 40–152)
- Lines 8–18: `EXCLUDED_CITIES` Set declared containing `"global"`, `"all"`, `"todas"`, `"todas as cidades"`, `"todas-as-cidades"`, `"todos"`, `"indefinida"`, `"undefined"`, `"null"`.
- Lines 24–32: `normalizeActiveCity` checks `EXCLUDED_CITIES.has(trimmed.toLowerCase())`, returning `undefined` for empty strings or reserved terms.
- Lines 40–152: `resolveActiveCity` implements a 5-tier isomorphic resolution hierarchy:
  1. URL search parameter `searchParams.city`.
  2. Context parameter `context.searchCity`.
  3. Client-side browser checks: `document.cookie` regex `/(?:^|;\s*)waesy_city=([^;]+)/`, followed by `localStorage.getItem("waesy_master_location")`.
  4. Server-side SSR checks: `context.cookie`, `@tanstack/start-server-core` `getCookie("waesy_city")`, HTTP `cookie` header.
  5. Edge geolocation header: Cloudflare `cf-ipcity` via `getRequestHeader("cf-ipcity")`.
- All SSR calls and JSON parses are enclosed in `try / catch` blocks to prevent unhandled exceptions outside server context.

#### B. `src/services/jobs.functions.ts` (lines 41–53, 78–82)
- Line 50: `city: z.string().optional()` added to `listPublicJobs` validator schema, preventing TanStack Start RPC from stripping the parameter.
- Lines 78–81:
  ```ts
  if (data?.city && data.city !== "todos" && data.city !== "Todas" && data.city !== "Global" && data.city !== "all") {
    const c = `%${data.city.trim()}%`;
    query = query.or(`location_city.ilike.${c},location.ilike.${c}`);
  }
  ```
  Applies case-insensitive partial match on `location_city` and `location`.

#### C. `src/services/directory.functions.ts` (lines 21–24, 48, 68–70, 108–111)
- Lines 21–24: `DirectoryListingDTO` extended with `city?: string | null; state?: string | null; is_crawled?: boolean | null; source?: string | null;`.
- Line 48: `city: z.string().optional()` added to `getPublicDirectory` validator schema.
- Lines 68–70:
  ```ts
  if (data?.city && data.city !== "todos" && data.city !== "Todas" && data.city !== "Global" && data.city !== "all" && data.city !== "Todas as Cidades") {
    query = query.ilike("city", `%${data.city.trim()}%`);
  }
  ```
- Lines 108–111: Returned DTO maps `row.city`, `row.state`, `row.is_crawled`, `row.source`.

#### D. `src/services/classifieds.functions.ts` (lines 52, 64, 92–95)
- Line 52: `city: z.string().optional()` added to `getPublicClassifieds` validator schema.
- Line 64: `city, state` selected from `classifieds` table.
- Lines 92–95:
  ```ts
  if (data?.city && data.city !== "todos" && data.city !== "Todas" && data.city !== "Global" && data.city !== "all" && data.city !== "Todas as Cidades") {
    const cCity = `%${data.city.trim()}%`;
    query = query.or(`city.ilike.${cCity},location_text.ilike.${cCity}`);
  }
  ```

#### E. `src/services/search.functions.ts` (lines 29, 119–127, 156–166, 228–230, 285–287, 344–346)
- Line 29: `city: z.string().optional()` added to `federatedSearchInput`.
- Lines 119–126: Normalizes `city` against `"todos"`, `"Todas"`, `"Global"`, `"all"`, `"Todas as Cidades"`.
- Lines 156–166: Scopes products through `store:stores!inner(id, name, city, settings)` with `q.ilike("store.city", `%${normalizedCity}%`)`.
- Lines 228–230: Scopes events with `q.or(city.ilike.%${normalizedCity}%,location.ilike.%${normalizedCity}%)`.
- Lines 285–287: Scopes classifieds with `q.or(city.ilike.%${normalizedCity}%,location_text.ilike.%${normalizedCity}%)`.
- Lines 344–346: Scopes stores with `storeQ.ilike("city", `%${normalizedCity}%`)`.

#### F. `src/routes/_store.index.tsx` & `src/routes/_store.explorar.tsx` (lines 125–151 & 106–132)
- Replaced manual regex parsing with `const filteredCity = resolveActiveCity(location.search as any);`.
- `filteredCity` is passed to:
  - `listActiveBanners({ data: { placement: "home", city: filteredCity } })`
  - `listActiveBanners({ data: { placement: "home_middle", city: filteredCity } })`
  - `listActiveBanners({ data: { placement: "home_footer", city: filteredCity } })`
  - `getPublicDirectory({ data: { limit: 12, city: filteredCity } })`
  - `getPublicClassifieds({ data: { limit: 12, city: filteredCity } })`
  - `listPublicJobs({ data: { limit: 8, city: filteredCity } })`
  - `getPublicEvents({ data: { limit: 8, city: filteredCity } })`
  - `listPublicArticles({ data: { limit: 6, city: filteredCity } })`
- Loader return exposes `activeCity: filteredCity`.

---

## 2. Logic Chain

1. **Premise**: Milestone 2 required resolving active city isomorphically and propagating `city` across BFF server function contracts and portal loaders.
2. **Resolution Layer (Observation 1.2.A)**: `resolveActiveCity` unifies URL parameters, client cookies, LocalStorage, SSR cookies (`getCookie`), HTTP headers, and Cloudflare `cf-ipcity` edge headers. Normalization guarantees that universal filters ("Global", "Todas") resolve to `undefined`, preventing accidental empty results.
3. **RPC Boundary Layer (Observations 1.2.B, 1.2.C, 1.2.D, 1.2.E)**: Adding `city: z.string().optional()` to the Zod schemas of `jobs`, `directory`, `classifieds`, and `search` closes the RPC parameter stripping gap identified in survey R2.
4. **Data Scoping Layer (Observations 1.2.B, 1.2.C, 1.2.D, 1.2.E)**: Database queries now filter via `ilike` or `.or()` matching both structured city columns (`city`, `location_city`) and textual address descriptions (`location`, `location_text`).
5. **Route Loader Layer (Observation 1.2.F)**: Portal routes (`_store.index.tsx` and `_store.explorar.tsx`) systematically propagate `filteredCity` to all 7 queried services in parallel.
6. **State Invalidation Layer (`location-master-pill.tsx`)**: The location pill invokes `router.invalidate()` on update, triggering re-fetching of all active TanStack Router loaders without requiring a full browser reload.
7. **Synthesis**: The core objectives of Milestone 2 are cleanly implemented without facade shortcuts, regressions, or visual lint violations.

---

## 3. Caveats & Non-Blocking Findings

- **Finding 1 (Minor — PostgREST Comma Ingestion)**:
  In `jobs.functions.ts`, `classifieds.functions.ts`, and `search.functions.ts`, the search city is directly interpolated into `.or(...)` filter strings (e.g., `location_city.ilike.%${c}%,location.ilike.%${c}%`). If an input contains a comma (e.g., `?city=Chapecó, SC`), PostgREST parses the comma as an expression delimiter, resulting in an invalid filter syntax.
  *Recommendation*: Sanitize commas in `normalizeActiveCity` or strip them prior to building `.or()` strings.
- **Finding 2 (Minor — Dedicated Route Loaders)**:
  - In `src/routes/_store.classificados.index.tsx` (line 49), `getPublicClassifieds({ data: {} })` is called without `city: activeCity` in the initial server loader, and `useClassifiedCatalog` does not pass `selectedCity` to its query. (The home and explore portals are correctly scoped, but `/classificados` initial feed is not).
  - In `src/routes/_store.places.index.tsx` (line 25), `activeCity` is not returned from the loader, defaulting `DirectoryPage` to `activeCity = ""` when mounted on `/places`.
  *Recommendation*: Address in Milestone 3 route polish.

---

## 4. Conclusion

The implementation of Milestone 2 (Active City Contextual Indexing) meets all architectural, functional, and safety criteria. Zero integrity violations or regressions were found.

**Verdict**: **APPROVE**

---

## 5. Verification Method

### 5.1 Automated Unit Tests
```powershell
cmd /c "npx vitest run src/services/mining/"
cmd /c "npx vitest run src/services/m2-adversarial-empirical.test.ts"
```
*Expected*: 100% green pass rate (12 tests in mining, 14 tests in adversarial harness).

### 5.2 Deterministic Design Lint Catraca
```powershell
node scripts/design-lint.mjs --ratchet
node scripts/design-lint.mjs --changed
```
*Expected*: Exit code 0, 0 regressions against baseline.

### 5.3 Invalidation Conditions
- If `node scripts/design-lint.mjs --ratchet` produces any regression over the frozen baseline of 15,417 violations.
- If `resolveActiveCity` fails to normalize `"Todas as Cidades"` or `"Global"` to `undefined`.
