/**
 * openrouter.ts — Orquestrador de IA via OpenRouter
 * Integrado ao pool centralizado de chaves (api_key_pools via api-orchestrator).
 * Hierarquia: Pool do banco → Env var → Erro descritivo.
 */
import { getNextActiveKey, markKeyError } from "@/services/api-orchestrator.functions";

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Modelos com bom custo-benefício no OpenRouter (cascade de fallback)
const DEFAULT_MODELS = [
  "meta-llama/llama-3.1-70b-instruct:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
];

/**
 * Sanitiza entradas para prevenir prompt injection.
 * Remove padrões de jailbreak comuns antes de enviar à LLM.
 */
export function sanitizeForAI(input: string, maxChars = 4000): string {
  return input
    .slice(0, maxChars)
    // Remove marcadores de instrução de sistema maliciosos
    .replace(/\[SYSTEM\]|\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/gi, "")
    // Remove blocos de prompt injection comuns
    .replace(/\n---\n[\s\S]*?(ignore|forget|disregard|override)/gi, "")
    .replace(/ignore (all|previous|above|prior)/gi, "")
    .replace(/you are now|act as|roleplay as|pretend to be/gi, "")
    // Remove sequências de escape de template
    .replace(/\{\{|\}\}/g, "")
    .trim();
}

/**
 * Orquestrador de IA utilizando OpenRouter.
 * Busca chave do pool centralizado primeiro, fallback para env var.
 */
export async function callOpenRouter(
  messages: ChatMessage[],
  options: {
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json_object" | "text";
  } = {}
): Promise<AIResponse> {
  // 1. Buscar chave do pool (banco) → fallback env var
  let poolKey: { id: string; rawKey: string } | null = null;
  let keyId = "env-openrouter";

  try {
    poolKey = await getNextActiveKey("openrouter");
  } catch {
    // Pool indisponível — continua para env var
  }

  const apiKey = poolKey?.rawKey
    || (typeof process !== "undefined" ? process.env?.OPENROUTER_API_KEY || process.env?.VITE_OPENROUTER_API_KEY : undefined);

  if (poolKey) {
    keyId = poolKey.id;
  }

  if (!apiKey || apiKey.trim().length < 5) {
    throw new Error(
      "Nenhuma chave OpenRouter configurada. Adicione uma chave em Admin > Orquestrador de IA ou na variável OPENROUTER_API_KEY."
    );
  }

  const modelToUse = options.model || DEFAULT_MODELS[0];
  const reqMessages = [...messages];

  if (options.systemPrompt) {
    reqMessages.unshift({ role: "system", content: options.systemPrompt });
  }

  const payload: any = {
    model: modelToUse,
    messages: reqMessages,
    temperature: options.temperature ?? 0.7,
  };

  if (options.maxTokens) {
    payload.max_tokens = options.maxTokens;
  }

  if (options.responseFormat === "json_object") {
    payload.response_format = { type: "json_object" };
    if (!reqMessages.some((m) => m.content.toLowerCase().includes("json"))) {
      const lastIdx = reqMessages.length - 1;
      reqMessages[lastIdx] = {
        ...reqMessages[lastIdx],
        content: reqMessages[lastIdx].content + "\n\nRetorne APENAS um JSON válido. Sem formatação markdown.",
      };
    }
  }

  // 2. Execução com cascade de fallback entre modelos
  const modelsToTry = [modelToUse, ...DEFAULT_MODELS.filter((m) => m !== modelToUse)].slice(0, 3);

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    payload.model = modelsToTry[attempt];
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://waesy.com.br",
          "X-Title": "Waesy SuperApp",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25000),
      });

      if (!response.ok) {
        const errData = await response.text();
        // Marca erro no pool se for chave inválida ou rate limit
        if (response.status === 401 || response.status === 403) {
          await markKeyError(keyId, `OpenRouter 401/403: chave inválida ou sem crédito`).catch(() => {});
        } else if (response.status === 429) {
          await markKeyError(keyId, `OpenRouter 429: rate limit excedido`).catch(() => {});
        }
        throw new Error(`OpenRouter HTTP ${response.status}: ${errData.slice(0, 200)}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "";

      // Cleanup de markdown JSON caso o LLM ainda envie ```json ... ```
      if (options.responseFormat === "json_object") {
        content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      }

      return { content, model: data.model, usage: data.usage };

    } catch (error: any) {
      console.error(`[openrouter] Tentativa ${attempt + 1}/${modelsToTry.length} falhou (${payload.model}):`, error?.message);
      if (attempt === modelsToTry.length - 1) {
        throw new Error(`Falha em todas as tentativas do OpenRouter: ${error?.message}`);
      }
    }
  }

  throw new Error("Falha inesperada no orquestrador OpenRouter.");
}
