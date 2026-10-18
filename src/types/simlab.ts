// ============================================================================
// CONTRATOS DE TIPAGEM: SIMLAB V4, POPULAÇÕES SINTÉTICAS, ECONOMETRIA & LOOP REAL
// ============================================================================

export type SocialClass = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'D_E';
export type RegionBrazil = 'Sudeste' | 'Sul' | 'Nordeste' | 'Centro-Oeste' | 'Norte';
export type LocationType = 'capital_metropole' | 'interior_polo' | 'interior_medio' | 'rural';
export type ExperimentStatus = 'queued' | 'simulating' | 'synthesizing' | 'completed' | 'failed';
export type VerdictStatus = 'aprovado_para_veiculacao' | 'revisar_com_ajustes' | 'bloqueado_por_alto_risco' | 'not_validated';
export type System1Emotion = 'desejo' | 'desconfianca' | 'tedio' | 'entusiasmo' | 'inseguranca';
export type PricePerception = 'muito_barato_duvidoso' | 'justo' | 'caro_mas_vale' | 'inacessivel';
export type SimLabSourceEntityType =
  | 'standalone'
  | 'ad_campaign'
  | 'product'
  | 'travel_package'
  | 'event'
  | 'classified'
  | 'social_story';
export type SocialFeedReaction = 'like' | 'share' | 'save' | 'skeptical_comment' | 'ignore';

export interface BigFiveOceanVector {
  openness: number;          // 0 a 10
  conscientiousness: number; // 0 a 10
  extraversion: number;      // 0 a 10
  agreeableness: number;     // 0 a 10
  neuroticism: number;       // 0 a 10
}

export interface PersonaCurriculum {
  profession_title: string;
  occupation_sector: string;
  work_experience_years: number;
  education_degree: string;
  career_summary: string;
  key_competencies: string[];
}

export interface PersonaHouseholdProfile {
  family_structure: 'unipessoal' | 'casal_sem_filhos' | 'nuclear_com_filhos' | 'monoparental' | 'multigeracional';
  total_members: number;
  dependents_count: number;
  dependents_ages?: number[];
  decision_power_in_home: 'decisora_principal' | 'decisor_conjunto' | 'influenciador';
}

export interface PersonaFinancialSheet {
  gross_monthly_income_brl: number;
  net_monthly_income_brl: number;
  essential_fixed_expenses_brl: number; // Moradia, alimentação, contas básicas (POF)
  discretionary_surplus_brl: number;    // Sobra mensal após custos essenciais
  leisure_budget_monthly_brl: number;   // Parcela média reservada para viagens/lazer
  liquid_reserves_brl: number;          // Poupança / Reserva de emergência
  credit_limit_available_brl: number;   // Limite rotativo somado dos cartões
  debt_commitment_percent: number;      // % de renda já comprometida com parcelas ativas
  preferred_payment_method: 'pix_a_vista' | 'cartao_parcelado_sem_juros' | 'boleto_carne' | 'cartao_black_a_vista';
}

export interface OfferDecomposition {
  raw_text: string;
  product_name: string;
  destination: string | null;
  unit_price_brl: number;
  is_per_person: boolean;
  installments_count: number;
  installment_value_brl: number;
  interest_free: boolean;
  inclusions: string[];
  category: 'turismo_pacote' | 'ingresso_evento' | 'gastronomia' | 'varejo_produto' | 'servico';
  detected_hooks: string[];
}

export interface EconometricChoiceEvaluation {
  persona_id: string;
  family_tickets_multiplier: number;
  total_outlay_brl: number;
  monthly_family_installment_brl: number;
  discretionary_burden_percent: number; // % que a parcela consome da folga mensal
  affordability_score: number;          // 0 a 10
  perceived_value_score: number;        // 0 a 10
  trust_score?: number;                 // 0 a 10
  ux_friction_score?: number;           // 0 a 10
  reservation_price_brl?: number;       // WTP_i em R$
  net_utility_mcfadden: number;         // U = V + eps
  choice_probability_percent: number;   // 0 a 100%
  system_1_emotion: System1Emotion;
  price_perception: PricePerception;
  primary_objection: string;
  natural_speech_verbatim: string;
  scientific_rationale: string;
  social_feed_comment?: string;
  social_feed_reaction?: SocialFeedReaction;
  p2p_initial_offer_brl?: number;
  p2p_walkaway_price_brl?: number;
  bargaining_strategy?: string;
}

export interface SyntheticArchetype {
  id: string;
  code: string;
  display_name: string;
  gender: 'feminino' | 'masculino' | 'nao_binario';
  age: number;
  age_range_label: string;
  abep_social_class: SocialClass;
  region: RegionBrazil;
  location_type: LocationType;
  municipality?: string;
  median_income_brl: number | null;
  education_level: string;
  cynicism_index: number;
  price_sensitivity: number;
  impulsivity_index: number;
  census_weight?: number;
  ocean_vector?: BigFiveOceanVector;
  primary_social_networks: string[];
  decision_heuristics: Record<string, any>;
  curriculum?: PersonaCurriculum;
  financial_sheet?: PersonaFinancialSheet;
  household_profile?: PersonaHouseholdProfile;
  avatar_url?: string | null;
  bio?: string | null;
  profile_origin?: 'persisted_synthetic_profile' | 'seed_catalog_profile' | 'user_defined_synthetic_profile' | 'procedural_ibge_profile' | 'legacy_unknown';
  source_profile_type?: string;
  calibration_status?: 'not_calibrated' | 'descriptive_only' | 'externally_calibrated' | 'bayesian_calibrated' | 'unknown';
  is_active: boolean;
  created_at?: string;
}

export interface SyntheticMemory {
  id: string;
  archetype_id: string;
  memory_category: string;
  narrative: string;
  emotional_valence: number;
  impact_on_buying_decision: string;
  created_at?: string;
}

export interface SimLabDemandCurvePoint {
  price_multiplier: number; // 0.8, 0.9, 1.0, 1.1, 1.2
  tested_price_brl: number;
  conversion_probability_percent: number;
  expected_buyers_per_100: number;
  expected_revenue_per_100_brl: number;
  is_optimal?: boolean;
}

export interface SimLabChronosCascadeStep {
  day_milestone: number; // 1, 7, 15, 30
  phase_title: string;
  adoption_rate_percent: number;
  cumulative_buyers_per_100: number;
  word_of_mouth_multiplier: number;
  ad_fatigue_index: number;
  dominant_narrative: string;
  expected_cumulative_revenue_brl: number;
}

export interface SimLabCalibrationRecord {
  id: string;
  store_id: string;
  experiment_id: string;
  source_entity_type: SimLabSourceEntityType;
  source_entity_id?: string | null;
  predicted_conversion_rate: number;
  actual_conversion_rate: number;
  predicted_ctr?: number | null;
  actual_ctr?: number | null;
  predicted_revenue_brl?: number | null;
  actual_revenue_brl?: number | null;
  observed_impressions: number;
  observed_clicks: number;
  observed_orders: number;
  accuracy_score_percent: number;
  bayesian_weight_adjustments: Record<string, number>;
  encrypted_conversation_digest?: string | null;
  calibration_summary?: string | null;
  calibrated_at: string;
}

export interface SimLabExperiment {
  id: string;
  store_id: string;
  title: string;
  objective: string;
  municipality_filter?: string;
  source_entity_type?: SimLabSourceEntityType;
  source_entity_id?: string | null;
  creative_media_url?: string | null;
  world_graph_snapshot?: Record<string, any>;
  stimulus_payload: {
    product_name?: string;
    description?: string;
    offer_headline?: string;
    test_price_brl?: number;
    original_price_brl?: number;
    installment_options?: string;
    guarantee_days?: number;
    primary_sin_trigger?: string;
    image_url?: string;
  };
  target_audience_filters: {
    social_classes?: SocialClass[];
    regions?: RegionBrazil[];
    municipality?: string;
    age_min?: number;
    age_max?: number;
  };
  sample_size: number;
  status: ExperimentStatus;
  confidence_level: number;
  margin_of_error: number;
  created_by?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface SimLabPersonaResponse {
  id: string;
  experiment_id: string;
  archetype_id: string | null;
  archetype_code?: string | null;
  persona_id?: string;
  archetype?: SyntheticArchetype;
  interest_score: number | null;
  purchase_intent_percent: number | null;
  choice_probability_percent?: number | null;
  net_utility_mcfadden?: number | null;
  affordability_score?: number | null;
  discretionary_burden_percent?: number | null;
  reservation_price_brl?: number | null;
  perceived_value_score?: number | null;
  trust_score?: number | null;
  ux_friction_score?: number | null;
  primary_hook_detected?: string | null;
  primary_barrier_objection: string | null;
  primary_objection?: string;
  verbatim_reaction: string | null;
  natural_speech_verbatim?: string;
  system_1_emotion: System1Emotion | null;
  price_perception: PricePerception | null;
  social_feed_comment?: string | null;
  social_feed_reaction?: SocialFeedReaction | null;
  p2p_initial_offer_brl?: number | null;
  p2p_walkaway_price_brl?: number | null;
  bargaining_strategy?: string | null;
  response_origin?: 'llm_synthetic' | 'rules_synthetic' | 'fixture' | 'human_observed';
  is_synthetic?: boolean;
  provenance?: SimLabProvenance;
  simulated_at: string;
}

export interface SimLabProvenance {
  record_kind?: string;
  provider?: string | null;
  model?: string | null;
  persona_profile_origin?: string;
  calibration_status?: string;
  factors_for?: string[];
  factors_against?: string[];
  unknowns?: string[];
  response_origin?: string;
  profile_selection?: string;
  profile_catalog_size?: number;
  selected_profile_count?: number;
  profiles_are_real_people?: boolean;
  probabilities_or_sales_forecast_generated?: boolean;
  municipality_filter?: string;
  wilson_ci_95?: [number, number];
  generated_at?: string;
}

export interface ScientificReviewerVerdict {
  reviewer_name: string;
  role: string;
  credibility_score: number; // 0 a 100
  critique: string;
  detected_biases: string[];
  status: 'passed' | 'warning' | 'rejected';
}

export interface SimLabStatisticalSynthesis {
  id: string;
  experiment_id: string;
  synthetic_nps: number | null;
  overall_approval_rate: number | null;
  rejection_rate: number | null;
  mean_intent_percent?: number | null;
  median_intent_percent?: number | null;
  mode_intent_percent?: number | null;
  std_dev_intent?: number | null;
  mode_reservation_price_brl?: number | null;
  optimal_price_point_brl?: number | null;
  estimated_conversion_range: [number, number] | null;
  price_elasticity_score: number | null;
  demand_curve_points?: SimLabDemandCurvePoint[];
  chronos_temporal_cascade?: SimLabChronosCascadeStep[];
  social_virality_index?: number | null;
  p2p_clearing_price_brl?: number | null;
  top_3_buying_triggers: string[];
  top_3_friction_barriers: string[];
  scientific_verdict: VerdictStatus;
  reviewer_reports: ScientificReviewerVerdict[];
  recommended_actions: Array<{
    title: string;
    description: string;
    priority: 'alta' | 'media' | 'baixa';
  }>;
  evidence_level?: 'exploratory_synthetic' | 'econometric_hybrid_swarm' | 'observed_association' | 'randomized_experiment' | 'legacy_unknown';
  methodology?: string;
  calibration_status?: 'not_calibrated' | 'fit_requires_holdout' | 'validated_on_holdout' | 'bayesian_calibrated' | 'unknown';
  provenance?: SimLabProvenance;
  limitations?: string[];
  synthesized_at: string;
}

export interface FocusGroupSession {
  id: string;
  store_id: string;
  session_title: string;
  selected_persona_ids: string[];
  moderator_goal?: string | null;
  status: 'active' | 'closed';
  created_at: string;
}

export interface FocusGroupMessage {
  id: string;
  session_id: string;
  sender_type: 'moderator_user' | 'synthetic_persona' | 'squad_scientist';
  sender_id: string;
  sender_name: string;
  sender_avatar_url?: string | null;
  content: string;
  sentiment_score?: number | null;
  provenance?: SimLabProvenance;
  created_at: string;
}
