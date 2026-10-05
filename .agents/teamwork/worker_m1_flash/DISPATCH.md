## 2026-10-04T21:28:59Z
You are Worker M1 (Flash) for Milestone 1: R1 Inventário Forense, Limpeza de Rotas & Fake Toasts.
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_flash
Your parent is orchestrator_5 (conversation ID: f5055954-3bc6-4fa7-b6c9-7f61186365f7).

MANDATORY FIRST STEP:
Read c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md under ## 2026-10-04T19:11:10Z.
Also read AGENTS.md, c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\orchestrator_5\PROJECT.md, and c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_w0_1\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

SCOPE & EXCLUSIVE WRITE OWNERSHIP:
1. Broken Navigation & Link Remediation:
   - In `src/components/chat/waesy-copilot-drawer.tsx`:
     - Fix broken link `/mobility` -> canonical `/mobilidade` (line 126).
     - Fix broken link `/checkout/${cartId}` -> canonical `/checkout` (line 130).
     - Eradicate fake toasts (lines 133-143): connect real backend mutations or honest handlers for `request_travel_quote`, `submit_legal_demand`, `publish_ad`, and `add_to_cart`.
   - In `src/components/onboarding/fast-company-onboarding.tsx`:
     - Fix broken navigation to `/@${resolvedSlug}` and `/empresa/${resolvedStoreId}` (lines 207, 209) to use canonical routes (`/loja/${resolvedSlug}` or `/c/${resolvedSlug}`).
2. Inoperable & Orphan Buttons:
   - In `src/routes/workspace.imoveis.manutencoes.tsx`: fix line 517 toast-only mock to invoke proper inspection report handling.
   - In `src/routes/_store.conta.creditos.tsx`: fix line 126 orphan "Cancelar" button to have proper navigation or dismissal action.
3. Missing Error Boundary / Error States:
   - Add proper error handling / error boundary to the 5 routes identified:
     - `src/routes/workspace.mining.tsx`
     - `src/routes/_store.cadastroantecipado.tsx`
     - `src/routes/_store.conta.metricas.tsx`
     - `src/routes/_store.garcom.tsx`
     - `src/routes/_store.places.$placeSlug.tsx`
4. Clean Route Tree:
   - Move or configure the 12 `*.test.ts` files inside `src/routes/` so TanStack Router does not pick them up as page routes (e.g. relocate to `src/routes/__tests__/` or appropriate test suites).

STRICT ENGINEERING RULES:
- PROIBIÇÃO ABSOLUTA: Proibido executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
- Execute apenas testes focados com Vitest via `cmd /c npx vitest run <file>` e `node scripts/design-lint.mjs --changed`.
- Document all changes and decisions in `docs/design/DECISIONS.md`.

DELIVERABLES:
Write your structured completion report to:
`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_flash\handoff.md`
Report passing vitest runs and design-lint status. Then send a completion message back to parent.
