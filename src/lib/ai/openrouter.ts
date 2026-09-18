import { env } from "@/lib/env";

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

// Modelos gratuitos recomendados no OpenRouter (fallback cascade)
const DEFAULT_MODELS = [
  "meta-llama/llama-3.1-70b-instruct:free", // Principal, bom raciocínio
  "google/gemma-2-9b-it:free",              // Rápido, bom para tarefas simples
  "mistralai/mistral-7b-instruct:free",     // Fallback
];

/**
 * Orquestrador de IA utilizando modelos gratuitos do OpenRouter.
 * Projetado para economia extrema de tokens.
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
  const apiKey = env.OPENROUTER_API_KEY || (typeof process !== "undefined" ? process.env?.OPENROUTER_API_KEY : undefined);

  if (!apiKey) {
    console.warn("⚠️ OPENROUTER_API_KEY não configurada. Usando mock ou falhará.");
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
      return {
        content: options.responseFormat === "json_object" ? "{}" : "Modo dev (Sem chave API).",
        model: "mock-model",
      };
    }
    throw new Error("API Key do OpenRouter não configurada no ambiente.");
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
    // A maioria dos modelos abertos gratuitos exige que a instrução JSON esteja no prompt, 
    // mas também enviamos a flag de formatação se o modelo suportar.
    payload.response_format = { type: "json_object" };
    // Forçar instrução JSON no último system prompt se não existir
    if (!reqMessages.some(m => m.content.toLowerCase().includes("json"))) {
        const lastUserIdx = reqMessages.length - 1;
        reqMessages[lastUserIdx].content += "\n\nVocê DEVE retornar APENAS UM JSON válido. Sem formatação markdown.";
    }
  }

  let attempt = 0;
  const maxAttempts = 2; // Tentar fallback se o primário falhar

  while (attempt < maxAttempts) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://waesy.com.br", 
          "X-Title": "Waesy SuperApp", 
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25000),
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`OpenRouter HTTP error! status: ${response.status}, body: ${errData}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      // Cleanup de Markdown JSON caso o LLM ainda envie ```json ... ```
      let cleanContent = content;
      if (options.responseFormat === "json_object") {
         cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      }

      return {
        content: cleanContent,
        model: data.model,
        usage: data.usage,
      };

    } catch (error) {
      console.error(`Erro na chamada AI (Modelo: ${payload.model}, Tentativa: ${attempt + 1}):`, error);
      attempt++;
      if (attempt < maxAttempts) {
        // Fallback para o próximo modelo gratuito se der erro de rate limit ou timeout
        payload.model = DEFAULT_MODELS[attempt % DEFAULT_MODELS.length];
        console.log(`Fazendo fallback para: ${payload.model}`);
      } else {
        throw new Error("Falha na orquestração de IA após múltiplas tentativas.");
      }
    }
  }

  throw new Error("Falha inesperada no orquestrador AI.");
}
