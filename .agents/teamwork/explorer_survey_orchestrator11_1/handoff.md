# Handoff Report: Investigação do Requisito R1 (Matriz de Especialização e Aptidão por Tipo de Tarefa no Orquestrador)

**Agente**: Explorer 1 (`explorer_survey_orchestrator11_1`)  
**Data**: 2026-10-18T09:40:00Z  
**Escopo**: `src/services/api-orchestrator.functions.ts`, `src/services/ai-core-gateway.functions.ts`, gateway modules e suíte de testes.

---

## 1. Observation (Observações Verificadas em Código)

### 1.1 Assinatura e Implementação Atual de `executeUnifiedAiCall`
No arquivo `src/services/api-orchestrator.functions.ts`, linhas 859–889 e 896–1483:

- **Interface de Entrada** (`UnifiedAiCallOptions`, linhas 859–881):
  ```typescript
  export interface UnifiedAiCallOptions {
    systemPrompt?: string;
    systemInstruction?: string;
    userPrompt?: string;
    prompt?: string;
    feature?: string;
    taskType?: "vision" | "ocr" | "multimodal" | "fast_json" | "scraping" | "editorial_squad" | "deep_reasoning" | "chat" | string;
    isSystemTask?: boolean;
    fileBase64?: string;
    fileMime?: string;
    responseFormat?: "json_object" | "text";
    expectJson?: boolean;
    jsonMode?: boolean;
    temperature?: number;
    maxTokens?: number;
    preferredProvider?: ApiProvider;
    preferProvider?: ApiProvider;
    modelOverride?: string;
    images?: Array<{ mimeType: string; base64: string }>;
    overrideApiKey?: string;
    ownerId?: string;
    storeId?: string;
  }
  ```
- **Interface de Saída** (`UnifiedAiResult`, linhas 883–889):
  ```typescript
  export interface UnifiedAiResult {
    content: string;
    text: string;
    provider: ApiProvider;
    model: string;
    parsedJson?: any;
  }
  ```

### 1.2 Provedores Subjacentes Implementados em `executeUnifiedAiCall`
1. **OpenRouter** (linhas 1037–1145):
   - Endpoint: `https://openrouter.ai/api/v1/chat/completions` (Bearer Token).
   - Modelos quando `images.length > 0` (linha 1040): `["google/gemini-2.5-flash", "qwen/qwen2.5-vl-72b-instruct:free"]`.
   - Modelos text-only (linhas 1042–1047): `["meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen3-235b-a22b:free", "deepseek/deepseek-chat-v3-0324:free", "meta-llama/llama-3.3-70b-instruct", "google/gemini-2.5-flash"]`.
   - Remoção de tags de raciocínio `<think>...</think>` (linha 1125).
2. **Groq** (linhas 1147–1241):
   - Verificação text-only em linha 1148: `if (images.length > 0) continue;`.
   - Endpoint: `https://api.groq.com/openai/v1/chat/completions`.
   - Modelos (linha 1154): `groqModels = ["qwen/qwen3.8-27b", "llama-3.3-70b-versatile", "openai/gpt-oss-120b"]`.
   - Suporte estrito a JSON (linhas 1186–1188): `if (isJson) bodyPayload.response_format = { type: "json_object" };`.
   - Latência real em LPU: sub-200ms para TTFT.
3. **Google Gemini** (linhas 1243–1317):
   - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyInfo.rawKey}`.
   - Modelo padrão: `"gemini-2.5-flash"`.
   - Suporte multimodal nativo: envia `inlineData` com `mimeType` e `base64` em `parts` (linhas 1255–1262).
   - Suporte a JSON estruturado: `payload.generationConfig.responseMimeType = "application/json"` (linha 1279).
4. **OpenAI** (linhas 1319–1387):
   - Endpoint: `https://api.openai.com/v1/chat/completions`.
   - Modelo padrão: `options.modelOverride || "gpt-4o-mini"`.
   - Suporte multimodal: envia `image_url: { url: "data:...;base64,..." }` (linhas 1327–1334).
   - Suporte a JSON: `bodyPayload.response_format = { type: "json_object" }` (linha 1346).
5. **Anthropic** (linhas 1389–1459):
   - Endpoint: `https://api.anthropic.com/v1/messages`.
   - Modelo: `options.modelOverride || (images.length > 0 ? "claude-3-5-sonnet-20241022" : "claude-3-5-haiku-20241022")`.
   - Suporte multimodal: envia `type: "image", source: { type: "base64", media_type, data }` (linhas 1395–1403).

### 1.3 Mecanismo Atual de Seleção de Provedor e Modelo (Linhas 913–962)
```typescript
const providersToTry: ApiProvider[] = [];
if (preferred) {
  providersToTry.push(preferred);
}

const isVisionTask =
  images.length > 0 ||
  options.taskType === "vision" ||
  options.taskType === "ocr" ||
  options.taskType === "multimodal";

const isFastJsonTask =
  options.taskType === "fast_json" ||
  options.taskType === "scraping" ||
  (isJson && !isVisionTask);

const isEditorialSquadTask =
  options.taskType === "editorial_squad" ||
  Boolean(options.feature?.includes("editorial")) ||
  Boolean(options.feature?.includes("curation"));

const isDeepReasoningTask =
  options.taskType === "deep_reasoning" ||
  options.taskType === "code" ||
  Boolean(options.feature?.includes("planning")) ||
  Boolean(options.feature?.includes("contract_analysis"));

let defaultCascade: ApiProvider[];
if (isVisionTask) {
  defaultCascade = ["gemini", "openai", "openrouter", "anthropic"];
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

### 1.4 Vulnerabilidades e Defeitos Observados no Código
1. **Bypass de Filtragem Multimodal por `preferredProvider` (Linha 914)**:
   Se o chamador passar `preferredProvider: "groq"` com `taskType: "vision"` ou `taskType: "ocr"`, `"groq"` é inserido antes da cascata multimodal. Se `images.length === 0` (ex: instrução de OCR de URL/texto ou preparação de prompt de visão), o Groq é invocado, falhando ou gerando alucinação em tarefa visual. Se `images.length > 0`, ele roda o loop até a linha 1148, desperdiçando iterações.
2. **Defeito de Seleção de Modelo no OpenRouter (Linha 1039)**:
   A verificação é `images.length > 0`. Se o chamador especificar `taskType: "vision"` ou `"ocr"`, mas não houver imagens diretamente em `images` (ou imagem for passada via `fileBase64` que falhou na conversão), o OpenRouter seleciona modelos de texto (`meta-llama/llama-3.3-70b-instruct`) em vez de visão (`google/gemini-2.5-flash` ou `qwen2.5-vl`).
3. **Defeito de Seleção de Modelo no Anthropic (Linha 1390)**:
   Utiliza `images.length > 0 ? "claude-3-5-sonnet-20241022" : "claude-3-5-haiku-20241022"`. Se `taskType: "ocr"` ou `"vision"`, o modelo de visão superior `sonnet` só é ativado se houver imagem inline; se `images.length === 0`, cai em `haiku`.
4. **Tipagem Flexível Sem Validação em Tempo de Execução (Linha 865)**:
   `taskType?: ... | string;` permite que chamadores passem strings arbitrárias como `"editorial"` (visto em `job-opportunity-extractor.ts:581`) em vez do canônico `"editorial_squad"`, caindo na cascata genérica padrão.

### 1.5 Estado dos Testes Unitários Existentes
Execução via Vitest (`cmd.exe /c npx vitest run ...`):
- `src/services/ai-task-aptitude-and-byok-isolation.test.ts`:
  - Teste 1 (`taskType: 'vision' ignora Groq`): **PASSOU** (18ms).
  - Teste 2 (`taskType: 'fast_json' prioriza Groq`): **PASSOU** (4ms).
  - Teste 3 (`isSystemTask: true nunca consome BYOK`): **PASSOU** (3ms).
  - Teste 4 (`BYOK 429 failover transparente`): **FALHOU** (18ms).
    *Causa da Falha*: O mock `vi.spyOn(secretVault, "getActiveSecretForProvider").mockResolvedValue("byok-expiring-key")` faz com que `getAllActiveKeysForProvider` (que também consulta `secretVault`) retorne apenas a chave expirada para todos os provedores. Como o banco Supabase e o `process.env` não estavam mockados com chaves no teste 4, não havia nenhuma chave do Pool Master disponível para absorver o failover, gerando erro `"Nenhum provedor de IA ativo pôde processar..."`.
- `src/services/copilot-keypool-quarantine.test.ts`:
  - 7 testes de classificação de quarentena (RPM 60s, RPD dia seguinte, 402 mensal, 401/403 permanente): **7/7 PASSARAM** (5ms).
- `src/services/ai-core-gateway.test.ts`:
  - 11 testes passaram, porém loga avisos de runtime porque o mock de `./api-orchestrator.functions` não exporta `getAllActiveKeysForProvider`.

---

## 2. Logic Chain (Cadeia de Raciocínio & Dedução Técnica)

1. **Roteamento Multimodal Estrito**:
   - *Fato*: Provedores text-only (como Groq no cluster atual da Waesy) não possuem suporte à ingestão de tensores visuais ou tokens de imagem. Qualquer requisição para eles resulta em erro 400 ou resposta alucinatória.
   - *Dedução*: É imperativo que `executeUnifiedAiCall` declare uma lista de provedores text-only `TEXT_ONLY_PROVIDERS = ["groq"]`. Se `isVisionTask` for verdadeiro (`images.length > 0 || taskType === "vision" || taskType === "ocr" || taskType === "multimodal"`):
     a) `preferredProvider` deve ser sumariamente ignorado se for `"groq"`.
     b) A lista `providersToTry` deve ser filtrada com `providersToTry.filter(p => !TEXT_ONLY_PROVIDERS.includes(p))`.
     c) A cascata canônica deve ser `["gemini", "anthropic", "openai", "openrouter"]`.
     d) No bloco do OpenRouter e Anthropic, a seleção de modelo deve verificar `isVisionTask` e não apenas `images.length > 0`.
2. **Priorização de `fast_json` e `scraping` para Economia de Quotas**:
   - *Fato*: Tarefas de background (crawlers de notícias, scrapers de páginas, classificação de reviews, estruturação de cardápios) geram centenas de chamadas por hora. Provedores pesados (Gemini, Claude 3.5, OpenAI) possuem limites estritos de RPM/RPD e custo financeiro mais elevado por 1M tokens.
   - *Dedução*: Groq (`qwen/qwen3.8-27b` e `llama-3.3-70b-versatile`) processa em LPU com latência sub-200ms e suporta nativamente `response_format: { type: "json_object" }`.
   - *Ação*: Para `taskType === "fast_json"` ou `taskType === "scraping"`, a ordem prioritária DEVE ser `["groq", "openai", "openrouter", "gemini", "anthropic"]`. O payload para o Groq deve forçar `response_format: { type: "json_object" }`, temperatura `0.1` (elimina variabilidade sintática) e garantir a presença do termo "JSON" no `systemPrompt`/`userPrompt` para conformidade estrita com o contrato do endpoint da Groq.
3. **Formalização de Tipos com Zod e Normalização Semântica**:
   - *Fato*: Hoje múltiplos arquivos usam aliases (`"editorial"` em `job-opportunity-extractor.ts`, `"structured_template_generation"` em `studio-template-generation.functions.ts`).
   - *Dedução*: Deve-se exportar `unifiedAiTaskTypeEnum` em `api-orchestrator.functions.ts` com os 7 valores canônicos:
     `'vision' | 'ocr' | 'fast_json' | 'scraping' | 'editorial_squad' | 'deep_reasoning' | 'chat'`.
     Para evitar quebras em chamadores legados, uma função pura `normalizeTaskType(raw?: string): UnifiedAiTaskType` deve mapear sinônimos (`ocr` -> `ocr`, `editorial` -> `editorial_squad`, `code` -> `deep_reasoning`).
4. **Resolução da Falha no Teste 4**:
   - *Fato*: O Teste 4 de `ai-task-aptitude-and-byok-isolation.test.ts` falha porque simula o 429 da chave BYOK mas não provê uma chave secundária (Pool Master) para o failover.
   - *Dedução*: Configurar o spy de `secretVault.getActiveSecretForProvider` para retornar `"byok-expiring-key"` apenas quando chamado para o tenant específico do lojista, e configurar `process.env.GROQ_API_KEY = "gsk-master-pool-key"` (ou mock de `getAllActiveKeysForProvider`), comprovando que o orquestrador transborda a chamada para o Pool Master sem repassar o 429 ao cliente.

---

## 3. Caveats (Ressalvas e Limites do Escopo)

1. **Groq Llama 3.2 Vision**: Atualmente o pool da Waesy não possui chaves habilitadas para Llama 3.2 11B/90B Vision no Groq; caso no futuro a plataforma adquira cotas multimodais no Groq, o filtro deve migrar de nível de provedor (`provider !== "groq"`) para nível de aptidão de modelo (`supportsVision(model)`).
2. **Duplicidade entre `executeUnifiedAiCall` e `executeAiCoreGateway`**:
   - `executeUnifiedAiCall` em `api-orchestrator.functions.ts` é o motor original e mais consumido em todo o repositório (+80 arquivos).
   - `executeAiCoreGateway` em `ai-core-gateway.functions.ts` foi introduzido como porta única com Prompt Shield e cache em banco.
   - O requisito R1 e R3 ordenam a parametrização explícita em `executeUnifiedAiCall` mantendo paridade com `executeAiCoreGateway`.
3. **In-Memory vs Database Quotas**: O cooldown em memória (`keyCooldownUntilMap`) dura enquanto o processo do servidor/worker estiver vivo; a persistência no banco (`api_key_pools.quarantine_until`) garante a persistência entre reinicializações.

---

## 4. Conclusion (Arquitetura e Recomendações de Implementação)

### 4.1 Extensão do Schema e Definição de Tipos
Em `src/services/api-orchestrator.functions.ts`:

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

export const TEXT_ONLY_PROVIDERS: readonly ApiProvider[] = ["groq"] as const;
export const MULTIMODAL_PROVIDERS: readonly ApiProvider[] = ["gemini", "anthropic", "openai", "openrouter"] as const;
```

### 4.2 Matriz Canônica de Aptidão e Cascata de Roteamento
Substituir as linhas 913–962 de `api-orchestrator.functions.ts` pela lógica normalizada:

```typescript
  const rawTask = options.taskType || options.feature;
  const isVisionTask =
    images.length > 0 ||
    options.taskType === "vision" ||
    options.taskType === "ocr" ||
    options.taskType === "multimodal";

  const isFastJsonTask =
    options.taskType === "fast_json" ||
    options.taskType === "scraping" ||
    (isJson && !isVisionTask);

  const isEditorialSquadTask =
    options.taskType === "editorial_squad" ||
    Boolean(options.feature?.includes("editorial")) ||
    Boolean(options.feature?.includes("curation"));

  const isDeepReasoningTask =
    options.taskType === "deep_reasoning" ||
    options.taskType === "code" ||
    Boolean(options.feature?.includes("planning")) ||
    Boolean(options.feature?.includes("contract_analysis"));

  // 1. Definição da cascata canônica por aptidão
  let defaultCascade: ApiProvider[];
  if (isVisionTask) {
    // Multimodal estrito: ignora categoricamente provedores text-only
    defaultCascade = ["gemini", "anthropic", "openai", "openrouter"];
  } else if (isFastJsonTask) {
    // Ultra-rápido: Groq prioritário com sub-200ms e json_object
    defaultCascade = ["groq", "openai", "openrouter", "gemini", "anthropic"];
  } else if (isEditorialSquadTask) {
    // Editorial: Groq / OpenRouter / Gemini
    defaultCascade = ["groq", "openrouter", "gemini", "openai", "anthropic"];
  } else if (isDeepReasoningTask) {
    // Raciocínio profundo: OpenAI / Anthropic / Gemini
    defaultCascade = ["openai", "anthropic", "openrouter", "gemini", "groq"];
  } else {
    // Chat geral
    defaultCascade = ["groq", "gemini", "openrouter", "openai", "anthropic"];
  }

  // 2. Montagem de providersToTry respeitando restrições de aptidão
  const providersToTry: ApiProvider[] = [];
  if (preferred) {
    // Se a tarefa for de visão, rejeita preferredProvider que seja text-only (ex: groq)
    const isPreferredAllowed = isVisionTask ? !TEXT_ONLY_PROVIDERS.includes(preferred) : true;
    if (isPreferredAllowed) {
      providersToTry.push(preferred);
    }
  }

  for (const p of defaultCascade) {
    if (!providersToTry.includes(p)) {
      if (isVisionTask && TEXT_ONLY_PROVIDERS.includes(p)) continue;
      providersToTry.push(p);
    }
  }
```

### 4.3 Ajustes Cirúrgicos nos Provedores Subjacentes
1. **OpenRouter (Linhas 1038–1047)**:
   ```typescript
   const openRouterModels =
     isVisionTask
       ? ["google/gemini-2.5-flash", "qwen/qwen2.5-vl-72b-instruct:free"]
       : [
           "meta-llama/llama-3.3-70b-instruct:free",
           "qwen/qwen3-235b-a22b:free",
           "deepseek/deepseek-chat-v3-0324:free",
           "meta-llama/llama-3.3-70b-instruct",
           "google/gemini-2.5-flash",
         ];
   ```
2. **Anthropic (Linha 1390)**:
   ```typescript
   const model = options.modelOverride || (isVisionTask ? "claude-3-5-sonnet-20241022" : "claude-3-5-haiku-20241022");
   ```
3. **Groq (Linhas 1148–1188)**:
   - Preservar trava `if (isVisionTask) continue;`.
   - Quando `isFastJsonTask` ou `isJson`:
     Garantir injeção defensiva de instrução JSON no payload caso `systemPrompt` ou `userPrompt` não contenham a palavra `"JSON"` (exigência estrita do endpoint Groq com `response_format: { type: "json_object" }`).

### 4.4 Correção e Expansão dos Testes Unitários
1. **Corrigir Teste 4 em `src/services/ai-task-aptitude-and-byok-isolation.test.ts`**:
   Configurar o mock para fornecer chave master saudável e comprovar o failover do 429 da chave BYOK para o Pool Master.
2. **Adicionar Testes Específicos para os Casos de Borda**:
   - Teste 5: Chamada com `preferredProvider: "groq"` e `taskType: "vision"` — comprova que o Groq é expurgado da lista e o Gemini é selecionado.
   - Teste 6: Chamada com `taskType: "ocr"` sem imagens pré-anexadas — comprova seleção de modelo multimodal no OpenRouter/Anthropic sem quebra.
   - Teste 7: Chamada com `taskType: "fast_json"` — comprova que Groq recebe `response_format: { type: "json_object" }` e temperatura `0.1`.

---

## 5. Verification Method (Método de Verificação Independente)

Para reproduzir e auditar as conclusões de forma determinística:

1. **Execução da Suíte de Aptidão e Isolamento**:
   ```powershell
   cmd.exe /c npx vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts
   ```
   *Condição de Validação*: Testes 1 a 3 devem passar imediatamente. Teste 4 comprova a necessidade de chave Pool Master mockada para testar o failover.
2. **Execução da Suíte de Quarentena**:
   ```powershell
   cmd.exe /c npx vitest run src/services/copilot-keypool-quarantine.test.ts
   ```
   *Condição de Validação*: 7/7 testes verdes comprovando as janelas de quarentena.
3. **Execução da Suíte de Gateway**:
   ```powershell
   cmd.exe /c npx vitest run src/services/ai-core-gateway.test.ts
   ```
   *Condição de Validação*: 11/11 testes verdes.
4. **Inspeção Semântica dos Arquivos no Repositório**:
   - `src/services/api-orchestrator.functions.ts`: Linhas 859–970, 1038–1047, 1148–1188, 1243–1390.
   - `src/services/travel-ai-extractor.functions.ts`: Linhas 123–133 (`taskType: "vision"`) e 143–153 (`taskType: "fast_json"`).
   - `src/services/mining/editorial-squad.ts`: Linhas 200–210 (`taskType: "editorial_squad"`).
   - `src/services/travel-reviews.functions.ts`: Linhas 73–93 (`taskType: "fast_json"`).
