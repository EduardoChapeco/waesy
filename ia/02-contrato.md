# Contrato da Porta Única de IA (Prompt 02)

## 1. Assinatura do Contrato da Porta Única

```typescript
export type AITaskType =
  | "chat"
  | "resumo"
  | "classificacao"
  | "extracao"
  | "geracao_texto"
  | "imagem"
  | "video"
  | "embedding"
  | "ocr"
  | "codigo";

export type AIExecutionMode = "sync" | "stream" | "async_queue";

export interface AIGatewayRequest {
  task: AITaskType;
  mode?: AIExecutionMode; // Default: 'sync'
  prompt: string;
  systemPrompt?: string;
  context?: Record<string, any>;
  images?: Array<{ mimeType: string; base64: string }>;
  constraints?: {
    maxTokens?: number;
    temperature?: number;
    responseFormat?: "json_object" | "text";
    timeoutMs?: number;
    minQualityScore?: number;
    maxCostUsd?: number;
  };
  authContext?: {
    userId?: string;
    workspaceId?: string;
    storeId?: string;
    userRole?: string;
    plan?: string;
  };
  promptVersion?: string;
  bypassCache?: boolean;
}

export interface AIGatewayResponse {
  success: boolean;
  result: {
    text: string;
    parsedJson?: any;
    asyncJobId?: string; // Presente quando mode === 'async_queue'
  };
  metadata: {
    callId: string;
    provider: string;
    model: string;
    fallbackUsed: boolean;
    fallbackFrom?: string;
    attemptsCount: number;
    latencyMs: number;
    cacheHit: boolean;
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    costUsd: number;
    promptVersion: string;
    fingerprint: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

## 2. Códigos Canônicos de Erro da Porta
- `RATE_LIMITED`: Todas as chaves do provedor selecionado estão esgotadas no momento.
- `BUDGET_EXCEEDED`: O usuário ou workspace estourou a cota de custo diária permitida.
- `PROMPT_SHIELD_VIOLATION`: Entrada bloqueada por tentativa de injeção de prompt ou jailbreak.
- `PROVIDER_UNAVAILABLE`: Todos os provedores da cascata falharam ou estão com circuito aberto.
- `TIMEOUT`: A requisição excedeu o tempo limite configurado para a tarefa.
- `INVALID_PAYLOAD`: Payload em desacordo com o schema da tarefa.
