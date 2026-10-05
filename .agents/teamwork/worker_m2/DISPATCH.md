# DISPATCH — Worker M2 (BFF Server Functions for 360 Telemetry & Governance)

## Target File (Exclusive Write Ownership)
`src/services/admin-360-governance.functions.ts`

## Requirements
Implement all 8 Server Functions using TanStack Start `createServerFn`:
1. `getUserFull360Activity`:
   - Aggregates 7 dimensions: General & Profile, KYC Documents, Form Submissions, Navigation Telemetry, E-Commerce & Carts, Mobility & GPS / Debt, Staff Actions as Operator.
   - Computes deterministic SHA-256 certificate over JSON string using Web Crypto API (`globalThis.crypto.subtle.digest("SHA-256", ...)`).
2. `adminForceSetUserPassword`:
   - Admin-only via `requirePlatformAdmin`. Uses `getServerClient().auth.admin.updateUserById(userId, { password: newPassword })`.
3. `adminTransferStoreOwnership`:
   - Admin-only. Atomically transfers store ownership updating `workspace_members` and `stores.settings`, emitting a forensic receipt.
4. `adminToggleUserAccess`:
   - Admin-only. Toggles account block/unblock, logging sanction/reason.
5. `recordFormSubmissionAudit`:
   - Records form submission to `user_form_submissions_log` with IP, VPN check, sanitized payload.
6. `recordCartTelemetryEvent`:
   - Records cart event to `user_cart_telemetry`.
7. `recordStaffActionLog`:
   - Records staff action to `employee_tenant_audit_logs` linking physical user_id / CPF to store_id.
8. `getMyActivityHistory`:
   - Civil customer query to inspect own activity history (forms, carts, affinity).

## INVARIANTE B.25 MANDATE
100% of parameters in Zod schemas must be destructure-safe with defensive defaults (`param ?? null`, `param ?? default`).

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Deliver your handoff report to `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m2\handoff.md` and communicate completion back to the orchestrator.

## 2026-10-05T04:39:31Z
You are Worker M2: BFF Server Functions & Telemetry Ingestion.
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m2
Read DISPATCH.md in your working directory.
Read ORIGINAL_REQUEST.md at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-05T04:01:31Z, R2).
Read Explorer 2's report at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_bff\report.md.
Read PROJECT.md at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\orchestrator_6\PROJECT.md.

Exclusive Write Ownership:
`src/services/admin-360-governance.functions.ts`

Task:
Implement `src/services/admin-360-governance.functions.ts` providing all 8 required functions:
1. `getUserFull360Activity` (aggregates 7 dimensions with SHA-256 certification via Web Crypto API)
2. `adminForceSetUserPassword` (Master Admin password reset via `getServerClient().auth.admin.updateUserById`)
3. `adminTransferStoreOwnership` (transfers store ownership and creates forensic receipt)
4. `adminToggleUserAccess` (locks/unlocks user account with reason logged)
5. `recordFormSubmissionAudit` (ingests form submissions into `user_form_submissions_log`)
6. `recordCartTelemetryEvent` (ingests cart events into `user_cart_telemetry`)
7. `recordStaffActionLog` (ingests staff action into `employee_tenant_audit_logs` binding operator CPF)
8. `getMyActivityHistory` (queries caller's own activity history)

Adhere to Invariante B.25 (100% parameter destructuring with defensive fallbacks).
Follow security guards (autonomous `requirePlatformAdmin` and `getServerIdentity`).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Deliver your handoff report to `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m2\handoff.md` and communicate completion back to the orchestrator.
