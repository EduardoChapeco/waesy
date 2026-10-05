# DISPATCH — Worker M1 (Supabase Migration Telemetry 360º)

## Task
Implement the database migration `supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql` strictly according to:
- `ORIGINAL_REQUEST.md` (section ## 2026-10-05T04:01:31Z, R1) at `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md`.
- Explorer 1 Survey Report at `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_db\report.md`.
- `PROJECT.md` at `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\orchestrator_6\PROJECT.md`.
- Skills:
  - `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\skills\supabase\SKILL.md`
  - `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\skills\supabase-postgres-best-practices\SKILL.md`

## Exclusive File Ownership
- `supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql`

## Requirements
1. Create `user_form_submissions_log` with all columns, check constraints, foreign keys, b-tree indexes, and RLS Deny-by-Default policies (platform_admin, user, store, insert for anon/auth).
2. Create `user_cart_telemetry` with all columns, check constraints, foreign keys, b-tree indexes, and RLS Deny-by-Default policies.
3. Create `employee_tenant_audit_logs` with all columns, operator_cpf, store_id, module, action, b-tree indexes, and RLS Deny-by-Default policies.
4. Create `customer_store_affinity` with `CONSTRAINT uq_customer_store_affinity UNIQUE (customer_id, store_id)`, metrics, affinity_level check constraint, updated_at trigger, b-tree indexes, and RLS policies.
5. All RLS policies must use `(SELECT auth.uid())` subqueries for query-level caching.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Deliver your handoff report to `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1\handoff.md` and communicate completion back to the orchestrator.

## 2026-10-05T04:15:52Z
Implement the complete SQL migration file `supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql` implementing:
1. `user_form_submissions_log` (table, columns, foreign keys, indexes, RLS Deny-by-Default policies).
2. `user_cart_telemetry` (table, columns, foreign keys, indexes, RLS Deny-by-Default policies).
3. `employee_tenant_audit_logs` (table, columns, foreign keys, operator_cpf, indexes, RLS Deny-by-Default policies).
4. `customer_store_affinity` (table, columns, unique constraint on customer_id + store_id, indexes, trigger, RLS Deny-by-Default policies).
Ensure all RLS policies wrap session lookups in subqueries `(SELECT auth.uid())` and use `public.is_platform_admin()` and `public.auth_user_store_ids()`.

