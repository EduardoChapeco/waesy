/**
 * travel-credit-intelligence.functions.ts — Motor de Inteligência de Crédito e Poder de Compra
 * Restrito EXCLUSIVAMENTE ao Admin Master (Zero-Trust) para futuro módulo de crédito.
 * Respeita a Invariante de Lazy Evaluation (Zero sobrecarga contínua de transações no banco).
 */

import { createServerFn } from "@tanstack/react-start";
import { requirePlatformAdmin } from "@/lib/server-access";
import {
  EvaluateCreditInputSchema,
  evaluatePayerCreditAssessment,
  type CreditAssessmentResult,
} from "@/lib/travel/credit-intelligence";

export const getPayerCreditAssessmentMaster = createServerFn({ method: "POST" })
  .validator(EvaluateCreditInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean; report: CreditAssessmentResult }> => {
    // Trava de Segurança Zero-Trust: Apenas o Admin Master Global pode consultar
    await requirePlatformAdmin();

    const report = evaluatePayerCreditAssessment(data);

    return {
      success: true,
      report,
    };
  });
