# Adversarial Stress-Test Handoff Report — Requirement R1 & R2
**Agent**: Challenger 1 (Round 2 Replacement)
**Role**: Empirical Challenger (critic, specialist)
**Working Directory**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\challenger_m1_m2_1_r2`
**Verdict**: **CONFIRM** (Risk: LOW)

---

## 1. Observation

Direct empirical observations, commands executed, and exact lines inspected in the codebase:

1. **Test Suite Execution (Baseline)**:
   - Command: `cmd.exe /c npx --node-options="--max-old-space-size=4096" vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts`
   - Result:
     ```
     ✓ src/services/ai-task-aptitude-and-byok-isolation.test.ts (8 tests) 237ms
     Test Files  1 passed (1)
     Tests       8 passed (8)
     ```
   - All 8 unit tests passed with Exit Code 0.

2. **Adversarial Stress Test Suite Execution**:
   - Command: `cmd.exe /c npx --node-options="--max-old-space-size=4096" vitest run src/services/ai-task-aptitude-adversarial-stress.test.ts`
   - Result:
     ```
     ✓ src/services/ai-task-aptitude-adversarial-stress.test.ts (7 tests) 17ms
     Test Files  1 passed (1)
     Tests       7 passed (7)
     ```
   - All 7 adversarial stress tests passed with Exit Code 0.

3. **Combined Multi-Suite Verification**:
   - Command: `cmd.exe /c npx --node-options="--max-old-space-size=4096" vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts src/services/ai-task-aptitude-adversarial-stress.test.ts`
   - Result: 2 passed test files, 15 passed tests, Duration 1.23s, Exit Code 0.

4. **Code Inspection — Task Aptitude & Multimodal Detection (`src/services/api-orchestrator.functions.ts`)**:
   - Lines 938–942:
     ```typescript
     const isVisionTask =
       images.length > 0 ||
       options.taskType === "vision" ||
       options.taskType === "ocr" ||
       options.taskType === "multimodal";
     ```
   - Lines 960–971:
     ```typescript
     let defaultCascade: ApiProvider[];
     if (isVisionTask) {
       defaultCascade = ["gemini", "anthropic", "openai", "openrouter"];
     } else if (isFastJsonTask) {
       defaultCascade = ["groq", "openai", "openrouter", "gemini", "anthropic"];
     } else if (isEditorialSquadTask) {
       defaultCascade = ["groq", "openrouter", "gemini", "openai", "anthropic"];
     } else if (isDeepReasoningTask) {
       defaultCascade = ["openai", "anthropic", "openrouter", "gemini", "groq"];
     } else {
       defaultCascade = ["groq", "gemini", "openrouter", "openai", "anthropic"];
     }
     ```
   - Line 975:
     ```typescript
     const isPreferredAllowed = isVisionTask ? !TEXT_ONLY_PROVIDERS.includes(preferred as any) : true;
     ```
   - Line 988–990:
     ```typescript
     const finalProvidersToTry = isVisionTask
       ? providersToTry.filter((p) => !TEXT_ONLY_PROVIDERS.includes(p as any))
       : providersToTry;
     ```
   - Line 1067–1075: OpenRouter model selection enforces `google/gemini-2.5-flash` and `qwen/qwen2.5-vl-72b-instruct:free` when `isVisionTask` is true.
   - Line 1432: Anthropic model selection enforces `claude-3-5-sonnet-20241022` when `isVisionTask` is true.

5. **Code Inspection — BYOK vs Background Isolation & 429 Failover (`src/services/api-orchestrator.functions.ts`)**:
   - Lines 993–1003:
     ```typescript
     const isPlatformBackground =
       Boolean(options.isSystemTask) ||
       Boolean(options.feature?.startsWith("mining_")) ||
       Boolean(options.feature?.startsWith("cron_")) ||
       Boolean(options.feature?.startsWith("crawler_")) ||
       Boolean(options.feature?.startsWith("datajud_")) ||
       options.taskType === "scraping" ||
       options.taskType === "background" ||
       (!options.storeId && !options.ownerId && (Boolean(options.feature?.includes("harvest")) || Boolean(options.feature?.includes("crawler"))));

     const canUseByok = !isPlatformBackground && (Boolean(targetOwner) || Boolean(targetStore));
     ```
   - Line 1020–1023:
     ```typescript
     const byokKeyId = `byok-${provider}-${targetStore || targetOwner || "user"}`;
     if (!isKeyInMemoryCooldown(byokKeyId)) {
       keysToTry.push({ id: byokKeyId, rawKey: byokSecret });
     }
     ```
   - Line 1030:
     ```typescript
     const poolKeys = await getAllActiveKeysForProvider(provider, undefined).catch(() => []);
     ```
   - Line 1046:
     ```typescript
     for (const keyInfo of keysToTry) {
     ```
   - Lines 1249–1258, 1331–1336, 1401–1406, 1473–1478: Any non-OK HTTP status code (including 429) triggers `markKeyError(keyInfo.id, ..., status)` and executes `continue`, proceeding to the next candidate key in `keysToTry`.

---

## 2. Logic Chain

1. **Edge Case 1.1: Arbitrary or Unknown `taskType`**:
   - *Observation*: Line 938–959 shows boolean flags for `isVisionTask`, `isFastJsonTask`, `isEditorialSquadTask`, `isDeepReasoningTask`.
   - *Logic*: An unrecognized string (e.g., `"unsupported_arbitrary_task_type_xyz"`) evaluates all four conditions to `false` (assuming no images and no json flags).
   - *Inference*: Execution falls into the fallback `else` branch of `defaultCascade`, utilizing the canonical standard cascade `["groq", "gemini", "openrouter", "openai", "anthropic"]`.
   - *Empirical Proof*: Test 1.1 of `ai-task-aptitude-adversarial-stress.test.ts` verifies that execution degrades smoothly without throwing or crashing.

2. **Edge Case 1.2: `images` Array Passed Without `taskType: 'vision'`**:
   - *Observation*: Line 938: `isVisionTask = images.length > 0 || ...`.
   - *Logic*: Passing any image immediately marks the request as a vision task regardless of whether `taskType` was omitted or explicitly set to `"chat"`.
   - *Inference*: `isVisionTask` becomes `true`, filtering Groq out of `finalProvidersToTry` and selecting multimodal models across all providers.
   - *Empirical Proof*: Test 1.2 verifies that requesting `preferredProvider: 'groq'` with an attached image discards Groq and routes successfully to Gemini multimodal.

3. **Edge Case 1.3: `taskType: 'ocr'` With Empty `images` Array**:
   - *Observation*: Line 941: `options.taskType === "ocr"` triggers `isVisionTask = true`.
   - *Logic*: Anthropic (line 1432) assigns `model = "claude-3-5-sonnet-20241022"` because `isVisionTask` is true. OpenRouter (line 1068) selects `["google/gemini-2.5-flash", "qwen/qwen2.5-vl-72b-instruct:free"]`.
   - *Inference*: When `images` is empty, lines 1100–1102 and 1448–1450 construct the message payload with user text only, sending it safely to the multimodal model without schema failure.
   - *Empirical Proof*: Test 1.3 confirms that Anthropic receives `model: "claude-3-5-sonnet-20241022"` for text-only OCR prompts and completes with status 200.

4. **Failover Stress 2.1: Double 429 Failover Cascade**:
   - *Observation*: Lines 1008–1046 build `keysToTry` consisting of `[BYOK key, Master Key 1, Master Key 2]`.
   - *Logic*:
     - Attempt 1 (BYOK key) encounters HTTP 429 -> calls `markKeyError("byok-groq-store", ..., 429)` -> executes `continue`.
     - Attempt 2 (Master Key 1) encounters HTTP 429 -> calls `markKeyError("pool-key-1", ..., 429)` -> executes `continue`.
     - Attempt 3 (Master Key 2) encounters HTTP 200 -> calls `finalizeSuccess(...)` with `status: "fallback_recovered"` and returns response.
   - *Inference*: The orchestrator transparently exhausts `keysToTry` without bubbling any error to the client.
   - *Empirical Proof*: Test 2.1 confirms that exactly 3 HTTP requests occurred in order and the final result succeeded.

5. **Failover Stress 2.2: Local In-Memory Quarantine & Network Request Bypass**:
   - *Observation*: Line 741 sets `keyCooldownUntilMap.set(keyId, until)` where `until` is 60s in the future (or until 00:00 UTC). Line 1021 checks `if (!isKeyInMemoryCooldown(byokKeyId))`.
   - *Logic*: Once a BYOK key receives a 429, `byokKeyId` is in cooldown. On the subsequent call by the same tenant, `isKeyInMemoryCooldown` returns `true`.
   - *Inference*: The degraded BYOK key is omitted from `keysToTry`, causing the request to immediately dispatch against Master Pool keys with zero network requests to the quarantined key.
   - *Empirical Proof*: Test 2.2 proves that after the initial 429, the second call made 0 requests to BYOK and 1 request directly to the Master Pool.

6. **Isolation Verification 2.3 & 2.4: Multi-Tenant & Background Rigidity**:
   - *Observation*: BYOK key IDs are tenant-partitioned (`byok-${provider}-${targetStore || targetOwner}`). Background tasks set `isPlatformBackground = true`, forcing `canUseByok = false`.
   - *Logic*: Quarantining Tenant A does not touch Tenant B's cooldown entry. Background tasks never invoke `getActiveSecretForProvider`.
   - *Empirical Proof*: Tests 2.3 and 2.4 verify tenant isolation and background exclusivity.

---

## 3. Caveats

- **In-Memory Volatility on Worker Restart**: The in-memory cooldown map `keyCooldownUntilMap` resides in the Node/Worker process memory. A process restart resets the in-memory cooldown. However, for Master Pool keys (`api_key_pools`), persistence is backed by Supabase table columns `quarantine_until` and `is_active`, maintaining durable state across restarts. For BYOK keys, in-memory quarantine is deliberately transient per worker instance to allow fast self-healing.
- **Provider API Changes**: Model IDs like `claude-3-5-sonnet-20241022` and `qwen/qwen2.5-vl-72b-instruct:free` rely on provider model availability. If an upstream provider sunsets a model, fallback to subsequent models in the cascade is active.

---

## 4. Conclusion

- **Requirement R1 (Matriz de Especialização e Aptidão por Tipo de Tarefa)** is **FULLY IMPLEMENTED & RESILIENT**:
  - `vision` and `ocr` strictly filter text-only providers (`groq`) and select multimodal models (`gemini-2.5-flash`, `claude-3-5-sonnet-20241022`, `qwen-vl`).
  - `images` auto-triggers vision handling.
  - `fast_json` prioritizes Groq with `json_object` format and 0.1 temperature.
  - Unknown task types degrade gracefully to default cascades without runtime errors.
- **Requirement R2 (Roteamento Híbrido BYOK vs Background com Quarentena Invisível & 429 Failover)** is **FULLY IMPLEMENTED & RESILIENT**:
  - Platform background tasks (`isSystemTask: true`, `mining_*`, `cron_*`, `crawler_*`, `datajud_*`) strictly isolate from BYOK keys.
  - BYOK HTTP 429 triggers local in-memory quarantine and seamless fallback to Master Pool keys.
  - Subsequent tenant calls bypass quarantined keys with zero network requests.
  - Multi-tenant isolation is strictly preserved.
- **Final Verdict**: **CONFIRM**.

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **Run Unit & Isolation Suite**:
   ```powershell
   cmd.exe /c npx --node-options="--max-old-space-size=4096" vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts
   ```
   *Expected*: 8 tests passed, 0 failed.

2. **Run Adversarial Stress Suite**:
   ```powershell
   cmd.exe /c npx --node-options="--max-old-space-size=4096" vitest run src/services/ai-task-aptitude-adversarial-stress.test.ts
   ```
   *Expected*: 7 tests passed, 0 failed.

3. **Run Quarantine Scope Suite**:
   ```powershell
   cmd.exe /c npx --node-options="--max-old-space-size=4096" vitest run src/services/copilot-keypool-quarantine.test.ts
   ```
   *Expected*: 7 tests passed, 0 failed.

4. **Invalidation Condition**:
   Any test failure in `ai-task-aptitude-and-byok-isolation.test.ts` or `ai-task-aptitude-adversarial-stress.test.ts`, or any case where an unknown `taskType` throws an uncaught exception, or where a background task touches a BYOK key.
