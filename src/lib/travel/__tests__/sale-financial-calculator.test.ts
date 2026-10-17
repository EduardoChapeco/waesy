import { describe, expect, it } from "vitest";
import { calculateSaleFinancials } from "../sale-financial-calculator";
import { resolveClassifiedDetailedSpecs } from "../../classifieds/canonical-specs-resolver";

describe("calculateSaleFinancials — 8-Block Travel Agency Financial Engine", () => {
  it("computes Net Sale, Commission, Net Over, Agency Revenue, Internal Costs, Result, and Margins accurately", () => {
    const result = calculateSaleFinancials({
      gross_sale_cents: 1000_000, // R$ 10.000,00
      non_commissionable_fees: [
        {
          fee_type: "taxa_embarque",
          description: "Taxas de embarque aeroportuárias",
          amount_cents: 120_000, // R$ 1.200,00
        },
      ],
      commission_mode: "percentage",
      commission_base_type: "net_sale",
      commission_percentage: 10, // 10% sobre R$ 8.800,00 = R$ 880,00
      over_mode: "amount",
      over_gross_cents: 50_000, // R$ 500,00 de over bruto
      over_deductions: [
        {
          deduction_type: "imposto",
          calc_mode: "amount",
          percentage: 0,
          amount_cents: 5_000, // R$ 50,00
        },
        {
          deduction_type: "taxa_operadora",
          calc_mode: "amount",
          percentage: 0,
          amount_cents: 3_000, // R$ 30,00
        },
        {
          deduction_type: "outra",
          calc_mode: "amount",
          percentage: 0,
          amount_cents: 2_000, // R$ 20,00
        },
      ],
      internal_costs: [
        {
          cost_type: "comissao_vendedor",
          description: "Comissão Consultor",
          calc_mode: "amount",
          percentage: 0,
          amount_cents: 78_000, // R$ 780,00
          payment_status: "previsto",
        },
        {
          cost_type: "taxa_cartao_gateway",
          description: "MDR Cartão",
          calc_mode: "amount",
          percentage: 0,
          amount_cents: 22_000, // R$ 220,00
          payment_status: "previsto",
        },
      ],
    });

    // Venda Líquida = 10.000 - 1.200 = R$ 8.800,00 (880_000 cents)
    expect(result.net_sale_cents).toBe(880_000);

    // Comissão = 10% de 880_000 = 88_000 cents (R$ 880,00)
    expect(result.commission_final_cents).toBe(88_000);

    // Over Líquido = 50_000 - (5_000 + 3_000 + 2_000) = 40_000 cents (R$ 400,00)
    expect(result.over_deductions_cents).toBe(10_000);
    expect(result.over_net_final_cents).toBe(40_000);

    // Receita da Agência = 88_000 + 40_000 = 128_000 cents (R$ 1.280,00)
    expect(result.agency_revenue_cents).toBe(128_000);

    // Custos Internos = 78_000 + 22_000 = 100_000 cents (R$ 1.000,00)
    expect(result.internal_costs_cents).toBe(100_000);

    // Resultado Final da Venda = 128_000 - 100_000 = 28_000 cents (R$ 280,00)
    expect(result.net_result_cents).toBe(28_000);

    // Margem sobre Venda Bruta = 28_000 / 1_000_000 = 2.8%
    expect(result.margin_on_sale_pct).toBe(2.8);

    // Margem sobre Receita da Agência = 28_000 / 128_000 = 21.88%
    expect(result.margin_on_revenue_pct).toBe(21.88);
  });

  it("supports direct amount commission mode and override", () => {
    const result = calculateSaleFinancials({
      gross_sale_cents: 500_000,
      non_commissionable_cents_direct: 100_000,
      commission_mode: "amount",
      commission_amount_cents: 60_000,
      over_gross_cents: 0,
      over_deductions: [],
      internal_costs: [],
    });

    expect(result.net_sale_cents).toBe(400_000);
    expect(result.commission_final_cents).toBe(60_000);
    expect(result.agency_revenue_cents).toBe(60_000);
    expect(result.net_result_cents).toBe(60_000);
  });
});

describe("resolveClassifiedDetailedSpecs — Anti-Leakage Guard for Travel & Non-Food Niches", () => {
  it("never leaks temperature or is_alcoholic into travel packages even if present in legacy JSONB", () => {
    const specs = resolveClassifiedDetailedSpecs({
      category_slug: "turismo-viagens",
      attributes: {
        niche: "viagem",
        destination_city: "Porto de Galinhas, PE",
        duration_text: "6D / 5N",
        meal_plan: "All Inclusive",
        temperature: "gelada",
        is_alcoholic: false,
      },
    });

    const labels = specs.map((s) => s.label);
    expect(labels).toContain("Destino");
    expect(labels).toContain("Duração");
    expect(labels).toContain("Regime Alimentar");
    expect(labels).not.toContain("Temperatura");
    expect(labels).not.toContain("Bebida Alcoólica");
  });

  it("keeps temperature and is_alcoholic for convenience/beverage listings", () => {
    const specs = resolveClassifiedDetailedSpecs({
      category_slug: "mercado-conveniencia",
      attributes: {
        niche: "mercado",
        template_style: "conveniencia",
        volume: "350ml",
        temperature: "gelada",
        is_alcoholic: false,
      },
    });

    const labels = specs.map((s) => s.label);
    expect(labels).toContain("Volume / Peso");
    expect(labels).toContain("Temperatura");
    expect(labels).toContain("Bebida Alcoólica");
  });
});
