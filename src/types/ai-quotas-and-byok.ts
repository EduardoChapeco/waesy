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

/**
 * Franquia Técnica Canônica de Tokens de LLM por Nível de Plano (SPEC-20261030):
 * Regra: 1.000 tokens técnicos ≈ 1 $WZ ≈ R$ 0,01
 */
export const PLAN_TECHNICAL_TOKEN_LIMITS = {
  CIVIL: 0,
  BUSINESS_START: 5_000_000,     // 5M tokens (4.990 $WZ equivalentes / R$ 49,90)
  BUSINESS_PRO: 10_000_000,      // 10M tokens (9.990 $WZ equivalentes / R$ 99,90)
  BUSINESS_MAX: 20_000_000,      // 20M tokens (19.900 $WZ equivalentes / R$ 199,00)
  BUSINESS_BLACK: 30_000_000,    // 30M tokens (29.900 $WZ equivalentes / R$ 299,00)
  BUSINESS_ENTERPRISE: 50_000_000, // 50M tokens (49.900 $WZ equivalentes / R$ 499,00)
  CORPORATE: -1,                 // Customizado via SLA
} as const;

export interface AiQuotaStatusDTO {
  storeId: string;
  planTier: PlanTier;
  monthlyLimit: number;
  monthlyUsed: number;
  remainingQuota: number;
  hasByokConfigured: boolean;
  hasActiveBYOK?: boolean;
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
