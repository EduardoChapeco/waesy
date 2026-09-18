import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";
import { enforceRateLimit } from "@/lib/rate-limiter";
import {
 inspectPromptSecurity,
 buildSandboxedPromptPayload,
 sanitizeAiOutput,
} from "@/lib/prompt-shield";
import { getNextActiveKey } from "./api-orchestrator.functions";

// AI Router Function
export const generateText = createServerFn({ method: "POST" })
 .validator(
 z.object({
 provider: z.enum(["gemini", "openrouter", "openai", "anthropic"]),
 prompt: z.string().min(1, "O prompt não pode estar vazio"),
 systemPrompt: z.string().optional(),
 maxTokens: z.number().int().min(1).max(8192).optional().default(1024),
 temperature: z.number().min(0).max(2).optional().default(0.7),
 })
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();
 if (!identity?.id) throw new Error("Não autenticado");

 // 0. Rate Limiting de IA (Anti-Abuso & DDoS)
 enforceRateLimit(identity.id, "ai_generation");

 // 0.1 Prompt Shield: Varredura Anti-Jailbreak e Injeção de Instruções
 const securityCheck = inspectPromptSecurity(input.prompt);
 if (!securityCheck.isSafe) {
 throw new Error(securityCheck.violationReason || "Prompt bloqueado por violação de segurança.");
 }

 // 0.2 Sandboxing de Contexto & Cláusula de Primazia do Sistema
 const { hardenedSystemPrompt, sandboxedUserPrompt } = buildSandboxedPromptPayload(
 securityCheck.sanitizedPrompt || input.prompt,
 input.systemPrompt
 );

 // 1. Resolve Credentials from Secret Vault
 // Prioritize personal scope, then organization, then global
 const { data: secrets, error: vaultError } = await supabase
 .from("secret_vault")
 .select("id, encrypted_secret, daily_budget_cents, is_active")
 .eq("owner_id", identity.id)
 .eq("provider", input.provider)
 .eq("is_active", true)
 .order("created_at", { ascending: false })
 .limit(1);

 if (vaultError) {
 console.error("[ai-router] Erro ao acessar secret vault:", vaultError);
 }

 let rawKey: string | null = null;
 if (secrets && secrets.length > 0 && secrets[0].encrypted_secret) {
   rawKey = Buffer.from(secrets[0].encrypted_secret, "base64").toString("utf-8");
 } else {
   // Fallback resiliente: buscar chave ativa configurada no pool da plataforma
   const poolKey = await getNextActiveKey(input.provider as any).catch(() => null);
   if (poolKey?.rawKey) {
     rawKey = poolKey.rawKey;
   }
 }

 if (!rawKey) {
   throw new Error(`Nenhuma chave ativa encontrada para o provedor ${input.provider}. Adicione sua chave (BYOK) em Configurações > Integrações ou configure o pool de APIs.`);
 }

 // 2. Routing Logic
 let generatedText = "";
 
 try {
 if (input.provider === "gemini") {
 generatedText = await invokeGemini(rawKey, sandboxedUserPrompt, hardenedSystemPrompt, input.temperature, input.maxTokens);
 } else if (input.provider === "openai") {
 generatedText = await invokeOpenAI(rawKey, sandboxedUserPrompt, hardenedSystemPrompt, input.temperature, input.maxTokens);
 } else if (input.provider === "anthropic") {
 generatedText = await invokeAnthropic(rawKey, sandboxedUserPrompt, hardenedSystemPrompt, input.temperature, input.maxTokens);
 } else if (input.provider === "openrouter") {
 generatedText = await invokeOpenRouter(rawKey, sandboxedUserPrompt, hardenedSystemPrompt, input.temperature, input.maxTokens);
 } else {
 throw new Error(`Provedor ${input.provider} ainda não implementado no roteador.`);
 }
 } catch (err: any) {
 console.error(`[ai-router] Falha ao invocar provedor ${input.provider}:`, err);
 throw new Error(`Falha no provedor de IA: ${err.message || "Erro desconhecido"}`);
 }

 // 2.1 Output Leakage Guard (Redação de credenciais e chaves expostas)
 generatedText = sanitizeAiOutput(generatedText);

 // 3. Deduct usage from budget & record in audit log
 const estimatedTokens = Math.max(50, Math.ceil((input.prompt.length + generatedText.length) / 4));
 
 if (identity.store_id) {
 try {
 const { data: store } = await supabase
 .from("stores")
 .select("id, settings")
 .eq("id", identity.store_id)
 .single();

 if (store) {
 const settings = store.settings || {};
 const wallet = settings.token_wallet || {
 balance: 50_000,
 lifetime_purchased: 50_000,
 lifetime_consumed: 0,
 };
 const newBalance = Math.max(0, (wallet.balance || 0) - estimatedTokens);
 wallet.balance = newBalance;
 wallet.lifetime_consumed = (wallet.lifetime_consumed || 0) + estimatedTokens;
 wallet.updated_at = new Date().toISOString();
 settings.token_wallet = wallet;

 await supabase.from("stores").update({ settings }).eq("id", store.id);

 await supabase.from("audit_logs").insert({
 store_id: store.id,
 user_id: identity.id,
 action: "ai_text_generation",
 entity_type: "token_transaction",
 payload_snapshot: {
 provider: input.provider,
 tokens_consumed: estimatedTokens,
 balance_after: newBalance,
 prompt_preview: input.prompt.slice(0, 100),
 },
 });
 }
 } catch (logErr) {
 console.warn("[ai-router] Aviso ao debitar ledger de tokens:", logErr);
 }
 }

 return {
 success: true,
 provider: input.provider,
 text: generatedText,
 tokensConsumed: estimatedTokens,
 };
 });

// --- Provider Implementations ---

async function invokeGemini(
 apiKey: string,
 prompt: string,
 systemPrompt?: string,
 temperature?: number,
 maxTokens?: number
) {
 const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
 
 const payload: any = {
 contents: [{ parts: [{ text: prompt }] }],
 generationConfig: {
 temperature: temperature || 0.7,
 maxOutputTokens: maxTokens || 1024,
 },
 };

 if (systemPrompt) {
 payload.systemInstruction = {
 parts: [{ text: systemPrompt }],
 };
 }

 const res = await fetch(url, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(payload),
 signal: AbortSignal.timeout(25000),
 });

 if (!res.ok) {
 const err = await res.json().catch(() => ({}));
 throw new Error(err?.error?.message || `HTTP ${res.status}`);
 }

 const data = await res.json();
 return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function invokeOpenAI(
 apiKey: string,
 prompt: string,
 systemPrompt?: string,
 temperature?: number,
 maxTokens?: number
) {
 const url = "https://api.openai.com/v1/chat/completions";
 
 const messages = [];
 if (systemPrompt) {
 messages.push({ role: "system", content: systemPrompt });
 }
 messages.push({ role: "user", content: prompt });

 const payload = {
 model: "gpt-4o-mini",
 messages,
 temperature: temperature || 0.7,
 max_tokens: maxTokens || 1024,
 };

 const res = await fetch(url, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 Authorization: `Bearer ${apiKey}`,
 },
 body: JSON.stringify(payload),
 signal: AbortSignal.timeout(25000),
 });

 if (!res.ok) {
 const err = await res.json().catch(() => ({}));
 throw new Error(err?.error?.message || `HTTP ${res.status}`);
 }

 const data = await res.json();
 return data?.choices?.[0]?.message?.content || "";
}

async function invokeAnthropic(
 apiKey: string,
 prompt: string,
 systemPrompt?: string,
 temperature?: number,
 maxTokens?: number
) {
 const url = "https://api.anthropic.com/v1/messages";

 const payload: any = {
 model: "claude-3-5-sonnet-20241022",
 max_tokens: maxTokens || 1024,
 temperature: temperature || 0.7,
 messages: [{ role: "user", content: prompt }],
 };

 if (systemPrompt) {
 payload.system = systemPrompt;
 }

 const res = await fetch(url, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 "x-api-key": apiKey,
 "anthropic-version": "2023-06-01",
 },
 body: JSON.stringify(payload),
 signal: AbortSignal.timeout(25000),
 });

 if (!res.ok) {
 const err = await res.json().catch(() => ({}));
 throw new Error(err?.error?.message || `HTTP ${res.status}`);
 }

 const data = await res.json();
 return data?.content?.[0]?.text || "";
}

async function invokeOpenRouter(
 apiKey: string,
 prompt: string,
 systemPrompt?: string,
 temperature?: number,
 maxTokens?: number
) {
 const url = "https://openrouter.ai/api/v1/chat/completions";

 const messages = [];
 if (systemPrompt) {
 messages.push({ role: "system", content: systemPrompt });
 }
 messages.push({ role: "user", content: prompt });

 const payload = {
 model: "meta-llama/llama-3.3-70b-instruct",
 messages,
 temperature: temperature || 0.7,
 max_tokens: maxTokens || 1024,
 };

 const res = await fetch(url, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 Authorization: `Bearer ${apiKey}`,
 "HTTP-Referer": "https://waesy.pages.dev",
 "X-Title": "Waesy AI Assistant",
 },
 body: JSON.stringify(payload),
 signal: AbortSignal.timeout(25000),
 });

 if (!res.ok) {
 const err = await res.json().catch(() => ({}));
 throw new Error(err?.error?.message || `HTTP ${res.status}`);
 }

 const data = await res.json();
 return data?.choices?.[0]?.message?.content || "";
}

