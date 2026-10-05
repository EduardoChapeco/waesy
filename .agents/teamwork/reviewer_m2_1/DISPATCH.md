# DISPATCH — Reviewer 1 (Milestone 2: City Indexing BFF & Loaders)

## 2026-10-04T11:40:00Z

### Identity & Setup
- **Role**: Reviewer 1 (`teamwork_preview_reviewer`)
- **Working Directory**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\reviewer_m2_1`
- **Parent Orchestrator ID**: `d28f856c-9966-4ad5-80d8-b7dba7b1979c`
- **Authoritative User Request**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md` (header `## 2026-10-04T03:35:00Z`)
- **Worker Handoff Report**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m2\handoff.md`
- **Survey Report**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_r2\handoff.md`

### Scope of Review
Review code changes in:
1. `src/lib/city-helper.ts`: Verify isomorphic `resolveActiveCity` implementation (URL query, SSR cookies via `@tanstack/start-server-core`, client cookies, Cloudflare `cf-ipcity`, localStorage, and normalization of "Global", "all", "Todas", "Todas as Cidades" to `undefined`).
2. `src/services/jobs.functions.ts`: Verify `city: z.string().optional()` in validator and `.ilike` filter.
3. `src/services/directory.functions.ts`: Verify `city: z.string().optional()` in validator and `DirectoryListingDTO` mapping.
4. `src/services/classifieds.functions.ts`: Verify `city: z.string().optional()` in validator and query filtering.
5. `src/services/search.functions.ts`: Verify `city: z.string().optional()` in `federatedSearchInput` and scoping.
6. `src/routes/_store.index.tsx` and `src/routes/_store.explorar.tsx`: Verify canonical `resolveActiveCity` and `filteredCity` passed to all services.

### Verification Commands
Run non-destructive checks:
- Verify modified files conform to design rules: `node scripts/design-lint.mjs --changed`
- PROIBIÇÃO ABSOLUTA: NEVER run `npm run typecheck` or `npm run build`.

### Required Output
Write your report and issue your verdict (**APPROVE** or **REQUEST_CHANGES**) in:
`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\reviewer_m2_1\handoff.md`
Notify parent orchestrator (`d28f856c-9966-4ad5-80d8-b7dba7b1979c`).
