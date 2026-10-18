/**
 * openrouter.ts — Orquestrador de IA via OpenRouter
 * Integrado ao pool centralizado de chaves (api_key_pools via api-orchestrator).
 * Hierarquia: Pool do banco → Env var → Erro descritivo.
 */
import { executeUnifiedAiCall, getNextActiveKey, markKeyError } from "@/services/api-orchestrator.functions";

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
 * @deprecated Use executeUnifiedAiCall from "@/services/api-orchestrator.functions" directly.
 * Orquestrador legado de IA via OpenRouter redirecionado soberanamente para executeUnifiedAiCall.
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
  const systemMsg = messages.find((m) => m.role === "system")?.content || options.systemPrompt;
  const userMessages = messages.filter((m) => m.role !== "system");
  const userPrompt = userMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");

  const result = await executeUnifiedAiCall({
    systemPrompt: systemMsg,
    userPrompt: userPrompt || messages[0]?.content || "",
    preferredProvider: "openrouter",
    modelOverride: options.model,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    expectJson: options.responseFormat === "json_object",
    responseFormat: options.responseFormat,
    taskType: options.responseFormat === "json_object" ? "fast_json" : "chat",
  });

  return {
    content: result.content,
    model: result.modelUsed || options.model || "openrouter/unified",
  };
}
