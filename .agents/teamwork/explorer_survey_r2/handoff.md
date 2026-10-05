# Handoff Report — Explorer Survey R2: Active City Contextual Indexing

**Module**: R2 — Indexação e Filtragem Contextual por Cidade  
**Date**: 2026-10-04T03:55:00Z  
**Author**: Explorer R2 (Active City Contextual Indexing)  
**Working Directory**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_r2`  
**Parent Orchestrator ID**: `d28f856c-9966-4ad5-80d8-b7dba7b1979c`  

---

## 1. Observation

### 1.1 City Resolution Mechanism (`src/lib/city-helper.ts` & `src/components/location/location-master-pill.tsx`)
- **`src/lib/city-helper.ts` (lines 6–40)**:
  ```ts
  export function resolveActiveCity(searchParams?: Record<string, unknown>): string | undefined {
    if (searchParams && typeof searchParams.city === "string" && searchParams.city.trim()) {
      const searchCity = searchParams.city.trim();
      if (
        searchCity !== "Global" &&
        searchCity !== "all" &&
        searchCity !== "Todas" &&
        searchCity !== "Todas as Cidades"
      ) {
        return searchCity;
      }
    }

    if (typeof document !== "undefined") {
      const match = document.cookie.match(/waesy_city=([^;]+)/);
      if (match) {
        try {
          const cookieCity = decodeURIComponent(match[1]).trim();
          if (
            cookieCity &&
            cookieCity !== "Global" &&
            cookieCity !== "all" &&
            cookieCity !== "Todas" &&
            cookieCity !== "Todas as Cidades"
          ) {
            return cookieCity;
          }
        } catch {
          // ignore
        }
      }
    }

    return undefined;
  }
  ```
  - **Direct Observation 1.1.1 (SSR Blindness)**: In SSR context (where `typeof document === "undefined"`), if `searchParams` does not contain `city`, `resolveActiveCity` unconditionally returns `undefined`, completely ignoring the incoming HTTP `Cookie` header (`waesy_city`) and edge headers (`cf-ipcity` via Cloudflare Pages).
  - **Direct Observation 1.1.2 (Unimplemented LocalStorage)**: The comment on line 3 claims: `Suporta parâmetro de URL (?city=), Cookie universal (waesy_city) e LocalStorage`, but `localStorage` is never inspected.
  - **Direct Observation 1.1.3 (Inline Logic Duplication with Flaws)**:
    In `src/routes/_store.index.tsx` (lines 123–134) and `src/routes/_store.explorar.tsx` (lines 104–115):
    ```ts
    let activeCity: string | undefined = (location.search as any)?.city;
    if (!activeCity && typeof document !== "undefined") {
      const match = document.cookie.match(/waesy_city=([^;]+)/);
      if (match) {
        try {
          activeCity = decodeURIComponent(match[1]);
        } catch {}
      }
    }
    const filteredCity = activeCity && activeCity !== "Global" ? activeCity : undefined;
    ```
    This inline duplication fails to filter out `"all"`, `"Todas"`, and `"Todas as Cidades"`. If `waesy_city="Todas"`, `filteredCity` becomes `"Todas"`, injecting an invalid city filter into database queries.

- **`src/components/location/location-master-pill.tsx` (lines 116–129, 169, 209–225)**:
  - Writes to `localStorage.setItem("waesy_master_location", ...)` and `document.cookie = waesy_city=...`.
  - Dispatches `window.dispatchEvent(new CustomEvent("waesy:location-updated", { detail: newLoc }))`.
  - **Direct Observation 1.1.4 (Decoupled Global State & Missing Route Invalidation)**:
    Grepping for `waesy:location-updated` across all of `src/` revealed that **only** `location-master-pill.tsx` itself listens to this event. Neither TanStack Router (`router.invalidate()`) nor any route loader or `useQuery` subscribes to it. Selecting a new city in the pill updates the button label in the header, but leaves the route content stale on the previous city until a hard page reload occurs.

---

### 1.2 Civic and Commercial Modules

#### A. Notícias (`src/services/news.functions.ts` & `src/routes/_store.noticias.index.tsx`)
- **`src/services/news.functions.ts` (lines 79, 112–114, 150–151)**:
  - `listPublicArticles` accepts `city: z.string().optional()`.
  - Query filtering:
    ```ts
    if (data?.city && data.city !== "todas" && data.city !== "Todas" && data.city !== "Global" && data.city !== "all") {
      q = q.or(`city.ilike.%${data.city}%,tags.cs.{${data.city.toLowerCase()}}`);
    }
    ```
  - Mapping return (lines 150–151):
    ```ts
    city: a.city || "Chapecó",
    state: a.state || "SC",
    ```
  - **Direct Observation 1.2.1 (Data Falsification of Null City Articles)**: Any article in `news_articles` with `city IS NULL` has its city falsified to `"Chapecó"` and state to `"SC"` in the DTO mapping.
  - **Direct Observation 1.2.2 (Omission in Crawler Insert)**: In `src/services/mining.functions.ts` (lines 138–160, `insertMinedArticle`), the `.insert({...})` statement completely omits `city` and `state`. Consequently, all news articles saved through this path persist with `city = NULL`.
  - **Direct Observation 1.2.3 (UI Parity Gap)**: In `src/components/news/news-card.tsx` (lines 1–205), `article.city` and `article.state` are never rendered. There is no location chip or badge, and no badge distinguishing native vs. mined news sources.

#### B. Vagas / Empregos (`src/services/jobs.functions.ts` & `src/routes/_store.empregos.index.tsx`)
- **`src/services/jobs.functions.ts` (lines 41–52, 77–80)**:
  ```ts
  export const listPublicJobs = createServerFn({ method: "GET" })
    .validator(
      z
        .object({
          category: z.string().optional(),
          search: z.string().optional(),
          contract_type: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional(),
          storeId: z.string().optional(),
        })
        .optional(),
    )
    .handler(async ({ data }) => {
      ...
      if (data?.city && data.city !== "todos" && data.city !== "Todas" && data.city !== "Global" && data.city !== "all") {
        const c = `%${data.city.trim()}%`;
        query = query.or(`location_city.ilike.${c},location.ilike.${c}`);
      }
  ```
  - **Direct Observation 1.2.4 (Zod Stripping Bug)**: Lines 41–52 do **not** declare `city` in the Zod object schema. TanStack Start Server Functions parse RPC input through Zod; because `city` is omitted from the validator schema, Zod strips `city` from the payload. Inside `.handler`, `data.city` is always `undefined`.
  - **Direct Observation 1.2.5 (Route Loader Bypasses)**: In `src/routes/_store.index.tsx` (line 155) and `src/routes/_store.explorar.tsx` (line 136), `listPublicJobs({ data: { limit: 8 } })` is invoked without passing `city`.

#### C. Eventos / Agenda (`src/services/events.functions.ts`, `_store.eventos.tsx`, `_store.agenda.tsx`)
- **`src/services/events.functions.ts` (lines 577–579, 603–621)**:
  ```ts
  if (opts.city) {
    query = query.ilike("city", `%${opts.city}%`);
  }
  ```
  - **Direct Observation 1.2.6 (Breakdown on "Global" / "Todas")**: Unlike `news` or `jobs`, `_getPublicEvents` does not guard against `"Global"`, `"Todas"`, or `"all"`. If `city: "Global"` is passed, it executes `.ilike("city", "%Global%")`, returning 0 results.
  - **Direct Observation 1.2.7 (Broken Invocation Signature on Home)**: In `src/routes/_store.index.tsx` (line 156) and `_store.explorar.tsx` (line 137):
    `getPublicEvents({ limit: 8 } as any)`
    This passes `{ limit: 8 }` instead of `{ data: { limit: 8 } }`, and passes no city parameter.
  - **Direct Observation 1.2.8 (Agenda Drops City)**: In `src/routes/_store.agenda.tsx` (lines 51, 57, 79):
    Loader resolves `const activeCity = resolveActiveCity(location?.search);`, passes it only to `listActiveBanners`, omits it from loader return, and calls `getPublicEvents({ data: { limit: 60 } })` with zero city filtering.

#### D. Diretório / Guia (`src/services/directory.functions.ts`, `_store.diretorio.index.tsx`, `_store.places.index.tsx`)
- **`src/services/directory.functions.ts` (lines 38–46, 63–65, 88–121)**:
  ```ts
  export const getPublicDirectory = createServerFn({ method: "GET" })
    .validator(
      z
        .object({
          limit: z.number().int().min(1).max(100).optional(),
          category: z.string().optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
  ```
  - **Direct Observation 1.2.9 (Zod Stripping Bug in Directory)**: Line 63 attempts to filter `if (data?.city ...) query = query.ilike("city", ...)`. But `city` is **omitted** from the Zod schema on lines 38–46. When called over RPC from `_store.diretorio.index.tsx` (line 78: `city: activeCity || undefined`), Zod strips the parameter, making it impossible to filter directory listings by city.
  - **Direct Observation 1.2.10 (DTO Truncates Location & Mining Fields)**: `DirectoryListingDTO` and lines 88–121 omit `city`, `state`, `is_crawled`, and `source` from the returned DTO, even though migration `20261113000000_unify_mining_canonical_entities.sql` added these columns to `directory_listings`.
  - **Direct Observation 1.2.11 (Missing Filter in Home / Explore / Places)**:
    - In `_store.index.tsx` (line 153) and `_store.explorar.tsx` (line 134), `getPublicDirectory({ data: { limit: 12 } })` is called with no city.
    - In `_store.places.index.tsx` (line 25), `activeCity` is not returned from the loader, so `DirectoryPage` defaults to `activeCity = ""`.

#### E. Vitrines & Comerciais (`src/services/surface-cms.functions.ts`, `src/services/unified-listing.functions.ts`, `src/services/marketplace.functions.ts`, `_store.marketplace.index.tsx`, `_store.ofertas.tsx`)
- **`src/services/surface-cms.functions.ts` (lines 179–275)**:
  - `getModularSurfaceFeed` accepts `city: z.string().optional()`.
  - Lines 231–233 apply `city_filter` **only** to `marketplace_sections`.
  - Lines 245–275 query `stores` and `products`:
    ```ts
    let storesQuery = supabase
      .from("stores")
      .select("id, name, slug, description, settings")
      .order("created_at", { ascending: false })
      .limit(storeId ? 1 : 100);

    let productsQuery = supabase
      .from("products")
      .select(...)
      .in("status", ["published", "active"])
      .order("created_at", { ascending: false })
      .limit(300);
    ```
  - **Direct Observation 1.2.12 (Vitrines / Marketplace Surface Query City Bypass)**: Neither `storesQuery` nor `productsQuery` is filtered by city. Stores and products from all cities are returned.
  - **Direct Observation 1.2.13 (Hardcoded Synthetic Mocks in Production Code)**:
    Lines 290–294 inject hardcoded mock metrics:
    `rating: 4.9, review_count: 120, distance_km: 1.2, delivery_time_min: "Disponível"`
    This directly violates Rule B.8 and Acceptance Criteria ("0 mocks sintéticos ou dados fictícios").
- **`src/services/unified-listing.functions.ts` (lines 255–353)**:
  - **Direct Observation 1.2.14 (Zero City Filter in listUnifiedListings)**: `listUnifiedListings` has no `city` parameter and performs no city filtering. In `_store.marketplace.index.tsx` (line 109), it is called without city.
- **`src/services/marketplace.functions.ts` (lines 430–460)**:
  - **Direct Observation 1.2.15 (Zero City Filter in getGlobalDealsPage)**: `getGlobalDealsPage` has no `city` parameter and performs no city filtering. In `_store.ofertas.tsx` (line 60), it is called without city.

#### F. Classificados (`src/services/classifieds.functions.ts` & `src/routes/_store.classificados.index.tsx`)
- **`src/services/classifieds.functions.ts` (lines 42–67)**:
  - Migration `20261124000000_add_classifieds_location_fields.sql` added `city`, `state`, `neighborhood`, `hide_location`, and created `idx_classifieds_city`.
  - **Direct Observation 1.2.16 (getPublicClassifieds Completely City-Agnostic)**:
    `getPublicClassifieds` validator does not accept `city`, select query line 63 does not include `city` or `state`, and handler does not filter by city.
  - **Direct Observation 1.2.17 (Loaders Pass No City)**: `_store.classificados.index.tsx` (line 49), `_store.index.tsx` (line 154), and `_store.explorar.tsx` (line 135) call `getPublicClassifieds({ data: {} })` without city.

#### G. Busca Global (`src/services/search.functions.ts` & `src/routes/_store.buscar.tsx`)
- **`src/services/search.functions.ts` (lines 22–30, `federatedSearchInput`)**:
  - **Direct Observation 1.2.18 (Zero City Awareness in Global Federated Search)**: `federatedSearchInput` does not accept `city`. `_store.buscar.tsx` executes searches globally without respecting the user's active city.

#### H. Crawler Ingestion & Data Mining (`src/services/crawler-sources.functions.ts`, `src/services/mining/crawler-batch-engine.ts`)
- **`src/services/crawler-sources.functions.ts` (lines 251–255)**:
  - `metadata` enqueued in `crawl_queue` omits `source.region` and `source.config?.city`.
- **`src/services/mining/crawler-batch-engine.ts` (lines 322–323)**:
  - `const city = item.metadata?.city || "Chapecó";`
  - **Direct Observation 1.2.19 (Monolithic Hardcoded Fallback in Crawler Engine)**: Since `item.metadata?.city` is not populated by `crawler-sources.functions.ts`, all news crawled via `crawler_sources` are hardcoded as `"Chapecó"`, even when harvested from regional outlets in other cities.

---

## 2. Logic Chain

1. **Premise 1**: The user expectation and architectural contract of Waesy is a city-contextualized platform (Requirement R2: "Garantir que todos os módulos cívicos e comerciais filtrem conteúdos pela cidade ativa do usuário `resolveActiveCity`").
2. **Step 2 (Resolution Layer)**: Observation 1.1.1 shows `resolveActiveCity` is blind to SSR headers (cookies and Cloudflare `cf-ipcity`), while Observation 1.1.4 shows `LocationMasterPill` dispatches an event that no consumer or router listens to. Therefore, city selection does not propagate to SSR or actively refresh route data.
3. **Step 3 (BFF Contract Layer)**: Observations 1.2.4 and 1.2.9 reveal that while developer intent to filter by city existed in the handlers of `jobs.functions.ts` and `directory.functions.ts`, the parameter was omitted from their Zod validator schemas. Because TanStack Start Server Functions strip unvalidated keys, RPC calls from the frontend silently lose the `city` parameter.
4. **Step 4 (Route Aggregation Layer)**: Observations 1.1.3, 1.2.5, 1.2.7, 1.2.8, 1.2.11, 1.2.14, 1.2.15, and 1.2.17 demonstrate that on the core portal routes (`_store.index.tsx`, `_store.explorar.tsx`, `_store.agenda.tsx`, `_store.marketplace.index.tsx`, `_store.ofertas.tsx`), the active city is either discarded, passed only to banners, or omitted from calls to Jobs, Directory, Events, Classifieds, Vitrines, and Deals.
5. **Step 5 (Surface & Query Execution Layer)**: Observation 1.2.12 shows that `surface-cms.functions.ts` applies `city_filter` to section definitions but leaves `storesQuery` and `productsQuery` completely unconstrained by city, rendering products and stores from anywhere.
6. **Step 6 (Data Ingestion & Integrity Layer)**: Observations 1.2.1, 1.2.2, 1.2.10, 1.2.18, and 1.2.19 show that mined articles and directory listings either drop location fields during insertion, omit them from public DTOs, or default to `"Chapecó"`, preventing clean multi-city operations.
7. **Synthesis**: City-based contextual filtering is fragmented. While banners and some niche headers filter by city, the data fetching across BFF server functions, route loaders, and Zod validators has critical holes that cause the system to either drop the filter, strip it at the RPC boundary, or fall back to global/hardcoded data.

---

## 3. Caveats

- **Caveat 1 (Historical Database Rows)**: Existing database rows in `news_articles` and `directory_listings` that were created before migration `20270103000000_news_articles_city_indexation.sql` or `20261113000000_unify_mining_canonical_entities.sql` may have `city IS NULL`. Until a backfill migration runs, queries filtering strictly by `city.ilike.%city%` would omit these older rows unless an explicit `OR city IS NULL` fallback policy is defined for "Global" mode.
- **Caveat 2 (Single-Store Multi-Tenant Boundaries)**: When an endpoint is called within a specific tenant context (`store_id` provided), the store's physical location takes precedence over the user's active browsing city. This behavior is intentional in B2B/storefront routes (`_store.loja.$slug.tsx`) and should not be conflated with public multi-store discovery feeds.

---

## 4. Conclusion & Actionable Tasks for Milestone 2

### Final Assessment
The core city resolution and contextual indexing mechanism requires stabilization across five distinct layers:
1. **Resolution & State Sync**: Unify SSR/client resolution in `src/lib/city-helper.ts` (supporting URL `?city=`, cookie header in SSR via `@tanstack/start-server-core`, client cookie, and Cloudflare `cf-ipcity`), and bind `LocationMasterPill` to `router.invalidate()` or URL search parameter synchronization.
2. **BFF Zod Contract Parity**: Fix missing `city: z.string().optional()` validator fields in `jobs.functions.ts`, `directory.functions.ts`, `classifieds.functions.ts`, `search.functions.ts`, `unified-listing.functions.ts`, and `marketplace.functions.ts`.
3. **Portal Route Loaders**: Update `_store.index.tsx` and `_store.explorar.tsx` to pass `filteredCity` to all 7 queried services (not just banners).
4. **Surface CMS Query Scoping**: In `surface-cms.functions.ts`, filter `storesQuery` by store city and `productsQuery` by store city, and eliminate hardcoded synthetic metrics (lines 290–294).
5. **Mining & Ingestion Integrity**: Ensure `crawler-sources.functions.ts` preserves `source.region` in `crawl_queue.metadata`, and ensure `mining.functions.ts` persists `city` and `state` when promoting mined articles to `news_articles`.

### Implementation Task Breakdown for Milestone 2

| Task ID | Component / File | Scope of Change | Priority |
|---|---|---|---|
| **TASK-R2-01** | `src/lib/city-helper.ts` | Add SSR cookie/header resolution (`getCookie` / `getRequestHeader` from `@tanstack/start-server-core`), Cloudflare `cf-ipcity` fallback, and clean normalization. | P0 |
| **TASK-R2-02** | `src/components/location/location-master-pill.tsx` | Wire location selection to trigger router invalidation (`useRouter().invalidate()`) and dispatch URL search update so active views immediately reflect city change. | P0 |
| **TASK-R2-03** | `src/services/jobs.functions.ts` | Add `city: z.string().optional()` to `listPublicJobs` validator schema (fixing RPC parameter stripping). | P0 |
| **TASK-R2-04** | `src/services/directory.functions.ts` | Add `city: z.string().optional()` to `getPublicDirectory` validator schema; expose `city`, `state`, and `is_crawled` in `DirectoryListingDTO`. | P0 |
| **TASK-R2-05** | `src/routes/_store.index.tsx` & `_store.explorar.tsx` | Use canonical `resolveActiveCity`; pass `filteredCity` to `getPublicDirectory`, `getPublicClassifieds`, `listPublicJobs`, `getPublicEvents`, `listPublicArticles`, `getMuralFeed`, and `getAllPublicConcursos`. | P0 |
| **TASK-R2-06** | `src/services/events.functions.ts` | Guard `_getPublicEvents` against `"Global"`, `"Todas"`, `"all"`; fix parameter format in `_store.index.tsx` and ensure `_store.agenda.tsx` passes `activeCity`. | P1 |
| **TASK-R2-07** | `src/services/surface-cms.functions.ts` | Apply city filtering to `storesQuery` and `productsQuery` (via store city relation); remove hardcoded synthetic metrics (`rating: 4.9`, etc.). | P1 |
| **TASK-R2-08** | `src/services/classifieds.functions.ts` | Add `city` to `getPublicClassifieds` validator, select `city` and `state` from database, and filter `query.ilike("city", ...)`. | P1 |
| **TASK-R2-09** | `src/services/search.functions.ts` | Add `city?: string` to `federatedSearchInput`; apply city scoping to products, events, classifieds, and stores. | P1 |
| **TASK-R2-10** | `src/services/mining.functions.ts` & `crawler-batch-engine.ts` | Persist `city` and `state` on `news_articles` insert; propagate `source.region` from `crawler_sources` to `crawl_queue.metadata`. | P1 |
| **TASK-R2-11** | `src/components/news/news-card.tsx` | Add location tag/chip rendering `article.city` and source attribution chip for mined articles. | P2 |

---

## 5. Verification Method

### 5.1 Unit Tests Verification
Run Vitest on the mining and crawler suites:
```powershell
cmd /c "npx vitest run src/services/mining/"
```
*Expected Result*: 100% tests passing (currently 2 test files, 12 tests pass).

### 5.2 Forensic Zod & Server Function Inspection
1. Inspect `src/services/jobs.functions.ts` lines 41–52: Verify that `city: z.string().optional()` is present in `listPublicJobs` validator.
2. Inspect `src/services/directory.functions.ts` lines 38–46: Verify that `city: z.string().optional()` is present in `getPublicDirectory` validator.
3. Inspect `src/services/classifieds.functions.ts` lines 42–55: Verify that `city: z.string().optional()` is present in `getPublicClassifieds` validator.

### 5.3 Route Loader Inspection
Inspect `src/routes/_store.index.tsx` lines 148–160: Verify that `filteredCity` is passed to:
- `listActiveBanners({ data: { placement: "...", city: filteredCity } })`
- `getPublicDirectory({ data: { limit: 12, city: filteredCity } })`
- `getPublicClassifieds({ data: { limit: 12, city: filteredCity } })`
- `listPublicJobs({ data: { limit: 8, city: filteredCity } })`
- `getPublicEvents({ data: { limit: 8, city: filteredCity } })`
- `listPublicArticles({ data: { limit: 6, city: filteredCity } })`

### 5.4 Invalidation Conditions
- If selecting a different city in `LocationMasterPill` does not trigger a re-render or loader refresh without manual page reload, TASK-R2-02 is invalidated.
- If calling `listPublicJobs` with `{ data: { city: "São Miguel do Oeste" } }` returns jobs from Chapecó when matching jobs exist, TASK-R2-03 is invalidated.
- If `node scripts/design-lint.mjs --changed` produces new P0 or P1 violations on modified routes or components, the implementation is blocked by Gate B.4.
