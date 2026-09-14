// ============================================================================
// CONTRATOS DE TIPAGEM: SIMLAB V2, POPULAÇÕES SINTÉTICAS & PROTOCOLO CIENTÍFICO
// ============================================================================

export type SocialClass = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'D_E';
export type RegionBrazil = 'Sudeste' | 'Sul' | 'Nordeste' | 'Centro-Oeste' | 'Norte';
export type LocationType = 'capital_metropole' | 'interior_polo' | 'interior_medio' | 'rural';
export type ExperimentStatus = 'queued' | 'simulating' | 'synthesizing' | 'completed' | 'failed';
export type VerdictStatus = 'aprovado_para_veiculacao' | 'revisar_com_ajustes' | 'bloqueado_por_alto_risco';
export type System1Emotion = 'desejo' | 'desconfianca' | 'tedio' | 'entusiasmo' | 'inseguranca';
export type PricePerception = 'muito_barato_duvidoso' | 'justo' | 'caro_mas_vale' | 'inacessivel';

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
  net_utility_mcfadden: number;         // U = V + eps
  choice_probability_percent: number;   // 0 a 100%
  system_1_emotion: System1Emotion;
  price_perception: PricePerception;
  primary_objection: string;
  natural_speech_verbatim: string;
  scientific_rationale: string;
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
 median_income_brl: number;
 education_level: string;
 cynicism_index: number;
 price_sensitivity: number;
 impulsivity_index: number;
 primary_social_networks: string[];
 decision_heuristics: Record<string, any>;
 curriculum?: PersonaCurriculum;
 financial_sheet?: PersonaFinancialSheet;
 household_profile?: PersonaHouseholdProfile;
 avatar_url?: string | null;
 bio?: string | null;
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

export interface SimLabExperiment {
 id: string;
 store_id: string;
 title: string;
 objective: string;
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
  archetype_id: string;
  persona_id?: string;
  archetype?: SyntheticArchetype;
  interest_score: number; // 0 a 10
  purchase_intent_percent: number; // 0 a 100%
  choice_probability_percent?: number;
  primary_hook_detected?: string | null;
  primary_barrier_objection: string;
  primary_objection?: string;
  verbatim_reaction: string;
  natural_speech_verbatim?: string;
  system_1_emotion: System1Emotion;
  price_perception: PricePerception;
  simulated_at: string;
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
 synthetic_nps: number; // -100 a +100
 overall_approval_rate: number; // %
 rejection_rate: number; // %
 estimated_conversion_range: [number, number]; // [min%, max%]
 price_elasticity_score: number;
 top_3_buying_triggers: string[];
 top_3_friction_barriers: string[];
 scientific_verdict: VerdictStatus;
 reviewer_reports: ScientificReviewerVerdict[];
 recommended_actions: Array<{
 title: string;
 description: string;
 priority: 'alta' | 'media' | 'baixa';
 }>;
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
 created_at: string;
}
