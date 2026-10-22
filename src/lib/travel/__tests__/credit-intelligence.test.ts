import { describe, expect, it } from "vitest";
import { evaluatePayerCreditAssessment } from "../credit-intelligence";

describe("evaluatePayerCreditAssessment — Multidimensional Credit & Purchasing Power Engine", () => {
  it("computes high purchasing power when a payer sponsors multiple trips/packages for family", () => {
    // Exemplo do usuário: Pai compra 2 pacotes (2 pax ele + esposa, 2 pax filho + nora) total R$ 60.000
    const result = evaluatePayerCreditAssessment({
      payer: {
        payer_cpf: "12345678901",
        payer_name: "Carlos Alberto Silva",
        total_financed_volume_cents: 6000_000, // R$ 60.000
        max_single_purchase_cents: 3500_000,
        sponsored_pax_count: 4,
        sponsored_trips_count: 2,
        bureau_operator_credit_approved_cents: 4000_000, // R$ 40.000 aprovados em boleto faturado
        operator_denied_events_count: 0,
        pix_punctual_volume_cents: 1000_000,
      },
      beneficiary_pax: {
        pax_cpf: "12345678901",
        pax_name: "Carlos Alberto Silva",
        is_same_as_payer: true,
      },
      company_profile: {
        job_title: "Diretor Comercial",
        is_c_level_or_owner: true,
        company_cnpj: "12.345.678/0001-90",
        company_capital_social_cents: 50000_000, // R$ 500.000
        company_status: "ativa",
        company_size: "demais",
      },
    });

    expect(result.composite_score).toBeGreaterThanOrEqual(850);
    expect(["AAA", "AA"]).toContain(result.confidence_grade);
    expect(["ELITE_VIP", "ALTO_VALOR"]).toContain(result.purchasing_power_tier);
    expect(result.credit_bureau_status).toBe("APROVADO_OPERADORA");
    expect(result.is_beneficiary_distinct_from_payer).toBe(false);
    expect(result.positive_factors.length).toBeGreaterThan(2);
    expect(result.risk_factors.length).toBe(0);
  });

  it("isolates purchasing power so beneficiary traveler does NOT inherit the sponsor's score", () => {
    // Filho viajando no pacote pago pelo pai
    const result = evaluatePayerCreditAssessment({
      payer: {
        payer_cpf: "12345678901", // CPF do pai
        payer_name: "Carlos Alberto Silva",
        total_financed_volume_cents: 6000_000,
        max_single_purchase_cents: 3500_000,
        sponsored_pax_count: 4,
        sponsored_trips_count: 2,
        bureau_operator_credit_approved_cents: 4000_000,
        operator_denied_events_count: 0,
        pix_punctual_volume_cents: 0,
      },
      beneficiary_pax: {
        pax_cpf: "98765432100", // CPF do filho (beneficiário distinto)
        pax_name: "Lucas Silva",
        is_same_as_payer: false,
      },
      company_profile: {
        job_title: "Estudante",
        is_c_level_or_owner: false,
      },
    });

    // O sistema registra explicitamente que o passageiro é distinto do pagador financeiro
    expect(result.is_beneficiary_distinct_from_payer).toBe(true);
    expect(result.payer_cpf).toBe("12345678901");
  });

  it("does not inflate credit score for pure Pix payer without operator credit approval", () => {
    // Cliente que apenas pagou R$ 3.000 via Pix e não tem aprovação de crédito faturado
    const result = evaluatePayerCreditAssessment({
      payer: {
        payer_cpf: "55566677788",
        payer_name: "Mariana Souza",
        total_financed_volume_cents: 300_000,
        max_single_purchase_cents: 300_000,
        sponsored_pax_count: 1,
        sponsored_trips_count: 1,
        bureau_operator_credit_approved_cents: 0,
        operator_denied_events_count: 0,
        pix_punctual_volume_cents: 300_000,
      },
      beneficiary_pax: {
        pax_name: "Mariana Souza",
        is_same_as_payer: true,
      },
      company_profile: {
        job_title: "Analista",
        is_c_level_or_owner: false,
      },
    });

    // Score deve permanecer em faixa moderada/iniciante (não atinge AAA apenas por ter feito Pix)
    expect(result.composite_score).toBeLessThan(600);
    expect(["BB", "B"]).toContain(result.confidence_grade);
    expect(result.credit_bureau_status).toBe("SCORE_NEUTRO");
  });

  it("penalizes credit score and triggers risk alert when operator denied credit events exist", () => {
    const result = evaluatePayerCreditAssessment({
      payer: {
        payer_cpf: "99988877766",
        payer_name: "Inadimplente Teste",
        total_financed_volume_cents: 0,
        max_single_purchase_cents: 0,
        sponsored_pax_count: 0,
        sponsored_trips_count: 0,
        bureau_operator_credit_approved_cents: 0,
        operator_denied_events_count: 2, // 2 recusas de faturamento por operadoras
        pix_punctual_volume_cents: 0,
      },
      beneficiary_pax: {
        pax_name: "Inadimplente Teste",
        is_same_as_payer: true,
      },
      company_profile: {
        job_title: "CEO Fantasma",
        is_c_level_or_owner: true,
        company_status: "inapta",
      },
    });

    expect(result.composite_score).toBeLessThan(350);
    expect(["C", "ALERTA_RISCO"]).toContain(result.confidence_grade);
    expect(result.purchasing_power_tier).toBe("RESTRITO");
    expect(result.risk_factors.length).toBeGreaterThanOrEqual(2);
  });
});
