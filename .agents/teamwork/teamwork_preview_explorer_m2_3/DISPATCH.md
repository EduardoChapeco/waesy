# Explorer M2_3 Dispatch: BOM Automatic Deduction & Service Orders Idempotency

## 2026-10-03T22:16:02Z
You are Explorer M2_3 (BOM Automatic Deduction & Service Orders Idempotency).
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_3
Read the original request at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project master plan at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\PROJECT.md
Read Explorer 2 survey findings in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md
Read your dispatch instructions in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_3\DISPATCH.md
And repository rules in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\AGENTS.md

CRITICAL CONSTRAINTS:
1. READ-ONLY exploration. Do NOT edit source code files.
2. PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
3. Write your report to: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m2_3\handoff.md
4. Notify orchestrator parent via send_message when complete.

INVESTIGATION SCOPE:
- Detailed diff for `src/services/pdv.functions.ts:407-456`: eliminate fragile `ilike` text search for BOM ingredients, replace with canonical `variant_id` matching, and correctly classify `movement_type`.
- Detailed diff for `src/services/service-orders.functions.ts:143-179`: add idempotency check to prevent duplicate parts deduction if an OS is updated multiple times to "delivered".
- Check online checkout BOM handling.
