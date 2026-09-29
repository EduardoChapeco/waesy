import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { getActiveSecretForProvider } from "./secret-vault.functions";
import {
  PLAN_AI_LIMITS,
  ConsumeAiQuotaInputSchema,
  type AiQuotaStatusDTO,
  type ConsumeAiQuotaResult,
} from "@/types/ai-quotas-and-byok";
import type { PlanTier } from "@/types/marketplace-compliance";

// ---------------------------------------------------------------------------
// 1. CONSULTAR STATUS DA COTA DE IA E BYOK DO WORKSPACE
// ---------------------------------------------------------------------------
export const GetStoreAiQuotaStatusSchema = z
  .object({
    storeId: z.string().uuid("ID da loja inválido").optional(),
  })
  .optional();

export const getStoreAiQuotaStatus = createServerFn({ method: "GET" })
  .validator((d: unknown) => GetStoreAiQuotaStatusSchema.parse(d))
  .handler(async ({ data }): Promise<AiQuotaStatusDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const targetStoreId = data?.storeId || identity.storeId;
    if (!targetStoreId) {
      throw new Error("ID da loja não fornecido e nenhuma loja ativa na sessão.");
    }
    assertStoreAccess(identity, ["owner", "admin", "manager", "master"], targetStoreId);

    // 1. Obter plano da loja
    const { data: store } = await supabase
      .from("stores")
      .select("id, plan_tier")
      .eq("id", targetStoreId)
      .maybeSingle();

    const planTier: PlanTier = (store?.plan_tier as PlanTier) || "FREE_MVP";
    const monthlyLimit = PLAN_AI_LIMITS[planTier];

    // 2. Calcular consumo no ciclo atual (mês vigente)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const { count, error } = await supabase
      .from("user_ai_usage_limits")
      .select("*", { count: "exact", head: true })
      .eq("store_id", data.storeId)
      .gte("created_at", startOfMonth);

    const monthlyUsed = count || 0;
    const remainingQuota = Math.max(0, monthlyLimit - monthlyUsed);

    // 3. Verificar se o lojista possui BYOK configurado no secret_vault
    const { data: byokSecrets } = await supabase
      .from("secret_vault")
      .select("id, provider, is_active")
      .eq("is_active", true)
      .in("provider", ["openai", "gemini", "anthropic", "openrouter", "groq"])
      .limit(1);

    const hasByok = Boolean(byokSecrets && byokSecrets.length > 0);
    const byokProvider = byokSecrets?.[0]?.provider || null;

    let activeEngineMode: "NATIVE_QUOTA" | "BYOK_FALLBACK" | "QUOTA_EXHAUSTED" = "NATIVE_QUOTA";
    if (remainingQuota === 0) {
      activeEngineMode = hasByok ? "BYOK_FALLBACK" : "QUOTA_EXHAUSTED";
    }

    return {
      storeId: data.storeId,
      planTier,
      monthlyLimit,
      monthlyUsed,
      remainingQuota,
      hasByokConfigured: hasByok,
      byokProvider,
      activeEngineMode,
      renewalDate: nextMonth,
    };
  });

// ---------------------------------------------------------------------------
// 2. CONSUMIR COTA OU ATIVAR FALLBACK SILENCIOSO BYOK
// ---------------------------------------------------------------------------
export const consumeAiQuotaOrFallback = createServerFn({ method: "POST" })
  .validator(ConsumeAiQuotaInputSchema)
  .handler(async ({ data }): Promise<ConsumeAiQuotaResult> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "master"], data.storeId);

    // 1. Obter plano da loja
    const { data: store } = await supabase
      .from("stores")
      .select("id, plan_tier")
      .eq("id", data.storeId)
      .maybeSingle();

    const planTier: PlanTier = (store?.plan_tier as PlanTier) || "FREE_MVP";
    const monthlyLimit = PLAN_AI_LIMITS[planTier];

    // 2. Checar consumo do mês
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count } = await supabase
      .from("user_ai_usage_limits")
      .select("*", { count: "exact", head: true })
      .eq("store_id", data.storeId)
      .gte("created_at", startOfMonth);

    const monthlyUsed = count || 0;

    // Cenário A: Ainda possui cota do plano nativo
    if (monthlyUsed < monthlyLimit) {
      // Registra consumo
      await supabase.from("user_ai_usage_limits").insert({
        store_id: data.storeId,
        profile_id: identity.id,
        feature: data.feature,
        daily_requests_used: 1,
        daily_requests_limit: monthlyLimit,
        created_at: now.toISOString(),
      });

      return {
        allowed: true,
        consumptionType: "NATIVE_QUOTA",
        remainingQuota: monthlyLimit - monthlyUsed - 1,
        providerToUse: data.preferredProvider,
      };
    }

    // Cenário B: Cota nativa esgotada -> Tenta BYOK (Fallback Silencioso)
    const byokKey = await getActiveSecretForProvider(
      data.preferredProvider as any,
      identity.id || undefined,
      data.storeId
    ).catch(() => null);

    if (byokKey) {
      return {
        allowed: true,
        consumptionType: "BYOK_FALLBACK",
        remainingQuota: 0,
        providerToUse: data.preferredProvider,
        byokKey,
      };
    }

    // Cenário C: Cota esgotada e sem BYOK cadastrado
    throw new Error(
      `Cota mensal de ${monthlyLimit} chamadas de IA esgotada para o plano ${planTier === "FREE_MVP" ? "Modo Rápido" : "Waesy Max"}. Cadastre sua própria chave de API (BYOK) em Configurações > IA ou migre para o Waesy Max.`
    );
  });

// ---------------------------------------------------------------------------
// 3. UPGRADE DE PLANO PARA WAESY MAX
// ---------------------------------------------------------------------------
export const upgradeStoreToWaesyMax = createServerFn({ method: "POST" })
  .validator(z.object({ storeId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean; planTier: PlanTier }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "master"], data.storeId);

    const { error } = await supabase
      .from("stores")
      .update({ plan_tier: "WAESY_MAX", updated_at: new Date().toISOString() })
      .eq("id", data.storeId);

    if (error) {
      throw new Error("Erro ao ativar Waesy Max: " + error.message);
    }

    return { success: true, planTier: "WAESY_MAX" };
  });

export const getStoreAIQuotaStatus = getStoreAiQuotaStatus;
