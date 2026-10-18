# Scope: Orquestração Soberana de IA (Orchestrator 11)

## Architecture
- **Motor Central Unificado Soberano (`src/services/api-orchestrator.functions.ts`)**:
  - Matriz de Especialização e Aptidão por `taskType`:
    - `vision` / `ocr`: Provedores multimodais estritos (`gemini`, `anthropic`, `openai`, `openrouter`). Provedores text-only (`groq`) são categoricamente expurgados mesmo que passados como `preferredProvider`.
    - `fast_json` / `scraping`: Provedores ultra-rápidos com LPU (`groq` com `qwen3.8-27b` ou `llama-3.3-70b-versatile`, sub-200ms) forçando `response_format: { type: "json_object" }` e temperatura 0.1 para economia de quotas.
    - `editorial_squad`: Cascata `groq` -> `openrouter` -> `gemini` -> `openai` -> `anthropic`.
    - `deep_reasoning`: Cascata `openai` -> `anthropic` -> `openrouter` -> `gemini` -> `groq`.
    - `chat`: Cascata `groq` -> `gemini` -> `openrouter` -> `openai` -> `anthropic`.
- **Roteamento Híbrido BYOK vs Background da Plataforma**:
  - Chaves de lojistas no cofre (`public.secret_vault`, `tenant_ai_providers`, `integration_credentials`) são de uso estrito e exclusivo das demandas do lojista autenticado (`storeId` / `ownerId`).
  - Rotinas de background da plataforma (`isSystemTask: true`, `mining_*`, `cron_*`, `crawler_*`, `datajud_*`) NUNCA consomem chaves BYOK de lojistas, operando exclusivamente sobre `public.api_key_pools` (Master Pool).
  - Quarentena silenciosa local em memória por tenant (`byok-${provider}-${storeId}`) ao ocorrer erro HTTP 429 na chave BYOK.
  - Failover atômico e transparente: ao tomar 429 na chave BYOK, transborda instantaneamente para a primeira chave saudável do Master Pool (`public.api_key_pools`) sem emitir alerta, erro ou quebra para o lojista.
- **Padronização dos 7 Módulos Consumidores de IA**:
  - `ai-conversations.functions.ts` (Copilot Loja & Civil)
  - `mining/editorial-squad.ts` (Curadoria Editorial)
  - `travel-ai-extractor.functions.ts` (OCR de Imagem e Texto de Viagens)
  - `travel-reviews.functions.ts` (Classificador de Avaliações)
  - `ai-builder-composition.functions.ts` (Omni Builder integrado com IA real e fallback determinístico)
  - `ads.functions.ts` (Criador e Diagnosticador de Campanhas)
  - `mining/datajud-harvester.ts` (Triagem Jurídica e Risco Processual `triageDataJudLawsuit`)
  - Deprecação de rogue direct fetch em `src/lib/ai/openrouter.ts`.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Matriz Canônica de Aptidão `taskType` | Tipagem `UnifiedAiTaskType`, `TEXT_ONLY_PROVIDERS`, filtragem de Groq para `vision`/`ocr`, priorização Groq para `fast_json` | M1 | Survey 1 (Explorer 1) | DONE |
| 2 | Provedores Multimodais & Seleção de Modelo | OpenRouter e Anthropic selecionam modelos multimodais baseados em `isVisionTask` mesmo sem imagem pré-anexada | M1 | Survey 1 (Explorer 1) | DONE |
| 3 | Isolamento Rígido de Background vs BYOK | Background tasks nunca tocam BYOK; `getAllActiveKeysForProvider` chamado com `undefined` na linha 1015 | M1 | Survey 2 (Explorer 2) | DONE |
| 4 | Quarentena Invisível de BYOK & Failover 429 | Quarentena local `byok-${provider}-${tenantId}` e transbordo atômico para Master Pool sem retorno de erro | M1 | Survey 2 (Explorer 2) | DONE |
| 5 | Padronização Copilot Loja & Civil | Explicitar `taskType: "vision" | "chat"`, `storeId`, `ownerId` em `ai-conversations.functions.ts` | M2 | Survey 3 (Explorer 3) | DONE |
| 6 | Padronização Travel AI Extractor | Passar `taskType: "ocr"` para imagem, `storeId`, `ownerId` em `travel-ai-extractor.functions.ts` | M2 | Survey 3 (Explorer 3) | DONE |
| 7 | Padronização Travel Reviews | Declarar `isSystemTask: true` e `ownerId` em `travel-reviews.functions.ts` | M2 | Survey 3 (Explorer 3) | DONE |
| 8 | IA Real no Omni Builder | Integrar `executeUnifiedAiCall` com `taskType: "deep_reasoning"`, `storeId`, `ownerId` e fallback determinístico em `ai-builder-composition.functions.ts` | M2 | Survey 3 (Explorer 3) | DONE |
| 9 | Padronização Ads Creator | Passar `ownerId: identity.id` junto com `storeId` em `ads.functions.ts` | M2 | Survey 3 (Explorer 3) | DONE |
| 10 | Triagem Jurídica DataJud | Implementar `triageDataJudLawsuit` com `taskType: "fast_json"`, `isSystemTask: true` em `mining/datajud-harvester.ts` | M2 | Survey 3 (Explorer 3) | DONE |
| 11 | Sanear Chamadas Rogue de IA | Deprecar `src/lib/ai/openrouter.ts` e padronizar `jobs.functions.ts` | M2 | Survey 3 (Explorer 3) | DONE |
| 12 | Testes Unitários de Roteamento, Failover e Aptidão | Cobrir `vision` ignora Groq, `fast_json` seleciona Groq, background não toca BYOK, e failover 429 sem erro | M3 | Survey 1, 2, 3 | DONE |
| 13 | Quality Gates Repositório | Aprovar `vitest`, `npm run typecheck`, `node scripts/design-lint.mjs --ratchet` e `npm run build` | M3 | Acceptance Criteria | DONE |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Motor Central de IA & Roteamento Soberano | Features 1, 2, 3, 4: `src/services/api-orchestrator.functions.ts` e testes unitários de aptidão/quarentena | none | DONE |
| 2 | M2: Padronização dos 7 Módulos Consumidores | Features 5, 6, 7, 8, 9, 10, 11: `ai-conversations`, `travel-ai-extractor`, `travel-reviews`, `ai-builder-composition`, `ads`, `datajud-harvester`, `openrouter.ts` | M1 | DONE |
| 3 | M3: Suíte de Testes, Quality Gates e Auditoria Forense | Features 12, 13: Vitest (100% green), Design-Lint ratchet (186 debt reduction), Reviewers (APPROVE), Challengers (CONFIRM), Auditoria Forense (CLEAN) | M1, M2 | DONE |
