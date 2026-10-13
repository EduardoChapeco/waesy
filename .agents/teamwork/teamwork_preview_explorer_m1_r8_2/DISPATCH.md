# Dispatch: Explorer M1.2 (Identity & Builder Conflict Specification)

- Working Directory: c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m1_r8_2
- Original Request: c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md
- Project Scope: c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\PROJECT.md
- Prior Evidence: c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\explorer_survey_r8_1\handoff.md

Your task for Milestone 1 (Reconciliação Forense e Unificação de Branches Remotas):
1. In `src/lib/identity.server.ts`:
   - Inspect main's current lines 98-220 (`workspace_members` check and strict prohibition of auto-heal/email store search/first store fallback).
   - Specify the exact drop-in code block to incorporate DEC-206 Zero-Trust Civil Root isolation:
     `if (activeContext === "civil") activeStoreId = null;`
   - Incorporate `perf`'s benign parallelization (`Promise.all` for profile + memberships) and `waesy-auth-token` cookie support without allowing any `.limit(1)` store guessing.
2. In `src/services/builder.functions.ts`:
   - Inspect `resolveStoreContext`: verify that main's strict error throw is retained (`throw new Error("Nenhum contexto de loja válido...")`).
   - In `getPublicExperienceDocumentBySlug`: specify exact drop-in code chunk for modern Omni-Builder blocks:
     `const omniDoc = (doc.settings as any)?.omni_page; if (omniDoc?.blocks && Array.isArray(omniDoc.blocks) && omniDoc.blocks.length > 0) return { status: "ok" as const, data: { document: doc as ExperienceDocument, tree: [] } };`
3. Produce a structured handoff report with verbatim code chunks at `c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m1_r8_2\handoff.md`.
