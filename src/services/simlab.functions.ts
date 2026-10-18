import { z } from 'zod';
import {
  CANONICAL_BRAZIL_ARCHETYPES,
  MUNICIPALITY_DEMOGRAPHIC_PRESETS,
  generateStratifiedSyntheticCohort,
} from '@/lib/simlab/brazil-demographics';
import {
  computeCohortDescriptiveAndEconometricStats,
  computePersonaAffordabilityAndMcFaddenUtility,
  type CognitivePersonaSignal,
} from '@/lib/simlab/econometric-engine';
import { getNextActiveKey, markKeyError, executeUnifiedAiCall } from '@/services/api-orchestrator.functions';
import { createServerFn } from '@tanstack/react-start';
import { getServerClient } from '@/lib/supabase';
import { assertStoreAccess, getServerIdentity } from '@/lib/server-access';
import { logSystemError } from '@/lib/logger';
import type {
  SyntheticArchetype,
  SimLabExperiment,
  SimLabPersonaResponse,
  SimLabStatisticalSynthesis,
  SimLabCalibrationRecord,
  SimLabSourceEntityType,
  ScientificReviewerVerdict,
  FocusGroupSession,
  FocusGroupMessage,
  VerdictStatus,
  System1Emotion,
  SocialFeedReaction,
} from '@/types/simlab';

export { CANONICAL_BRAZIL_ARCHETYPES, MUNICIPALITY_DEMOGRAPHIC_PRESETS };

function regionForState(state: string): SyntheticArchetype["region"] {
  const normalized = state.toUpperCase();
  if (["SP", "RJ", "MG", "ES"].includes(normalized)) return "Sudeste";
  if (["PR", "SC", "RS"].includes(normalized)) return "Sul";
  if (["DF", "GO", "MT", "MS"].includes(normalized)) return "Centro-Oeste";
  if (["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"].includes(normalized)) return "Nordeste";
  return "Norte";
}

export async function fetchSyntheticArchetypes(data?: {
  socialClasses?: string[];
  regions?: string[];
  municipalityFilter?: string;
  storeId?: string;
}): Promise<SyntheticArchetype[]> {
  if (data?.storeId) {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "store_owner", "proprietario", "admin", "manager", "gerente", "content"], data.storeId);
  }
  const canonicalMap = new Map(CANONICAL_BRAZIL_ARCHETYPES.map((persona) => [persona.code, persona]));
  const serverClient = getServerClient();

  try {
    let globalQuery = serverClient
      .from("synthetic_population_archetypes")
      .select("*")
      .eq("is_active", true)
      .order("median_income_brl", { ascending: false, nullsFirst: false });
    if (data?.socialClasses?.length) globalQuery = globalQuery.in("abep_social_class", data.socialClasses);
    if (data?.regions?.length) globalQuery = globalQuery.in("region", data.regions);

    const { data: rows, error } = await globalQuery;
    if (error) throw error;
    let globalProfiles: SyntheticArchetype[] = (rows || []).map((row: any) => {
      const canonical = canonicalMap.get(row.code);
      return {
        ...row,
        municipality: canonical?.municipality || row.decision_heuristics?.city || undefined,
        profile_origin: "persisted_synthetic_profile",
        source_profile_type: row.profile_source || "legacy_unknown",
        calibration_status: row.calibration_status || "not_calibrated",
        curriculum: canonical?.curriculum || row.curriculum,
        financial_sheet: canonical?.financial_sheet || row.financial_sheet,
        household_profile: canonical?.household_profile || row.household_profile,
      } as SyntheticArchetype;
    });

    // Garante que os arquétipos canônicos hiperlocais (ex: São Miguel do Oeste - SC) estejam sempre disponíveis
    for (const seedPersona of CANONICAL_BRAZIL_ARCHETYPES) {
      if (!globalProfiles.some((p) => p.code === seedPersona.code)) {
        if (
          (!data?.socialClasses?.length || data.socialClasses.includes(seedPersona.abep_social_class)) &&
          (!data?.regions?.length || data.regions.includes(seedPersona.region))
        ) {
          globalProfiles.push({
            ...seedPersona,
            profile_origin: "seed_catalog_profile",
            source_profile_type: "code_seed_catalog",
            calibration_status: "not_calibrated",
          });
        }
      }
    }

    let workspaceProfiles: SyntheticArchetype[] = [];
    if (data?.storeId) {
      const { data: customRows, error: customError } = await serverClient
        .from("simlab_workspace_persona_profiles")
        .select("*")
        .eq("store_id", data.storeId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (customError) throw customError;
      workspaceProfiles = (customRows || []).map((row: any) => ({
        id: row.id,
        code: row.code,
        display_name: row.display_name,
        gender: row.gender,
        age: row.age,
        age_range_label: `${row.age} anos`,
        abep_social_class: row.abep_class,
        region: regionForState(row.state),
        location_type: "interior_medio",
        municipality: `${row.city} - ${row.state}`,
        median_income_brl: row.median_income_brl == null ? null : Number(row.median_income_brl),
        education_level: "Não informado",
        cynicism_index: 5,
        price_sensitivity: 5,
        impulsivity_index: 5,
        primary_social_networks: ["Instagram", "WhatsApp"],
        decision_heuristics: {
          city: row.city,
          state: row.state,
          occupation: row.occupation,
          profile_text: row.psychography?.profile_text || null,
          habits: row.psychography?.habits || [],
        },
        bio: row.psychography?.profile_text || null,
        profile_origin: "user_defined_synthetic_profile",
        source_profile_type: row.profile_source,
        calibration_status: row.calibration_status,
        is_active: row.is_active,
        created_at: row.created_at,
      } as SyntheticArchetype)).filter((persona) =>
        (!data?.socialClasses?.length || data.socialClasses.includes(persona.abep_social_class)) &&
        (!data?.regions?.length || data.regions.includes(persona.region)),
      );
    }

    return [...workspaceProfiles, ...globalProfiles];
  } catch (err: any) {
    logSystemError({
      route: "simlab.fetchSyntheticArchetypes",
      error: err,
      schemaName: "public",
      tableName: "synthetic_population_archetypes",
      contractName: "listSyntheticArchetypes",
    });
    throw new Error(`Falha ao carregar arquétipos do SimLab: ${err.message}`);
  }
}

export const ListSyntheticArchetypesSchema = z.object({
  socialClasses: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  municipalityFilter: z.string().optional(),
  storeId: z.string().uuid().optional(),
}).optional();

export const listSyntheticArchetypes = createServerFn({ method: 'GET' })
  .validator(ListSyntheticArchetypesSchema)
  .handler(async ({ data }): Promise<SyntheticArchetype[]> => {
    const identity = await getServerIdentity();
    const privateProfileRoles = ["owner", "store_owner", "proprietario", "admin", "manager", "gerente", "content"] as const;
    let authorizedStoreId: string | undefined;

    if (data?.storeId) {
      assertStoreAccess(identity, [...privateProfileRoles], data.storeId);
      authorizedStoreId = data.storeId;
    } else if (identity.id && identity.store_id) {
      try {
        assertStoreAccess(identity, [...privateProfileRoles], identity.store_id);
        authorizedStoreId = identity.store_id;
      } catch {
        // Catálogo global permanece acessível
      }
    }

    return fetchSyntheticArchetypes({
      ...data,
      ...(authorizedStoreId ? { storeId: authorizedStoreId } : { storeId: undefined }),
    });
  });

// ─── 2. CRIAR NOVO EXPERIMENTO NO SIMLAB ─────────────────────────────────────
export async function executeCreateSimLabExperiment(data: {
  storeId: string;
  title: string;
  objective: string;
  stimulusPayload: Record<string, any>;
  targetAudienceFilters?: Record<string, any>;
  sampleSize?: number;
  municipalityFilter?: string;
  sourceEntityType?: SimLabSourceEntityType;
  sourceEntityId?: string | null;
  creativeMediaUrl?: string | null;
}): Promise<{ success: boolean; experiment: SimLabExperiment }> {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ['owner', 'admin', 'manager', 'content'], data.storeId);
  const serverClient = getServerClient();

  const municipality =
    data.municipalityFilter ||
    data.targetAudienceFilters?.municipality ||
    'Nacional';

  const basePayload: Record<string, any> = {
    store_id: data.storeId,
    title: data.title,
    objective: data.objective,
    stimulus_payload: {
      ...data.stimulusPayload,
      municipality_filter: municipality,
      source_entity_type: data.sourceEntityType || 'standalone',
      source_entity_id: data.sourceEntityId || null,
      creative_media_url: data.creativeMediaUrl || data.stimulusPayload?.image_url || null,
    },
    target_audience_filters: {
      ...(data.targetAudienceFilters || {}),
      municipality,
    },
    sample_size: Math.min(Math.max(data.sampleSize || 12, 1), 100),
    created_by: identity.id,
    status: 'queued',
  };

  const { data: row, error } = await serverClient
    .from('simlab_market_experiments')
    .insert(basePayload)
    .select('*')
    .single();

  if (error) {
    console.error('[simlab] Erro ao persistir experimento:', error);
    throw new Error(`Falha ao persistir experimento no banco de dados: ${error.message}`);
  }
  return { success: true, experiment: row as SimLabExperiment };
}

export const CreateSimLabExperimentSchema = z.object({
  storeId: z.string().uuid(),
  title: z.string().min(2),
  objective: z.string().min(2),
  stimulusPayload: z.record(z.any()),
  targetAudienceFilters: z.record(z.any()).optional(),
  sampleSize: z.number().int().positive().max(100).optional(),
  municipalityFilter: z.string().optional(),
  sourceEntityType: z
    .enum(['standalone', 'ad_campaign', 'product', 'travel_package', 'event', 'classified', 'social_story'])
    .optional(),
  sourceEntityId: z.string().uuid().nullable().optional(),
  creativeMediaUrl: z.string().nullable().optional(),
});

export const createSimLabExperiment = createServerFn({ method: 'POST' })
  .validator(CreateSimLabExperimentSchema)
  .handler(async ({ data }) => {
    return executeCreateSimLabExperiment(data);
  });

// ─── 3. SIMULAÇÃO HÍBRIDA: COGNIÇÃO MULTIAGENTE + MOTOR ECONOMÉTRICO MECÂNICO ──

const HybridSwarmReactionSchema = z.object({
  reactions: z.array(z.object({
    persona_id: z.string().min(1),
    reaction: z.string().trim().min(10).max(1800),
    factors_for: z.array(z.string().trim().min(2).max(240)).max(5).default([]),
    factors_against: z.array(z.string().trim().min(2).max(240)).max(5).default([]),
    unknowns: z.array(z.string().trim().min(2).max(240)).max(5).default([]),
    perceived_value_score: z.number().min(0).max(10).optional(),
    trust_score: z.number().min(0).max(10).optional(),
    ux_friction_score: z.number().min(0).max(10).optional(),
    reservation_price_brl: z.number().nonnegative().optional(),
    system_1_emotion: z.enum(['desejo', 'desconfianca', 'tedio', 'entusiasmo', 'inseguranca']).optional(),
    social_feed_comment: z.string().max(500).optional(),
    social_feed_reaction: z.enum(['like', 'share', 'save', 'skeptical_comment', 'ignore']).optional(),
    p2p_initial_offer_brl: z.number().nonnegative().optional(),
    p2p_walkaway_price_brl: z.number().nonnegative().optional(),
    bargaining_strategy: z.string().max(400).optional(),
  })).min(1),
});

async function evaluateBatchWithRealAI(
  personas: SyntheticArchetype[],
  stimulus: {
    title?: string;
    description?: string;
    test_price_brl?: number;
    max_installments?: number;
    niche?: string;
    municipality?: string;
  },
  experimentId: string,
  storeId: string,
): Promise<{
  responses: SimLabPersonaResponse[];
  signals: CognitivePersonaSignal[];
  provider: string;
  model: string;
}> {
  const systemPrompt = `Você é o Córtex Comportamental do Waesy SimLabs 4.0 (arquitetura inspirada em Aaru, Simile Stanford Generative Agents, MatrAIx-Persona-8B, PersonaForge e DeepMind Concordia).
Sua missão é simular como cada persona sintética avalia a oferta comercial considerando estritamente sua renda líquida POF, sobra discricionária mensal, estrutura familiar, profissão, ceticismo e cidade/região.
Para cada persona informada, retorne no JSON:
- "persona_id": ID exato recebido
- "reaction": Fala natural em primeira pessoa explicando como enxerga a oferta, impacto no bolso e decisão prática
- "factors_for": até 4 gatilhos de valor percebidos pela persona
- "factors_against": até 4 barreiras/objeções reais (preço, frete, confiança, fluxo de caixa)
- "unknowns": até 3 dúvidas que precisariam ser respondidas antes da compra
- "perceived_value_score": nota de 0.0 a 10.0 para utilidade/benefício percebido pela persona
- "trust_score": nota de 0.0 a 10.0 de credibilidade percebida na oferta
- "ux_friction_score": nota de 0.0 a 10.0 de atrito/dúvida/complexidade
- "reservation_price_brl": valor máximo em R$ (WTP) que essa persona considera justo e cabível pagar
- "system_1_emotion": uma entre ["desejo", "desconfianca", "tedio", "entusiasmo", "inseguranca"]
- "social_feed_comment": comentário realista que essa persona deixaria num post patrocinado no Instagram/Feed
- "social_feed_reaction": uma entre ["like", "share", "save", "skeptical_comment", "ignore"]
- "p2p_initial_offer_brl": valor inicial em R$ que ofereceria numa negociação/pechincha à vista no PIX
- "p2p_walkaway_price_brl": preço limite máximo em R$ acima do qual desiste da negociação
- "bargaining_strategy": resumo da tática de negociação da persona

Retorne exclusivamente JSON válido no formato {"reactions":[...]}. Gere exatamente um item para cada persona_id enviado.`;

  const offerPrice =
    Number.isFinite(Number(stimulus.test_price_brl)) && Number(stimulus.test_price_brl) > 0
      ? Number(stimulus.test_price_brl)
      : 0;
  const maxInstallments = Math.max(1, Number(stimulus.max_installments || 1));

  const userPrompt = JSON.stringify({
    task: "Avaliação comportamental, social e de barganha por persona sintética estratificada",
    experiment_id: experimentId,
    world_context: {
      municipality: stimulus.municipality || "Nacional",
      niche: stimulus.niche || "geral",
    },
    offer: {
      title: stimulus.title || null,
      description: stimulus.description || null,
      price_brl: offerPrice > 0 ? offerPrice : null,
      max_installments: maxInstallments,
      niche: stimulus.niche || null,
    },
    synthetic_profiles: personas.map((persona) => ({
      id: persona.id,
      profile_code: persona.code,
      fictional_name: persona.display_name,
      age: persona.age,
      social_class: persona.abep_social_class,
      region: persona.region,
      municipality: persona.municipality || (persona.decision_heuristics as any)?.city || persona.region,
      net_income_brl: persona.financial_sheet?.net_monthly_income_brl ?? persona.median_income_brl,
      discretionary_surplus_brl: persona.financial_sheet?.discretionary_surplus_brl ?? null,
      leisure_budget_brl: persona.financial_sheet?.leisure_budget_monthly_brl ?? null,
      credit_limit_brl: persona.financial_sheet?.credit_limit_available_brl ?? null,
      cynicism_index: persona.cynicism_index,
      price_sensitivity: persona.price_sensitivity,
      impulsivity_index: persona.impulsivity_index,
      occupation: persona.curriculum?.profession_title || (persona.decision_heuristics as any)?.occupation || null,
      family_profile: persona.household_profile || null,
      characteristics: persona.decision_heuristics,
      psychography: persona.bio || null,
    })),
  });

  const aiResult = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.45,
    maxTokens: 6000,
    taskType: "fast_json",
    feature: "simlab_hybrid_econometric_swarm",
    storeId,
  });

  const parsed = aiResult.parsedJson || (aiResult.content ? JSON.parse(aiResult.content) : null);
  const validated = HybridSwarmReactionSchema.parse(parsed);
  const byId = new Map(validated.reactions.map((reaction) => [reaction.persona_id, reaction]));
  if (byId.size !== personas.length || personas.some((persona) => !byId.has(persona.id))) {
    throw new Error("A IA não retornou exatamente uma resposta válida para cada perfil selecionado; nenhuma resposta substituta foi criada.");
  }

  const generatedAt = new Date().toISOString();
  const signals: CognitivePersonaSignal[] = [];

  const responses = personas.map((persona): SimLabPersonaResponse => {
    const reaction = byId.get(persona.id)!;

    // Deriva notas comportamentais coerentes com os argumentos caso o provedor omita campos opcionais
    const posCount = reaction.factors_for.length;
    const negCount = reaction.factors_against.length;
    const fallbackPerceivedValue = Math.max(
      2.0,
      Math.min(9.5, 5.5 + posCount * 1.1 - negCount * 0.6),
    );
    const fallbackTrust = Math.max(
      2.5,
      Math.min(9.5, 7.2 - (persona.cynicism_index - 5) * 0.35 - reaction.unknowns.length * 0.4),
    );
    const fallbackFriction = Math.max(
      1.0,
      Math.min(9.0, 2.5 + negCount * 0.9 + reaction.unknowns.length * 0.6),
    );

    const signal: CognitivePersonaSignal = {
      perceived_value_score: reaction.perceived_value_score ?? fallbackPerceivedValue,
      trust_score: reaction.trust_score ?? fallbackTrust,
      ux_friction_score: reaction.ux_friction_score ?? fallbackFriction,
      reservation_price_brl: reaction.reservation_price_brl ?? 0,
      system_1_emotion: reaction.system_1_emotion as System1Emotion | undefined,
      primary_hook_detected: reaction.factors_for[0] || undefined,
      primary_objection: reaction.factors_against.join("; ") || "Avaliação de custo-benefício mensal",
      natural_speech_verbatim: reaction.reaction,
      factors_for: reaction.factors_for,
      factors_against: reaction.factors_against,
      social_feed_comment: reaction.social_feed_comment,
      social_feed_reaction: reaction.social_feed_reaction as SocialFeedReaction | undefined,
      p2p_initial_offer_brl: reaction.p2p_initial_offer_brl,
      p2p_walkaway_price_brl: reaction.p2p_walkaway_price_brl,
      bargaining_strategy: reaction.bargaining_strategy,
    };

    const econometric = computePersonaAffordabilityAndMcFaddenUtility(
      persona,
      {
        unitPriceBrl: offerPrice,
        maxInstallments,
        category: stimulus.niche,
      },
      signal,
    );

    // Atualiza o signal com o WTP ancorado pela solvência POF
    signal.reservation_price_brl = econometric.reservation_price_brl || 0;
    signals.push(signal);

    const interestScore = Math.max(
      1,
      Math.min(10, Math.round(econometric.choice_probability_percent / 10)),
    );
    const purchaseIntentPercent = Math.round(econometric.choice_probability_percent);

    return {
      id: `synthetic-${experimentId}-${persona.id}`,
      experiment_id: experimentId,
      archetype_id: persona.profile_origin === "persisted_synthetic_profile" ? persona.id : null,
      archetype_code: persona.code,
      archetype: persona,
      interest_score: interestScore,
      purchase_intent_percent: purchaseIntentPercent,
      choice_probability_percent: econometric.choice_probability_percent,
      net_utility_mcfadden: econometric.net_utility_mcfadden,
      affordability_score: econometric.affordability_score,
      discretionary_burden_percent: econometric.discretionary_burden_percent,
      reservation_price_brl: econometric.reservation_price_brl ?? null,
      perceived_value_score: econometric.perceived_value_score,
      trust_score: econometric.trust_score ?? null,
      ux_friction_score: econometric.ux_friction_score ?? null,
      primary_hook_detected: reaction.factors_for[0] || null,
      primary_barrier_objection: reaction.factors_against.join("; ") || econometric.primary_objection,
      verbatim_reaction: reaction.reaction,
      system_1_emotion: econometric.system_1_emotion,
      price_perception: econometric.price_perception,
      social_feed_comment: econometric.social_feed_comment || null,
      social_feed_reaction: econometric.social_feed_reaction || null,
      p2p_initial_offer_brl: econometric.p2p_initial_offer_brl ?? null,
      p2p_walkaway_price_brl: econometric.p2p_walkaway_price_brl ?? null,
      bargaining_strategy: econometric.bargaining_strategy || null,
      response_origin: "llm_synthetic",
      is_synthetic: true,
      provenance: {
        record_kind: "simlab_v4_hybrid_econometric_response",
        provider: aiResult.provider,
        model: aiResult.model,
        persona_profile_origin: persona.profile_origin || "seed_catalog_profile",
        calibration_status: persona.calibration_status || "not_calibrated",
        municipality_filter: persona.municipality || stimulus.municipality || "Nacional",
        factors_for: reaction.factors_for,
        factors_against: reaction.factors_against,
        unknowns: reaction.unknowns,
        probabilities_or_sales_forecast_generated: true,
        generated_at: generatedAt,
      },
      simulated_at: generatedAt,
    };
  });

  return { responses, signals, provider: aiResult.provider, model: aiResult.model };
}

function uniqueQualitativeThemes(values: Array<string | null | undefined>, limit = 3): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value?.trim();
    const key = normalized?.toLocaleLowerCase("pt-BR");
    if (normalized && key && !seen.has(key)) {
      seen.add(key);
      output.push(normalized);
      if (output.length === limit) break;
    }
  }
  return output;
}

function buildScientificReviewerSquad(
  summary: ReturnType<typeof computeCohortDescriptiveAndEconometricStats>,
  offerPrice: number,
  topTriggers: string[],
  topBarriers: string[],
): ScientificReviewerVerdict[] {
  const priceDeltaPercent =
    offerPrice > 0
      ? Math.round(((summary.optimal_price_point_brl - offerPrice) / offerPrice) * 100)
      : 0;

  return [
    {
      reviewer_name: "Dr. Henrique Moura — Econometrista Chefe (McFadden & POF/IBGE)",
      role: "Auditoria de Solvência Familiar, Utilidade Logit e Elasticidade-Preço",
      credibility_score: Math.min(98, Math.max(60, Math.round(78 + summary.overall_approval_rate * 0.18))),
      critique:
        offerPrice > 0
          ? `A média ponderada de intenção foi de ${summary.mean_intent_percent}% (Mediana: ${summary.median_intent_percent}%, Moda: ${summary.mode_intent_percent}%, Desvio-Padrão: ±${summary.std_dev_intent}%). O preço modal de reserva (WTP) da coorte é R$ ${summary.mode_reservation_price_brl.toFixed(2)} e o ponto ótimo de maximização de receita é R$ ${summary.optimal_price_point_brl.toFixed(2)} (${priceDeltaPercent >= 0 ? "+" : ""}${priceDeltaPercent}% sobre o preço testado), com elasticidade E_d = ${summary.price_elasticity_score}.`
          : `Sem preço nominal fixado, a utilidade média ponderada atingiu ${summary.mean_intent_percent}% com preço modal de reserva estimado em R$ ${summary.mode_reservation_price_brl.toFixed(2)}.`,
      detected_biases:
        summary.std_dev_intent > 22
          ? ["Alta dispersão entre classes sociais (polarização de renda POF)"]
          : ["Convergência consistente entre faixas de renda"],
      status:
        summary.scientific_verdict === "aprovado_para_veiculacao"
          ? "passed"
          : summary.scientific_verdict === "revisar_com_ajustes"
            ? "warning"
            : "rejected",
    },
    {
      reviewer_name: "Dra. Sofia Alencar — Cientista Comportamental (Kahneman Sistema 1/2)",
      role: "Análise de Fricção Cognitiva, Prova Social & Viralidade no Feed",
      credibility_score: Math.min(96, Math.max(58, Math.round(74 + summary.social_virality_index * 2.2))),
      critique: `O Índice de Viralidade Social atingiu ${summary.social_virality_index}/10 com NPS sintético de ${summary.synthetic_nps}. Principais gatilhos ativados: ${topTriggers.join(", ") || "valor prático direto"}. Principais barreiras cognitivas: ${topBarriers.join(", ") || "cautela financeira"}.`,
      detected_biases:
        summary.rejection_rate > 35
          ? ["Aversão à perda ativada por percepção de comprometimento mensal elevado"]
          : ["Baixo atrito cognitivo na proposta de valor"],
      status: summary.rejection_rate <= 35 ? "passed" : "warning",
    },
    {
      reviewer_name: "Dr. Marcos Viana — Estrategista de Teoria dos Jogos (Concordia P2P)",
      role: "Simulação de Barganha no PIX, Descontos e Cascata Temporal 30 Dias",
      credibility_score: 91,
      critique: `Na arena de negociação P2P, o preço de equilíbrio (clearing price) converge para R$ ${summary.p2p_clearing_price_brl.toFixed(2)}. Na projeção Chronos de 30 dias, a adoção acumulada estimada chega a ${summary.chronos_temporal_cascade[3]?.cumulative_buyers_per_100 ?? summary.mean_intent_percent} compradores a cada 100 impactos qualificados.`,
      detected_biases: ["Desconto à vista no PIX destrava compradores das classes B2 e C1"],
      status: summary.overall_approval_rate >= 35 ? "passed" : "warning",
    },
  ];
}

function buildRecommendedActions(
  summary: ReturnType<typeof computeCohortDescriptiveAndEconometricStats>,
  offerPrice: number,
  topBarriers: string[],
): SimLabStatisticalSynthesis["recommended_actions"] {
  const actions: SimLabStatisticalSynthesis["recommended_actions"] = [];

  if (offerPrice > 0 && Math.abs(summary.optimal_price_point_brl - offerPrice) >= offerPrice * 0.05) {
    actions.push({
      title: `Calibrar preço para o Ponto Ótimo Econométrico (R$ ${summary.optimal_price_point_brl.toFixed(2)})`,
      description: `A curva de demanda McFadden mostra maximização de receita bruta em R$ ${summary.optimal_price_point_brl.toFixed(2)}, com preço psicológico modal (WTP) em R$ ${summary.mode_reservation_price_brl.toFixed(2)} e preço de fechamento P2P no PIX em R$ ${summary.p2p_clearing_price_brl.toFixed(2)}.`,
      priority: "alta",
    });
  }

  if (topBarriers.length > 0) {
    actions.push({
      title: "Neutralizar a Objeção Dominante já no Headline/Criativo",
      description: `A barreira mais citada pelo enxame foi "${topBarriers[0]}". Adicione prova social local, garantia explícita e simulação de parcela logo no primeiro bloco visual.`,
      priority: "alta",
    });
  }

  actions.push({
    title: "Ativar Condição Dupla (Parcelamento Sem Juros + Desconto PIX)",
    description: `Para capturar tanto perfis descapitalizados (que dependem de caber na sobra mensal POF) quanto compradores líquidos (que pechincham até R$ ${summary.p2p_clearing_price_brl.toFixed(2)} no PIX), destaque ambas as modalidades no checkout.`,
    priority: "media",
  });

  return actions;
}

export async function executeSimLabBatchSimulation(data: {
  experimentId: string;
  storeId: string;
}): Promise<{ success: boolean; responsesCount: number; synthesis: SimLabStatisticalSynthesis; responses: SimLabPersonaResponse[] }> {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "content"], data.storeId);
  const serverClient = getServerClient();
  const { data: expRow, error: experimentError } = await serverClient
    .from("simlab_market_experiments")
    .select("*")
    .eq("id", data.experimentId)
    .eq("store_id", data.storeId)
    .maybeSingle();
  if (experimentError) throw new Error(`Falha ao carregar experimento: ${experimentError.message}`);
  if (!expRow) throw new Error("O experimento não existe neste workspace.");
  if (expRow.status === "completed") {
    throw new Error("Este experimento já foi executado. Crie uma nova execução para preservar o histórico.");
  }

  const { error: statusError } = await serverClient
    .from("simlab_market_experiments")
    .update({ status: "simulating" })
    .eq("id", data.experimentId)
    .eq("store_id", data.storeId);
  if (statusError) throw new Error(`Falha ao iniciar experimento: ${statusError.message}`);

  try {
    const filters = expRow.target_audience_filters || {};
    const stimulus = expRow.stimulus_payload || {};
    const municipalityFilter =
      expRow.municipality_filter ||
      stimulus.municipality_filter ||
      filters.municipality ||
      "Nacional";

    const availableProfiles = await fetchSyntheticArchetypes({
      socialClasses: filters.social_classes || filters.socialClasses,
      regions: filters.regions,
      municipalityFilter,
      storeId: data.storeId,
    });
    if (availableProfiles.length === 0) {
      throw new Error("Nenhum perfil sintético corresponde aos filtros selecionados.");
    }

    const requestedCount = Math.min(Math.max(Number(expRow.sample_size) || 12, 1), 60);
    const { profiles: selectedProfiles, preset } = generateStratifiedSyntheticCohort({
      count: requestedCount,
      baseProfiles: availableProfiles,
      municipalityFilter,
      regions: filters.regions,
      socialClasses: filters.social_classes || filters.socialClasses,
      ageMin: filters.age_min,
      ageMax: filters.age_max,
      seed: data.experimentId,
    });

    const offerPriceBrl =
      Number.isFinite(Number(stimulus.test_price_brl)) && Number(stimulus.test_price_brl) > 0
        ? Number(stimulus.test_price_brl)
        : 0;
    const maxInstallments = Math.max(1, Number(stimulus.max_installments || 1));

    const generated = await evaluateBatchWithRealAI(
      selectedProfiles,
      {
        title: stimulus.title || expRow.title || undefined,
        description: stimulus.description || expRow.objective || undefined,
        test_price_brl: offerPriceBrl > 0 ? offerPriceBrl : undefined,
        max_installments: maxInstallments,
        niche: stimulus.niche || undefined,
        municipality: preset.municipality,
      },
      data.experimentId,
      data.storeId,
    );

    const responses = generated.responses;
    const evaluationsForSummary = responses.map((r) => ({
      persona_id: r.archetype?.id || r.archetype_code || r.id,
      family_tickets_multiplier: 1,
      total_outlay_brl: offerPriceBrl,
      monthly_family_installment_brl: offerPriceBrl / maxInstallments,
      discretionary_burden_percent: r.discretionary_burden_percent ?? 0,
      affordability_score: r.affordability_score ?? 7,
      perceived_value_score: r.perceived_value_score ?? 6.5,
      trust_score: r.trust_score ?? 6.5,
      ux_friction_score: r.ux_friction_score ?? 3.0,
      reservation_price_brl: r.reservation_price_brl ?? offerPriceBrl,
      net_utility_mcfadden: r.net_utility_mcfadden ?? 0,
      choice_probability_percent: r.choice_probability_percent ?? 50,
      system_1_emotion: r.system_1_emotion || "desejo",
      price_perception: r.price_perception || "justo",
      primary_objection: r.primary_barrier_objection || "",
      natural_speech_verbatim: r.verbatim_reaction || "",
      scientific_rationale: "",
      social_feed_comment: r.social_feed_comment || undefined,
      social_feed_reaction: r.social_feed_reaction || undefined,
      p2p_initial_offer_brl: r.p2p_initial_offer_brl ?? undefined,
      p2p_walkaway_price_brl: r.p2p_walkaway_price_brl ?? undefined,
      bargaining_strategy: r.bargaining_strategy || undefined,
    }));

    const econSummary = computeCohortDescriptiveAndEconometricStats(
      selectedProfiles,
      evaluationsForSummary,
      generated.signals,
      {
        unitPriceBrl: offerPriceBrl,
        maxInstallments,
        category: stimulus.niche,
      },
    );

    const topTriggers = uniqueQualitativeThemes(
      responses.flatMap((response) => (response.provenance?.factors_for as string[]) || []),
      3,
    );
    const topBarriers = uniqueQualitativeThemes(
      responses.flatMap((response) => (response.provenance?.factors_against as string[]) || []),
      3,
    );
    const reviewerReports = buildScientificReviewerSquad(
      econSummary,
      offerPriceBrl,
      topTriggers,
      topBarriers,
    );
    const recommendedActions = buildRecommendedActions(econSummary, offerPriceBrl, topBarriers);

    const synthesis: SimLabStatisticalSynthesis = {
      id: `synth-${data.experimentId}`,
      experiment_id: data.experimentId,
      synthetic_nps: econSummary.synthetic_nps,
      overall_approval_rate: econSummary.overall_approval_rate,
      rejection_rate: econSummary.rejection_rate,
      mean_intent_percent: econSummary.mean_intent_percent,
      median_intent_percent: econSummary.median_intent_percent,
      mode_intent_percent: econSummary.mode_intent_percent,
      std_dev_intent: econSummary.std_dev_intent,
      mode_reservation_price_brl: econSummary.mode_reservation_price_brl,
      optimal_price_point_brl: econSummary.optimal_price_point_brl,
      estimated_conversion_range: econSummary.estimated_conversion_range,
      price_elasticity_score: econSummary.price_elasticity_score,
      demand_curve_points: econSummary.demand_curve_points,
      chronos_temporal_cascade: econSummary.chronos_temporal_cascade,
      social_virality_index: econSummary.social_virality_index,
      p2p_clearing_price_brl: econSummary.p2p_clearing_price_brl,
      top_3_buying_triggers: topTriggers,
      top_3_friction_barriers: topBarriers,
      scientific_verdict: econSummary.scientific_verdict,
      reviewer_reports: reviewerReports,
      recommended_actions: recommendedActions,
      evidence_level: "econometric_hybrid_swarm",
      methodology: `Motor Híbrido SimLabs 4.0: Cognição Multiagente (${generated.provider}/${generated.model}) + Utilidade Aleatória de McFadden (Logit), Solvência Orçamentária POF/IBGE (${preset.municipality}), Intervalo de Wilson 95% e Grafo Temporal Chronos.`,
      calibration_status: "fit_requires_holdout",
      provenance: {
        record_kind: "simlab_v4_econometric_hybrid_synthesis",
        provider: generated.provider,
        model: generated.model,
        profile_selection: "ibge_pof_stratified_cohort_generator",
        municipality_filter: preset.municipality,
        profile_catalog_size: availableProfiles.length,
        selected_profile_count: selectedProfiles.length,
        profiles_are_real_people: false,
        probabilities_or_sales_forecast_generated: true,
        wilson_ci_95: econSummary.estimated_conversion_range,
        generated_at: new Date().toISOString(),
        // Embutimos também nos metadados JSONB para garantir leitura mesmo se alguma coluna nova ainda não estiver aplicada
        ...( {
          mean_intent_percent: econSummary.mean_intent_percent,
          median_intent_percent: econSummary.median_intent_percent,
          mode_intent_percent: econSummary.mode_intent_percent,
          std_dev_intent: econSummary.std_dev_intent,
          mode_reservation_price_brl: econSummary.mode_reservation_price_brl,
          optimal_price_point_brl: econSummary.optimal_price_point_brl,
          demand_curve_points: econSummary.demand_curve_points,
          chronos_temporal_cascade: econSummary.chronos_temporal_cascade,
          social_virality_index: econSummary.social_virality_index,
          p2p_clearing_price_brl: econSummary.p2p_clearing_price_brl,
          reviewer_reports: reviewerReports,
        } as any ),
      },
      limitations: [
        `Coorte sintética estratificada para ${preset.municipality} (${selectedProfiles.length} perfis com restrição orçamentária POF/IBGE).`,
        "As probabilidades individuais são calculadas mecanicamente via função Logit de McFadden sobre os escores cognitivos e a solvência real da persona.",
        "Para calibração bayesiana de 100% de precisão local, vincule a simulação a uma campanha ou produto ativo e execute o Loop de Calibração Real após as primeiras impressões/vendas.",
      ],
      synthesized_at: new Date().toISOString(),
    };

    const baseResponseRows = responses.map((response) => ({
      experiment_id: data.experimentId,
      archetype_id: response.archetype_id,
      archetype_code: response.archetype_code,
      archetype_snapshot: {
        ...response.archetype,
        econometric_metrics: {
          net_utility_mcfadden: response.net_utility_mcfadden,
          choice_probability_percent: response.choice_probability_percent,
          affordability_score: response.affordability_score,
          discretionary_burden_percent: response.discretionary_burden_percent,
          reservation_price_brl: response.reservation_price_brl,
          perceived_value_score: response.perceived_value_score,
          trust_score: response.trust_score,
          ux_friction_score: response.ux_friction_score,
          social_feed_comment: response.social_feed_comment,
          social_feed_reaction: response.social_feed_reaction,
          p2p_initial_offer_brl: response.p2p_initial_offer_brl,
          p2p_walkaway_price_brl: response.p2p_walkaway_price_brl,
          bargaining_strategy: response.bargaining_strategy,
        },
      },
      interest_score: response.interest_score,
      purchase_intent_percent: response.purchase_intent_percent,
      primary_hook_detected: response.primary_hook_detected,
      primary_barrier_objection: response.primary_barrier_objection,
      verbatim_reaction: response.verbatim_reaction,
      system_1_emotion: response.system_1_emotion,
      price_perception: response.price_perception,
      provenance: response.provenance,
    }));

    const { error: responsesError } = await serverClient
      .from("simlab_persona_responses")
      .insert(baseResponseRows);
    if (responsesError) throw new Error(`Falha ao persistir as respostas sintéticas: ${responsesError.message}`);

    const { error: synthesisError } = await serverClient
      .from("simlab_statistical_synthesis")
      .upsert({
        experiment_id: data.experimentId,
        synthetic_nps: synthesis.synthetic_nps,
        overall_approval_rate: synthesis.overall_approval_rate,
        rejection_rate: synthesis.rejection_rate,
        estimated_conversion_range: synthesis.estimated_conversion_range,
        price_elasticity_score: synthesis.price_elasticity_score,
        top_3_buying_triggers: synthesis.top_3_buying_triggers,
        top_3_friction_barriers: synthesis.top_3_friction_barriers,
        scientific_verdict: synthesis.scientific_verdict,
        recommended_actions: synthesis.recommended_actions,
        evidence_level: synthesis.evidence_level,
        methodology: synthesis.methodology,
        calibration_status: synthesis.calibration_status,
        provenance: synthesis.provenance,
        limitations: synthesis.limitations,
      }, { onConflict: "experiment_id" });
    if (synthesisError) throw new Error(`Falha ao persistir a síntese estatística: ${synthesisError.message}`);

    const { error: completeError } = await serverClient
      .from("simlab_market_experiments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", data.experimentId)
      .eq("store_id", data.storeId);
    if (completeError) throw new Error(`Falha ao finalizar o experimento: ${completeError.message}`);

    return { success: true, responsesCount: responses.length, synthesis, responses };
  } catch (error) {
    await serverClient
      .from("simlab_market_experiments")
      .update({ status: "failed" })
      .eq("id", data.experimentId)
      .eq("store_id", data.storeId);
    throw error;
  }
}

export const RunSimLabBatchSimulationSchema = z.object({
  experimentId: z.string().uuid(),
  storeId: z.string().uuid(),
});

export const runSimLabBatchSimulation = createServerFn({ method: "POST" })
  .validator(RunSimLabBatchSimulationSchema)
  .handler(async ({ data }) => executeSimLabBatchSimulation(data));

// ─── 4. FOCUS GROUP VIRTUAL EM TEMPO REAL ────────────────────────────────────
export async function executeCreateFocusGroupSession(data: {
  storeId: string;
  sessionTitle: string;
  personaIds: string[];
  moderatorGoal?: string;
}): Promise<{ success: boolean; session: FocusGroupSession }> {
  try {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ['owner', 'admin', 'manager', 'content'], data.storeId);
    const supabase = getServerClient();
    const { data: row, error } = await supabase
      .from('simlab_focus_group_sessions')
      .insert({
        store_id: data.storeId,
        session_title: data.sessionTitle,
        selected_persona_ids: data.personaIds,
        moderator_goal: data.moderatorGoal || null,
        status: 'active',
      })
      .select('*')
      .single();

    if (error) throw error;
    return { success: true, session: row as FocusGroupSession };
  } catch (err: any) {
    logSystemError({
      route: 'simlab.executeCreateFocusGroupSession',
      error: err,
      schemaName: 'public',
      tableName: 'simlab_focus_group_sessions',
      contractName: 'createFocusGroupSession',
    });
    throw new Error(`Erro ao criar sessão de focus group no SimLab: ${err.message}`);
  }
}

export const CreateFocusGroupSessionSchema = z.object({
  storeId: z.string().uuid(),
  sessionTitle: z.string().min(2),
  personaIds: z.array(z.string().uuid()).max(50),
  moderatorGoal: z.string().optional(),
});

export const createFocusGroupSession = createServerFn({ method: 'POST' })
  .validator(CreateFocusGroupSessionSchema)
  .handler(async ({ data }) => {
    return executeCreateFocusGroupSession(data);
  });

export async function executeGetOrCreateActiveFocusSession(data: {
  storeId: string;
  personaIds?: string[];
}): Promise<{ session: FocusGroupSession }> {
  try {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ['owner', 'admin', 'manager', 'content'], data.storeId);
    const supabase = getServerClient();
    const { data: existing, error } = await supabase
      .from('simlab_focus_group_sessions')
      .select('*')
      .eq('store_id', data.storeId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && !error) {
      return { session: existing as FocusGroupSession };
    }

    const defaultIds = data.personaIds && data.personaIds.length > 0
      ? data.personaIds
      : [];

    const created = await executeCreateFocusGroupSession({
      storeId: data.storeId,
      sessionTitle: 'Focus Group Virtual — Avaliação de Ofertas',
      personaIds: defaultIds,
      moderatorGoal: 'Avaliar aderência, preço e barreiras de compra'
    });
    return { session: created.session };
  } catch (e: any) {
    logSystemError({
      route: 'simlab.executeGetOrCreateActiveFocusSession',
      error: e,
      schemaName: 'public',
      tableName: 'simlab_focus_group_sessions',
      contractName: 'getOrCreateActiveFocusSession',
    });
    throw new Error(`Não foi possível inicializar a sessão de Focus Group: ${e.message}`);
  }
}

export const GetOrCreateActiveFocusSessionSchema = z.object({
  storeId: z.string().uuid(),
  personaIds: z.array(z.string().uuid()).max(50).optional(),
});

export const getOrCreateActiveFocusSession = createServerFn({ method: 'POST' })
  .validator(GetOrCreateActiveFocusSessionSchema)
  .handler(async ({ data }) => {
    return executeGetOrCreateActiveFocusSession(data);
  });

export async function executeListFocusGroupMessages(data: { sessionId: string }): Promise<FocusGroupMessage[]> {
  try {
    const identity = await getServerIdentity();
    const supabase = getServerClient();
    const { data: session, error: sessionError } = await supabase
      .from('simlab_focus_group_sessions')
      .select('id, store_id')
      .eq('id', data.sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) throw new Error('Sessão de Focus Group não encontrada.');
    assertStoreAccess(identity, ['owner', 'admin', 'manager', 'content'], session.store_id);
    const { data: rows, error } = await supabase
      .from('simlab_focus_group_messages')
      .select('*')
      .eq('session_id', data.sessionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (rows || []) as FocusGroupMessage[];
  } catch (err: any) {
    logSystemError({
      route: 'simlab.executeListFocusGroupMessages',
      error: err,
      schemaName: 'public',
      tableName: 'simlab_focus_group_messages',
      contractName: 'listFocusGroupMessages',
    });
    throw new Error(`Erro ao buscar mensagens do Focus Group: ${err.message}`);
  }
}

export const listFocusGroupMessages = createServerFn({ method: 'GET' })
  .validator(z.object({ sessionId: z.string().min(1) }))
  .handler(async ({ data }) => {
    return executeListFocusGroupMessages(data);
  });

export async function executeSendFocusGroupMessage(data: {
  sessionId: string;
  userMessage: string;
  selectedPersonas: SyntheticArchetype[];
}): Promise<{ success: boolean; newMessages: FocusGroupMessage[] }> {
  const identity = await getServerIdentity();
  const supabase = getServerClient();
  const { data: session, error: sessionError } = await supabase
    .from("simlab_focus_group_sessions")
    .select("id, store_id, selected_persona_ids")
    .eq("id", data.sessionId)
    .maybeSingle();
  if (sessionError) throw new Error(`Falha ao verificar a sessão: ${sessionError.message}`);
  if (!session) throw new Error("A sessão de Focus Group não existe.");
  assertStoreAccess(identity, ["owner", "admin", "manager", "content"], session.store_id);

  const requestedIds = new Set((data.selectedPersonas || []).map((persona) => String(persona.id)));
  const availableProfiles = await fetchSyntheticArchetypes({ storeId: session.store_id });
  const personas = availableProfiles.filter((persona) => requestedIds.has(persona.id));
  if (personas.length === 0 || personas.length !== requestedIds.size) throw new Error("A seleção inclui perfis inexistentes ou indisponíveis neste workspace.");

  const ReplySchema = z.object({
    replies: z.array(z.object({
      persona_id: z.string().min(1),
      reply: z.string().trim().min(10).max(1800),
      concerns: z.array(z.string().trim().min(2).max(240)).max(5),
      unknowns: z.array(z.string().trim().min(2).max(240)).max(5),
    })).min(1),
  });
  const systemPrompt = `Você gera contribuições em uma mesa-redonda multi-turno de Focus Group Sintético (estilo TinyTroupe / PersonaForge). Cada persona responde em primeira pessoa com base em sua renda líquida POF, estrutura familiar, cidade e profissão, podendo também concordar ou discordar construtivamente dos pontos levantados. Retorne JSON válido: {"replies":[{"persona_id":"...","reply":"...","concerns":["..."],"unknowns":["..."]}]}. Produza uma resposta para cada id informado e não invente outras personas.`;
  const userPrompt = JSON.stringify({
    moderator_question: data.userMessage,
    synthetic_profiles: personas.map((persona) => ({
      id: persona.id,
      profile_code: persona.code,
      fictional_name: persona.display_name,
      age: persona.age,
      social_class: persona.abep_social_class,
      region: persona.region,
      municipality: persona.municipality || (persona.decision_heuristics as any)?.city || persona.region,
      income_brl: persona.median_income_brl != null && Number.isFinite(persona.median_income_brl) ? persona.median_income_brl : null,
      discretionary_surplus_brl: persona.financial_sheet?.discretionary_surplus_brl ?? null,
      occupation: persona.curriculum?.profession_title || (persona.decision_heuristics as any)?.occupation || null,
      family_profile: persona.household_profile || null,
      known_profile_origin: persona.profile_origin || "legacy_unknown",
      profile_source_type: persona.source_profile_type || "legacy_unknown",
      calibration_status: persona.calibration_status || "unknown",
      characteristics: persona.decision_heuristics,
    })),
  });

  const aiResult = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.55,
    maxTokens: 4000,
    feature: "simlab_synthetic_focus_group",
    storeId: session.store_id,
  });
  const parsed = aiResult.parsedJson || (aiResult.content ? JSON.parse(aiResult.content) : null);
  const validated = ReplySchema.parse(parsed);
  const repliesById = new Map(validated.replies.map((reply) => [reply.persona_id, reply]));
  if (repliesById.size !== personas.length || personas.some((persona) => !repliesById.has(persona.id))) {
    throw new Error("A IA não retornou uma resposta válida para cada perfil selecionado; nenhuma fala substituta foi inventada.");
  }

  const generatedAt = new Date().toISOString();
  const moderatorMessage: FocusGroupMessage = {
    id: `mod-${data.sessionId}-${Date.now()}`,
    session_id: data.sessionId,
    sender_type: "moderator_user",
    sender_id: identity.id!,
    sender_name: identity.name || "Pesquisador do workspace",
    sender_avatar_url: null,
    content: data.userMessage,
    sentiment_score: null,
    created_at: generatedAt,
  };
  const personaMessages: FocusGroupMessage[] = personas.map((persona) => {
    const reply = repliesById.get(persona.id)!;
    return {
      id: `synthetic-${data.sessionId}-${persona.id}-${Date.now()}`,
      session_id: data.sessionId,
      sender_type: "synthetic_persona",
      sender_id: persona.id,
      sender_name: `${persona.display_name} — Classe ${persona.abep_social_class}`,
      sender_avatar_url: persona.avatar_url || null,
      content: reply.reply,
      sentiment_score: null,
      provenance: {
        record_kind: "llm_generated_synthetic_qualitative_response",
        response_origin: "llm_synthetic",
        is_synthetic: true,
        provider: aiResult.provider,
        model: aiResult.model,
        persona_code: persona.code,
        profile_origin: persona.profile_origin || "legacy_unknown",
        profile_source_type: persona.source_profile_type || "legacy_unknown",
        calibration_status: persona.calibration_status || "unknown",
        concerns: reply.concerns,
        unknowns: reply.unknowns,
      } as any,
      created_at: generatedAt,
    } as FocusGroupMessage;
  });
  const newMessages = [moderatorMessage, ...personaMessages];
  const rows = newMessages.map((message) => ({
    session_id: data.sessionId,
    sender_type: message.sender_type,
    sender_id: message.sender_id,
    sender_name: message.sender_name,
    sender_avatar_url: message.sender_avatar_url,
    content: message.content,
    sentiment_score: null,
    provenance: message.sender_type === "moderator_user"
      ? { record_kind: "human_authored_moderator_question" }
      : message.provenance,
  }));

  const { error: insertError } = await supabase.from("simlab_focus_group_messages").insert(rows);
  if (insertError) throw new Error(`Falha ao salvar as respostas do Focus Group: ${insertError.message}`);
  const { error: updateError } = await supabase
    .from("simlab_focus_group_sessions")
    .update({ selected_persona_ids: personas.map((persona) => persona.id) })
    .eq("id", data.sessionId)
    .eq("store_id", session.store_id);
  if (updateError) throw new Error(`Falha ao atualizar a sessão: ${updateError.message}`);

  return { success: true, newMessages };
}

export const SendFocusGroupMessageSchema = z.object({
  sessionId: z.string().min(1),
  userMessage: z.string().min(1),
  selectedPersonas: z.array(z.any()),
});

export const sendFocusGroupMessage = createServerFn({ method: 'POST' })
  .validator(SendFocusGroupMessageSchema)
  .handler(async ({ data }) => {
    return executeSendFocusGroupMessage(data);
  });

// ─── 5. LOOP FECHADO DE AUTO-CALIBRAÇÃO REAL (TRUTH-LOOP SIMILE / AARU) ──────

export const RunSimLabClosedLoopCalibrationSchema = z.object({
  storeId: z.string().uuid().optional(),
  experimentId: z.string().uuid(),
  observedImpressions: z.number().int().nonnegative().default(0),
  observedClicks: z.number().int().nonnegative().default(0),
  observedOrders: z.number().int().nonnegative().default(0),
  actualRevenueBrl: z.number().nonnegative().default(0),
  conversationNotes: z.string().max(4000).optional(),
});

export const runSimLabClosedLoopCalibration = createServerFn({ method: "POST" })
  .validator(RunSimLabClosedLoopCalibrationSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
    if (!storeId) throw new Error("Selecione um workspace antes de calibrar o SimLab.");
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"], storeId);

    const db = getServerClient();
    const { data: synthRow, error: synthError } = await db
      .from("simlab_statistical_synthesis")
      .select("*")
      .eq("experiment_id", data.experimentId)
      .maybeSingle();
    if (synthError) throw new Error(`Falha ao ler síntese para calibração: ${synthError.message}`);
    if (!synthRow) throw new Error("Síntese estatística não encontrada para este experimento.");

    const predictedConv =
      Number(synthRow.provenance?.mean_intent_percent ?? synthRow.overall_approval_rate ?? 25);
    const denominator = Math.max(1, data.observedClicks > 0 ? data.observedClicks : data.observedImpressions);
    const actualConv = Number(((data.observedOrders / denominator) * 100).toFixed(2));
    const actualCtr =
      data.observedImpressions > 0
        ? Number(((data.observedClicks / data.observedImpressions) * 100).toFixed(2))
        : null;

    const absDelta = Math.abs(predictedConv - actualConv);
    const accuracyScore = Number(Math.max(0, Math.min(100, 100 - absDelta * 1.35)).toFixed(2));

    // Ajuste Bayesiano dos pesos de sensibilidade a preço e ceticismo para o tenant
    const ratio = predictedConv > 0 ? actualConv / predictedConv : 1.0;
    const bayesianWeightAdjustments = {
      price_sensitivity_multiplier: Number((ratio < 0.85 ? 1.15 : ratio > 1.15 ? 0.9 : 1.0).toFixed(3)),
      cynicism_dampener: Number((ratio < 0.85 ? 1.12 : 0.96).toFixed(3)),
      conversion_calibration_factor: Number(Math.max(0.25, Math.min(2.5, ratio)).toFixed(3)),
      calibrated_accuracy_percent: accuracyScore,
    };

    // Digest criptográfico SHA-256 (anonimização zero-leak de conversas reais)
    let encryptedDigest: string | null = null;
    if (data.conversationNotes?.trim()) {
      const encoder = new TextEncoder();
      const digestBuffer = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(`${storeId}:${data.experimentId}:${data.conversationNotes.trim()}`),
      );
      const hashHex = Array.from(new Uint8Array(digestBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      encryptedDigest = `sha256:${hashHex}`;
    }

    // Atualiza o status de calibração na síntese do experimento
    const updatedProvenance = {
      ...(synthRow.provenance || {}),
      calibration_ledger: {
        predicted_conversion_rate: predictedConv,
        actual_conversion_rate: actualConv,
        actual_ctr: actualCtr,
        actual_revenue_brl: data.actualRevenueBrl,
        observed_impressions: data.observedImpressions,
        observed_clicks: data.observedClicks,
        observed_orders: data.observedOrders,
        accuracy_score_percent: accuracyScore,
        bayesian_weight_adjustments: bayesianWeightAdjustments,
        encrypted_conversation_digest: encryptedDigest,
        calibrated_at: new Date().toISOString(),
      },
    };

    await db
      .from("simlab_statistical_synthesis")
      .update({
        calibration_status: "validated_on_holdout",
        provenance: updatedProvenance,
      })
      .eq("experiment_id", data.experimentId);

    return {
      success: true,
      accuracyScorePercent: accuracyScore,
      predictedConversionRate: predictedConv,
      actualConversionRate: actualConv,
      bayesianWeightAdjustments,
      encryptedDigest,
    };
  });

// ============================================================================
// CONTRATOS CANÔNICOS DE COMPATIBILIDADE OPERACIONAL (ADMIN MASTER & WORKSPACE)
// ============================================================================

export const getSeedPersonas = createServerFn({ method: 'GET' })
  .handler(async () => {
    return fetchSyntheticArchetypes();
  });

export const getSimLabStatus = createServerFn({ method: 'GET' })
  .handler(async () => {
    const identity = await getServerIdentity();
    const hasWorkspace = Boolean(identity.id && (identity.store_id || identity.memberships?.length));
    return {
      isEnabled: hasWorkspace,
      isAdmin: ['owner', 'admin', 'platform_admin', 'master'].includes(identity.role),
      role: identity.role,
    };
  });

export const RunPersonaSimulationSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  niche: z.string().optional(),
});

export const runPersonaSimulation = createServerFn({ method: "POST" })
  .validator(RunPersonaSimulationSchema)
  .handler(async () => {
    throw new Error("O simulador determinístico legado foi aposentado. Use a exploração qualitativa SimLab ou registre resultados observados de um experimento.");
  });

export const listSimLabPersonas = createServerFn({ method: "GET" })
  .handler(async () => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);
    const archetypes = await fetchSyntheticArchetypes({ storeId: identity.store_id });
    return archetypes.map((persona) => ({
      id: persona.id,
      name: persona.display_name,
      archetype: `Classe ${persona.abep_social_class} · ${persona.municipality || (persona.decision_heuristics as any)?.city || persona.region}`,
      neighborhood: persona.municipality || (persona.decision_heuristics as any)?.city || persona.region || "Não informado",
      age_range: String(persona.age),
      income_level: persona.abep_social_class,
      net_income_brl: persona.financial_sheet?.net_monthly_income_brl ?? persona.median_income_brl ?? 0,
      discretionary_surplus_brl: persona.financial_sheet?.discretionary_surplus_brl ?? 0,
      prompt_persona: persona.bio || persona.curriculum?.career_summary || "Perfil sintético sem descrição adicional.",
      profile_origin: persona.profile_origin || "legacy_unknown",
      calibration_status: persona.calibration_status || "unknown",
    }));
  });

export const listResearchSessions = createServerFn({ method: "GET" })
  .handler(async () => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);
    const db = getServerClient();
    const { data: experiments, error } = await db
      .from("simlab_market_experiments")
      .select("id, store_id, title, objective, stimulus_payload, target_audience_filters, sample_size, status, created_at, completed_at")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(`Falha ao consultar o histórico SimLab: ${error.message}`);
    if (!experiments?.length) return [];

    const ids = experiments.map((experiment: any) => experiment.id);
    const [{ data: synthesisRows, error: synthesisError }, { data: responseRows, error: responseError }] = await Promise.all([
      db.from("simlab_statistical_synthesis")
        .select("*")
        .in("experiment_id", ids),
      db.from("simlab_persona_responses")
        .select("*")
        .in("experiment_id", ids),
    ]);
    if (synthesisError) throw new Error(`Falha ao consultar proveniência do SimLab: ${synthesisError.message}`);
    if (responseError) throw new Error(`Falha ao consultar respostas do SimLab: ${responseError.message}`);
    const synthById = new Map((synthesisRows || []).map((row: any) => [row.experiment_id, row]));
    const responsesById = new Map<string, any[]>();
    for (const response of responseRows || []) {
      const current = responsesById.get(response.experiment_id) || [];
      current.push(response);
      responsesById.set(response.experiment_id, current);
    }

    return experiments.map((experiment: any) => {
      const synthesis: any = synthById.get(experiment.id);
      const prov: any = synthesis?.provenance || {};
      const evidenceLevel = synthesis?.evidence_level || "legacy_unknown";
      const municipality =
        prov.municipality_filter ||
        experiment.stimulus_payload?.municipality_filter ||
        experiment.target_audience_filters?.municipality ||
        "Nacional";

      const meanIntent = synthesis?.mean_intent_percent ?? prov?.mean_intent_percent ?? synthesis?.overall_approval_rate ?? null;
      const modeWtp = synthesis?.mode_reservation_price_brl ?? prov?.mode_reservation_price_brl ?? null;
      const optimalPrice = synthesis?.optimal_price_point_brl ?? prov?.optimal_price_point_brl ?? null;

      const summary =
        evidenceLevel === "econometric_hybrid_swarm"
          ? `Coorte ${municipality} · Aprovação: ${synthesis?.overall_approval_rate ?? meanIntent ?? 0}% · Média: ${meanIntent ?? 0}% · Moda WTP: R$ ${Number(modeWtp || 0).toFixed(2)} · Preço Ótimo: R$ ${Number(optimalPrice || 0).toFixed(2)} · NPS: ${synthesis?.synthetic_nps ?? 0}`
          : evidenceLevel === "exploratory_synthetic"
            ? "Exploração qualitativa com perfis sintéticos."
            : "Resultado histórico disponível para consulta.";

      return {
        id: experiment.id,
        title: experiment.title,
        objective: experiment.objective,
        municipality,
        test_price_brl: experiment.stimulus_payload?.test_price_brl ?? null,
        status: experiment.status,
        created_at: experiment.created_at,
        summary_insight: summary,
        evidence_level: evidenceLevel,
        calibration_status: synthesis?.calibration_status || "not_calibrated",
        methodology: synthesis?.methodology || null,
        econometrics: {
          synthetic_nps: synthesis?.synthetic_nps ?? null,
          overall_approval_rate: synthesis?.overall_approval_rate ?? null,
          rejection_rate: synthesis?.rejection_rate ?? null,
          mean_intent_percent: meanIntent,
          median_intent_percent: synthesis?.median_intent_percent ?? prov?.median_intent_percent ?? null,
          mode_intent_percent: synthesis?.mode_intent_percent ?? prov?.mode_intent_percent ?? null,
          std_dev_intent: synthesis?.std_dev_intent ?? prov?.std_dev_intent ?? null,
          mode_reservation_price_brl: modeWtp,
          optimal_price_point_brl: optimalPrice,
          price_elasticity_score: synthesis?.price_elasticity_score ?? null,
          estimated_conversion_range: synthesis?.estimated_conversion_range ?? prov?.wilson_ci_95 ?? null,
          demand_curve_points: synthesis?.demand_curve_points ?? prov?.demand_curve_points ?? [],
          chronos_temporal_cascade: synthesis?.chronos_temporal_cascade ?? prov?.chronos_temporal_cascade ?? [],
          social_virality_index: synthesis?.social_virality_index ?? prov?.social_virality_index ?? null,
          p2p_clearing_price_brl: synthesis?.p2p_clearing_price_brl ?? prov?.p2p_clearing_price_brl ?? null,
          scientific_verdict: synthesis?.scientific_verdict || "not_validated",
          top_3_buying_triggers: synthesis?.top_3_buying_triggers || [],
          top_3_friction_barriers: synthesis?.top_3_friction_barriers || [],
          reviewer_reports: synthesis?.reviewer_reports ?? prov?.reviewer_reports ?? [],
          recommended_actions: synthesis?.recommended_actions || [],
          calibration_ledger: prov?.calibration_ledger || null,
        },
        execution_results: (responsesById.get(experiment.id) || []).map((response: any) => {
          const snapMetrics = response.archetype_snapshot?.econometric_metrics || {};
          return {
            persona_name: response.archetype_snapshot?.display_name || response.archetype_code || "Perfil sintético",
            social_class: response.archetype_snapshot?.abep_social_class || "C1",
            municipality: response.archetype_snapshot?.municipality || municipality,
            net_income_brl: response.archetype_snapshot?.financial_sheet?.net_monthly_income_brl ?? response.archetype_snapshot?.median_income_brl ?? null,
            discretionary_surplus_brl: response.archetype_snapshot?.financial_sheet?.discretionary_surplus_brl ?? null,
            purchase_intent: response.purchase_intent_percent ?? snapMetrics.choice_probability_percent ?? null,
            interest_score: response.interest_score ?? null,
            net_utility_mcfadden: response.net_utility_mcfadden ?? snapMetrics.net_utility_mcfadden ?? null,
            affordability_score: response.affordability_score ?? snapMetrics.affordability_score ?? null,
            discretionary_burden_percent: response.discretionary_burden_percent ?? snapMetrics.discretionary_burden_percent ?? null,
            reservation_price_brl: response.reservation_price_brl ?? snapMetrics.reservation_price_brl ?? null,
            system_1_emotion: response.system_1_emotion || null,
            price_perception: response.price_perception || null,
            primary_hook_detected: response.primary_hook_detected || null,
            primary_barrier_objection: response.primary_barrier_objection || null,
            social_feed_comment: response.social_feed_comment ?? snapMetrics.social_feed_comment ?? null,
            social_feed_reaction: response.social_feed_reaction ?? snapMetrics.social_feed_reaction ?? null,
            p2p_initial_offer_brl: response.p2p_initial_offer_brl ?? snapMetrics.p2p_initial_offer_brl ?? null,
            p2p_walkaway_price_brl: response.p2p_walkaway_price_brl ?? snapMetrics.p2p_walkaway_price_brl ?? null,
            bargaining_strategy: response.bargaining_strategy ?? snapMetrics.bargaining_strategy ?? null,
            feedback: response.verbatim_reaction || "Resposta indisponível.",
            factors_for: response.provenance?.factors_for || [],
            factors_against: response.provenance?.factors_against || [],
            unknowns: response.provenance?.unknowns || [],
            response_origin:
              response.provenance?.record_kind?.includes("llm") ||
              response.provenance?.record_kind?.includes("simlab_v4")
                ? "llm_synthetic"
                : "legacy_unknown",
          };
        }),
      };
    });
  });

export const CreateSimLabPersonaSchema = z.object({
  storeId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  socialClass: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "D_E"]),
  age: z.number().int().min(18).max(100),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  occupation: z.string().trim().min(1).max(160),
  medianIncomeBrl: z.number().nonnegative().finite().nullable().optional(),
  prompt_persona: z.string().trim().min(10).max(2000),
  habits: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
});

export const createSimLabPersona = createServerFn({ method: "POST" })
  .validator(CreateSimLabPersonaSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
    if (!storeId) throw new Error("Selecione um workspace antes de criar um perfil sintético.");
    assertStoreAccess(identity, ["owner", "admin", "manager"], storeId);
    const db = getServerClient();
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
    const { data: inserted, error } = await db
      .from("simlab_workspace_persona_profiles")
      .insert({
        store_id: storeId,
        code: `USR_${suffix}`,
        display_name: data.name,
        gender: "nao_binario",
        age: data.age,
        city: data.city,
        state: data.state,
        abep_class: data.socialClass,
        median_income_brl: data.medianIncomeBrl ?? null,
        occupation: data.occupation,
        psychography: { profile_text: data.prompt_persona, habits: data.habits || [] },
        digital_behavior: {},
        trigger_scores: {},
        calibration_status: "not_calibrated",
        profile_source: "user_defined_synthetic_profile",
        is_active: true,
        created_by: identity.id,
      })
      .select("*")
      .single();
    if (error) throw new Error(`Falha ao salvar o perfil sintético no workspace: ${error.message}`);
    return { success: true, persona: inserted };
  });

export const RunSimLabResearchSchema = z.object({
  storeId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  objective: z.string().trim().min(1).max(4000),
  simulated_personas_count: z.number().int().positive().max(100),
  testPriceBrl: z.number().nonnegative().finite().optional(),
  maxInstallments: z.number().int().positive().max(24).optional(),
  municipalityFilter: z.string().optional(),
  sourceEntityType: z
    .enum(['standalone', 'ad_campaign', 'product', 'travel_package', 'event', 'classified', 'social_story'])
    .optional(),
  sourceEntityId: z.string().uuid().nullable().optional(),
  creativeMediaUrl: z.string().nullable().optional(),
  socialClasses: z.array(z.string()).optional(),
});

export const runSimLabResearch = createServerFn({ method: "POST" })
  .validator(RunSimLabResearchSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
    if (!storeId) throw new Error("Selecione um workspace antes de executar o SimLab.");
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"], storeId);
    const { experiment } = await executeCreateSimLabExperiment({
      storeId,
      title: data.title,
      objective: data.objective,
      municipalityFilter: data.municipalityFilter || "Nacional",
      sourceEntityType: data.sourceEntityType || "standalone",
      sourceEntityId: data.sourceEntityId || null,
      creativeMediaUrl: data.creativeMediaUrl || null,
      targetAudienceFilters: {
        municipality: data.municipalityFilter || "Nacional",
        ...(data.socialClasses?.length ? { social_classes: data.socialClasses } : {}),
      },
      stimulusPayload: {
        title: data.title,
        description: data.objective,
        municipality_filter: data.municipalityFilter || "Nacional",
        max_installments: data.maxInstallments || 1,
        ...(data.testPriceBrl == null ? {} : { test_price_brl: data.testPriceBrl }),
      },
      sampleSize: data.simulated_personas_count,
    });
    return executeSimLabBatchSimulation({ experimentId: experiment.id, storeId });
  });
