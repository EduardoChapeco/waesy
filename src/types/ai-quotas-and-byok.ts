import { z } from "zod";
import type { PlanTier } from "./marketplace-compliance";

/**
 * Limites Mensais Canônicos de Chamadas de IA por Plano:
 * - FREE_MVP: 10 chamadas mensais de cortesia (com BYOK ilimitado)
 * - WAESY_MAX: 200 chamadas mensais incluídas no plano profissional (com fallback silencioso para BYOK)
 */
export const PLAN_AI_LIMITS: Record<PlanTier, number> = {
  FREE_MVP: 10,
  WAESY_MAX: 200,
};

export interface AiQuotaStatusDTO {
  storeId: string;
  planTier: PlanTier;
  monthlyLimit: number;
  monthlyUsed: number;
  remainingQuota: number;
  hasByokConfigured: boolean;
  byokProvider?: string | null;
  activeEngineMode: "NATIVE_QUOTA" | "BYOK_FALLBACK" | "QUOTA_EXHAUSTED";
  renewalDate: string;
}

export const ConsumeAiQuotaInputSchema = z.object({
  storeId: z.string().uuid("ID da loja inválido"),
  feature: z.string().min(2, "Feature é obrigatória"),
  preferredProvider: z.enum(["gemini", "openai", "anthropic", "openrouter", "groq"]).default("gemini"),
});

export type ConsumeAiQuotaInput = z.infer<typeof ConsumeAiQuotaInputSchema>;

export interface ConsumeAiQuotaResult {
  allowed: boolean;
  consumptionType: "NATIVE_QUOTA" | "BYOK_FALLBACK";
  remainingQuota: number;
  providerToUse: string;
  byokKey?: string;
}
