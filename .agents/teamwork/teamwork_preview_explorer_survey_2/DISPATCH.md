# Explorer 2 Dispatch: BFF Contracts, Server Functions, Zod Schemas & Business Logic Survey

## Objective
Conduct a comprehensive read-only survey of the Waesy codebase regarding:
1. All Server Functions in `src/services/*.functions.ts`.
2. SSR authorization checks (`getServerIdentity`, `requireAdmin`) and verify zero RLS bypass.
3. Perimeter input validation with closed Zod schemas.
4. Closed Allowlists for public products/classifieds queries: ensure NCM, CEST, cost, margin, and fiscal data are never leaked publicly.
5. Quick AI Onboarding pipeline (Firecrawl, Steel.dev, Gemini 2.5 Flash, 5 squads) and persistence into `stores`, `brand_kits`, and `brand_dna_profiles`.
6. Bill of Materials (BOM) automatic deduction of ingredients/components in service orders (`stock_movements`) and at POS counter sales.

## Constraints
- READ-ONLY exploration. Do not modify source code.
- PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
- Produce handoff report at `.agents/teamwork/teamwork_preview_explorer_survey_2/handoff.md`.


## 2026-10-03T20:57:33Z
You are Explorer 2 (Survey: BFF Contracts, Server Functions, Zod Schemas & Business Logic).
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_survey_2
Read the verbatim user request at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md
Also read your task instructions in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_survey_2\DISPATCH.md
And repository rules in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\AGENTS.md

CRITICAL CONSTRAINTS:
1. READ-ONLY exploration. Do NOT write or edit source code files.
2. PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
3. You may use read-only inspection tools (view_file, grep_search, find_by_name, list_dir).
4. Write your comprehensive survey report to: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md
5. Maintain your heartbeat in .agents/teamwork/teamwork_preview_explorer_survey_2/progress.md with timestamps.
6. When complete, send a message to orchestrator parent with a summary of findings and the path to handoff.md.

INVESTIGATION SCOPE:
- Inspect all files in `src/services/*.functions.ts` and related service files.
- SSR authorization checks (`getServerIdentity`, `requireAdmin`) and verify zero RLS bypass.
- Perimeter input sanitization with strict closed Zod schemas.
- Closed Allowlists for public products/classifieds queries: ensure NCM, CEST, cost, margin, and fiscal data NEVER leak into public products/classifieds queries or endpoints.
- Quick AI Onboarding pipeline: inspect integrations (Firecrawl, Steel.dev, Gemini 2.5 Flash, 5 squads) and verified atomic persistence in `stores`, `brand_kits`, and `brand_dna_profiles`.
- Bill of Materials (BOM) automatic deduction of ingredients/components in service orders (`stock_movements`) and when settling counter sales at POS.
- Cart and checkout inventory validation in real-time, calculating cent totals without floating point rounding errors.
