# Relatório de Handoff — Auditoria e Padronização de 100% dos Módulos Consumidores de IA (R3)

**Autor**: Explorer 3 (Survey Orchestrator 11)  
**Data**: 2026-10-18T09:58:00Z  
**Diretório de Trabalho**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_orchestrator11_3`  
**Escopo**: Requisito R3 — Auditoria forense dos 7 módulos consumidores de IA e varredura do repositório em busca de chamadas diretas (rogue AI fetch).

---

## 1. Observation (Observações Diretas com Evidências de Código)

### Módulo 1: `src/services/ai-conversations.functions.ts` (Copilot Loja & Civil)
- **Localização 1**: Linhas 12 e 980–1022.
  - O pipeline principal do Copilot invoca `executeAiCoreGateway(gatewayRequest)` onde:
    ```typescript
    980: const gatewayRequest = {
    981:   task: "chat" as const,
    982:   prompt: sandboxedUserPrompt,
    983:   systemPrompt: hardenedSystemPrompt,
    ...
    1001: const runGateway = () => executeAiCoreGateway(gatewayRequest);
    ```
- **Localização 2**: Linhas 2215–2256 (Estágio 4 — Síntese Analítica `@synthesizer`):
  - Invoca dinamicamente `executeUnifiedAiCall`:
    ```typescript
    2215: const { executeUnifiedAiCall } = await import("./api-orchestrator.functions");
    ...
    2240: const aiSynth = await executeUnifiedAiCall({
    2241:   feature: `copilot_stage4_synthesis_${intent}`,
    2242:   taskType: resolvedAttachments.images.length > 0 ? "vision" : undefined,
    2243:   images: resolvedAttachments.images.length > 0 ? resolvedAttachments.images : undefined,
    2244:   temperature: 0.35,
    2245:   maxTokens: 900,
    2246:   storeId: context.storeId || undefined,
    2247:   ownerId: context.userId || undefined,
    ...
    ```
  - **Defeito**: Na linha 2242, se `resolvedAttachments.images` estiver vazio, `taskType` fica `undefined` em vez de declarar explicitamente `"chat"`. No estágio 1 (linha 1001), opera via gateway legado em vez de estar padronizado no motor unificado soberano com fallback de pool.

---

### Módulo 2: `src/services/mining/editorial-squad.ts` (Curadoria Editorial de Notícias)
- **Localização**: Linhas 16 e 198–215.
  ```typescript
  16: import { getNextActiveKey, executeUnifiedAiCall } from "../api-orchestrator.functions";
  ...
  199: try {
  200:   const aiResult = await executeUnifiedAiCall({
  201:     systemPrompt: SQUAD_SYSTEM_PROMPT,
  202:     userPrompt,
  203:     taskType: "editorial_squad",
  204:     feature: "mining_editorial_squad",
  205:     isSystemTask: true,
  206:     responseFormat: "json_object",
  207:     expectJson: true,
  208:     temperature: 0.25,
  209:   });
  ```
- **Avaliação**: O módulo já consome `executeUnifiedAiCall` com `taskType: "editorial_squad"`, `isSystemTask: true` e `expectJson: true`.
- **Contexto**: Plataforma em segundo plano (`isSystemTask: true`), nunca utiliza chaves BYOK de lojistas, com fallback determinístico de alta fidelidade em `generateDeterministicCuratedFallback` (linha 220).

---

### Módulo 3: `src/services/travel-ai-extractor.functions.ts` (Extrator OCR de Viagens)
- **Localização**: Linhas 70–160.
  - Autenticação na linha 73: `const identity = await requireStaff();`.
  - Extração de Imagem / OCR (linhas 123–133):
    ```typescript
    123: const aiRes = await executeUnifiedAiCall({
    124:   systemPrompt,
    125:   userPrompt: `Analise cuidadosamente esta imagem/print de viagem e extraia os dados com fidelidade absoluta...`,
    126:   images: [{ mimeType: data.fileMime, base64: data.fileBase64 }],
    127:   taskType: "vision",
    128:   feature: "travel_ocr_extractor",
    129:   preferredProvider: "gemini",
    130:   responseFormat: "json_object",
    131:   expectJson: true,
    132:   temperature: 0.1,
    133: });
    ```
  - Extração de Texto bruto (linhas 143–152):
    ```typescript
    143: const aiRes = await executeUnifiedAiCall({
    144:   systemPrompt,
    145:   userPrompt: `Analise o seguinte texto de promoção turística:\n\n${data.rawText}`,
    146:   taskType: "fast_json",
    147:   feature: "travel_text_extractor",
    148:   preferredProvider: "groq",
    149:   responseFormat: "json_object",
    150:   expectJson: true,
    151:   temperature: 0.1,
    152: });
    ```
- **Defeitos**:
  1. Omitiu `storeId: identity.store_id || undefined` e `ownerId: identity.id` em ambas as chamadas (linhas 123 e 143), impedindo o roteador de vincular à chave BYOK do lojista no cofre seguro.
  2. A tarefa de imagem deve declarar `taskType: "ocr"` (compatível com a matriz R1 de aptidão multimodal).

---

### Módulo 4: `src/services/travel-reviews.functions.ts` (Classificador de Avaliações)
- **Localização**: Linhas 73–93 em `submitAndClassifyHotelReview`.
  ```typescript
  73: const aiRes = await executeUnifiedAiCall({
  74:   systemPrompt: `Você é um Classificador de Avaliações Turísticas Tripartite...`,
  75:   userPrompt: `Comentário: "${data.comment}"`,
  76:   taskType: "fast_json",
  77:   feature: "travel_reviews_classification",
  78:   responseFormat: "json_object",
  79:   expectJson: true,
  80:   temperature: 0.1,
  81: });
  ```
- **Defeito**: Avaliação tripartite é submetida por usuários civis para o catálogo público de hotéis (`global_hotels`), sem vínculo com uma loja específica. Não declara explicitamente `isSystemTask: true` nem `ownerId: identity?.id`. Se um lojista logado avaliar um hotel, arrisca consumir indevidamente BYOK da sua loja. Deve declarar `isSystemTask: true`.

---

### Módulo 5: `src/services/ai-builder-composition.functions.ts` (Omni Builder)
- **Localização**: Linhas 832–860 em `generateAiBuilderArtifact`.
  ```typescript
  853: const { document, rubric } = composeAiArtifactDocument({
  854:   briefing: input.briefing,
  855:   storeName: input.storeName,
  856:   niche: input.niche,
  857:   archetype: input.archetype,
  858:   targetAudience: input.targetAudience,
  859: });
  ```
- **Defeito Crítico**: O arquivo chama `composeAiArtifactDocument`, que é uma função puramente estática/determinística (linhas 390–627) com textos hardcoded de placeholder. **O Omni Builder atualmente NÃO invoca nenhum modelo de IA**, ignorando completamente o briefing fornecido pelo usuário.
- **Necessidade**: Inserir chamada a `executeUnifiedAiCall` com `taskType: "deep_reasoning"` ou `"fast_json"`, `storeId: identity.store_id` e `ownerId: identity.id`, usando o gerador determinístico como fallback seguro em caso de indisponibilidade de pool.

---

### Módulo 6: `src/services/ads.functions.ts` (Criador de Campanhas)
- **Localização 1**: Linhas 1788–1798 em `generateAiAdCreativeFromCatalog`:
  ```typescript
  1788: const { executeUnifiedAiCall } = await import("./api-orchestrator.functions");
  1791: const aiResult = await executeUnifiedAiCall({
  1792:   feature: "marketing_ad_copy",
  1793:   taskType: "fast_json",
  1794:   responseFormat: "json_object",
  1795:   expectJson: true,
  1796:   prompt,
  1797:   storeId: identity.store_id || undefined,
  1798: });
  ```
- **Localização 2**: Linhas 2662–2675 em `diagnoseConnectedAdAccounts`:
  ```typescript
  2662: const { executeUnifiedAiCall } = await import("./api-orchestrator.functions");
  2663: const aiRes = await executeUnifiedAiCall({
  2664:   feature: "ads_mcp_account_diagnostics",
  2665:   taskType: "deep_reasoning",
  2666:   storeId,
  2667:   systemPrompt: "Você é o Especialista Sênior de Tráfego Pago...",
  2668:   userPrompt: JSON.stringify({ ... }),
  2669: });
  ```
- **Defeitos**:
  - Ambas as chamadas passam `storeId`, mas omitem `ownerId: identity.id`, impedindo o roteamento correto no `secret_vault` quando o lojista cadastra chave sob seu perfil pessoal de operador.
  - Na chamada 1, manipula o resultado convertendo para string e fazendo regex manual (`parseAiAdCreative(rawText)`) em vez de utilizar diretamente `aiResult.parsedJson`.

---

### Módulo 7: `src/services/mining/datajud-harvester.ts` (Triagem Jurídica)
- **Localização**: Linhas 9–11 e 171–250.
  - O crawler consome a API REST pública do Elasticsearch do DataJud diretamente via `fetch` na linha 208, utilizando a chave `cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==` e rotacionando com `getNextActiveKey("datajud" as any)`.
- **Defeito**: O harvester apenas indexa dados crus em `mined_lawsuits` e `lawsuit_movements`. Falta a função canônica de **Triagem Jurídica e Risco Processual** (`triageDataJudLawsuit`) para classificar a urgência, risco e gerar os `compliance_flags` (`has_arrest_warrants`, `has_criminal_executions`, `has_sanctions_restrictions`) consumidos por `workspace.advocacia.index.tsx` e `jus.functions.ts`.
- **Necessidade**: Declarar função de triagem jurídica consumindo `executeUnifiedAiCall` com `taskType: "fast_json"`, `isSystemTask: true` (background da plataforma), sem consumir chaves de lojistas.

---

### Módulo 8: Varredura de Chamadas Rogue Direct AI Invocations
1. **`src/lib/ai/openrouter.ts` (Linha 119)**:
   - Contém `fetch("https://openrouter.ai/api/v1/chat/completions", ...)` dentro de `callOpenRouter`.
   - **Status**: Função legada órfã (nenhum outro arquivo do repositório a consome). Deve ser marcada como `@deprecated` e redirecionada para `executeUnifiedAiCall`.
2. **`src/services/jobs.functions.ts` (Linha 1016)**:
   - Na função `extractJobWithAI`, invoca `executeUnifiedAiCall({ systemInstruction, prompt, temperature: 0.1, expectJson: true })` sem passar `taskType: "fast_json"` nem `isSystemTask: true`.
3. **`src/services/ai-core-gateway.functions.ts` (Linhas 317, 387, 444, 468, 506, 1189–1197)**:
   - Contém implementações low-level de `fetch` para Groq, Gemini, Anthropic e OpenAI dentro de `callProviderLowLevel` e `executeAiCoreGatewayStream`.
   - **Status**: O gateway implementa Prompt Shield e cache, mas duplica chamadas HTTP em vez de unificar o dispatch de baixo nível no `api-orchestrator.functions.ts`.

---

## 2. Logic Chain (Cadeia de Raciocínio & Relação de Causa e Efeito)

1. **Aptidão de Modelo (`taskType`)**:
   - *Premissa*: Modelos possuem especializações distintas. O Groq oferece latência sub-200ms com suporte nativo a `response_format: { type: "json_object" }`, ideal para extração rápida e JSON, mas não possui visão computacional. Provedores multimodais (Gemini 2.5 Flash, Claude 3.5 Sonnet, GPT-4o) são indispensáveis para OCR e imagens.
   - *Fato*: No Módulo 3 (`travel-ai-extractor.functions.ts`), a extração de prints/folders precisa de `taskType: "ocr"` para garantir que o orquestrador elimine chaves text-only (Groq) e direcione para Gemini/Claude.
   - *Fato*: No Módulo 2 (`editorial-squad.ts`), Módulo 4 (`travel-reviews.functions.ts`) e Módulo 7 (`datajud-harvester.ts`), respostas rápidas e estruturadas devem usar `taskType: "fast_json"` ou `"editorial_squad"`, garantindo economia de custos e tempo de resposta instantâneo.

2. **Isolamento Soberano (Lojista BYOK vs Background da Plataforma)**:
   - *Premissa*: Chaves BYOK configuradas por empresas parceiras no `secret_vault` pertencem ao lojista e devem ser gastas apenas com demandas dele (`store_id`).
   - *Fato*: Crawlers de notícias (`editorial-squad.ts`), rotinas judiciais (`datajud-harvester.ts`) e classificadores universais (`travel-reviews.functions.ts`) operam para a plataforma como um todo. A falta do parâmetro `isSystemTask: true` acarreta risco de vazamento de consumo de cotas de lojistas.
   - *Fato*: Módulos de loja como Copilot de Loja (`ai-conversations.functions.ts`), Criador de Anúncios (`ads.functions.ts`), Extrator de Viagens de Agência (`travel-ai-extractor.functions.ts`) e Omni Builder (`ai-builder-composition.functions.ts`) operam com identidade autenticada (`identity.store_id`, `identity.id`), devendo passar ambos os identificadores para que a chave BYOK seja utilizada prioritariamente e, em caso de 429, faça failover silencioso para o Pool Master.

---

## 3. Matriz Comparativa: Atual vs Proposto

| Módulo | Arquivo | Chamada Atual | taskType Atual | taskType Proposto | Contexto Atual | Contexto Proposto |
|---|---|---|---|---|---|---|
| **1. Copilot (Loja & Civil)** | `src/services/ai-conversations.functions.ts` | `executeAiCoreGateway` (L1001) / `executeUnifiedAiCall` (L2240) | `chat` / `undefined` (quando sem img) | `chat` (L1001) / `vision` ou `chat` (L2242) | Parcial (`storeId`, `userId`) | Completo (`storeId`, `ownerId`) |
| **2. Editorial Squad** | `src/services/mining/editorial-squad.ts` | `executeUnifiedAiCall` (L200) | `editorial_squad` | `editorial_squad` | `isSystemTask: true` | `isSystemTask: true` (Conforme) |
| **3. Travel OCR** | `src/services/travel-ai-extractor.functions.ts` | `executeUnifiedAiCall` (L123, L143) | `vision` / `fast_json` | `ocr` / `fast_json` | Sem `storeId`/`ownerId` | `storeId: identity.store_id`, `ownerId: identity.id` |
| **4. Travel Reviews** | `src/services/travel-reviews.functions.ts` | `executeUnifiedAiCall` (L73) | `fast_json` | `fast_json` | Sem flag de sistema | `isSystemTask: true`, `ownerId: identity?.id` |
| **5. Omni Builder** | `src/services/ai-builder-composition.functions.ts` | **NENHUMA** (Templates estáticos L853) | N/A | `deep_reasoning` | Sem chamada de IA | `storeId: identity.store_id`, `ownerId: identity.id` |
| **6. Criador de Ads** | `src/services/ads.functions.ts` | `executeUnifiedAiCall` (L1791, L2663) | `fast_json` / `deep_reasoning` | `fast_json` / `deep_reasoning` | `storeId` apenas | `storeId: identity.store_id`, `ownerId: identity.id` |
| **7. Triagem DataJud** | `src/services/mining/datajud-harvester.ts` | `fetch` direto DataJud (L208) | N/A | `fast_json` | Background sem triagem | `isSystemTask: true` com `triageDataJudLawsuit` |
| **Extra: Jobs Extractor** | `src/services/jobs.functions.ts` | `executeUnifiedAiCall` (L1016) | Ausente | `fast_json` | Ausente | `isSystemTask: true` |
| **Extra: Rogue OpenRouter** | `src/lib/ai/openrouter.ts` | `fetch` direto (L119) | N/A | Deprecado | N/A | Redirecionar para `executeUnifiedAiCall` |

---

## 4. Plano de Refatoração Detalhado (Código Antes vs Depois)

### 4.1. `src/services/ai-conversations.functions.ts` (Linha 2240)
**Antes**:
```typescript
const aiSynth = await executeUnifiedAiCall({
  feature: `copilot_stage4_synthesis_${intent}`,
  taskType: resolvedAttachments.images.length > 0 ? "vision" : undefined,
  images: resolvedAttachments.images.length > 0 ? resolvedAttachments.images : undefined,
  temperature: 0.35,
  maxTokens: 900,
  storeId: context.storeId || undefined,
  ownerId: context.userId || undefined,
  ...
});
```
**Depois**:
```typescript
const aiSynth = await executeUnifiedAiCall({
  feature: `copilot_stage4_synthesis_${intent}`,
  taskType: resolvedAttachments.images.length > 0 ? "vision" : "chat",
  images: resolvedAttachments.images.length > 0 ? resolvedAttachments.images : undefined,
  temperature: 0.35,
  maxTokens: 900,
  storeId: context.storeId || undefined,
  ownerId: context.userId || undefined,
  ...
});
```

---

### 4.2. `src/services/travel-ai-extractor.functions.ts` (Linhas 123–152)
**Antes**:
```typescript
const aiRes = await executeUnifiedAiCall({
  systemPrompt,
  userPrompt: `...`,
  images: [{ mimeType: data.fileMime, base64: data.fileBase64 }],
  taskType: "vision",
  feature: "travel_ocr_extractor",
  preferredProvider: "gemini",
  responseFormat: "json_object",
  expectJson: true,
  temperature: 0.1,
});
```
**Depois**:
```typescript
const aiRes = await executeUnifiedAiCall({
  systemPrompt,
  userPrompt: `...`,
  images: [{ mimeType: data.fileMime, base64: data.fileBase64 }],
  taskType: "ocr",
  feature: "travel_ocr_extractor",
  storeId: identity.store_id || undefined,
  ownerId: identity.id || undefined,
  preferredProvider: "gemini",
  responseFormat: "json_object",
  expectJson: true,
  temperature: 0.1,
});
```

---

### 4.3. `src/services/travel-reviews.functions.ts` (Linha 73)
**Antes**:
```typescript
const aiRes = await executeUnifiedAiCall({
  systemPrompt: `...`,
  userPrompt: `Comentário: "${data.comment}"`,
  taskType: "fast_json",
  feature: "travel_reviews_classification",
  responseFormat: "json_object",
  expectJson: true,
  temperature: 0.1,
});
```
**Depois**:
```typescript
const aiRes = await executeUnifiedAiCall({
  systemPrompt: `...`,
  userPrompt: `Comentário: "${data.comment}"`,
  taskType: "fast_json",
  feature: "travel_reviews_classification",
  isSystemTask: true,
  ownerId: identity?.id || undefined,
  responseFormat: "json_object",
  expectJson: true,
  temperature: 0.1,
});
```

---

### 4.4. `src/services/ai-builder-composition.functions.ts` (Linha 852)
**Antes**:
```typescript
// 1. Gera o documento estruturado e calcula a rubrica
const { document, rubric } = composeAiArtifactDocument({
  briefing: input.briefing,
  storeName: input.storeName,
  niche: input.niche,
  archetype: input.archetype,
  targetAudience: input.targetAudience,
});
```
**Depois**:
```typescript
// 1. Gera o documento via IA através do briefing do lojista com fallback determinístico
const { executeUnifiedAiCall } = await import("./api-orchestrator.functions");
let document: OmniPageDocument;
let rubric: QualityRubricDimension;

try {
  const aiRes = await executeUnifiedAiCall({
    feature: "ai_builder_composition",
    taskType: "deep_reasoning",
    storeId: identity.store_id || undefined,
    ownerId: identity.id || undefined,
    responseFormat: "json_object",
    expectJson: true,
    temperature: 0.3,
    systemPrompt: `Você é o Arquiteto Master de Composição do Waesy Omni-Builder...`,
    userPrompt: `Briefing: "${input.briefing}"\nEmpresa: "${input.storeName}"\nNicho: "${input.niche}"\nArquétipo: "${input.archetype}"\nPúblico: "${input.targetAudience || 'Geral'}"`,
  });

  if (aiRes?.parsedJson?.blocks && Array.isArray(aiRes.parsedJson.blocks)) {
    const rawDoc = composeAiArtifactDocument(input);
    document = {
      ...rawDoc.document,
      title: aiRes.parsedJson.title || rawDoc.document.title,
      description: aiRes.parsedJson.description || rawDoc.document.description,
      blocks: aiRes.parsedJson.blocks,
    };
    rubric = evaluateArtifactQuality(document, input.archetype, input.niche);
  } else {
    throw new Error("Resposta de blocos inválida");
  }
} catch (aiErr) {
  console.warn("[ai-builder-composition] Fallback para blueprint determinístico:", aiErr);
  const fallback = composeAiArtifactDocument(input);
  document = fallback.document;
  rubric = fallback.rubric;
}
```

---

### 4.5. `src/services/ads.functions.ts` (Linhas 1791–1798 e 2663–2669)
**Antes**:
```typescript
const aiResult = await executeUnifiedAiCall({
  feature: "marketing_ad_copy",
  taskType: "fast_json",
  responseFormat: "json_object",
  expectJson: true,
  prompt,
  storeId: identity.store_id || undefined,
});
```
**Depois**:
```typescript
const aiResult = await executeUnifiedAiCall({
  feature: "marketing_ad_copy",
  taskType: "fast_json",
  responseFormat: "json_object",
  expectJson: true,
  prompt,
  storeId: identity.store_id || undefined,
  ownerId: identity.id || undefined,
});
```

---

### 4.6. `src/services/mining/datajud-harvester.ts` (Nova Função de Triagem Jurídica)
**Implementação Canônica a Adicionar**:
```typescript
export async function triageDataJudLawsuit(mined: MinedLawsuitData): Promise<{
  summary: string;
  riskLevel: "baixo" | "medio" | "alto";
  complianceFlags: {
    has_arrest_warrants: boolean;
    has_criminal_executions: boolean;
    has_sanctions_restrictions: boolean;
  };
  recommendedAction: string;
}> {
  const { executeUnifiedAiCall } = await import("../api-orchestrator.functions");
  try {
    const aiRes = await executeUnifiedAiCall({
      feature: "datajud_lawsuit_triage",
      taskType: "fast_json",
      isSystemTask: true,
      responseFormat: "json_object",
      expectJson: true,
      temperature: 0.1,
      systemPrompt: "Você é o Analista Jurídico de Compliance do Waesy JUS. Analise o processo judicial e retorne rigorosamente um JSON com: summary (resumo em até 3 frases), riskLevel ('baixo'|'medio'|'alto'), complianceFlags ({ has_arrest_warrants: boolean, has_criminal_executions: boolean, has_sanctions_restrictions: boolean }) e recommendedAction.",
      userPrompt: JSON.stringify({
        processNumber: mined.processNumber,
        courtName: mined.courtName,
        className: mined.className,
        subjectName: mined.subjectName,
        status: mined.status,
        parties: mined.parties,
        lastMovements: mined.movements.slice(0, 5),
      }),
    });
    if (aiRes?.parsedJson) {
      return aiRes.parsedJson;
    }
  } catch (err) {
    console.warn("[datajud-harvester] Falha na triagem IA, aplicando flags heurísticas:", err);
  }

  // Fallback determinístico baseado na classe e texto dos andamentos
  const fullText = `${mined.className} ${mined.subjectName} ${mined.lastMovementText}`.toLowerCase();
  return {
    summary: `Processo ${mined.processNumber} em trâmite no ${mined.courtName}. Último andamento: ${mined.lastMovementText}`,
    riskLevel: fullText.includes("penhora") || fullText.includes("execução") ? "alto" : "medio",
    complianceFlags: {
      has_arrest_warrants: fullText.includes("prisão") || fullText.includes("mandado"),
      has_criminal_executions: fullText.includes("execução penal"),
      has_sanctions_restrictions: fullText.includes("indisponibilidade") || fullText.includes("bloqueio"),
    },
    recommendedAction: "Acompanhar prazos e andamentos na comarca de origem.",
  };
}
```

---

## 5. Caveats (Ressalvas e Limitações da Investigação)

1. **Investigação Read-Only**: Nenhuma linha de código fonte foi alterada nesta etapa em cumprimento estrito ao papel de Explorer.
2. **Secret Vault Key Connection Testing**: As chamadas diretas de `fetch` presentes em `src/services/secret-vault.functions.ts` e `src/services/ai-providers.functions.ts` não são chamadas de consumo de inferência por agentes ou usuários; são testes pontuais de credencial administrativa (ping de validação nos endpoints `/models` ou `/auth/key`). Não devem ser alteradas para `executeUnifiedAiCall` pois testam chaves brutas recém-digitadas antes de persistência.
3. **Stream SSE no Gateway**: O endpoint `executeAiCoreGatewayStream` em `ai-core-gateway.functions.ts` provê streaming Server-Sent Events (SSE) para a rota `/api/ai/stream`. Uma futura unificação completa de streaming dependerá da exposição de gerador assíncrono em `executeUnifiedAiCall`.

---

## 6. Conclusion (Conclusão Operacional)

A arquitetura de IA do Waesy possui uma base sólida em `executeUnifiedAiCall` (`src/services/api-orchestrator.functions.ts`), com suporte a quarentena em memória, balanceamento multi-key e failover em cascata. Contudo, 5 dos 7 módulos consumidores apresentavam assimetrias:
- Parâmetros de contexto incompletos (`storeId` ou `ownerId` ausentes em chamadas de loja).
- Falta de identificação de tarefas de background da plataforma (`isSystemTask: true`), arriscando consumo indevido de BYOK.
- Ausência de invocação de IA no Omni-Builder (`ai-builder-composition.functions.ts`), que operava exclusivamente com templates estáticos.
- Falta da função de triagem analítica em `datajud-harvester.ts`.
- Módulo órfão rogue (`src/lib/ai/openrouter.ts`) com `fetch` direto.

A implementação do plano acima garantirá paridade canônica de 100% dos módulos com zero vazamentos e máxima economia de quotas.

---

## 7. Verification Method (Método de Verificação Independente)

1. **Testes Unitários Automatizados de Aptidão e Roteamento**:
   Executar a suíte de testes de aptidão e isolamento BYOK:
   ```bash
   npx vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts
   ```
   Critério de sucesso: 4/4 testes passando (vision ignora Groq, fast_json prioriza Groq, isSystemTask não chama secretVault, e 429 faz failover silencioso).

2. **Varredura Estática de Conformidade de Chamadas de IA**:
   Verificar ausência de chamadas diretas `fetch` para provedores fora dos gateways canônicos:
   ```bash
   git grep -n "fetch(\"https://openrouter.ai" src/
   git grep -n "fetch(\"https://api.openai.com" src/
   git grep -n "fetch(\"https://api.groq.com" src/
   ```

3. **Validação de Tipagem e Sintaxe**:
   ```bash
   npx vitest run src/services/vertical-ai-modules.test.ts
   ```

4. **Condição de Invalidação**:
   Se qualquer tarefa de background (`mining_*`, `editorial_squad`, `datajud_*`) invocar `getActiveSecretForProvider` com chave de lojista, o gate é invalidado.
