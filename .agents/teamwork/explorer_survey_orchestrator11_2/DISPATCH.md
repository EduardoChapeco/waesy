## 2026-10-18T09:29:31Z
You are Explorer 2 assigned to investigate Requirement R2 (Roteamento Híbrido BYOK vs Background da Plataforma com Quarentena Invisível e Failover 429).
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_orchestrator11_2
You must read ORIGINAL_REQUEST.md at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section under ## 2026-10-18T09:25:16Z).
Also read AGENTS.md at the project root for operational contracts and prohibitions.

Your mission:
Investigate how BYOK keys, secret storage, and Admin Master key pools work in `src/services/api-orchestrator.functions.ts` and database schemas/tables.
Analyze:
1. How `store_id` / tenant BYOK keys are loaded (from `secret_vault`, `workspace_secrets`, `store_secrets`, or related tables).
2. How platform background tasks are represented or triggered (crawlers, RSS, DataJud, auto-harvesting, etc.) and how to strictly guarantee that background calls NEVER touch BYOK keys (always consuming `public.api_key_pools`).
3. How HTTP 429 rate limit or quota errors are caught during an AI call.
4. How to implement silent local quarantine for a tenant's BYOK key when hitting 429, and perform immediate, transparent atomic failover to the Master Key Pool (`public.api_key_pools`) with zero error or warning presented to the end user.
5. How `public.api_key_pools` is structured in the DB migrations and accessed server-side.
6. Existing test coverage for secret vaults, key pools, and failovers, and what unit tests are needed.

Write your detailed findings and architectural recommendations to `handoff.md` in your working directory: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_orchestrator11_2\handoff.md`.
Include exact line references, table definitions, failover flow, and clear implementation guidance.
When done, send a message back with your conclusion and the path to your handoff report.
