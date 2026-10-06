import { z } from 'zod';
import { CANONICAL_BRAZIL_ARCHETYPES } from '@/lib/simlab/brazil-demographics';
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
  FocusGroupSession,
  FocusGroupMessage,
  VerdictStatus
} from '@/types/simlab';

export { CANONICAL_BRAZIL_ARCHETYPES };

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
        profile_origin: "persisted_synthetic_profile",
        source_profile_type: row.profile_source || "legacy_unknown",
        // No row-level calibration dataset/model/version is stored; legacy status claims are not auditable.
        calibration_status: "not_calibrated",
        curriculum: canonical?.curriculum || row.curriculum,
        financial_sheet: canonical?.financial_sheet || row.financial_sheet,
        household_profile: canonical?.household_profile || row.household_profile,
      } as SyntheticArchetype;
    });

    if (globalProfiles.length === 0) {
      let fallback = [...CANONICAL_BRAZIL_ARCHETYPES];
      if (data?.socialClasses?.length) fallback = fallback.filter((persona) => data.socialClasses!.includes(persona.abep_social_class));
      if (data?.regions?.length) fallback = fallback.filter((persona) => data.regions!.includes(persona.region));
      globalProfiles = fallback.map((persona) => ({
        ...persona,
        profile_origin: "seed_catalog_profile",
        source_profile_type: "code_seed_catalog",
        calibration_status: "not_calibrated",
      }));
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
        median_income_brl: row.median_income_brl == null ? null : Number(row.median_income_brl),
        education_level: "Não informado",
        cynicism_index: 5,
        price_sensitivity: 5,
        impulsivity_index: 5,
        primary_social_networks: [],
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
  storeId: z.string().uuid().optional(),
}).optional();

export const listSyntheticArchetypes = createServerFn({ method: 'GET' })
  .validator(ListSyntheticArchetypesSchema)
  .handler(async ({ data }): Promise<SyntheticArchetype[]> => {
    const identity = await getServerIdentity();
    const privateProfileRoles = ["owner", "store_owner", "proprietario", "admin", "manager", "gerente", "content"] as const;
    let authorizedStoreId: string | undefined;

    if (data?.storeId) {
      // Explicit tenant IDs are never trusted merely because the caller knows a UUID.
      assertStoreAccess(identity, [...privateProfileRoles], data.storeId);
      authorizedStoreId = data.storeId;
    } else if (identity.id && identity.store_id) {
      // A role without membership is not enough: assertStoreAccess checks the active membership.
      try {
        assertStoreAccess(identity, [...privateProfileRoles], identity.store_id);
        authorizedStoreId = identity.store_id;
      } catch {
        // The public synthetic catalog remains available, but private workspace personas do not.
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
}): Promise<{ success: boolean; experiment: SimLabExperiment }> {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ['owner', 'admin', 'manager', 'content'], data.storeId);
  const serverClient = getServerClient();
  const { data: row, error } = await serverClient
    .from('simlab_market_experiments')
    .insert({
      store_id: data.storeId,
      title: data.title,
      objective: data.objective,
      stimulus_payload: data.stimulusPayload,
      target_audience_filters: data.targetAudienceFilters || {},
      sample_size: Math.min(data.sampleSize || 12, 50),
      created_by: identity.id,
      status: 'queued',
    })
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
  sampleSize: z.number().int().positive().max(50).optional(),
});

export const createSimLabExperiment = createServerFn({ method: 'POST' })
  .validator(CreateSimLabExperimentSchema)
  .handler(async ({ data }) => {
    return executeCreateSimLabExperiment(data);
  });

// ─── 3. EXPLORAÇÃO QUALITATIVA COM PERSONAS SINTÉTICAS ─────────────────────────

const QualitativeReactionSchema = z.object({
  reactions: z.array(z.object({
    persona_id: z.string().min(1),
    reaction: z.string().trim().min(10).max(1800),
    factors_for: z.array(z.string().trim().min(2).max(240)).max(5),
    factors_against: z.array(z.string().trim().min(2).max(240)).max(5),
    unknowns: z.array(z.string().trim().min(2).max(240)).max(5),
  })).min(1),
});

function seededRandom(seedText: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    state ^= seedText.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function selectCuratedProfiles<T>(items: T[], count: number, seed: string): T[] {
  const random = seededRandom(seed);
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function evaluateBatchWithRealAI(
  personas: SyntheticArchetype[],
  stimulus: { title?: string; description?: string; test_price_brl?: number; niche?: string },
  experimentId: string,
  storeId: string,
): Promise<{ responses: SimLabPersonaResponse[]; provider: string; model: string }> {
  const systemPrompt = `Gere respostas qualitativas hipotéticas de personagens explicitamente SINTÉTICOS para explorar uma hipótese comercial. Eles não são pessoas entrevistadas, não são clientes reais e não representam uma amostra probabilística da população.
Use somente as características e a oferta recebidas. Não invente estatísticas, intenção percentual, probabilidade de compra, NPS, conversão, elasticidade, opinião de consumidores reais ou validação científica. Se uma informação necessária não estiver nos dados, registre-a como desconhecida. Evite alegar que os dados vieram do IBGE/POF se essa proveniência não estiver explicitamente fornecida.
Retorne exclusivamente JSON válido no formato {"reactions":[{"persona_id":"...","reaction":"...","factors_for":["..."],"factors_against":["..."],"unknowns":["..."]}]}. Gere uma resposta para cada id informado; não acrescente pessoas.`;

  const userPrompt = JSON.stringify({
    task: "Exploração qualitativa sintética; não prever vendas.",
    experiment_id: experimentId,
    offer: {
      title: stimulus.title || null,
      description: stimulus.description || null,
      price_brl: Number.isFinite(stimulus.test_price_brl) ? stimulus.test_price_brl : null,
      niche: stimulus.niche || null,
    },
    synthetic_profiles: personas.map((persona) => ({
      id: persona.id,
      profile_code: persona.code,
      fictional_name: persona.display_name,
      age: persona.age,
      social_class: persona.abep_social_class,
      region: persona.region,
      income_brl: persona.median_income_brl != null && Number.isFinite(persona.median_income_brl) ? persona.median_income_brl : null,
      occupation: persona.curriculum?.profession_title || (persona.decision_heuristics as any)?.occupation || null,
      profile_origin: persona.profile_origin || "legacy_unknown",
      profile_source_type: persona.source_profile_type || "legacy_unknown",
      calibration_status: persona.calibration_status || "unknown",
      characteristics: persona.decision_heuristics,
      psychography: persona.bio || null,
    })),
  });

  const aiResult = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.55,
    maxTokens: 5000,
    feature: "simlab_qualitative_exploration",
    storeId,
  });
  const parsed = aiResult.parsedJson || (aiResult.content ? JSON.parse(aiResult.content) : null);
  const validated = QualitativeReactionSchema.parse(parsed);
  const byId = new Map(validated.reactions.map((reaction) => [reaction.persona_id, reaction]));
  if (byId.size !== personas.length || personas.some((persona) => !byId.has(persona.id))) {
    throw new Error("A IA não retornou exatamente uma resposta válida para cada perfil selecionado; nenhuma resposta substituta foi criada.");
  }

  const generatedAt = new Date().toISOString();
  const responses = personas.map((persona): SimLabPersonaResponse => {
    const reaction = byId.get(persona.id)!;
    return {
      id: `synthetic-${experimentId}-${persona.id}`,
      experiment_id: experimentId,
      archetype_id: persona.profile_origin === "persisted_synthetic_profile" ? persona.id : null,
      archetype_code: persona.code,
      archetype: persona,
      interest_score: null,
      purchase_intent_percent: null,
      choice_probability_percent: null,
      primary_hook_detected: reaction.factors_for[0] || null,
      primary_barrier_objection: reaction.factors_against.join("; ") || null,
      verbatim_reaction: reaction.reaction,
      system_1_emotion: null,
      price_perception: null,
      response_origin: "llm_synthetic",
      is_synthetic: true,
      provenance: {
        record_kind: "llm_generated_synthetic_qualitative_response",
        provider: aiResult.provider,
        model: aiResult.model,
        persona_profile_origin: persona.profile_origin || "legacy_unknown",
        calibration_status: persona.calibration_status || "unknown",
        factors_for: reaction.factors_for,
        factors_against: reaction.factors_against,
        unknowns: reaction.unknowns,
      },
      simulated_at: generatedAt,
    };
  });
  return { responses, provider: aiResult.provider, model: aiResult.model };
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
    const availableProfiles = await fetchSyntheticArchetypes({
      socialClasses: filters.social_classes || filters.socialClasses,
      regions: filters.regions,
      storeId: data.storeId,
    });
    if (availableProfiles.length === 0) {
      throw new Error("Nenhum perfil sintético corresponde aos filtros selecionados.");
    }
    const requestedCount = Number(expRow.sample_size) || availableProfiles.length;
    const selectedProfiles = selectCuratedProfiles(availableProfiles, Math.min(requestedCount, 50), data.experimentId);
    const stimulus = expRow.stimulus_payload || {};
    const generated = await evaluateBatchWithRealAI(
      selectedProfiles,
      {
        title: stimulus.title || expRow.title || undefined,
        description: stimulus.description || expRow.objective || undefined,
        test_price_brl: Number.isFinite(Number(stimulus.test_price_brl)) && stimulus.test_price_brl != null
          ? Number(stimulus.test_price_brl)
          : undefined,
        niche: stimulus.niche || undefined,
      },
      data.experimentId,
      data.storeId,
    );
    const responses = generated.responses;
    const synthesis: SimLabStatisticalSynthesis = {
      id: `synth-${data.experimentId}`,
      experiment_id: data.experimentId,
      synthetic_nps: null,
      overall_approval_rate: null,
      rejection_rate: null,
      estimated_conversion_range: null,
      price_elasticity_score: null,
      top_3_buying_triggers: uniqueQualitativeThemes(responses.flatMap((response) => response.provenance?.factors_for as string[] || [])),
      top_3_friction_barriers: uniqueQualitativeThemes(responses.flatMap((response) => response.provenance?.factors_against as string[] || [])),
      scientific_verdict: "not_validated",
      reviewer_reports: [],
      recommended_actions: [],
      evidence_level: "exploratory_synthetic",
      methodology: "Respostas qualitativas hipotéticas geradas por LLM sobre perfis sintéticos curados; não é pesquisa observada nem modelo de conversão.",
      calibration_status: "not_calibrated",
      provenance: {
        record_kind: "synthetic_qualitative_exploration",
        provider: generated.provider,
        model: generated.model,
        profile_selection: "seeded_random_from_curated_catalog_not_population_sample",
        profile_catalog_size: availableProfiles.length,
        selected_profile_count: selectedProfiles.length,
        profiles_are_real_people: false,
        probabilities_or_sales_forecast_generated: false,
        generated_at: new Date().toISOString(),
      },
      limitations: [
        "Personas são perfis sintéticos curados; não correspondem a pessoas entrevistadas nem constituem amostra representativa da população.",
        "As respostas são geradas por LLM e podem refletir vieses do modelo, do prompt e dos perfis fornecidos.",
        "NPS, taxa de aprovação, conversão, elasticidade e veredito de veiculação não são estimados nesta exploração.",
        "Use teste randomizado com resultados de clientes/contas reais e validação holdout para previsões quantitativas.",
      ],
      synthesized_at: new Date().toISOString(),
    };

    const responseRows = responses.map((response) => ({
      experiment_id: data.experimentId,
      archetype_id: response.archetype_id,
      archetype_code: response.archetype_code,
      archetype_snapshot: response.archetype,
      interest_score: null,
      purchase_intent_percent: null,
      choice_probability_percent: null,
      primary_hook_detected: response.primary_hook_detected,
      primary_barrier_objection: response.primary_barrier_objection,
      verbatim_reaction: response.verbatim_reaction,
      system_1_emotion: null,
      price_perception: null,
      provenance: response.provenance,
    }));
    const { error: responsesError } = await serverClient
      .from("simlab_persona_responses")
      .insert(responseRows);
    if (responsesError) throw new Error(`Falha ao persistir as respostas sintéticas: ${responsesError.message}`);

    const { error: synthesisError } = await serverClient
      .from("simlab_statistical_synthesis")
      .upsert({
        experiment_id: data.experimentId,
        synthetic_nps: null,
        overall_approval_rate: null,
        rejection_rate: null,
        estimated_conversion_range: null,
        price_elasticity_score: null,
        top_3_buying_triggers: synthesis.top_3_buying_triggers,
        top_3_friction_barriers: synthesis.top_3_friction_barriers,
        scientific_verdict: "not_validated",
        reviewer_reports: [],
        recommended_actions: [],
        evidence_level: synthesis.evidence_level,
        methodology: synthesis.methodology,
        calibration_status: synthesis.calibration_status,
        provenance: synthesis.provenance,
        limitations: synthesis.limitations,
      }, { onConflict: "experiment_id" });
    if (synthesisError) throw new Error(`Falha ao persistir a proveniência da síntese: ${synthesisError.message}`);

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
  const systemPrompt = `Você gera contribuições hipotéticas para um focus group SINTÉTICO. Os perfis são personagens inventados/compostos, não pessoas reais nem respondentes entrevistados. Não alegue que currículos, renda, comportamento ou respostas vieram de IBGE, POF, pesquisas ou clientes reais, salvo se a proveniência específica estiver nos dados. Responda em linguagem natural, mas identifique incertezas e limites. Não produza nota, intenção percentual, probabilidade, estimativa de conversão ou conclusão estatística. Retorne JSON válido: {"replies":[{"persona_id":"...","reply":"...","concerns":["..."],"unknowns":["..."]}]}. Produza uma resposta para cada id informado e não invente outras personas.`;
  const userPrompt = JSON.stringify({
    moderator_question: data.userMessage,
    synthetic_profiles: personas.map((persona) => ({
      id: persona.id,
      profile_code: persona.code,
      fictional_name: persona.display_name,
      age: persona.age,
      social_class: persona.abep_social_class,
      region: persona.region,
      income_brl: persona.median_income_brl != null && Number.isFinite(persona.median_income_brl) ? persona.median_income_brl : null,
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
      sender_name: `${persona.display_name} — perfil sintético ${persona.abep_social_class}`,
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
      },
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
    .update({ updated_at: generatedAt, selected_persona_ids: personas.map((persona) => persona.id) })
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

/** Endpoint determinístico legado desativado para não expor números fabricados. */
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
      archetype: `Classe ${persona.abep_social_class} · ${persona.profile_origin || "origem desconhecida"}`,
      neighborhood: (persona.decision_heuristics as any)?.city || persona.region || "Não informado",
      age_range: String(persona.age),
      income_level: persona.abep_social_class,
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
      .select("id, store_id, title, objective, status, created_at, completed_at")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(`Falha ao consultar o histórico SimLab: ${error.message}`);
    if (!experiments?.length) return [];

    const ids = experiments.map((experiment: any) => experiment.id);
    const [{ data: synthesisRows, error: synthesisError }, { data: responseRows, error: responseError }] = await Promise.all([
      db.from("simlab_statistical_synthesis")
        .select("experiment_id, evidence_level, methodology, calibration_status, provenance, limitations")
        .in("experiment_id", ids),
      db.from("simlab_persona_responses")
        .select("experiment_id, archetype_code, archetype_snapshot, verbatim_reaction, provenance")
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
      const evidenceLevel = synthesis?.evidence_level || "legacy_unknown";
      const summary = evidenceLevel === "exploratory_synthetic"
        ? "Exploração qualitativa com perfis sintéticos. Não é pesquisa observada, amostra representativa nem previsão de vendas."
        : "Origem/metodologia deste resultado legado não verificável; não interpretar como estimativa quantitativa.";
      return {
        id: experiment.id,
        title: experiment.title,
        objective: experiment.objective,
        status: experiment.status,
        created_at: experiment.created_at,
        summary_insight: summary,
        evidence_level: evidenceLevel,
        methodology: synthesis?.methodology || null,
        execution_results: (responsesById.get(experiment.id) || []).map((response: any) => ({
          persona_name: response.archetype_snapshot?.display_name || response.archetype_code || "Perfil sintético",
          purchase_intent: null,
          feedback: response.verbatim_reaction || "Resposta indisponível.",
          response_origin: response.provenance?.record_kind === "llm_generated_synthetic_qualitative_response"
            ? "llm_synthetic"
            : "legacy_unknown",
        })),
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
  simulated_personas_count: z.number().int().positive().max(50),
  testPriceBrl: z.number().nonnegative().finite().optional(),
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
      stimulusPayload: {
        title: data.title,
        description: data.objective,
        ...(data.testPriceBrl == null ? {} : { test_price_brl: data.testPriceBrl }),
      },
      sampleSize: data.simulated_personas_count,
    });
    return executeSimLabBatchSimulation({ experimentId: experiment.id, storeId });
  });
