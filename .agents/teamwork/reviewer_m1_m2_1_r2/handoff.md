# Quality & Adversarial Review Report — Milestone 1 & Milestone 2 (R1 & R2)

**Reviewer**: Reviewer 1 (Round 2 Replacement)  
**Parent Agent**: `2e600c46-95e2-4963-8431-c31ea9d5365f`  
**Working Directory**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\reviewer_m1_m2_1_r2`  
**Target Files**:
- `src/services/api-orchestrator.functions.ts`
- `src/services/ai-task-aptitude-and-byok-isolation.test.ts`
- `src/services/copilot-keypool-quarantine.test.ts`
- `src/services/ai-core-gateway.test.ts`
- `src/services/mining/datajud-harvester.ts`

---

## Review Summary

**Verdict**: **APPROVE**

No integrity violations detected (no hardcoded test returns, no dummy facades, no bypassed logic, no fabricated verification). All requirements for R1 (Matriz de Especialização e Aptidão por Tipo de Tarefa) and R2 (Roteamento Híbrido BYOK vs Background com Quarentena Invisível e Failover 429) have been genuinely implemented, verified against code, and tested with 100% passing automated suites.

---

## 1. Observation

Direct code inspections with exact file paths and line numbers:

1. **`unifiedAiTaskTypeEnum`, `TEXT_ONLY_PROVIDERS`, `MULTIMODAL_PROVIDERS`** (`src/services/api-orchestrator.functions.ts:863-876`):
   - Enum declared with: `"vision"`, `"ocr"`, `"fast_json"`, `"scraping"`, `"editorial_squad"`, `"deep_reasoning"`, `"chat"`.
   - `export const TEXT_ONLY_PROVIDERS = ["groq"] as const;`
   - `export const MULTIMODAL_PROVIDERS = ["gemini", "anthropic", "openai", "openrouter"] as const;`
   - `UnifiedAiCallOptions.taskType` supports `UnifiedAiTaskType | "multimodal" | string`.

2. **`isVisionTask` Logic & Groq Exclusion** (`src/services/api-orchestrator.functions.ts:938-989, 1016, 1176`):
   - Defined as: `images.length > 0 || options.taskType === "vision" || options.taskType === "ocr" || options.taskType === "multimodal"`.
   - When `isVisionTask === true`:
     - Groq is excluded from `preferredProvider`: `const isPreferredAllowed = isVisionTask ? !TEXT_ONLY_PROVIDERS.includes(preferred as any) : true;` (lines 975–978).
     - `defaultCascade` contains only `["gemini", "anthropic", "openai", "openrouter"]` (line 962).
     - `finalProvidersToTry` is filtered: `providersToTry.filter((p) => !TEXT_ONLY_PROVIDERS.includes(p as any))` (lines 988–990).
     - BYOK selection rejects Groq: `const isProviderCompatibleWithTask = isVisionTask ? !TEXT_ONLY_PROVIDERS.includes(provider as any) : true;` (line 1016).
     - Inside Groq execution: `if (isVisionTask) continue;` (line 1176).

3. **`isFastJsonTask` Logic & LPU Optimization** (`src/services/api-orchestrator.functions.ts:944-971, 1195-1230`):
   - `isFastJsonTask` prioritizes Groq: `defaultCascade = ["groq", "openai", "openrouter", "gemini", "anthropic"]`.
   - Groq prompt verification (lines 1199–1207): If neither `systemPrompt` nor `userPrompt` contains "JSON" (case-insensitive `/json/i`), the orchestrator automatically appends `"Responda estritamente em formato JSON válido."` to `finalSystemPrompt`, preventing Groq HTTP 400 errors.
   - Temperature default is set to `0.1`: `temperature: isFastJsonTask ? (options.temperature ?? 0.1) : (options.temperature ?? 0.3)` (line 1225).
   - Response format set to `{ type: "json_object" }` (line 1229).

4. **Background Isolation vs BYOK** (`src/services/api-orchestrator.functions.ts:993-1035`):
   - `isPlatformBackground` detects `isSystemTask: true`, prefixes `"mining_"`, `"cron_"`, `"crawler_"`, `"datajud_"`, task types `"scraping"`, `"background"`, or crawler/harvest tasks without store/owner (lines 993–1001).
   - `canUseByok = !isPlatformBackground && (Boolean(targetOwner) || Boolean(targetStore))` (line 1003). When `isPlatformBackground === true`, `canUseByok` is strictly `false`.
   - In Step 2 (Master Pool): `const poolKeys = await getAllActiveKeysForProvider(provider, undefined).catch(() => []);` (line 1030). Passing `undefined` as `ownerId` guarantees that `getAllActiveKeysForProvider` (line 483) does not load any tenant BYOK secrets into the pool.

5. **429 Quarantine & Failover** (`src/services/api-orchestrator.functions.ts:445-468, 734-754, 1020-1024, 1256`):
   - BYOK key ID is tenant-scoped: `byok-${provider}-${targetStore || targetOwner || "user"}` (line 1020).
   - On HTTP 429, `markKeyError` calls `classifyKeyQuotaError`, storing the quarantine expiry timestamp in `keyCooldownUntilMap.set(keyId, cls.until)`.
   - If `keyId.startsWith("byok-")`, `markKeyError` returns early without database write to `api_key_pools` (preserving ACID isolation).
   - The loop over `keysToTry` automatically continues to the next key (Master Pool / env key), which resolves the request.
   - `finalizeSuccess` records `status: "fallback_recovered"` and `fallbackUsed: true` in `ai_telemetry_logs` (lines 1047–1062). Zero error is raised to caller.
   - Subsequent calls from that tenant check `!isKeyInMemoryCooldown(byokKeyId)` and skip the quarantined key directly without sending network requests.

6. **Unit Test Suite Execution**:
   - `cmd.exe /c npx --node-options="--max-old-space-size=4096" vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts src/services/copilot-keypool-quarantine.test.ts src/services/ai-core-gateway.test.ts`
   - Result: 3 passed (3), 22 passed (22). Duration: ~943ms. Exit Code: 0.
   - Adversarial stress suite `src/services/ai-task-aptitude-adversarial-stress.test.ts`: 1 passed (1), 7 passed (7). Exit Code: 0.
   - M2 downstream suites (`ai-builder-composition`, `travel-reviews`, `travel-ai-extractor-security`, `ads-provenance`, `ai-conversations-access`): 5 passed (5), 19 passed (19). Exit Code: 0.

---

## 2. Logic Chain

1. **Aptitude Routing (`isVisionTask` vs `isFastJsonTask`)**:
   - Text-only LPU models (Groq `llama-3.3-70b`, `qwen3.8-27b`) have no visual encoding layers. R1 mandates that multimodal queries never reach Groq. Lines 962, 975, 988, 1016, and 1176 create a 5-layer mechanical defense ensuring Groq cannot be invoked for vision or OCR tasks under any scenario.
   - Conversely, high-volume structured extractions benefit from LPU sub-200ms latency. Groq rejects requests when `response_format: { type: "json_object" }` is specified unless the word "JSON" is present in the prompt. Injecting this term into `finalSystemPrompt` guarantees zero HTTP 400 parameter errors from Groq. Setting default temperature to `0.1` ensures deterministic outputs.
2. **BYOK vs Background Platform Isolation**:
   - Platform background jobs (crawlers, cron, datajud, news feeds) are platform overhead and must never deplete a merchant's private quota.
   - By deriving `canUseByok = !isPlatformBackground && ...` and passing `undefined` to `getAllActiveKeysForProvider(provider, undefined)` in Step 2, neither the primary nor the secondary key resolution paths can access `secret_vault` BYOK keys during background operations.
3. **429 Quarantine & Invisible Failover**:
   - When a merchant's BYOK key hits quota limits (HTTP 429), alerting the end-user causes immediate customer friction.
   - Deriving a scoped key `byok-${provider}-${tenantId}` and quarantining it in `keyCooldownUntilMap` prevents repeated failed requests while seamlessly falling over to the next key in `keysToTry` (the Master Pool key).
   - This completes the request with HTTP 200, logs telemetry as `fallback_recovered`, and maintains zero disruption for the merchant.

---

## 3. Caveats

- **In-Memory vs Distributed Cooldown**: `keyCooldownUntilMap` is an in-memory Map. In a serverless environment with multiple isolated worker isolates, the quarantine is per-isolate. Because Master Pool keys are also persisted in `api_key_pools`, this is safe and acceptable, but distributed Redis/Durable Objects could be considered in future for multi-region coordination.
- **R6 Absolute Prohibition Respected**: In strict compliance with `ORIGINAL_REQUEST.md` R6, `npm run typecheck` and `npm run build` were NOT run. Verification was performed strictly through code inspection and Vitest test execution.
- **Minor Observation**: In `src/services/ai-core-gateway.test.ts`, the mock for `./api-orchestrator.functions` did not export `getAllActiveKeysForProvider`. When test 7 exercised fallback, a caught error was logged (`[AI-CORE-GATEWAY] Pool sem chave para...`), but the test still passed. Adding `getAllActiveKeysForProvider` to that test's mock in future cleanup will make test runs 100% warning-free.

---

## 4. Conclusion

The implementation of Milestone 1 and Milestone 2 meets all criteria:
- `unifiedAiTaskTypeEnum` and constants properly typed and exported.
- Strict Groq exclusion from vision/OCR tasks verified across 5 layers of code.
- Groq JSON prompt injection, response_format, and temperature 0.1 verified.
- Complete separation between lojista BYOK keys and platform background tasks verified.
- In-memory 429 quarantine with tenant-scoped key and transparent Master Pool failover verified.
- All 22 tests across the 3 target suites pass with 100% success.
- Zero integrity violations or facades found.

**Verdict**: **APPROVE**

---

## 5. Verification Method

To independently verify this report:

```powershell
cmd.exe /c npx --node-options="--max-old-space-size=4096" vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts src/services/copilot-keypool-quarantine.test.ts src/services/ai-core-gateway.test.ts
```

Expected result:
- 3 test files passed (3)
- 22 tests passed (22)
- Exit Code: 0
