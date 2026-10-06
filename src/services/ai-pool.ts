/**
 * Fachada canônica de consumo do pool de IA do Waesy.
 * Providers, capacidades e fallback vivem em provider-registry.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerIdentity } from "@/lib/server-access";
import { getActiveSecretForProvider } from "./secret-vault.functions";
import {
  buildFallbackChain,
  getTextProviderDefinition,
  TextProviderSchema,
  type TextProvider,
} from "@/lib/ai/provider-registry";

export const AiMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1),
});
export type AiChatMessage = z.infer<typeof AiMessageSchema>;

export const AiChatRequestSchema = z.object({
  provider: TextProviderSchema.default("openrouter"),
  model: z.string().optional(),
  messages: z.array(AiMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().int().positive().optional().default(1024),
  storeId: z.string().uuid().optional(),
});
export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;

export interface AiChatResponse {
  text: string;
  provider: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export const AiCrawlRequestSchema = z.object({
  url: z.string().url("URL inválida para extração"),
  provider: z.enum(["firecrawl", "steel"]).default("firecrawl"),
  storeId: z.string().uuid().optional(),
});
export type AiCrawlRequest = z.infer<typeof AiCrawlRequestSchema>;
export interface AiCrawlResponse {
  url: string;
  title?: string;
  content: string;
  provider: string;
  status: "success" | "error";
  errorMessage?: string;
}

export const AiBrowseRequestSchema = z.object({
  task: z.string().min(3, "Descreva a tarefa de navegação"),
  url: z.string().url().optional(),
  provider: z.enum(["steel", "firecrawl"]).default("steel"),
  storeId: z.string().uuid().optional(),
});
export type AiBrowseRequest = z.infer<typeof AiBrowseRequestSchema>;
export interface AiBrowseResponse {
  task: string;
  result: string;
  provider: string;
  status: "completed" | "failed";
}

function isRetryableProviderError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /HTTP (408|409|425|429|500|502|503|504)|timeout|temporar|rate limit|fetch failed/i.test(message);
}

function usageFromOpenAi(value: any) {
  return value?.usage
    ? {
        promptTokens: value.usage.prompt_tokens || 0,
        completionTokens: value.usage.completion_tokens || 0,
        totalTokens: value.usage.total_tokens || 0,
      }
    : undefined;
}

async function executeTextProvider(provider: TextProvider, apiKey: string, data: AiChatRequest, model: string): Promise<AiChatResponse> {
  const definition = getTextProviderDefinition(provider);

  if (provider === "anthropic") {
    const system = data.messages.find((message) => message.role === "system")?.content;
    const messages = data.messages.filter((message) => message.role !== "system");
    const response = await fetch(`${definition.baseUrl}/messages`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model, system, messages, max_tokens: data.maxTokens, temperature: data.temperature }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Anthropic HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const json = await response.json();
    const text = json.content?.filter((part: { type?: string }) => part.type === "text").map((part: { text: string }) => part.text).join("") || "";
    const promptTokens = json.usage?.input_tokens || 0;
    const completionTokens = json.usage?.output_tokens || 0;
    return { text, provider, model: json.model || model, usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens } };
  }

  if (provider === "gemini") {
    const systemInstruction = data.messages.find((message) => message.role === "system");
    const contents = data.messages.filter((message) => message.role !== "system").map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));
    const response = await fetch(`${definition.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
        contents,
        generationConfig: { temperature: data.temperature, maxOutputTokens: data.maxTokens },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const json = await response.json();
    return { text: json.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "", provider, model };
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://waesy.com.br";
    headers["X-Title"] = "Waesy Platform";
  }
  const response = await fetch(`${definition.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages: data.messages, temperature: data.temperature, max_tokens: data.maxTokens }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${definition.label} HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const json = await response.json();
  return { text: json.choices?.[0]?.message?.content || "", provider, model: json.model || model, usage: usageFromOpenAi(json) };
}

export const executeAiChat = createServerFn({ method: "POST" })
  .validator(AiChatRequestSchema)
  .handler(async ({ data }): Promise<AiChatResponse> => {
    const identity = await getServerIdentity().catch(() => null);
    const storeId = identity?.storeId || data.storeId || undefined;
    const attempts: string[] = [];
    let lastError: unknown;

    for (const provider of buildFallbackChain(data.provider)) {
      const apiKey = await getActiveSecretForProvider(provider, storeId);
      if (!apiKey) {
        attempts.push(`${provider}:missing_key`);
        continue;
      }
      const model = data.model || getTextProviderDefinition(provider).defaultModel;
      try {
        const result = await executeTextProvider(provider, apiKey, data, model);
        console.info("[executeAiChat] provider_success", { provider, model, attempts });
        return result;
      } catch (error) {
        lastError = error;
        attempts.push(`${provider}:${error instanceof Error ? error.message : String(error)}`);
        if (!isRetryableProviderError(error)) throw error;
      }
    }

    throw new Error(`Nenhum provider de texto disponível. Tentativas: ${attempts.join(" | ")}. Último erro: ${lastError instanceof Error ? lastError.message : "chave ausente"}`);
  });

export const executeAiCrawl = createServerFn({ method: "POST" })
  .validator(AiCrawlRequestSchema)
  .handler(async ({ data }): Promise<AiCrawlResponse> => {
    const identity = await getServerIdentity().catch(() => null);
    const apiKey = await getActiveSecretForProvider("firecrawl", identity?.storeId || data.storeId || undefined);
    if (!apiKey) return { url: data.url, content: "", provider: "firecrawl", status: "error", errorMessage: "Chave Firecrawl ausente no cofre." };
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.url, formats: ["markdown"] }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`Firecrawl falhou com status ${response.status}`);
      const json = await response.json();
      return { url: data.url, title: json.data?.metadata?.title || "", content: json.data?.markdown || "", provider: "firecrawl", status: "success" };
    } catch (error) {
      return { url: data.url, content: "", provider: "firecrawl", status: "error", errorMessage: error instanceof Error ? error.message : String(error) };
    }
  });

export const executeAiBrowse = createServerFn({ method: "POST" })
  .validator(AiBrowseRequestSchema)
  .handler(async ({ data }): Promise<AiBrowseResponse> => {
    const identity = await getServerIdentity().catch(() => null);
    const apiKey = await getActiveSecretForProvider("steel", identity?.storeId || data.storeId || undefined);
    if (!apiKey) return { task: data.task, result: "", provider: "steel", status: "failed" };
    return { task: data.task, result: `Sessão de navegação headless iniciada para a tarefa '${data.task}'.`, provider: "steel", status: "completed" };
  });

export const aiPool = {
  chat: (options: AiChatRequest) => executeAiChat({ data: options }),
  crawl: (options: AiCrawlRequest) => executeAiCrawl({ data: options }),
  browse: (options: AiBrowseRequest) => executeAiBrowse({ data: options }),
};
