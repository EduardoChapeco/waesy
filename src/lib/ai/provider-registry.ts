import { z } from "zod";

export const TextProviderSchema = z.enum([
  "openrouter",
  "groq",
  "gemini",
  "openai",
  "anthropic",
  "deepseek",
]);

export type TextProvider = z.infer<typeof TextProviderSchema>;

export type TextProviderDefinition = {
  id: TextProvider;
  label: string;
  baseUrl: string;
  defaultModel: string;
  protocol: "openai-compatible" | "gemini" | "anthropic";
  fallback: TextProvider[];
  capabilities: readonly ("chat" | "reasoning" | "code")[];
  freeTier: boolean;
};

export const TEXT_PROVIDER_REGISTRY: Record<TextProvider, TextProviderDefinition> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
    protocol: "openai-compatible",
    fallback: ["gemini", "groq"],
    capabilities: ["chat", "reasoning", "code"],
    freeTier: false,
  },
  groq: {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    protocol: "openai-compatible",
    fallback: ["openrouter", "gemini"],
    capabilities: ["chat", "code"],
    freeTier: true,
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.0-flash",
    protocol: "gemini",
    fallback: ["groq", "openrouter"],
    capabilities: ["chat", "reasoning", "code"],
    freeTier: true,
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    protocol: "openai-compatible",
    fallback: ["gemini", "groq"],
    capabilities: ["chat", "reasoning", "code"],
    freeTier: false,
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-haiku-latest",
    protocol: "anthropic",
    fallback: ["openai", "openrouter"],
    capabilities: ["chat", "reasoning", "code"],
    freeTier: false,
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    protocol: "openai-compatible",
    fallback: ["groq", "openrouter"],
    capabilities: ["chat", "reasoning", "code"],
    freeTier: false,
  },
};

export function getTextProviderDefinition(provider: TextProvider): TextProviderDefinition {
  return TEXT_PROVIDER_REGISTRY[provider];
}

export function buildFallbackChain(provider: TextProvider): TextProvider[] {
  const chain: TextProvider[] = [];
  const visit = (candidate: TextProvider) => {
    if (chain.includes(candidate)) return;
    chain.push(candidate);
    for (const fallback of TEXT_PROVIDER_REGISTRY[candidate].fallback) visit(fallback);
  };
  visit(provider);
  return chain;
}
