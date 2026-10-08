import { z } from "zod";
import { JsonValueSchema } from "@/types/json-value";

// ============================================================================
// SCHEMAS & TIPOS CANÔNICOS: SQUADS AGÊNTICOS & ONBOARDING MULTIMODAL & MERCADO
// ============================================================================

export const AgentRegistrySchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  category: z.enum(["marketing", "finance_tax", "hr_people", "strategy", "multimodal", "general"]),
  ui_group: z.string().default("general"),
  seniority: z.string().default("Senior / PhD"),
  career_summary: z.string(),
  curriculum: z.object({
    academic_background: z.array(z.string()).default([]),
    certifications: z.array(z.string()).default([]),
    years_experience: z.number().default(10),
    specialties: z.array(z.string()).default([]),
  }),
  deliverables: z.array(z.string()).default([]),
  execution_mode: z.enum(["llm", "vision", "scraper", "deterministic"]).default("llm"),
  default_model: z.string().default("google/gemini-2.5-flash"),
  token_budget: z.number().default(4000),
  system_prompt_template: z.string(),
  input_schema: z.record(z.string(), z.unknown()).default({}),
  output_schema: z.record(z.string(), z.unknown()).default({}),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type AgentRegistryDTO = z.infer<typeof AgentRegistrySchema>;

export const SquadTemplateSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string().min(2),
  description: z.string(),
  department: z.enum(["marketing", "accounting", "human_resources", "executive_strategy"]),
  runtime_status: z.string().default("ready"),
  onboarding_questions: z.array(z.any()).default([]),
  default_config: z.record(z.string(), z.unknown()).default({}),
  icon_name: z.string().default("Users"),
  badge_label: z.string().default("Enterprise Grade"),
  is_system: z.boolean().default(true),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type SquadTemplateDTO = z.infer<typeof SquadTemplateSchema>;

export const SquadTemplateAgentSchema = z.object({
  id: z.string().uuid(),
  squad_template_id: z.string().uuid(),
  agent_id: z.string(),
  task_order: z.number(),
  role_label: z.string(),
  depends_on_agent_id: z.string().nullable().optional(),
  is_required: z.boolean().default(true),
  input_contract: z.record(z.string(), z.unknown()).default({}),
  output_contract: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().optional(),
});

export type SquadTemplateAgentDTO = z.infer<typeof SquadTemplateAgentSchema>;

export const StoreSquadSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  squad_template_id: z.string().uuid(),
  custom_name: z.string().min(2),
  status: z.enum(["active", "paused", "configuring"]).default("active"),
  operational_goal: z.string().nullable().optional(),
  cadence: z.enum(["on_demand", "daily", "weekly", "event_driven"]).default("on_demand"),
  approval_mode: z.enum(["auto", "human_in_the_loop"]).default("human_in_the_loop"),
  onboarding_answers: z.record(z.string(), z.unknown()).default({}),
  runtime_settings: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type StoreSquadDTO = z.infer<typeof StoreSquadSchema>;

export const StoreSquadRunSchema = z.object({
  id: z.string().uuid(),
  store_squad_id: z.string().uuid(),
  store_id: z.string().uuid(),
  trigger_source: z.enum(["manual", "scheduler", "webhook", "onboarding"]).default("manual"),
  status: z.enum(["queued", "running", "completed", "failed", "needs_approval"]).default("running"),
  current_agent_id: z.string().nullable().optional(),
  input_payload: z.record(z.string(), z.unknown()).default({}),
  output_artifacts: z.record(z.string(), z.unknown()).default({}),
  error_log: z.string().nullable().optional(),
  total_tokens_consumed: z.number().default(0),
  cost_estimate_cents: z.number().default(0),
  started_at: z.string().optional(),
  completed_at: z.string().nullable().optional(),
});

export type StoreSquadRunDTO = z.infer<typeof StoreSquadRunSchema>;

// BRAND DNA & ARQUÉTIPOS
export const BrandDnaProfileSchema = z.object({
  id: z.string().uuid().nullable(),
  store_id: z.string().uuid(),
  archetype: z.string(),
  archetype_justification: z.string().nullable().optional(),
  tone_of_voice: z.string(),
  tone_rules: z.array(z.string()).default([]),
  content_pillars: z.array(z.string()).default([]),
  forbidden_words: z.array(z.string()).default([]),
  color_palette: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
    text: z.string(),
  }),
  seven_sins_triggers: z.record(z.string(), z.string()).default({}),
  swot_analysis: z.object({
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    opportunities: z.array(z.string()).default([]),
    threats: z.array(z.string()).default([]),
  }),
  source_url: z.string().nullable().optional(),
  source_evidence: z.record(z.string(), JsonValueSchema).optional(),
  ai_provider: z.string().nullable().optional(),
  ai_model: z.string().nullable().optional(),
  analysis_status: z.enum(["not_created", "legacy_unverified", "ai_generated_draft", "human_edited"]).optional(),
  edited_by_human: z.boolean().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type BrandDnaProfileDTO = z.infer<typeof BrandDnaProfileSchema>;

// RADAR DE CONCORRENTES & SNAPSHOTS
export const MarketCompetitorSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  name: z.string().min(2),
  website_url: z.string().nullable().optional(),
  instagram_handle: z.string().nullable().optional(),
  facebook_url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type MarketCompetitorDTO = z.infer<typeof MarketCompetitorSchema>;

export const CompetitorSnapshotSchema = z.object({
  id: z.string().uuid(),
  competitor_id: z.string().uuid(),
  store_id: z.string().uuid(),
  source_url: z.string().nullable(),
  snapshot_type: z.enum(["website", "full_page", "mobile_hero", "menu_card", "social_grid"]).nullable(),
  screenshot_url: z.string().nullable(),
  extracted_dna: z.object({
    brand_archetype: z.string(),
    color_palette: z.array(z.string()).default([]),
    typography: z.string(),
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    differentiation_gap: z.string().default(""),
  }),
  marketing_hooks: z.array(z.string()).default([]),
  pricing_signals: z.object({
    tier: z.enum(["budget", "mid_market", "premium", "luxury"]).nullable(),
    average_ticket_estimate: z.number().nonnegative().nullable(),
    promotional_intensity: z.enum(["low", "moderate", "aggressive"]).nullable(),
  }),
  analyzed_by_agent_id: z.string().nullable().optional(),
  analysis_status: z.enum(["legacy_unverified", "ai_generated_draft"]).optional(),
  source_evidence: z.record(z.string(), JsonValueSchema).optional(),
  ai_provider: z.string().nullable().optional(),
  ai_model: z.string().nullable().optional(),
  captured_at: z.string().nullable().optional(),
});

export type CompetitorSnapshotDTO = z.infer<typeof CompetitorSnapshotSchema>;

// MASTER CATALOG GLOBAL
export const GlobalMasterCatalogItemSchema = z.object({
  id: z.string().uuid(),
  barcode_ean: z.string().nullable().optional(),
  name: z.string().min(2),
  brand_name: z.string().min(1),
  category: z.string(),
  subcategory: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  suggested_price_cents: z.number().nullable().optional(),
  ncm_code: z.string().nullable().optional(),
  cest_code: z.string().nullable().optional(),
  tax_tribute_group: z.string().default("tributado_integralmente"),
  unit_of_measure: z.string().default("UN"),
  image_urls: z.array(z.string()).default([]),
  nutrition_facts: z.record(z.string(), z.unknown()).default({}),
  tags: z.array(z.string()).default([]),
  is_verified: z.boolean().default(true),
  created_at: z.string().optional(),
});

export type GlobalMasterCatalogItemDTO = z.infer<typeof GlobalMasterCatalogItemSchema>;

// ONBOARDING MULTIMODAL
export const MultimodalOnboardingSessionSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  status: z.enum(["uploaded", "processing_vision", "extracted", "approved", "applied"]).default("uploaded"),
  input_sources: z.object({
    image_urls: z.array(z.string()).default([]),
    external_links: z.array(z.string()).default([]),
  }),
  extracted_business_profile: z.record(z.string(), z.unknown()).default({}),
  extracted_products: z.array(z.record(z.string(), z.unknown())).default([]),
  extracted_categories: z.array(z.string()).default([]),
  applied_products_count: z.number().default(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type MultimodalOnboardingSessionDTO = z.infer<typeof MultimodalOnboardingSessionSchema>;

// CANVAS DOS 7 PECADOS CAPITAIS
export const SevenSinHookSchema = z.object({
  sin: z.enum(["orgulho", "ganancia", "luxuria", "inveja", "gula", "ira", "preguica"]),
  title: z.string(),
  subconscious_trigger: z.string(),
  copy_headline: z.string(),
  copy_body: z.string(),
  call_to_action: z.string(),
  recommended_channel: z.enum(["whatsapp", "instagram_ad", "push_notification", "storefront_banner"]),
});

export type SevenSinHookDTO = z.infer<typeof SevenSinHookSchema>;
