# Explorer M1_3 Dispatch: Mock & Unsplash Eradication Plan

## Objective
Analyze the exact code changes needed for:
1. `src/components/admin/builder/MediaUploader.tsx:180`: Replacing `placehold.co` with an honest inline SVG empty state.
2. `src/services/proposals.ts`: Eradicating `searchUnsplash` and Unsplash API calls, replacing with native media storage or clean empty state.
3. `src/services/proposal-storage.ts`: Removing or replacing `saveUnsplashImageToStorage`.
4. `src/components/tourism/studio/StudioUnsplashPicker.tsx`, `SectionCover.tsx`, `SectionHotels.tsx`, `SectionItinerary.tsx`: Replacing the Unsplash photo picker modal with an internal asset uploader or empty state.
5. `src/routes/workspace.turismo.hoteis.tsx:1584`: Purging references to Unsplash in placeholder strings.

## Deliverable
Write your recommendations to `.agents/teamwork/teamwork_preview_explorer_m1_3/handoff.md`.
PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build`.

## 2026-10-03T21:13:59Z
You are Explorer M1_3 (Mock & Unsplash Eradication Plan).
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m1_3
Read the original request at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project master plan at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\PROJECT.md
Read previous survey findings in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_survey_1\handoff.md
Read your dispatch instructions in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m1_3\DISPATCH.md
And repository rules in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\AGENTS.md

CRITICAL CONSTRAINTS:
1. READ-ONLY exploration. Do NOT edit source code files. Recommend concrete fix strategy with exact code diffs.
2. PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
3. Write your report to: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m1_3\handoff.md
4. Notify orchestrator parent via send_message when done.

INVESTIGATION SCOPE:
- Inspect `src/components/admin/builder/MediaUploader.tsx:180` and design replacing `placehold.co` with an honest inline SVG empty state.
- Inspect `src/services/proposals.ts` and `src/services/proposal-storage.ts`, design the complete eradication of `searchUnsplash` and Unsplash API calls, replacing with native media storage or honest empty state.
- Inspect `src/components/tourism/studio/StudioUnsplashPicker.tsx`, `SectionCover.tsx`, `SectionHotels.tsx`, `SectionItinerary.tsx`, and `src/routes/workspace.turismo.hoteis.tsx:1584`, design replacing Unsplash modal with native asset selector/uploader and cleaning up placeholder strings.
