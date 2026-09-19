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
import { getNextActiveKey, executeUnifiedAiCall } from "./api-orchestrator.functions";

// AI Router Function
export const generateText = createServerFn({ method: "POST" })
 .validator(
 z.object({
 provider: z.enum(["gemini", "openrouter", "openai", "anthropic", "groq"]),
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

 // 1. Resolve Credentials from Secret Vault (BYOK se houver)
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
 }

 // 2. Executa via Orquestrador Universal com cascade automático e fallback BYOK -> Pool
 let generatedText = "";
 try {
 const preferred = input.provider as any;
 const aiRes = await executeUnifiedAiCall({
 systemPrompt: hardenedSystemPrompt,
 userPrompt: sandboxedUserPrompt,
 preferredProvider: preferred,
 overrideApiKey: rawKey || undefined,
 temperature: input.temperature,
 maxTokens: input.maxTokens,
 });
 generatedText = aiRes.content;
 } catch (err: any) {
 console.error(`[ai-router] Falha ao invocar provedor ${input.provider}:`, err);
 throw new Error(`Falha no orquestrador de IA: ${err.message || "Erro desconhecido"}`);
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
