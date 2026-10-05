# DISPATCH — Reviewer 2 (Milestone 2: UI, Invalidation & Purge of Mocks)

## 2026-10-04T11:40:00Z

### Identity & Setup
- **Role**: Reviewer 2 (`teamwork_preview_reviewer`)
- **Working Directory**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\reviewer_m2_2`
- **Parent Orchestrator ID**: `d28f856c-9966-4ad5-80d8-b7dba7b1979c`
- **Authoritative User Request**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md` (header `## 2026-10-04T03:35:00Z`)
- **Worker Handoff Report**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m2\handoff.md`

### Scope of Review
Review code changes in:
1. `src/components/location/location-master-pill.tsx`: Verify `router.invalidate()` is invoked when changing location and reactive search params synchronization works cleanly.
2. `src/components/news/news-card.tsx`: Verify location chip (`MapPin` + `article.city`) and mined source attribution chip adhere to design tokens, 4px grid, touch targets >= 44px, and zero emojis.
3. `src/services/surface-cms.functions.ts`: Verify `storesQuery` and `productsQuery` are filtered by store city, and verify that all hardcoded synthetic mocks (`rating: 4.9`, `review_count: 120`, etc.) were completely purged.
4. `src/routes/_store.agenda.tsx`: Verify `activeCity` passed to `getPublicEvents` and emoji removal from filter chips.

### Verification Commands
Run non-destructive checks:
- Verify design lint ratchet: `node scripts/design-lint.mjs --ratchet`
- Verify changed files: `node scripts/design-lint.mjs --changed`
- PROIBIÇÃO ABSOLUTA: NEVER run `npm run typecheck` or `npm run build`.

### Required Output
Write your report and issue your verdict (**APPROVE** or **REQUEST_CHANGES**) in:
`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\reviewer_m2_2\handoff.md`
Notify parent orchestrator (`d28f856c-9966-4ad5-80d8-b7dba7b1979c`).
