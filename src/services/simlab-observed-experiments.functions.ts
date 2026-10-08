import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";
import {
  analyzeCampaignExperiment,
  fitRandomizedPriceResponse,
  holmAdjustPValues,
  type CampaignArmObservation,
  type CampaignExperimentAnalysis,
  type CampaignComparison,
  type PriceResponseModel,
} from "@/lib/simlab/experiment-statistics";

const OutcomeArmSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  assigned: z.number().int().positive().max(2_147_483_647),
  conversions: z.number().int().nonnegative().max(2_147_483_647),
  priceBrl: z.number().positive().finite().max(9_999_999_999.99)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, "O preço precisa ter no máximo duas casas decimais.")
    .nullable().optional(),
});

export const RecordObservedCampaignExperimentSchema = z.object({
  storeId: z.string().uuid(),
  experimentId: z.string().uuid(),
  controlKey: z.string().trim().min(1).max(80),
  assignmentMethod: z.enum(["randomized", "observational"]),
  randomizationUnit: z.enum(["customer", "session", "cluster", "not_applicable"]).nullable().optional(),
  measurementStart: z.string().datetime({ offset: true }),
  measurementEnd: z.string().datetime({ offset: true }),
  arms: z.array(OutcomeArmSchema).min(2).max(12),
  confidenceLevel: z.number().min(0.81).max(0.99).optional().default(0.95),
  sourceReference: z.string().trim().max(500).nullable().optional(),
}).superRefine((data, context) => {
  const randomizedUnits = ["customer", "session", "cluster"];
  if (data.assignmentMethod === "randomized" && !randomizedUnits.includes(data.randomizationUnit || "")) {
    context.addIssue({
      code: "custom",
      path: ["randomizationUnit"],
      message: "Informe se a randomização ocorreu por cliente, sessão ou cluster.",
    });
  }
  if (data.assignmentMethod === "observational" && data.randomizationUnit && data.randomizationUnit !== "not_applicable") {
    context.addIssue({
      code: "custom",
      path: ["randomizationUnit"],
      message: "Dados observacionais não podem declarar unidade randomizada.",
    });
  }
});

export type RecordObservedCampaignExperimentInput = z.infer<typeof RecordObservedCampaignExperimentSchema>;

export interface ObservedCampaignExperimentResult {
  success: true;
  sourceType: "user_reported";
  assignmentMethod: "randomized" | "observational";
  randomizationUnit: "customer" | "session" | "cluster" | "not_applicable" | null;
  analysis: CampaignExperimentAnalysis;
  priceResponse: PriceResponseModel | null;
  priceResponseStatus: "estimated" | "need_three_randomized_price_arms" | "not_randomized" | "unsupported_randomization_unit" | "incomplete_price_data";
  storedArmCount: number;
  limitations: string[];
}

export interface ObservedCampaignExperimentHistoryEntry extends ObservedCampaignExperimentResult {
  measurementStart: string;
  measurementEnd: string;
  sourceReference: string | null;
  recordedAt: string | null;
}

function withHolmAdjustment(
  analysis: CampaignExperimentAnalysis,
  confidenceLevel: number,
): CampaignExperimentAnalysis {
  const eligible = analysis.comparisons
    .map((comparison, index) => ({ comparison, index }))
    .filter(({ comparison }) => comparison.pValue != null);
  const adjustedValues = holmAdjustPValues(eligible.map(({ comparison }) => comparison.pValue!));
  const adjustedByIndex = new Map(eligible.map(({ index }, i) => [index, adjustedValues[i]]));

  const comparisons: CampaignComparison[] = analysis.comparisons.map((comparison, index) => {
    const adjustedPValue = adjustedByIndex.get(index);
    return {
      ...comparison,
      ...(adjustedPValue == null ? {} : {
        adjustedPValue,
        statisticallySignificant: adjustedPValue < (1 - confidenceLevel),
      }),
    };
  });

  return {
    ...analysis,
    comparisons,
    limitations: [
      ...analysis.limitations,
      ...(eligible.length > 0
        ? ["P-values das variantes contra o controle são ajustados pelo procedimento step-down de Holm; o intervalo por comparação permanece não ajustado."]
        : []),
    ],
  };
}

export const recordObservedCampaignExperiment = createServerFn({ method: "POST" })
  .validator(RecordObservedCampaignExperimentSchema)
  .handler(async ({ data }): Promise<ObservedCampaignExperimentResult> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"], data.storeId);
    const supabase = getServerClient();

    const { data: experiment, error: experimentError } = await supabase
      .from("simlab_market_experiments")
      .select("id, store_id")
      .eq("id", data.experimentId)
      .eq("store_id", data.storeId)
      .maybeSingle();
    if (experimentError) throw new Error(`Falha ao verificar o experimento: ${experimentError.message}`);
    if (!experiment) throw new Error("O experimento não existe neste workspace.");

    const arms: CampaignArmObservation[] = data.arms.map((arm) => ({
      key: arm.key,
      label: arm.label,
      assigned: arm.assigned,
      conversions: arm.conversions,
      priceBrl: arm.priceBrl == null ? null : Math.round(arm.priceBrl * 100) / 100,
    }));
    const rawAnalysis = analyzeCampaignExperiment({
      arms,
      controlKey: data.controlKey,
      assignmentMethod: data.assignmentMethod,
      randomizationUnit: data.randomizationUnit === "customer"
        ? "customer"
        : data.randomizationUnit === "session"
          ? "session"
          : data.randomizationUnit === "cluster"
            ? "cluster"
            : null,
      confidenceLevel: data.confidenceLevel,
    });
    const analysis = withHolmAdjustment(rawAnalysis, data.confidenceLevel);

    const measurementStart = new Date(data.measurementStart);
    const measurementEnd = new Date(data.measurementEnd);
    if (measurementEnd <= measurementStart) throw new Error("O fim da janela de medição deve ser posterior ao início.");

    const provenance = {
      record_kind: "observed_aggregate_outcome",
      entry_method: "workspace_user_reported",
      control_key: data.controlKey,
      source_reference: data.sourceReference || null,
      methodology: analysis.method,
      interval_method: analysis.intervalMethod,
      confidence_level: data.confidenceLevel,
      multiple_comparison_adjustment: "holm_step_down",
      causal_design_claim: data.assignmentMethod === "randomized" && data.randomizationUnit === "customer",
      individual_customer_data_stored: false,
      recorded_at: new Date().toISOString(),
    };

    const rows = arms.map((arm) => ({
      experiment_id: data.experimentId,
      store_id: data.storeId,
      variant_key: arm.key,
      variant_label: arm.label,
      assigned_units: arm.assigned,
      conversions: arm.conversions,
      price_brl: arm.priceBrl ?? null,
      assignment_method: data.assignmentMethod,
      randomization_unit: data.randomizationUnit || "not_applicable",
      measurement_start: measurementStart.toISOString(),
      measurement_end: measurementEnd.toISOString(),
      source_type: "user_reported",
      source_reference: data.sourceReference || null,
      provenance,
      created_by: identity.id,
    }));

    const { error: persistError } = await supabase
      .from("simlab_observed_campaign_arms")
      .upsert(rows, {
        onConflict: "experiment_id,measurement_start,measurement_end,variant_key",
      });
    if (persistError) throw new Error(`Falha ao salvar resultados agregados: ${persistError.message}`);

    let priceResponse: PriceResponseModel | null = null;
    let priceResponseStatus: ObservedCampaignExperimentResult["priceResponseStatus"];
    const hasAllPrices = arms.every((arm) => arm.priceBrl != null && arm.priceBrl > 0);
    const uniquePriceCount = new Set(arms.map((arm) => arm.priceBrl).filter((price): price is number => price != null)).size;

    if (data.assignmentMethod !== "randomized") {
      priceResponseStatus = "not_randomized";
    } else if (data.randomizationUnit !== "customer") {
      priceResponseStatus = "unsupported_randomization_unit";
    } else if (!hasAllPrices) {
      priceResponseStatus = "incomplete_price_data";
    } else if (uniquePriceCount < 3) {
      priceResponseStatus = "need_three_randomized_price_arms";
    } else {
      try {
        priceResponse = fitRandomizedPriceResponse({
          arms: arms as Array<CampaignArmObservation & { priceBrl: number }>,
          assignmentMethod: "randomized",
          randomizationUnit: "customer",
        });
        priceResponseStatus = "estimated";
      } catch {
        // A/B analysis remains valid even when this optional secondary model is not identifiable.
        priceResponseStatus = "incomplete_price_data";
      }
    }

    return {
      success: true,
      sourceType: "user_reported",
      assignmentMethod: data.assignmentMethod,
      randomizationUnit: data.randomizationUnit || null,
      analysis,
      priceResponse,
      priceResponseStatus,
      storedArmCount: rows.length,
      limitations: [
        ...analysis.limitations,
        "O registro foi informado pelo usuário; sem integração ou reconciliação com pedidos, exposição e atribuição, a Waesy não verificou a origem dos totais.",
        "Os resultados não devem ser projetados para milhões de pessoas sem validação prospectiva e avaliação de estabilidade por canal, local, período e segmento.",
      ],
    };
  });

export const listObservedCampaignExperimentHistory = createServerFn({ method: "GET" })
  .validator(z.object({
    storeId: z.string().uuid(),
    experimentId: z.string().uuid(),
  }))
  .handler(async ({ data }): Promise<ObservedCampaignExperimentHistoryEntry[]> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"], data.storeId);
    const supabase = getServerClient();

    const { data: experiment, error: experimentError } = await supabase
      .from("simlab_market_experiments")
      .select("id, store_id")
      .eq("id", data.experimentId)
      .eq("store_id", data.storeId)
      .maybeSingle();
    if (experimentError) throw new Error(`Falha ao verificar o experimento: ${experimentError.message}`);
    if (!experiment) throw new Error("O experimento não existe neste workspace.");

    const { data: storedRows, error } = await supabase
      .from("simlab_observed_campaign_arms")
      .select("variant_key, variant_label, assigned_units, conversions, price_brl, assignment_method, randomization_unit, measurement_start, measurement_end, source_type, source_reference, provenance, created_at")
      .eq("experiment_id", data.experimentId)
      .eq("store_id", data.storeId)
      .order("measurement_start", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Falha ao carregar o histórico observado: ${error.message}`);

    const groups = new Map<string, NonNullable<typeof storedRows>>();
    for (const row of storedRows || []) {
      const key = `${row.measurement_start}|${row.measurement_end}`;
      const group = groups.get(key) || [];
      group.push(row);
      groups.set(key, group);
    }

    const history: ObservedCampaignExperimentHistoryEntry[] = [];
    for (const rows of groups.values()) {
      const first = rows[0];
      if (!first || rows.length < 2) {
        throw new Error("O histórico contém uma janela incompleta; revise os braços persistidos antes de interpretar resultados.");
      }
      if (rows.some((row) => row.assignment_method !== first.assignment_method || row.randomization_unit !== first.randomization_unit)) {
        throw new Error("O histórico contém braços com desenhos incompatíveis na mesma janela de medição.");
      }

      const assignmentMethod = first.assignment_method as "randomized" | "observational";
      const randomizationUnit = first.randomization_unit as ObservedCampaignExperimentHistoryEntry["randomizationUnit"];
      const rawProvenance = first.provenance;
      const provenance = rawProvenance && typeof rawProvenance === "object" && !Array.isArray(rawProvenance)
        ? rawProvenance as Record<string, unknown>
        : {};
      const rawConfidence = Number(provenance.confidence_level);
      const confidenceLevel = Number.isFinite(rawConfidence) && rawConfidence > 0.8 && rawConfidence < 1
        ? rawConfidence
        : 0.95;
      const controlKey = typeof provenance.control_key === "string" ? provenance.control_key : "control";
      const arms: CampaignArmObservation[] = rows.map((row) => ({
        key: row.variant_key,
        label: row.variant_label,
        assigned: Number(row.assigned_units),
        conversions: Number(row.conversions),
        priceBrl: row.price_brl == null ? null : Number(row.price_brl),
      }));

      const analysis = withHolmAdjustment(analyzeCampaignExperiment({
        arms,
        controlKey,
        assignmentMethod,
        randomizationUnit: randomizationUnit === "not_applicable" ? null : randomizationUnit,
        confidenceLevel,
      }), confidenceLevel);
      const hasAllPrices = arms.every((arm) => arm.priceBrl != null && arm.priceBrl > 0);
      const uniquePriceCount = new Set(arms.map((arm) => arm.priceBrl).filter((price): price is number => price != null)).size;
      let priceResponse: PriceResponseModel | null = null;
      let priceResponseStatus: ObservedCampaignExperimentResult["priceResponseStatus"];
      if (assignmentMethod !== "randomized") priceResponseStatus = "not_randomized";
      else if (randomizationUnit !== "customer") priceResponseStatus = "unsupported_randomization_unit";
      else if (!hasAllPrices) priceResponseStatus = "incomplete_price_data";
      else if (uniquePriceCount < 3) priceResponseStatus = "need_three_randomized_price_arms";
      else {
        try {
          priceResponse = fitRandomizedPriceResponse({
            arms: arms as Array<CampaignArmObservation & { priceBrl: number }>,
            assignmentMethod: "randomized",
            randomizationUnit: "customer",
          });
          priceResponseStatus = "estimated";
        } catch {
          priceResponseStatus = "incomplete_price_data";
        }
      }

      history.push({
        success: true,
        sourceType: "user_reported",
        assignmentMethod,
        randomizationUnit,
        analysis,
        priceResponse,
        priceResponseStatus,
        storedArmCount: rows.length,
        measurementStart: first.measurement_start,
        measurementEnd: first.measurement_end,
        sourceReference: first.source_reference,
        recordedAt: first.created_at,
        limitations: [
          ...analysis.limitations,
          "O registro foi informado pelo usuário; a origem dos totais não foi verificada automaticamente.",
        ],
      });
    }

    return history;
  });
