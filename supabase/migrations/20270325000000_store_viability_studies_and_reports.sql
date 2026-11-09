-- Migration: 20270325000000_store_viability_studies_and_reports.sql
-- Cria a tabela canônica store_viability_studies, sincroniza colunas avançadas (Porter, Sexy Canvas, Recomendações, PDF URL)
-- em market_viability_studies e configura o bucket viability-reports com políticas RLS.

CREATE TABLE IF NOT EXISTS public.store_viability_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  niche_slug text NOT NULL DEFAULT 'gastronomia',
  idea_description text NOT NULL DEFAULT '',
  target_address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT 'SC',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_km double precision NOT NULL DEFAULT 2.0,
  base_ticket_cents integer NOT NULL DEFAULT 5000,
  estimated_rent_cents integer NOT NULL DEFAULT 350000,
  viability_score integer NOT NULL DEFAULT 70,
  verdict text NOT NULL DEFAULT 'GO',
  tam_monthly_cents bigint NOT NULL DEFAULT 0,
  sam_monthly_cents bigint NOT NULL DEFAULT 0,
  som_monthly_cents bigint NOT NULL DEFAULT 0,
  cortex_dynamic_price_cents integer NOT NULL DEFAULT 5000,
  market_sentiment_alpha double precision NOT NULL DEFAULT 0,
  local_scarcity_beta double precision NOT NULL DEFAULT 0,
  competitor_pressure_gamma double precision NOT NULL DEFAULT 0,
  ibge_population integer NOT NULL DEFAULT 0,
  ibge_per_capita_income_brl numeric(12,2) NOT NULL DEFAULT 0,
  ibge_density_hab_km2 numeric(12,2) NOT NULL DEFAULT 0,
  ibge_vehicle_fleet integer NOT NULL DEFAULT 0,
  ibge_schooling_rate_pct numeric(5,2) NOT NULL DEFAULT 0,
  discovered_competitors jsonb NOT NULL DEFAULT '[]'::jsonb,
  comperator_matrix jsonb NOT NULL DEFAULT '[]'::jsonb,
  swot_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  bmc_canvas jsonb NOT NULL DEFAULT '{}'::jsonb,
  sexy_canvas jsonb NOT NULL DEFAULT '{}'::jsonb,
  porter_five_forces jsonb NOT NULL DEFAULT '{}'::jsonb,
  tactical_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  simlab_synthesis jsonb NOT NULL DEFAULT '{}'::jsonb,
  isochrone_geojson jsonb NOT NULL DEFAULT '{}'::jsonb,
  executive_summary text NOT NULL DEFAULT '',
  report_pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_viability_studies_store_id
  ON public.store_viability_studies(store_id, created_at DESC);

ALTER TABLE public.store_viability_studies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_viability_studies_select_own" ON public.store_viability_studies;
CREATE POLICY "store_viability_studies_select_own"
  ON public.store_viability_studies
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR store_id IN (
      SELECT wm.store_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() OR wm.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "store_viability_studies_insert_own" ON public.store_viability_studies;
CREATE POLICY "store_viability_studies_insert_own"
  ON public.store_viability_studies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR store_id IN (
      SELECT wm.store_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() OR wm.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "store_viability_studies_update_own" ON public.store_viability_studies;
CREATE POLICY "store_viability_studies_update_own"
  ON public.store_viability_studies
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR store_id IN (
      SELECT wm.store_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() OR wm.profile_id = auth.uid()
    )
  );

-- Bucket de Relatórios Executivos de Viabilidade (viability-reports)
INSERT INTO storage.buckets (id, name, public)
VALUES ('viability-reports', 'viability-reports', true)
ON CONFLICT (id) DO NOTHING;
