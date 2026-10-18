## 2026-10-18T10:01:38Z
You are Worker M1 assigned to implement Milestone 1: Motor Central de IA & Roteamento Soberano.
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_orchestrator11

You MUST read:
1. ORIGINAL_REQUEST.md at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section under ## 2026-10-18T09:25:16Z).
2. AGENTS.md at the project root for repository operational rules and prohibitions.
3. SCOPE.md at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\orchestrator_11\SCOPE.md.
4. Explorer 1 Handoff at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_orchestrator11_1\handoff.md.
5. Explorer 2 Handoff at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_orchestrator11_2\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You have exclusive write ownership of:
- `src/services/api-orchestrator.functions.ts`
- `src/services/ai-task-aptitude-and-byok-isolation.test.ts`
Do NOT edit other source files in this milestone.

Tasks:
1. In `src/services/api-orchestrator.functions.ts`:
   - Export `unifiedAiTaskTypeEnum` (Zod enum) and `type UnifiedAiTaskType = z.infer<typeof unifiedAiTaskTypeEnum>` covering: 'vision' | 'ocr' | 'fast_json' | 'scraping' | 'editorial_squad' | 'deep_reasoning' | 'chat'.
   - Declare `TEXT_ONLY_PROVIDERS = ['groq'] as const` and `MULTIMODAL_PROVIDERS = ['gemini', 'anthropic', 'openai', 'openrouter'] as const`.
   - In `executeUnifiedAiCall`:
     - If `isVisionTask` (`taskType === 'vision' || taskType === 'ocr' || taskType === 'multimodal' || images.length > 0`):
       - If `preferredProvider` is in `TEXT_ONLY_PROVIDERS` (like 'groq'), discard it from preferred.
       - Set default cascade to `['gemini', 'anthropic', 'openai', 'openrouter']`.
       - Filter `providersToTry` to strictly exclude all `TEXT_ONLY_PROVIDERS`.
     - If `isFastJsonTask` (`taskType === 'fast_json' || taskType === 'scraping' || (isJson && !isVisionTask)`):
       - Prioritize Groq: default cascade `['groq', 'openai', 'openrouter', 'gemini', 'anthropic']`.
       - For Groq: ensure `response_format: { type: "json_object" }` is passed, temperature 0.1, and guarantee that the word "JSON" is included in system/user prompt if not already present.
     - For OpenRouter: ensure `isVisionTask` selects multimodal models (`google/gemini-2.5-flash`, `qwen/qwen2.5-vl-72b-instruct:free`).
     - For Anthropic: ensure `isVisionTask` selects `claude-3-5-sonnet-20241022`.
   - In Background vs BYOK isolation:
     - On line 1002, ensure `getAllActiveKeysForProvider(provider, undefined)` is called with `undefined` so that Master Pool keys are loaded cleanly without re-adding unvetted/unquarantined BYOK keys.
     - Ensure `canUseByok` is false whenever `isPlatformBackground === true` (`isSystemTask: true`, `mining_*`, `cron_*`, `crawler_*`, `datajud_*`, etc.).
   - In Quarentena e Failover 429:
     - Ensure tenant BYOK key ID is structured as `byok-${provider}-${targetStore || targetOwner || "user"}`.
     - When HTTP 429 occurs on the BYOK key, `markKeyError` records local quarantine timestamp in `keyCooldownUntilMap`.
     - The loop continues to the next key in `keysToTry` (the healthy Master Pool key from `public.api_key_pools`), succeeding and marking `fallback_recovered` without returning an error to the user.
2. In `src/services/ai-task-aptitude-and-byok-isolation.test.ts`:
   - Fix Test 4 to provide an active Master Pool key for failover (e.g. setting `process.env.GROQ_API_KEY = "gsk-master-pool-key"` or mock for pool) so the test passes cleanly and verifies that 429 on BYOK falls over to the master pool with 0 errors returned.
   - Add/verify tests for:
     - `taskType: "vision"` ignores Groq even if `preferredProvider: "groq"` was passed.
     - `taskType: "fast_json"` selects Groq with JSON formatting.
     - background tasks (`isSystemTask: true`) never invoke BYOK secrets.
     - BYOK 429 transparent failover.
3. Verification:
   - Run: `cmd.exe /c npx vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts`
   - Run: `cmd.exe /c npx vitest run src/services/copilot-keypool-quarantine.test.ts`
   - Run: `cmd.exe /c npx vitest run src/services/ai-core-gateway.test.ts`
   - Verify all tests pass.
4. Write your full report to `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_orchestrator11\handoff.md`. Include test commands, outputs, and diff summary.
When done, message back with your conclusion.
