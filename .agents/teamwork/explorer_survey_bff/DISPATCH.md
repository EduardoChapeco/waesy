# DISPATCH — Explorer Survey BFF

Task: BFF Server Functions & Services Survey for Telemetria 360º & Governança Master (R2).
Read ORIGINAL_REQUEST.md at c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-05T04:01:31Z).
Inspect existing Server Functions in `src/services/` for:
- Existing admin server functions (e.g. `src/services/admin-users.functions.ts` or related).
- How auth and security context are resolved: `getServerIdentity`, `requireAdmin`, Supabase service role / admin client.
- Zod schema validation conventions and parameter handling (Invariante B.25).
- Existing telemetry / event logging / hashing (SHA-256) implementations.
- Testing conventions in `src/services/*.test.ts` (Vitest, mocks, fixtures).
Write your detailed report to `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_bff\report.md` and deliver `handoff.md`.


## 2026-10-05T04:04:19Z
You are Explorer 2: BFF Server Functions & Services Survey.
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_bff
Read ORIGINAL_REQUEST.md at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section ## 2026-10-05T04:01:31Z).
Read DISPATCH.md in your working directory.
Investigate the authoritative source of truth in the codebase:
1. Review `src/services/` for existing server functions, auth verification (`getServerIdentity`, `requireAdmin`, `getAdminClient` or service-role Supabase clients).
2. Examine Zod schema validation conventions and parameter handling (Invariante B.25).
3. Review SHA-256 hashing patterns (e.g. `crypto.subtle` or node `crypto` in server functions).
4. Review existing user management functions (`src/services/admin-users.functions.ts` or similar).
5. Review test patterns in `src/services/*.test.ts` (Vitest, mocking Supabase, test coverage).
Write your complete findings to `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_bff\report.md` and deliver `handoff.md`. Communicate back when done.
