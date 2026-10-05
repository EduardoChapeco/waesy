# Explorer M1_1 Dispatch: Storage RLS & Views Security

## Objective
Analyze the exact SQL migrations and code changes needed for:
1. Revoking `Universal Media *` policies in `storage.objects` granting ALL to `{public}` across 9 buckets.
2. Formulating strict RLS policies per bucket (`avatars`, `covers`, `brand-assets`, `classifieds`, `product-media`, `legal-documents`, `receipts`, `identity-vault`).
3. Setting `security_invoker = true` on the 6 `SECURITY DEFINER` views (`store_memberships`, `store_members`, `classified_ads`, `companies`, `store_reviews`, `store_integrations`).
4. Creating bucket `covers` and fixing `src/lib/classifieds/upload-classified-media.ts` so sensitive classified documents are not sent to public folders.

## Deliverable
Write your recommendations to `.agents/teamwork/teamwork_preview_explorer_m1_1/handoff.md`.
PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build`.


## 2026-10-03T21:13:57Z
You are Explorer M1_1 (Storage RLS & Views Security).
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m1_1
Read the original request at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project master plan at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\PROJECT.md
Read previous survey findings in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_survey_1\handoff.md
Read your dispatch instructions in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m1_1\DISPATCH.md
And repository rules in: c:\Users\Eduardo Antônio Ramo\Documents\waesy\AGENTS.md

CRITICAL CONSTRAINTS:
1. READ-ONLY exploration. Do NOT edit source code files. Recommend concrete fix strategy with exact SQL/code diffs.
2. PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
3. Write your report to: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\teamwork_preview_explorer_m1_1\handoff.md
4. Notify orchestrator parent via send_message when done.

INVESTIGATION SCOPE:
- Exact SQL migration to revoke the 4 `Universal Media *` policies in `storage.objects` granting ALL to `{public}` on 9 buckets.
- Formulate replacement RLS policies isolating private buckets (`legal-documents`, `receipts`, `identity-vault`) and restricting uploads to authenticated tenant staff/users.
- Exact SQL to set `(security_invoker = true)` on the 6 `SECURITY DEFINER` views (`store_memberships`, `store_members`, `classified_ads`, `companies`, `store_reviews`, `store_integrations`).
- Bucket `covers` creation script.
- Code changes in `src/lib/classifieds/upload-classified-media.ts` to redirect photos to `classifieds` and isolate confidential documents.
