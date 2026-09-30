import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";
import { enforceRateLimit } from "@/lib/rate-limiter";
import { executeAiCoreGateway } from "./ai-core-gateway.functions";

// AI Router Function — Migrado para a Porta Única (AI Core Gateway)
export const generateText = createServerFn({ method: "POST" })
  .validator(
    z.object({
      provider: z.enum(["gemini", "openrouter", "openai", "anthropic", "groq"]).optional(),
      prompt: z.string().min(1, "O prompt não pode estar vazio"),
      systemPrompt: z.string().optional(),
      maxTokens: z.number().int().min(1).max(8192).optional().default(1024),
      temperature: z.number().min(0).max(2).optional().default(0.7),
      task: z.enum(["chat", "resumo", "classificacao", "extracao", "geracao_texto", "imagem", "video", "embedding", "ocr", "codigo"]).optional().default("geracao_texto"),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    // 0. Rate Limiting de IA (Anti-Abuso & DDoS)
    enforceRateLimit(identity.id, "ai_generation");

    // 1. Execução via Porta Única Server-Side
    const response = await executeAiCoreGateway({
      task: input.task || "geracao_texto",
      prompt: input.prompt,
      systemPrompt: input.systemPrompt,
      constraints: {
        maxTokens: input.maxTokens,
        temperature: input.temperature,
      },
      module: "ai.functions:generateText",
      authContext: {
        userId: identity.id,
        storeId: identity.store_id || undefined,
        userRole: identity.role || undefined,
      },
    });

    if (!response.success) {
      throw new Error(response.error?.message || "Falha na geração de texto pelo Gateway de IA.");
    }

    const generatedText = response.result.text;
    const estimatedTokens = response.metadata.usage.totalTokens || Math.max(50, Math.ceil((input.prompt.length + generatedText.length) / 4));

    // 2. Decremento de saldo na carteira da loja para compatibilidade com billing histórico
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

          await supabase
            .from("stores")
            .update({ settings: { ...settings, token_wallet: wallet } })
            .eq("id", identity.store_id);
        }
      } catch (e) {
        console.error("[ai-functions] Erro ao debitar carteira de tokens da loja:", e);
      }
    }

    return {
      text: generatedText,
      provider: response.metadata.provider,
      tokensUsed: estimatedTokens,
      costUsd: response.metadata.costUsd,
      latencyMs: response.metadata.latencyMs,
      fallbackUsed: response.metadata.fallbackUsed,
      cacheHit: response.metadata.cacheHit,
    };
  });
