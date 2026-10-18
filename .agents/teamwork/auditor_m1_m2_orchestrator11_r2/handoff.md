# Forensic Audit Report & Handoff

**Work Product**: Milestone 1 & 2 Implementation (AI Sovereign Task Aptitude, BYOK Isolation, Master Keypool Routing, Module Standardization)
**Profile**: General Project (Integrity Mode: Development per ORIGINAL_REQUEST.md ## 2026-10-18T09:25:16Z)
**Verdict**: **CLEAN**

---

## Forensic Audit Report

### Phase Results

| Check / Phase | Result | Details |
|---|:---:|---|
| **Phase 1.1: Task Aptitude Routing** | **PASS** | `executeUnifiedAiCall` in `src/services/api-orchestrator.functions.ts` strictly categorizes by `taskType`. Groq is expunged from `vision`/`ocr` cascades; Groq is prioritized for `fast_json`/`scraping`. |
| **Phase 1.2: Multimodal Model Selection** | **PASS** | When `isVisionTask` is true (images present or `taskType: "vision"|"ocr"`), OpenRouter selects `google/gemini-2.5-flash` / `qwen/qwen2.5-vl-72b-instruct:free`; Anthropic selects `claude-3-5-sonnet-20241022`. Groq is bypassed. |
| **Phase 1.3: Groq Fast JSON & Temperature** | **PASS** | `isFastJsonTask` forces Groq temperature to `0.1`, injects `response_format: { type: "json_object" }`, and defensively ensures the keyword "json" is present in prompts. |
| **Phase 1.4: AI Builder Composition Invocation** | **PASS** | `ai-builder-composition.functions.ts` genuinely calls `executeUnifiedAiCall` with `taskType: "deep_reasoning"` and `responseFormat: "json_object"`, parses the generated blocks, and falls back gracefully to deterministic blueprints if the LLM fails. |
| **Phase 1.5: DataJud Harvester Triage** | **PASS** | `src/services/mining/datajud-harvester.ts` exports `triageDataJudLawsuit`, which invokes `executeUnifiedAiCall` with `taskType: "fast_json"`, `isSystemTask: true`, `responseFormat: "json_object"`, and `temperature: 0.1`, returning structured compliance flags with heuristic fallback. |
| **Phase 2.1: BYOK Isolation & Background Leak Prevention** | **PASS** | Background tasks (`isSystemTask: true`, `mining_*`, `cron_*`, `crawler_*`, `datajud_*`) set `canUseByok = false`. `getActiveSecretForProvider` is bypassed and `getAllActiveKeysForProvider(provider, undefined)` prevents tenant keys from entering the pool. |
| **Phase 2.2: Silent 429 Failover & Tenant Quarantine** | **PASS** | HTTP 429 on tenant BYOK puts `byok-${provider}-${storeId}` into in-memory cooldown without DB writes; the loop seamlessly falls over to Master Pool keys and environment fallbacks with zero user-facing errors. |
| **Phase 3.1: Rogue Direct Fetch Elimination** | **PASS** | `src/lib/ai/openrouter.ts` direct fetch calls were removed and replaced with sovereign delegation to `executeUnifiedAiCall`. No rogue direct fetch calls exist in modified consumers. |
| **Phase 3.2: Hardcoding & Test Tampering** | **PASS** | Unit tests in `src/services/ai-task-aptitude-and-byok-isolation.test.ts` assert real behavior and inspect real payloads. No test assertions were weakened. No verification strings are hardcoded in source code. |
| **Phase 4: Behavioral Test Verification** | **PASS** | Vitest suites (`ai-task-aptitude-and-byok-isolation.test.ts`, `ai-task-aptitude-adversarial-stress.test.ts`, `copilot-keypool-quarantine.test.ts`) executed 22/22 tests with 100% green exit code 0. Design lint ratchet passed with 186 violation debt reduction. |

---

## 5-Component Handoff Report

### 1. Observation
- `src/services/api-orchestrator.functions.ts` (lines 938-1035, 1176-1256):
  - `isVisionTask` detects `images.length > 0`, `taskType === "vision"`, `taskType === "ocr"`, `taskType === "multimodal"`.
  - `TEXT_ONLY_PROVIDERS = ["groq"] as const`. When `isVisionTask` is true, Groq is filtered out of `defaultCascade` and `finalProvidersToTry`, and bypassed if attempted.
  - `isFastJsonTask` detects `taskType === "fast_json"`, `taskType === "scraping"`, or JSON mode without vision. Sets `defaultCascade` with Groq as primary, sets `temperature: 0.1`, and sets `response_format: { type: "json_object" }`.
  - `isPlatformBackground` detects `options.isSystemTask`, `feature` starting with `mining_`, `cron_`, `crawler_`, `datajud_`, or `taskType: "scraping"|"background"`.
  - When `isPlatformBackground` is true, `canUseByok` is false, completely skipping `getActiveSecretForProvider` and passing `ownerId: undefined` to `getAllActiveKeysForProvider`.
  - Key quarantine: `keyCooldownUntilMap.set(byokKeyId, ...)` sets local in-memory cooldown on HTTP 429. The loop continues to the next key in `keysToTry` (Master Pool key `public.api_key_pools`), successfully completing the request without throwing.
- `src/services/ai-builder-composition.functions.ts` (lines 850-910):
  - In `generateAiBuilderArtifact`: invokes `executeUnifiedAiCall` with `taskType: "deep_reasoning"`, `responseFormat: "json_object"`, parses the returned blocks, merges into `OmniPageDocument`, and runs `evaluateArtifactQuality`. Fallback invokes `composeAiArtifactDocument`.
- `src/services/mining/datajud-harvester.ts` (lines 521-595):
  - Exports `triageDataJudLawsuit(mined: MinedLawsuitData)` invoking `executeUnifiedAiCall` with `taskType: "fast_json"`, `isSystemTask: true`, `feature: "datajud_lawsuit_triage"`, `temperature: 0.1`, `responseFormat: "json_object"`.
- `src/lib/ai/openrouter.ts`:
  - Deprecated and removed old direct `fetch("https://openrouter.ai/api/v1/chat/completions", ...)` implementation; delegates directly to `executeUnifiedAiCall`.
- Unit tests:
  - `cmd.exe /c npx vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts`: 8/8 passed in 694ms.
  - `cmd.exe /c npx vitest run src/services/ai-task-aptitude-adversarial-stress.test.ts`: 7/7 passed in 669ms.
  - `cmd.exe /c npx vitest run src/services/copilot-keypool-quarantine.test.ts`: 7/7 passed in 767ms.
  - `cmd.exe /c node scripts/design-lint.mjs --ratchet`: Exit Code 0, Catraca Ativa (186 debt reduced).

### 2. Logic Chain
1. *Task Aptitude*: The code uses explicit boolean flags (`isVisionTask`, `isFastJsonTask`, `isEditorialSquadTask`, `isDeepReasoningTask`) to construct `defaultCascade` and filter incompatible providers before attempting keys. Even when `preferredProvider: "groq"` is explicitly requested, `TEXT_ONLY_PROVIDERS.includes(preferred)` expunges Groq if vision is required. This proves that task aptitude routing is genuine and not a facade.
2. *Groq Fast JSON*: In lines 1195-1230, Groq execution checks `isJsonMode = isFastJsonTask || isJson`. It sets `temperature: isFastJsonTask ? 0.1 : 0.3` and attaches `response_format: { type: "json_object" }`. Test 2 in `ai-task-aptitude-and-byok-isolation.test.ts` intercepted the fetch payload and proved `temperature === 0.1` and `response_format === { type: "json_object" }`.
3. *BYOK Isolation*: The security boundary defines `isPlatformBackground`. When true, `canUseByok` is set to false. Step 1 (BYOK check) is guarded by `if (canUseByok)`. Step 2 (Platform Master Pool) calls `getAllActiveKeysForProvider(provider, undefined)`. Because `undefined` is passed as ownerId, `getAllActiveKeysForProvider` does not query `secret_vault` for user keys. Tests 3 and 2.4 assert `getActiveSecretSpy` was never called when `isSystemTask: true`.
4. *Failover & Quarantine*: When a BYOK key receives HTTP 429, `markKeyError` sets an in-memory expiry in `keyCooldownUntilMap`. It then continues the loop to the Master Pool key in `keysToTry`. Test 4 and Test 2.1 empirically validated that when BYOK fails with 429, the call succeeds with the Master Pool key without throwing an error to the caller.
5. *Consumers & Rogue Fetches*: `ai-builder-composition.functions.ts`, `datajud-harvester.ts`, `editorial-squad.ts`, `travel-ai-extractor.functions.ts`, `travel-reviews.functions.ts`, `ads.functions.ts`, `jobs.functions.ts`, and `ai-conversations.functions.ts` all route through `executeUnifiedAiCall`. `openrouter.ts` was refactored to delegate to `executeUnifiedAiCall`. Grep searches confirm zero rogue AI fetch calls in modified code outside the gateway.

### 3. Caveats
- `api_key_pools` RPC `claim_healthy_api_keys_for_provider` gracefully falls back to direct select if the migration is unapplied in local developer environments. In production, the RPC provides atomic locking.
- In accordance with ORIGINAL_REQUEST.md lines 55 and 141 ("never run npm run typecheck or npm run build"), full compilation was not executed; verification was performed via Vitest, Design Lint Ratchet, AST/code inspection, and git diff analysis.

### 4. Conclusion
Milestone 1 & 2 implementation satisfies all forensic requirements, adheres to repository invariants in `AGENTS.md`, and implements genuine routing, isolation, and failover without facade patterns, hardcoded test tricks, or leaks.
Final verdict: **CLEAN**.

### 5. Verification Method
Run the following commands in powershell via `cmd.exe /c`:
```powershell
cmd.exe /c npx vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts
cmd.exe /c npx vitest run src/services/ai-task-aptitude-adversarial-stress.test.ts
cmd.exe /c npx vitest run src/services/copilot-keypool-quarantine.test.ts
cmd.exe /c node scripts/design-lint.mjs --ratchet
```
All suites must pass with Exit Code 0.
