## 2026-10-13T19:44:05Z
You are Worker M2 (Lead Mobile & Design System Engineer) for Milestone 2 of the Waesy project.
Working directory: c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\worker_m2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your inputs to read:
- c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY: read first)
- c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\PROJECT.md
- c:\Users\Excelência Tour SMO\Documents\waesy\AGENTS.md (Rules B.1 to B.30, Invariant B.26)
- c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\explorer_m2_1\handoff.md (Feature 4 recipes)
- c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\explorer_m2_2\handoff.md (Features 5 & 6 diffs)
- c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\explorer_m2_3\handoff.md (Features 7 & 8 recipes)

Relevant domain skills:
- c:\Users\Excelência Tour SMO\Documents\waesy\.agents\skills\apple-design\SKILL.md
- c:\Users\Excelência Tour SMO\Documents\waesy\.agents\skills\design-lint\SKILL.md
- c:\Users\Excelência Tour SMO\Documents\waesy\.agents\skills\anti-ai-design\SKILL.md

Scope of implementation (Milestone 2: Nativização Mobile e Ergonomia HIG):

1. Feature 4: Mobile Nav Bar Ergonomics & Safe Area:
   - Implement exact replacements from explorer_m2_1/handoff.md in:
     - src/components/shell/mobile-nav.tsx: remove inline styles, add pb-safe, upgrade tab labels to text-xs font-semibold, add :focus-visible:ring-2 to all tabs, use flex-1 layout (eradicating DL-29), upgrade gap-0.5 to gap-1.
     - src/components/commerce/quick-create-modal.tsx: eliminate !important classes (DL-04 P0) by converting mobile view to Apple HIG <Sheet side="bottom"> with rounded-t-3xl, enlarge close button to size-11 (DL-14), upgrade badge to text-xs, convert action cards to focusable elements with :focus-visible.
     - src/components/shell/global-menu-hub.tsx: eradicate arbitrary bracket classes (h-[88dvh] -> h-overlay-max max-h-overlay-max rounded-t-3xl), upgrade buttons to h-11 min-h-11 (DL-14), add :focus-visible:ring-2 to all items.

2. Feature 5: Native Mobile Header Canonical Height (Invariant B.26):
   - Implement exact diff from explorer_m2_2/handoff.md in:
     - src/components/navigation/native-mobile-header.tsx:
       - Container height h-12 sm:h-14 -> canonical h-11 min-h-11 (Invariant B.26).
       - Search input h-9 -> h-11 min-h-11 with pl-9 pr-11 (DL-14).
       - Search clear button -> size-11 min-h-11 min-w-11 with :focus-visible:ring-2 (DL-14, DL-15).
       - Add :focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary to back button, search trigger, and filter trigger (DL-15 P0).
       - Replace min-w-[44px] with min-w-11 (DL-02).
       - Replace filter badge text-[9px] with text-xs font-bold leading-none (Typographic Floor >= 12px).
       - Destructure rightAction in addition to rightActions ({rightActions || rightAction}).

3. Feature 6: Double Header Eradication in AppShell & Desktop Pairing:
   - Implement exact diff from explorer_m2_2/handoff.md in src/components/shell/app-shell.tsx:
     - Centralize exclusion in checkHasCustomPageMobileHeader(pathname) including /conta/atividade, /conta/trocas, /conta/salvos, /conta/financas, /conta/enderecos, /conta/avaliacoes, /conta/entregador, /faq, /redefinir-senha.
   - Implement desktop pairing headers (hidden md:flex) from explorer_m2_2/handoff.md in:
     - src/routes/_store.faq.tsx
     - src/routes/_store.conta.entregador.tsx
     - src/routes/_store.conta.pedidos.$id.tsx
     - src/routes/_store.diretorio.index.tsx
     - src/routes/_store.eventos.tsx
     - src/routes/_store.empregos.index.tsx
     - src/routes/_store.conta.atividade.tsx (add hidden md:flex to inpage header)

4. Feature 7: Bottom Sheets Conversion & Dead Filter Fix:
   - Implement Recipe REC-01 in src/routes/_store.buscar.tsx: mount <FacetedSearchSheet> connected to isFilterSheetOpen and handlers. Fix microfont on line 675.
   - Implement Recipe REC-03 in src/components/classifieds/catalog/classified-filter-sheet.tsx: convert to <Sheet side="bottom"> with iOS grab handle.
   - Implement Recipe REC-04 in src/components/location/location-master-pill.tsx: responsive <Sheet side="bottom"> on mobile (isCompact).
   - Implement Recipe REC-05 in src/components/common/action-auth-guard-modal.tsx: responsive <Sheet side="bottom"> on mobile (isCompact) and humanize copy.
   - Implement Recipe REC-06 in src/components/common/share-modal.tsx: responsive <Sheet side="bottom"> on mobile (isCompact), purge microfonts.

5. Feature 8: Typographic Floor (>=12px), Dead Space Purge & Anti-AI Copy:
   - Implement Recipe REC-09: change root wrappers in _store.conta.entregador.tsx, _store.conta.avaliacoes.tsx, _store.conta.ingressos.tsx, _store.conta.notificacoes.tsx, _store.agendar.index.tsx, _store.afiliados.tsx, _store.agenda.tsx from px-4 sm:px-6 to px-0 sm:px-4 md:px-0.
   - Implement Recipe REC-11: replace conversational text with concise human copy per table.
   - Apply typographic floor table to eliminate microfonts across modified components.

6. Verification & Recording:
   - Create focused unit tests verifying the mobile nav, native header B.26, and AppShell checkHasCustomPageMobileHeader helper (e.g. in src/components/navigation/native-mobile-header.test.ts and src/components/shell/app-shell.test.ts).
   - Run vitest: `npx.cmd vitest run ...` on modified test files.
   - Run design lint ratchet: `node scripts/design-lint.mjs --ratchet` to confirm 0 new P0/P1 violations.
   - In accordance with user rules, DO NOT run `npm run typecheck` or `npm run build`.
   - Record DEC-207 in docs/design/DECISIONS.md documenting Milestone 2 decisions.
   - Commit changes to branch `main` using git command: `git commit -m "feat(m2): mobile nativization, canonical header height B.26, bottom sheets and anti-jank ergonomics"`.
   - Write comprehensive handoff report to: c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\worker_m2\handoff.md
   - Send completion message to parent upon completion.
