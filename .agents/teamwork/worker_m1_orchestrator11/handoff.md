# Handoff Report — Milestone 1: Motor Central de IA & Roteamento Soberano

**Worker**: Worker M1 (`worker_m1_orchestrator11`)  
**Parent Agent**: `2e600c46-95e2-4963-8431-c31ea9d5365f`  
**Working Directory**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_orchestrator11`  
**Date**: 2026-10-18T10:32:00Z  

---

## 1. Observation

### 1.1 Modificações Realizadas em `src/services/api-orchestrator.functions.ts`
- **Linhas 863–876**:
  Declarou e exportou o enum e tipo Zod canônico:
  ```typescript
  export const unifiedAiTaskTypeEnum = z.enum([
    "vision",
    "ocr",
    "fast_json",
    "scraping",
    "editorial_squad",
    "deep_reasoning",
    "chat",
  ]);
  export type UnifiedAiTaskType = z.infer<typeof unifiedAiTaskTypeEnum>;
  export const TEXT_ONLY_PROVIDERS = ["groq"] as const;
  export const MULTIMODAL_PROVIDERS = ["gemini", "anthropic", "openai", "openrouter"] as const;
  ```
  Na interface `UnifiedAiCallOptions`, o campo `taskType` agora suporta `UnifiedAiTaskType | "multimodal" | string`.
- **Linhas 947–985**:
  - Cascata padrão para tarefas de visão/OCR ajustada para: `["gemini", "anthropic", "openai", "openrouter"]`.
  - Rejeição de `preferredProvider` quando pertencente a `TEXT_ONLY_PROVIDERS`:
    ```typescript
    const providersToTry: ApiProvider[] = [];
    if (preferred) {
      const isPreferredAllowed = isVisionTask ? !TEXT_ONLY_PROVIDERS.includes(preferred as any) : true;
      if (isPreferredAllowed) {
        providersToTry.push(preferred);
      }
    }
    ```
  - Filtragem estrita de `finalProvidersToTry` expurgando qualquer provedor em `TEXT_ONLY_PROVIDERS` quando `isVisionTask === true`.
- **Linha 1015**:
  Em `executeUnifiedAiCall`, na resolução de chaves do Master Pool:
  ```typescript
  const poolKeys = await getAllActiveKeysForProvider(provider, undefined).catch(() => []);
  ```
  O argumento `ownerId` foi fixado como `undefined`, impedindo a inserção de chaves BYOK não-isoladas ou fora de quarentena na lista do pool da plataforma.
- **Linhas 1065–1075 (OpenRouter)**:
  Seleção de modelo multimodal vinculada a `isVisionTask`:
  ```typescript
  const openRouterModels =
    isVisionTask
      ? ["google/gemini-2.5-flash", "qwen/qwen2.5-vl-72b-instruct:free"]
      : [ ... ];
  ```
- **Linhas 1174–1215 (Groq)**:
  - Trava estrita de visão: `if (isVisionTask) continue;`.
  - Para `isFastJsonTask` ou `isJson`:
    - Injeção preventiva do termo "JSON" no prompt (`finalSystemPrompt`) caso nem system nem user prompt o contenham.
    - `response_format: { type: "json_object" }`.
    - `temperature: isFastJsonTask ? (options.temperature ?? 0.1) : (options.temperature ?? 0.3)`.
- **Linha 1431 (Anthropic)**:
  Seleção de modelo vinculada a `isVisionTask`:
  ```typescript
  const model = options.modelOverride || (isVisionTask ? "claude-3-5-sonnet-20241022" : "claude-3-5-haiku-20241022");
  ```
- **Linhas 907 e 1061**:
  Adicionado campo `modelUsed?: string` a `UnifiedAiResult` e no retorno de `finalizeSuccess` para garantir paridade com consumidores legados (`callOpenRouter`).

### 1.2 Atualização da Suíte de Testes em `src/services/ai-task-aptitude-and-byok-isolation.test.ts`
- **Teste 1**: Comprova que chamada com `taskType: 'vision'` e `preferredProvider: 'groq'` rejeita Groq da preferência e seleciona Gemini.
- **Teste 2**: Comprova que chamada com `taskType: 'fast_json'` prioriza Groq com `response_format: { type: 'json_object' }`, `temperature === 0.1`, e presença garantida da palavra "JSON" nos prompts.
- **Teste 3**: Comprova que chamadas com `isSystemTask: true` nunca invocam `getActiveSecretForProvider` (isolamento total de BYOK).
- **Teste 4**: Comprova failover transparente de chave BYOK com `429` para a chave saudável do Pool Master sem erro retornado ao usuário final.
- **Teste 5**: Comprova triagem jurídica DataJud com `taskType: 'fast_json'` e flags de compliance.
- **Teste 6**: Comprova delegação soberana de `callOpenRouter` para `executeUnifiedAiCall`.
- **Teste 7**: Comprova seleção de modelos multimodais (`gemini-2.5-flash` ou `qwen2.5-vl`) no OpenRouter quando `taskType: 'vision'`.
- **Teste 8**: Comprova seleção de `claude-3-5-sonnet-20241022` no Anthropic quando `taskType: 'ocr'` mesmo sem imagens inline.

### 1.3 Execução e Resultados de Testes
Comando executado:
```powershell
cmd.exe /c npx --node-options="--max-old-space-size=4096" vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts src/services/copilot-keypool-quarantine.test.ts src/services/ai-core-gateway.test.ts
```
Saída verificada:
```
 ✓ src/services/ai-core-gateway.test.ts (7 tests) 304ms
 ✓ src/services/copilot-keypool-quarantine.test.ts (7 tests) 12ms
 ✓ src/services/ai-task-aptitude-and-byok-isolation.test.ts (8 tests) 39ms

 Test Files  3 passed (3)
      Tests  22 passed (22)
   Start at  07:29:57
   Duration  6.51s
```

---

## 2. Logic Chain

1. **Roteamento Multimodal vs Provedores Text-Only**:
   - Modelos LPU no Groq (ex.: `llama-3.3-70b`, `qwen3.8-27b`) não possuem encoders visuais. Requisições contendo tensores visuais ou solicitando OCR invariavelmente falham ou alucinam.
   - Ao avaliar `isVisionTask = Boolean(images.length > 0 || taskType === "vision" || taskType === "ocr" || taskType === "multimodal")`, o orquestrador descarta qualquer provedor contido em `TEXT_ONLY_PROVIDERS` (mesmo que passado em `preferredProvider`) e filtra `providersToTry` exclusivamente para `MULTIMODAL_PROVIDERS`.
2. **Priorização LPU para Extração e JSON Estruturado**:
   - Rotinas de background (classificações de avaliações, triagem jurídica, extrações de cardápios) geram alta volumetria. Provedores com LPU como Groq oferecem sub-200ms de latência e cota ampla.
   - Forçar `response_format: { type: "json_object" }` e temperatura `0.1` elimina deriva sintática e garante compatibilidade com o parser JSON do orquestrador.
   - O endpoint da Groq exige estritamente a presença da palavra "JSON" no prompt ao utilizar `response_format: { type: "json_object" }`; a verificação preventiva assegura que chamadores que não colocaram o termo explicitamente não sofram rejeição HTTP 400.
3. **Isolamento de BYOK e Prevenção de Transbordo Indevido**:
   - Chaves cadastradas por lojistas em `secret_vault` pertencem ao tenant. Rotinas da plataforma (`isSystemTask: true`, `isPlatformBackground: true`) não possuem vínculo financeiro com lojistas e devem consumir exclusivamente o Master Pool.
   - Na linha 1015, passar `undefined` para `getAllActiveKeysForProvider(provider, undefined)` garante que o segundo passo de resolução carregue estritamente chaves de `api_key_pools` (Master Pool), impedindo qualquer injeção de BYOK fora da etapa 1.
4. **Quarentena Silenciosa 429 e Failover Atômico**:
   - A chave BYOK possui ID escopado por tenant (`byok-${provider}-${targetStore || targetOwner || "user"}`).
   - Ao receber status 429, `markKeyError` registra o timestamp de quarentena em `keyCooldownUntilMap`, evitando chamadas subsequentes enquanto a cota estiver esgotada.
   - O loop de execução de `keysToTry` avança imediatamente para a próxima chave (a chave saudável do Master Pool), concluindo a chamada com sucesso e marcando `status: "fallback_recovered"` na telemetria, sem expor nenhum erro ou quebra de experiência ao usuário.

---

## 3. Caveats

- **Ambiente de Memória Local vs Serveless Workers**: A quarentena de chaves BYOK via `keyCooldownUntilMap` opera em memória do processo Node/Worker ativo. Em ambientes serverless multi-instância sem memória compartilhada, cada instância isola sua quarentena local. A persistência em banco já ocorre para as chaves do Master Pool em `public.api_key_pools`.
- **Restrição Operacional R6**: `npm run typecheck` e `npm run build` não foram invocados durante a execução desta milestone em cumprimento estrito à proibição de R6 em `ORIGINAL_REQUEST.md`.

---

## 4. Conclusion

O Milestone 1 (Motor Central de IA & Roteamento Soberano) está plenamente implementado, testado e verificado:
- Tipagem Zod `unifiedAiTaskTypeEnum` e constantes `TEXT_ONLY_PROVIDERS` / `MULTIMODAL_PROVIDERS` exportadas.
- Roteamento inteligente por aptidão de tarefa (`vision`, `fast_json`, `editorial_squad`, `deep_reasoning`, `chat`).
- Seleção automática de modelos multimodais no OpenRouter e Anthropic para tarefas visuais e OCR.
- Blindagem e isolamento rígido entre chaves de lojistas (BYOK) e tarefas de background da plataforma.
- Quarentena local e failover transparente 429 para o Master Pool.
- 100% dos testes unitários passando (22 testes verdes across 3 suites).

---

## 5. Verification Method

Para reproduzir a verificação de forma independente:

```powershell
cmd.exe /c npx --node-options="--max-old-space-size=4096" vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts src/services/copilot-keypool-quarantine.test.ts src/services/ai-core-gateway.test.ts
```

Critério de Sucesso:
- 3 arquivos de teste aprovados.
- 22 testes unitários aprovados (Exit Code 0).
