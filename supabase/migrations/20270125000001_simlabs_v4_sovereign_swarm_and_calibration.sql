-- ========================================================================================
-- WAESY SIMLABS 4.0 — SOVEREIGN SYNTHETIC POPULATION, ECONOMETRIC SWARM & CLOSED-LOOP CALIBRATION
-- ========================================================================================

-- 1. Expansão de simlab_market_experiments para contexto hiperlocal, grafo de mundo e vínculo com entidades reais
ALTER TABLE public.simlab_market_experiments
  ADD COLUMN IF NOT EXISTS municipality_filter TEXT DEFAULT 'Nacional',
  ADD COLUMN IF NOT EXISTS source_entity_type TEXT DEFAULT 'standalone'
    CHECK (source_entity_type IN ('standalone', 'ad_campaign', 'product', 'travel_package', 'event', 'classified', 'social_story')),
  ADD COLUMN IF NOT EXISTS source_entity_id UUID,
  ADD COLUMN IF NOT EXISTS creative_media_url TEXT,
  ADD COLUMN IF NOT EXISTS world_graph_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_simlab_experiments_source_entity
  ON public.simlab_market_experiments (store_id, source_entity_type, source_entity_id);

-- 2. Expansão quantitativa, econométrica e de arenas (Feed Social / Barganha P2P) em simlab_persona_responses
ALTER TABLE public.simlab_persona_responses
  ADD COLUMN IF NOT EXISTS reservation_price_brl NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS perceived_value_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS trust_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS ux_friction_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS net_utility_mcfadden NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS choice_probability_percent NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS affordability_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS discretionary_burden_percent NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS social_feed_comment TEXT,
  ADD COLUMN IF NOT EXISTS social_feed_reaction TEXT
    CHECK (social_feed_reaction IS NULL OR social_feed_reaction IN ('like', 'share', 'save', 'skeptical_comment', 'ignore')),
  ADD COLUMN IF NOT EXISTS p2p_initial_offer_brl NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS p2p_walkaway_price_brl NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS bargaining_strategy TEXT;

-- 3. Expansão estatística mecânica (Média, Moda, Mediana, Desvio-Padrão, Curva de Demanda e Cascata Temporal Chronos) em simlab_statistical_synthesis
ALTER TABLE public.simlab_statistical_synthesis
  ADD COLUMN IF NOT EXISTS mean_intent_percent NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS median_intent_percent NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS mode_intent_percent NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS std_dev_intent NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS mode_reservation_price_brl NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS optimal_price_point_brl NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS demand_curve_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS chronos_temporal_cascade JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS social_virality_index NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS p2p_clearing_price_brl NUMERIC(12, 2);

-- 4. Tabela de Calibração em Loop Fechado (Truth-Loop Simile / Aaru) com Memória Criptografada
CREATE TABLE IF NOT EXISTS public.simlab_calibration_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  experiment_id UUID NOT NULL REFERENCES public.simlab_market_experiments(id) ON DELETE CASCADE,
  source_entity_type TEXT NOT NULL DEFAULT 'standalone',
  source_entity_id UUID,
  predicted_conversion_rate NUMERIC(6, 3) NOT NULL DEFAULT 0,
  actual_conversion_rate NUMERIC(6, 3) NOT NULL DEFAULT 0,
  predicted_ctr NUMERIC(6, 3),
  actual_ctr NUMERIC(6, 3),
  predicted_revenue_brl NUMERIC(12, 2),
  actual_revenue_brl NUMERIC(12, 2),
  observed_impressions INTEGER NOT NULL DEFAULT 0,
  observed_clicks INTEGER NOT NULL DEFAULT 0,
  observed_orders INTEGER NOT NULL DEFAULT 0,
  accuracy_score_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  bayesian_weight_adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
  encrypted_conversation_digest TEXT,
  calibration_summary TEXT,
  calibrated_by UUID REFERENCES auth.users(id),
  calibrated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_simlab_calibration_store_experiment
  ON public.simlab_calibration_ledger (store_id, experiment_id, calibrated_at DESC);

ALTER TABLE public.simlab_calibration_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS simlab_calibration_ledger_read ON public.simlab_calibration_ledger;
CREATE POLICY simlab_calibration_ledger_read
  ON public.simlab_calibration_ledger
  FOR SELECT TO authenticated
  USING (public.has_workspace_role(store_id, ARRAY['owner', 'admin', 'manager', 'content']));

REVOKE INSERT, UPDATE, DELETE ON public.simlab_calibration_ledger FROM authenticated;
GRANT SELECT ON public.simlab_calibration_ledger TO authenticated;
