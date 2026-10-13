# Dispatch — Worker M2 (Gen 10)

## 2026-10-13T20:06:00Z
You are Worker M2 (teamwork_preview_worker) for the Waesy project, operating in generation 10.
Your working directory is: `c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\worker_m2_gen10`
Your parent orchestrator is: `fb9f3ff7-a6fc-4889-96f4-4f0a457a69f3` (Orchestrator 10)

### Mandatory References to Read First:
1. `c:\Users\Excelência Tour SMO\Documents\waesy\AGENTS.md` (Rules B.1 to B.31, DL-01 to DL-30, Invariant B.26)
2. `c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md`
3. `c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\PROJECT.md`
4. `c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\explorer_m2_1\handoff.md` (Full recipe for mobile dock, safe area, quick create, global menu hub)
5. `c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\explorer_m2_2\handoff.md` (Full recipe for native mobile header canonical height B.26, app shell double header eradication, desktop inpage pairing)
6. `c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\explorer_m2_3\handoff.md` (Full recipe for /buscar dead filter, bottom sheets conversion, microfont purge, lateral dead space purge)

### Mandatory Integrity Warning:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Objective & Scope:
Complete 100% of Milestone 2 (Mobile Nativization & App Ergonomics HIG - Features 4, 5, 6, 7, 8):
1. **Feature 4 & 5 Verification/Completion**:
   - Check status of `src/components/shell/mobile-nav.tsx`, `src/components/navigation/native-mobile-header.tsx`, `src/components/commerce/quick-create-modal.tsx`, `src/components/shell/global-menu-hub.tsx`, and `src/components/shell/app-shell.tsx`. Ensure all focus rings `:focus-visible:ring-2`, canonical height `h-11 min-h-11` (B.26), touch targets >= 44px (DL-14), safe area padding, and `checkHasCustomPageMobileHeader` are 100% in place.
2. **Feature 6 (Desktop Inpage Header Pairing)**:
   - Ensure `hidden md:flex` inpage headers are present in `src/routes/_store.faq.tsx`, `src/routes/_store.conta.entregador.tsx`, `src/routes/_store.conta.pedidos.$id.tsx`, `src/routes/_store.diretorio.index.tsx`, `src/routes/_store.eventos.tsx`, `src/routes/_store.empregos.index.tsx`, and `src/routes/_store.conta.atividade.tsx` (where desktop header has `hidden md:flex` so it doesn't double on mobile).
3. **Feature 7 (Bottom Sheets & Dead Filter in /buscar)**:
   - `src/routes/_store.buscar.tsx`: Mount `<FacetedSearchSheet>` connected to `isFilterSheetOpen`, `facetedFacets`, `handleApplyFilters`, and reset handlers.
   - `src/components/classifieds/catalog/classified-filter-sheet.tsx`: Convert from `<Dialog>` to `<Sheet side="bottom">` with iOS grab handle.
   - `src/components/location/location-master-pill.tsx`: Use `<Sheet side="bottom">` on compact mobile viewports (<640px).
   - `src/components/common/action-auth-guard-modal.tsx`: Convert to `<Sheet side="bottom">` on compact mobile viewports, humanize copy (anti-ai-design), and ensure `returnUrl` preservation.
   - `src/components/common/share-modal.tsx`: Convert to `<Sheet side="bottom">` on compact viewports, purge microfonts `text-[11px]`.
4. **Feature 8 (Lateral Dead Space & Typographic Floor Purge)**:
   - In `src/routes/_store.conta.entregador.tsx`, `src/routes/_store.conta.avaliacoes.tsx`, `src/routes/_store.conta.ingressos.tsx`, `src/routes/_store.conta.notificacoes.tsx`, `src/routes/_store.agendar.index.tsx`, `src/routes/_store.afiliados.tsx`, `src/routes/_store.agenda.tsx`: ensure root wrapper uses `px-0 sm:px-4 md:px-0` so there is no double lateral margin on mobile.
   - Purge microfonts (`text-[8px]..text-[11px]`) in the modified components, standardizing to `text-xs`.
   - Purge conversational copy ("Clique no botão abaixo...") per anti-ai-design rules.
5. **Decisions & Commit**:
   - Register DEC-207 in `docs/design/DECISIONS.md`.
   - Run vitest on affected UI/mobile test suites.
   - Run design lint ratchet: `node scripts/design-lint.mjs --ratchet` (0 new P0/P1 violations, exit code 0).
   - Commit all changes to `main`: `git commit -m "feat(m2): mobile nativization, canonical header height B.26, bottom sheets and anti-jank ergonomics"`.
6. **Handoff**:
   - Write comprehensive `handoff.md` in `c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\worker_m2_gen10\handoff.md` documenting: Observation, Logic Chain, Caveats, Conclusion, and Verification Method (exact commands and outputs).
   - Send completion message to parent orchestrator.
