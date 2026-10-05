# Worker M1 Dispatch: Storage Governance, Media Triad, Mock & Unsplash Purge Implementation

## Objective
Implement all code modifications and migrations specified by the M1 Explorers:
1. Create `supabase/migrations/20261231000000_storage_rls_lockdown_views_security_invoker.sql` using the complete SQL specification from `.agents/teamwork/teamwork_preview_explorer_m1_1/handoff.md`. Apply the migration via `supabase-mcp-server` tool `execute_sql` (or `apply_migration`) on project `jfuebqmltksyznovhlwa`.
2. Update `src/lib/classifieds/upload-classified-media.ts` and `src/services/storage.functions.ts` to route media to canonical buckets (`classifieds`, `covers`, `legal-documents`).
3. Update `src/components/ui/media-uploader.tsx` and `src/components/ui/image-upload.tsx` with external URL input field, hybrid Ctrl+V paste listener, and Apple HIG 44px touch targets per `.agents/teamwork/teamwork_preview_explorer_m1_2/handoff.md`.
4. Implement the 8 eradication diffs from `.agents/teamwork/teamwork_preview_explorer_m1_3/handoff.md`:
   - Replace `placehold.co` in `src/components/admin/builder/MediaUploader.tsx`.
   - Remove Unsplash API calls and exposed token from `src/services/proposals.ts` and `src/services/proposal-storage.ts`.
   - Transform `src/components/tourism/studio/StudioUnsplashPicker.tsx` into `StudioAssetPicker` (Upload + URL + Ctrl+V).
   - Update `SectionCover.tsx`, `SectionHotels.tsx`, `SectionItinerary.tsx`.
   - Sanitize placeholder in `src/routes/workspace.turismo.hoteis.tsx:1584`.
5. Run verification:
   - `node scripts/design-lint.mjs` (ensure 0 P0/P1 violations on touched files).
   - Targeted vitest: `npx vitest run src/routes/_store.evento-turismo-detail.test.ts`.
   - Document decision in `docs/design/DECISIONS.md` (DEC-015).

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Constraints
- PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
- Report all file modifications, diffs, and verification output in `handoff.md`.

## 2026-10-03T21:25:46Z
Received dispatch from parent c9b7f840-de13-40ec-9aef-bf41b37256c2:
Execute tasks:
1. Migration `supabase/migrations/20261231000000_storage_rls_lockdown_views_security_invoker.sql` applied to `jfuebqmltksyznovhlwa`.
2. Update `src/lib/classifieds/upload-classified-media.ts` and `src/services/storage.functions.ts`.
3. Update `src/components/ui/media-uploader.tsx` and `src/components/ui/image-upload.tsx`.
4. Apply 8 mock/Unsplash eradication diffs per M1_3 handoff.
5. Verification: design-lint + vitest.
6. Handoff report and parent notification.
