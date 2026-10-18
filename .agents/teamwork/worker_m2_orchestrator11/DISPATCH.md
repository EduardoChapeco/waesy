## 2026-10-18T10:42:45Z
You are Worker M2 assigned to implement Milestone 2: Padronização dos 7 Módulos Consumidores de IA & Erradicação de Rogue Calls.
Your working directory is: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m2_orchestrator11

You MUST read:
1. ORIGINAL_REQUEST.md at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section under ## 2026-10-18T09:25:16Z).
2. AGENTS.md at the project root for repository rules and prohibitions.
3. SCOPE.md at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\orchestrator_11\SCOPE.md.
4. Explorer 3 Handoff Report at: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_orchestrator11_3\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You have exclusive write ownership of:
- `src/services/ai-conversations.functions.ts`
- `src/services/travel-ai-extractor.functions.ts`
- `src/services/travel-reviews.functions.ts`
- `src/services/ai-builder-composition.functions.ts`
- `src/services/ads.functions.ts`
- `src/services/mining/datajud-harvester.ts`
- `src/lib/ai/openrouter.ts`
- `src/services/jobs.functions.ts`

Tasks:
1. In `src/services/ai-conversations.functions.ts`:
   - Line ~2242 (Stage 4 synthesis): ensure `taskType: resolvedAttachments.images.length > 0 ? "vision" : "chat"`, `storeId: context.storeId || undefined`, `ownerId: context.userId || undefined`.
2. In `src/services/travel-ai-extractor.functions.ts`:
   - Line ~127: For image OCR extraction, set `taskType: "ocr"`, `feature: "travel_ocr_extractor"`, `storeId: identity.store_id || undefined`, `ownerId: identity.id || undefined`.
   - Line ~146: For text extraction, set `taskType: "fast_json"`, `feature: "travel_text_extractor"`, `storeId: identity.store_id || undefined`, `ownerId: identity.id || undefined`.
3. In `src/services/travel-reviews.functions.ts`:
   - Line ~76: In `submitAndClassifyHotelReview`, set `taskType: "fast_json"`, `isSystemTask: true`, `ownerId: identity?.id || undefined`.
4. In `src/services/ai-builder-composition.functions.ts`:
   - In `generateAiBuilderArtifact` (around lines 832–865):
     Plug in `executeUnifiedAiCall` with:
     - `feature: "ai_builder_composition"`
     - `taskType: "deep_reasoning"`
     - `storeId: identity.store_id || undefined`, `ownerId: identity.id || undefined`
     - `responseFormat: "json_object"`, `expectJson: true`, `temperature: 0.3`
     - Prompts structured with user briefing, company name, niche, archetype, and target audience
     - If AI succeeds with valid blocks in JSON, merge into document and compute quality rubric via `evaluateArtifactQuality`
     - Wrap in try/catch with fallback to deterministic blueprint generator `composeAiArtifactDocument(input)` on any AI failure.
5. In `src/services/ads.functions.ts`:
   - Line ~1797 in `generateAiAdCreativeFromCatalog`: pass `ownerId: identity.id || undefined` alongside `storeId`.
   - Line ~2666 in `diagnoseConnectedAdAccounts`: pass `ownerId: identity.id || undefined` alongside `storeId`.
6. In `src/services/mining/datajud-harvester.ts`:
   - Export canonical `triageDataJudLawsuit(mined: MinedLawsuitData)`:
     - Invokes `executeUnifiedAiCall` with:
       - `feature: "datajud_lawsuit_triage"`
       - `taskType: "fast_json"`
       - `isSystemTask: true`
       - `responseFormat: "json_object"`, `expectJson: true`, `temperature: 0.1`
       - System prompt asking for JSON with summary, riskLevel ('baixo'|'medio'|'alto'), complianceFlags ({ has_arrest_warrants: boolean, has_criminal_executions: boolean, has_sanctions_restrictions: boolean }), recommendedAction.
     - Fallback determinístico caso a IA falhe.
7. In `src/lib/ai/openrouter.ts`:
   - Deprecate `callOpenRouter` by delegating directly to `executeUnifiedAiCall({ ... })` from `src/services/api-orchestrator.functions.ts` to eradicate rogue direct fetch outside the gateway.
8. In `src/services/jobs.functions.ts`:
   - Line ~1016 in `extractJobWithAI`: ensure `taskType: "fast_json"`, `isSystemTask: true`.

Verification:
- Run Vitest tests:
  `cmd.exe /c npx --node-options="--max-old-space-size=4096" vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts src/services/copilot-keypool-quarantine.test.ts src/services/ai-core-gateway.test.ts`
- Verify that any relevant unit tests for ads, travel extractor, or conversations pass.
- Write your comprehensive handoff report to `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m2_orchestrator11\handoff.md`.
- Message back when done.
