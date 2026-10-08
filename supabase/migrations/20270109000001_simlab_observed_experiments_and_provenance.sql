-- Separates synthetic exploration from observed campaign outcomes.
-- Does not store person-level customer data.

ALTER TABLE public.simlab_persona_responses
  ALTER COLUMN archetype_id DROP NOT NULL,
  ALTER COLUMN interest_score DROP NOT NULL,
  ALTER COLUMN purchase_intent_percent DROP NOT NULL,
  ALTER COLUMN primary_barrier_objection DROP NOT NULL,
  ALTER COLUMN verbatim_reaction DROP NOT NULL,
  ALTER COLUMN system_1_emotion DROP NOT NULL,
  ALTER COLUMN price_perception DROP NOT NULL;

ALTER TABLE public.simlab_persona_responses
  ADD COLUMN IF NOT EXISTS archetype_code TEXT,
  ADD COLUMN IF NOT EXISTS archetype_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provenance JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.synthetic_population_archetypes
  ADD COLUMN IF NOT EXISTS profile_source TEXT NOT NULL DEFAULT 'legacy_unknown',
  ADD COLUMN IF NOT EXISTS calibration_status TEXT NOT NULL DEFAULT 'unknown';

UPDATE public.synthetic_population_archetypes
SET profile_source = CASE
      WHEN code LIKE 'BR_%' THEN 'seeded_synthetic_profile'
      ELSE 'legacy_unknown'
    END,
    calibration_status = 'not_calibrated'
WHERE profile_source = 'legacy_unknown';

-- A catalog profile has no auditable row-level calibration dataset/model yet.
UPDATE public.synthetic_population_archetypes
SET calibration_status = 'not_calibrated'
WHERE code LIKE 'BR_%' OR profile_source IN ('seeded_synthetic_profile', 'code_seed_catalog');

ALTER TABLE public.synthetic_population_archetypes
  ALTER COLUMN median_income_brl DROP NOT NULL,
  ALTER COLUMN median_income_brl DROP DEFAULT;

-- User-authored profiles are private to their workspace and explicitly uncalibrated.
CREATE TABLE IF NOT EXISTS public.simlab_workspace_persona_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'nao_binario',
  age INTEGER NOT NULL CHECK (age BETWEEN 18 AND 100),
  city TEXT NOT NULL,
  state TEXT NOT NULL CHECK (char_length(state) = 2),
  abep_class TEXT NOT NULL CHECK (abep_class IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D_E')),
  median_income_brl NUMERIC(10, 2) CHECK (median_income_brl IS NULL OR median_income_brl >= 0),
  occupation TEXT NOT NULL,
  psychography JSONB NOT NULL DEFAULT '{}'::jsonb,
  digital_behavior JSONB NOT NULL DEFAULT '{}'::jsonb,
  trigger_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  calibration_status TEXT NOT NULL DEFAULT 'not_calibrated' CHECK (calibration_status = 'not_calibrated'),
  profile_source TEXT NOT NULL DEFAULT 'user_defined_synthetic_profile' CHECK (profile_source = 'user_defined_synthetic_profile'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (store_id, code)
);

CREATE INDEX IF NOT EXISTS idx_simlab_workspace_personas_store_active
  ON public.simlab_workspace_persona_profiles (store_id, is_active, created_at DESC);
ALTER TABLE public.simlab_workspace_persona_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS simlab_workspace_personas_members
  ON public.simlab_workspace_persona_profiles;
CREATE POLICY simlab_workspace_personas_members
  ON public.simlab_workspace_persona_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = simlab_workspace_persona_profiles.store_id
        AND wm.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = simlab_workspace_persona_profiles.store_id
        AND wm.profile_id = auth.uid()
    )
  );
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.simlab_workspace_persona_profiles TO authenticated;

ALTER TABLE public.simlab_focus_group_messages
  ADD COLUMN IF NOT EXISTS provenance JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.simlab_statistical_synthesis
  ALTER COLUMN synthetic_nps DROP NOT NULL,
  ALTER COLUMN overall_approval_rate DROP NOT NULL,
  ALTER COLUMN rejection_rate DROP NOT NULL,
  ALTER COLUMN estimated_conversion_range DROP NOT NULL,
  ALTER COLUMN price_elasticity_score DROP NOT NULL,
  ALTER COLUMN scientific_verdict DROP NOT NULL;

ALTER TABLE public.simlab_statistical_synthesis
  ALTER COLUMN estimated_conversion_range DROP DEFAULT,
  ADD COLUMN IF NOT EXISTS evidence_level TEXT NOT NULL DEFAULT 'legacy_unknown',
  ADD COLUMN IF NOT EXISTS methodology TEXT,
  ADD COLUMN IF NOT EXISTS calibration_status TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS limitations JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.simlab_statistical_synthesis
SET evidence_level = 'legacy_unknown',
    calibration_status = 'unknown',
    provenance = jsonb_build_object(
      'record_kind', 'legacy_result',
      'notice', 'Origem/modelo da síntese anterior não é verificável nesta migração.'
    ),
    limitations = jsonb_build_array('Resultado legado: revisar antes de interpretar como estimativa observada.')
WHERE evidence_level = 'legacy_unknown';

-- Old synthetic KPIs and verdicts have no observed data lineage; do not preserve them as estimates.
UPDATE public.simlab_statistical_synthesis
SET synthetic_nps = NULL,
    overall_approval_rate = NULL,
    rejection_rate = NULL,
    estimated_conversion_range = NULL,
    price_elasticity_score = NULL,
    scientific_verdict = NULL
WHERE evidence_level = 'legacy_unknown';

-- Aggregated outcomes for A/B tests and randomized price experiments.
-- One row per variant and measurement window; no raw customer identifiers.
CREATE TABLE IF NOT EXISTS public.simlab_observed_campaign_arms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES public.simlab_market_experiments(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  variant_label TEXT NOT NULL,
  assigned_units INTEGER NOT NULL CHECK (assigned_units > 0),
  conversions INTEGER NOT NULL CHECK (conversions >= 0 AND conversions <= assigned_units),
  price_brl NUMERIC(12, 2) CHECK (price_brl IS NULL OR price_brl > 0),
  assignment_method TEXT NOT NULL CHECK (assignment_method IN ('randomized', 'observational')),
  randomization_unit TEXT NOT NULL CHECK (randomization_unit IN ('customer', 'session', 'cluster', 'not_applicable')),
  measurement_start TIMESTAMPTZ NOT NULL,
  measurement_end TIMESTAMPTZ NOT NULL CHECK (measurement_end > measurement_start),
  source_type TEXT NOT NULL DEFAULT 'user_reported' CHECK (source_type IN ('user_reported', 'integration_import')),
  source_reference TEXT,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT simlab_observed_campaign_arm_window_unique
    UNIQUE (experiment_id, measurement_start, measurement_end, variant_key)
);

CREATE INDEX IF NOT EXISTS idx_simlab_observed_arms_experiment_window
  ON public.simlab_observed_campaign_arms (experiment_id, measurement_start, variant_key);
CREATE INDEX IF NOT EXISTS idx_simlab_observed_arms_store_created
  ON public.simlab_observed_campaign_arms (store_id, created_at DESC);

ALTER TABLE public.simlab_observed_campaign_arms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS simlab_observed_campaign_arms_store_members
  ON public.simlab_observed_campaign_arms;
CREATE POLICY simlab_observed_campaign_arms_store_members
  ON public.simlab_observed_campaign_arms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.store_id = simlab_observed_campaign_arms.store_id
        AND wm.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.store_id = simlab_observed_campaign_arms.store_id
        AND wm.profile_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.simlab_observed_campaign_arms TO authenticated;
