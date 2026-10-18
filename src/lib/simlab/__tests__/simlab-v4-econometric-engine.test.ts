import { describe, it, expect } from "vitest";
import {
  CANONICAL_BRAZIL_ARCHETYPES,
  MUNICIPALITY_DEMOGRAPHIC_PRESETS,
  generateStratifiedSyntheticCohort,
} from "../brazil-demographics";
import {
  computePersonaAffordabilityAndMcFaddenUtility,
  computeCohortDescriptiveAndEconometricStats,
  computeHistogramMode,
  computeMedian,
  computeStdDev,
  type CognitivePersonaSignal,
} from "../econometric-engine";

describe("SimLabs 4.0 — Motor Econométrico McFadden, Solvência POF & Geração Hiperlocal IBGE", () => {
  it("deve conter presets demográficos municipais incluindo São Miguel do Oeste - SC e Chapecó - SC", () => {
    expect(MUNICIPALITY_DEMOGRAPHIC_PRESETS["São Miguel do Oeste - SC"]).toBeDefined();
    expect(MUNICIPALITY_DEMOGRAPHIC_PRESETS["São Miguel do Oeste - SC"].state).toBe("SC");
    expect(MUNICIPALITY_DEMOGRAPHIC_PRESETS["Chapecó - SC"]).toBeDefined();
    expect(MUNICIPALITY_DEMOGRAPHIC_PRESETS["Nacional"]).toBeDefined();

    const smoProfiles = CANONICAL_BRAZIL_ARCHETYPES.filter(
      (p) => p.municipality === "São Miguel do Oeste - SC",
    );
    expect(smoProfiles.length).toBeGreaterThanOrEqual(2);
  });

  it("deve gerar coortes estratificadas procedurais de até 120 personas com vetores Big Five OCEAN e pesos censitários", () => {
    const { profiles, preset } = generateStratifiedSyntheticCohort({
      count: 60,
      municipalityFilter: "São Miguel do Oeste - SC",
      seed: "test-seed-smo-2026",
    });

    expect(preset.municipality).toBe("São Miguel do Oeste - SC");
    expect(profiles).toHaveLength(60);

    for (const p of profiles) {
      expect(p.municipality).toBe("São Miguel do Oeste - SC");
      expect(p.financial_sheet).toBeDefined();
      expect(p.financial_sheet!.net_monthly_income_brl).toBeGreaterThan(0);
      expect(p.financial_sheet!.discretionary_surplus_brl).toBeGreaterThan(0);
      expect(p.ocean_vector).toBeDefined();
      expect(p.ocean_vector!.openness).toBeGreaterThanOrEqual(0);
      expect(p.ocean_vector!.openness).toBeLessThanOrEqual(10);
      expect(p.census_weight).toBeGreaterThan(0);
    }
  });

  it("deve aplicar a Trava Mecânica de Solvência POF (Hard Budget Gate) quando o preço excede a capacidade financeira da persona", () => {
    const lowIncomePersona = CANONICAL_BRAZIL_ARCHETYPES.find(
      (p) => p.abep_social_class === "D_E" || p.abep_social_class === "C2",
    )!;
    const highIncomePersona = CANONICAL_BRAZIL_ARCHETYPES.find(
      (p) => p.abep_social_class === "A1" || p.abep_social_class === "A2",
    )!;

    const signal: CognitivePersonaSignal = {
      perceived_value_score: 9.0,
      trust_score: 8.5,
      ux_friction_score: 1.5,
      reservation_price_brl: 15000,
      primary_objection: "Preço elevado à vista",
      natural_speech_verbatim: "Produto excelente, compraria se coubesse no bolso.",
    };

    // Produto de R$ 28.000 à vista (1x)
    const evalLow = computePersonaAffordabilityAndMcFaddenUtility(
      lowIncomePersona,
      { unitPriceBrl: 28000, maxInstallments: 1 },
      signal,
    );
    const evalHigh = computePersonaAffordabilityAndMcFaddenUtility(
      highIncomePersona,
      { unitPriceBrl: 28000, maxInstallments: 1 },
      signal,
    );

    // A persona de baixa renda não tem solvência para R$ 28.000 à vista, logo P(Compra) é mecanicamente travada
    expect(evalLow.affordability_score).toBeLessThan(2);
    expect(evalLow.choice_probability_percent).toBeLessThan(15);
    expect(evalLow.price_perception).toBe("inacessivel");

    // A persona de alta renda tem solvência e alta utilidade McFadden
    expect(evalHigh.choice_probability_percent).toBeGreaterThan(evalLow.choice_probability_percent);
  });

  it("deve calcular Média Ponderada, Mediana, Moda por Kernel/Histograma, Desvio-Padrão, Curva de Demanda, Preço Ótimo P* e Cascata Chronos", () => {
    const { profiles } = generateStratifiedSyntheticCohort({
      count: 20,
      municipalityFilter: "Chapecó - SC",
      seed: "econ-suite-test",
    });

    const basePrice = 350;
    const signals: CognitivePersonaSignal[] = profiles.map((p, idx) => ({
      perceived_value_score: 7.5 + (idx % 3) * 0.5,
      trust_score: 8.0,
      ux_friction_score: 2.2,
      reservation_price_brl: Math.min(
        600,
        Math.max(180, (p.financial_sheet?.discretionary_surplus_brl || 800) * 0.35),
      ),
      primary_objection: "Avaliando frete e parcelamento",
      natural_speech_verbatim: "Boa proposta para a região.",
      social_feed_reaction: idx % 2 === 0 ? "share" : "like",
    }));

    const evaluations = profiles.map((p, idx) =>
      computePersonaAffordabilityAndMcFaddenUtility(
        p,
        { unitPriceBrl: basePrice, maxInstallments: 3 },
        signals[idx],
      ),
    );

    const summary = computeCohortDescriptiveAndEconometricStats(
      profiles,
      evaluations,
      signals,
      { unitPriceBrl: basePrice, maxInstallments: 3 },
    );

    expect(summary.mean_intent_percent).toBeGreaterThan(0);
    expect(summary.median_intent_percent).toBeGreaterThan(0);
    expect(summary.mode_intent_percent).toBeGreaterThanOrEqual(0);
    expect(summary.std_dev_intent).toBeGreaterThanOrEqual(0);
    expect(summary.mode_reservation_price_brl).toBeGreaterThan(0);
    expect(summary.optimal_price_point_brl).toBeGreaterThan(0);
    expect(summary.price_elasticity_score).toBeGreaterThanOrEqual(0);
    expect(summary.estimated_conversion_range).toHaveLength(2);
    expect(summary.estimated_conversion_range[1]).toBeGreaterThanOrEqual(
      summary.estimated_conversion_range[0],
    );

    // 5 pontos na curva de demanda (-20%, -10%, Base, +10%, +20%) e monotonicidade inversa de conversão com preço
    expect(summary.demand_curve_points).toHaveLength(5);
    expect(
      summary.demand_curve_points[0].conversion_probability_percent,
    ).toBeGreaterThanOrEqual(
      summary.demand_curve_points[4].conversion_probability_percent,
    );
    expect(summary.demand_curve_points.some((pt) => pt.is_optimal)).toBe(true);

    // Cascata Temporal Chronos de 4 marcos (Dia 1, 7, 15, 30) com receita acumulada crescente
    expect(summary.chronos_temporal_cascade).toHaveLength(4);
    expect(summary.chronos_temporal_cascade[0].day_milestone).toBe(1);
    expect(summary.chronos_temporal_cascade[3].day_milestone).toBe(30);
    expect(
      summary.chronos_temporal_cascade[3].expected_cumulative_revenue_brl,
    ).toBeGreaterThanOrEqual(
      summary.chronos_temporal_cascade[0].expected_cumulative_revenue_brl,
    );
  });

  it("deve calcular corretamente Moda, Mediana e Desvio-Padrão em coleções numéricas", () => {
    const sample = [190, 195, 200, 202, 205, 350, 480];
    const modeVal = computeHistogramMode(sample, 20);
    const medianVal = computeMedian(sample);
    const stdVal = computeStdDev(sample, 260.28);

    expect(modeVal).toBeGreaterThanOrEqual(190);
    expect(modeVal).toBeLessThanOrEqual(210);
    expect(medianVal).toBe(202);
    expect(stdVal).toBeGreaterThan(80);
  });
});
