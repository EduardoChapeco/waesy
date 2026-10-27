import { z } from "zod";

// ─── ESQUEMA DE PODER DE COMPRA DO PAGADOR / SPONSOR ─────────────────────────

export const PayerPurchasingPowerInputSchema = z.object({
  payer_cpf: z.string().min(11).max(14),
  payer_name: z.string().min(1),
  total_financed_volume_cents: z.number().int().nonnegative().default(0),
  max_single_purchase_cents: z.number().int().nonnegative().default(0),
  sponsored_pax_count: z.number().int().nonnegative().default(0),
  sponsored_trips_count: z.number().int().nonnegative().default(0),
  bureau_operator_credit_approved_cents: z.number().int().nonnegative().default(0),
  operator_denied_events_count: z.number().int().nonnegative().default(0),
  pix_punctual_volume_cents: z.number().int().nonnegative().default(0),
  last_purchase_date: z.string().optional().nullable(),
});

export const ProfessionalCompanyProfileSchema = z.object({
  job_title: z.string().nullable().optional(),
  is_c_level_or_owner: z.boolean().default(false),
  company_cnpj: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  company_capital_social_cents: z.number().int().nonnegative().nullable().optional(),
  company_status: z.enum(["ativa", "suspensa", "inapta", "baixada", "nao_informado"]).default("nao_informado"),
  company_size: z.enum(["mei", "me", "epp", "demais", "nao_informado"]).default("nao_informado"),
});

export const EvaluateCreditInputSchema = z.object({
  payer: PayerPurchasingPowerInputSchema,
  beneficiary_pax: z
    .object({
      pax_cpf: z.string().optional().nullable(),
      pax_name: z.string().min(1),
      is_same_as_payer: z.boolean(),
    })
    .default({ pax_name: "Viajante", is_same_as_payer: true }),
  company_profile: ProfessionalCompanyProfileSchema.default({}),
});

export type EvaluateCreditInput = z.input<typeof EvaluateCreditInputSchema>;
export type EvaluateCreditParsed = z.infer<typeof EvaluateCreditInputSchema>;

export interface CreditAssessmentResult {
  payer_cpf: string;
  is_beneficiary_distinct_from_payer: boolean;
  composite_score: number; // 0 a 1000
  confidence_grade: "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "C" | "ALERTA_RISCO";
  purchasing_power_tier: "ELITE_VIP" | "ALTO_VALOR" | "MEDIO" | "INICIANTE" | "RESTRITO";
  estimated_monthly_capacity_cents: number;
  max_recommended_unsecured_installment_cents: number;
  risk_factors: string[];
  positive_factors: string[];
  credit_bureau_status: "APROVADO_OPERADORA" | "SCORE_NEUTRO" | "NEGADO_OPERADORA" | "SEM_HISTORICO";
  evaluated_at: string;
}

/**
 * Avaliador Determinístico Server-Side de Crédito e Poder de Compra.
 * Respeita estritamente as regras de negócio:
 * 1. Desacoplamento Estrito: O poder de compra pertence ao PAGADOR líder (quem financia),
 *    nunca ao passageiro beneficiário (ex: pai comprando para filho).
 * 2. Pix não gera score alto imediato: Pix pontual demonstra liquidez momentânea, mas
 *    não atesta histórico de crédito ou capacidade de honrar compromissos a prazo.
 * 3. Cargo vs CNPJ: CEO ou Diretor sem CNPJ com capital social compatível não recebe
 *    pontuação máxima de renda (evita presunção de liquidez por mero título).
 * 4. Lazy Evaluation: Zero processamento contínuo em background para não onerar o banco.
 */
export function evaluatePayerCreditAssessment(input: EvaluateCreditInput): CreditAssessmentResult {
  const data = EvaluateCreditInputSchema.parse(input);
  const { payer, beneficiary_pax, company_profile } = data;
  const isDistinctBeneficiary = !beneficiary_pax.is_same_as_payer && beneficiary_pax.pax_cpf !== payer.payer_cpf;

  const riskFactors: string[] = [];
  const positiveFactors: string[] = [];
  let baseScore = 500; // Ponto neutro

  // 1. Histórico com Operadoras de Turismo (Peso Máximo)
  if (payer.operator_denied_events_count > 0) {
    baseScore -= payer.operator_denied_events_count * 150;
    riskFactors.push(`Registrado(s) ${payer.operator_denied_events_count} evento(s) de recusa de crédito por operadoras.`);
  }

  let creditBureauStatus: CreditAssessmentResult["credit_bureau_status"] = "SEM_HISTORICO";

  if (payer.bureau_operator_credit_approved_cents > 0) {
    creditBureauStatus = "APROVADO_OPERADORA";
    const approvedThousands = Math.round(payer.bureau_operator_credit_approved_cents / 100_000); // R$ 1.000s
    const boost = Math.min(250, approvedThousands * 10);
    baseScore += boost;
    positiveFactors.push(`Operadoras concederam crédito faturado pré-aprovado de ${(payer.bureau_operator_credit_approved_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`);
  } else if (payer.operator_denied_events_count > 0) {
    creditBureauStatus = "NEGADO_OPERADORA";
  } else if (payer.total_financed_volume_cents > 0) {
    creditBureauStatus = "SCORE_NEUTRO";
  }

  // 2. Volume Acumulado de Patrocínio e Poder de Compra do Pagador
  const totalVolumeCents = payer.total_financed_volume_cents || 0;
  if (totalVolumeCents >= 5000_000) { // >= R$ 50.000
    baseScore += 180;
    positiveFactors.push("Poder de compra consolidado de alto valor (mais de R$ 50.000 em viagens faturadas).");
  } else if (totalVolumeCents >= 2000_000) { // >= R$ 20.000
    baseScore += 100;
    positiveFactors.push("Volume histórico expressivo de viagens suportadas.");
  } else if (totalVolumeCents >= 500_000) {
    baseScore += 40;
  }

  // 3. Patrocínio de Família / Múltiplos Paxes (Multiplicador de Poder de Compra)
  if (payer.sponsored_pax_count >= 4) {
    baseScore += 60;
    positiveFactors.push(`Patrocinador financeiro frequente de grupos/família (${payer.sponsored_pax_count} passageiros distintos beneficiados).`);
  }

  // 4. Análise de Pix Pontual (Não inflar score artificialmente)
  if (payer.pix_punctual_volume_cents > 0 && payer.bureau_operator_credit_approved_cents === 0) {
    // Pix sozinho confere apenas liquidez de entrada, sem histórico de parcelamento
    baseScore += Math.min(30, Math.round(payer.pix_punctual_volume_cents / 200_000));
    positiveFactors.push("Pontualidade comprovada em pagamentos à vista via Pix.");
  }

  // 5. Perfil Profissional e Verificação de CNPJ da Empresa
  if (company_profile.is_c_level_or_owner) {
    if (company_profile.company_status === "ativa") {
      const capital = company_profile.company_capital_social_cents || 0;
      if (capital >= 50000_000) { // >= R$ 500.000 de capital social
        baseScore += 120;
        positiveFactors.push("Empresário/C-Level vinculado a CNPJ ativo de alto capital social verificado.");
      } else if (capital >= 10000_000) { // >= R$ 100.000
        baseScore += 70;
        positiveFactors.push("Empresário/C-Level vinculado a CNPJ ativo com capital social moderado.");
      } else if (company_profile.company_size === "mei") {
        baseScore += 20;
        positiveFactors.push("Microempreendedor Individual (MEI) com atividade formal ativa.");
      } else {
        baseScore += 30;
      }
    } else if (company_profile.company_status === "inapta" || company_profile.company_status === "suspensa") {
      baseScore -= 100;
      riskFactors.push(`Cargo executivo associado a CNPJ com situação cadastral ${company_profile.company_status}.`);
    } else {
      // Declarou cargo mas sem comprovação ou CNPJ não informado
      riskFactors.push("Cargo executivo declarado sem CNPJ ativo associado (ausência de comprovação de faturamento).");
    }
  }

  // Trava de limites
  const finalScore = Math.max(0, Math.min(1000, Math.round(baseScore)));

  // Determinação de Faixa
  let confidenceGrade: CreditAssessmentResult["confidence_grade"] = "B";
  let purchasingTier: CreditAssessmentResult["purchasing_power_tier"] = "MEDIO";

  if (finalScore >= 900) {
    confidenceGrade = "AAA";
    purchasingTier = "ELITE_VIP";
  } else if (finalScore >= 800) {
    confidenceGrade = "AA";
    purchasingTier = "ALTO_VALOR";
  } else if (finalScore >= 700) {
    confidenceGrade = "A";
    purchasingTier = "ALTO_VALOR";
  } else if (finalScore >= 600) {
    confidenceGrade = "BBB";
    purchasingTier = "MEDIO";
  } else if (finalScore >= 500) {
    confidenceGrade = "BB";
    purchasingTier = "MEDIO";
  } else if (finalScore >= 400) {
    confidenceGrade = "B";
    purchasingTier = "INICIANTE";
  } else if (finalScore >= 250) {
    confidenceGrade = "C";
    purchasingTier = "RESTRITO";
  } else {
    confidenceGrade = "ALERTA_RISCO";
    purchasingTier = "RESTRITO";
  }

  // Capacidade Mensal Estimada e Parcela Máxima Descoberta
  const estimatedCapacityCents = Math.round(
    Math.max(200_000, (totalVolumeCents / Math.max(1, payer.sponsored_trips_count || 1)) * 0.25)
  );
  const maxUnsecuredInstallmentCents = Math.round(
    (estimatedCapacityCents * (finalScore / 1000)) * 0.4
  );

  return {
    payer_cpf: payer.payer_cpf,
    is_beneficiary_distinct_from_payer: isDistinctBeneficiary,
    composite_score: finalScore,
    confidence_grade: confidenceGrade,
    purchasing_power_tier: purchasingTier,
    estimated_monthly_capacity_cents: estimatedCapacityCents,
    max_recommended_unsecured_installment_cents: maxUnsecuredInstallmentCents,
    risk_factors: riskFactors,
    positive_factors: positiveFactors,
    credit_bureau_status: creditBureauStatus,
    evaluated_at: new Date().toISOString(),
  };
}
