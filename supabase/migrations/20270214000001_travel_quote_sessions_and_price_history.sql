-- ============================================================================
-- MIGRATION: 20270214000000_travel_quote_sessions_and_price_history.sql
-- DESCRIÇÃO: Sessões Canônicas de Busca, Snapshots de Oferta e Histórico Estruturado de Preços
-- NORMAS: AGENTS.md (B.1 a B.41), SPEC-TURISMO-CORPORATIVO-TRAVELOS-CONSOLIDATION
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. SESSÃO CANÔNICA DE BUSCA / COTAÇÃO (TRAVEL QUOTE SESSION)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_quote_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  project_id UUID REFERENCES public.travel_projects(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('flight', 'hotel', 'car', 'bus', 'transfer', 'package')),
  search_payload_hash TEXT NOT NULL,
  search_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('started', 'in_progress', 'completed', 'failed')),
  provider_count INTEGER NOT NULL DEFAULT 0,
  successful_provider_count INTEGER NOT NULL DEFAULT 0,
  failed_provider_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_travel_quote_sessions_agency ON public.travel_quote_sessions(agency_id, started_at);
CREATE INDEX IF NOT EXISTS idx_travel_quote_sessions_hash ON public.travel_quote_sessions(search_payload_hash);

ALTER TABLE public.travel_quote_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_quote_sessions_parties_access" ON public.travel_quote_sessions;
CREATE POLICY "travel_quote_sessions_parties_access"
  ON public.travel_quote_sessions
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_store_staff(agency_id) OR
    (company_id IS NOT NULL AND public.is_store_staff(company_id))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    public.is_store_staff(agency_id) OR
    (company_id IS NOT NULL AND public.is_store_staff(company_id))
  );

-- ----------------------------------------------------------------------------
-- 2. EXECUÇÃO INDIVIDUAL POR PROVEDOR (TELEMETRIA E RESILIÊNCIA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quote_provider_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_session_id UUID NOT NULL REFERENCES public.travel_quote_sessions(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  request_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_at TIMESTAMPTZ,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'timeout', 'error', 'no_availability')),
  error_code TEXT,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  provider_request_id TEXT,
  trace_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quote_provider_executions_session ON public.quote_provider_executions(quote_session_id);

ALTER TABLE public.quote_provider_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote_provider_executions_access" ON public.quote_provider_executions;
CREATE POLICY "quote_provider_executions_access"
  ON public.quote_provider_executions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_quote_sessions s
      WHERE s.id = quote_session_id AND (
        s.user_id = auth.uid() OR
        public.is_store_staff(s.agency_id) OR
        (s.company_id IS NOT NULL AND public.is_store_staff(s.company_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.travel_quote_sessions s
      WHERE s.id = quote_session_id AND (
        public.is_store_staff(s.agency_id)
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 3. SNAPSHOT IMUTÁVEL DE OFERTA NORMALIZADA (TRAVEL OFFER SNAPSHOT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_offer_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_session_id UUID NOT NULL REFERENCES public.travel_quote_sessions(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  normalized_offer_id TEXT NOT NULL,
  product_type TEXT NOT NULL,
  origin TEXT,
  destination TEXT,
  travel_start_date DATE,
  travel_end_date DATE,
  net_amount_cents BIGINT NOT NULL,
  tax_amount_cents BIGINT NOT NULL DEFAULT 0,
  fee_amount_cents BIGINT NOT NULL DEFAULT 0,
  markup_amount_cents BIGINT NOT NULL DEFAULT 0,
  total_amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  fare_family TEXT,
  baggage_included TEXT,
  cancellation_rule_summary TEXT,
  policy_status TEXT NOT NULL DEFAULT 'within_policy' CHECK (policy_status IN ('within_policy', 'outside_policy', 'requires_approval')),
  policy_violation_reasons TEXT[] NOT NULL DEFAULT '{}',
  provider_reference TEXT,
  raw_snapshot_ref TEXT,
  normalizer_version TEXT NOT NULL DEFAULT 'v1',
  quoted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_travel_offer_snapshots_session ON public.travel_offer_snapshots(quote_session_id);
CREATE INDEX IF NOT EXISTS idx_travel_offer_snapshots_route ON public.travel_offer_snapshots(origin, destination, travel_start_date);

ALTER TABLE public.travel_offer_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_offer_snapshots_access" ON public.travel_offer_snapshots;
CREATE POLICY "travel_offer_snapshots_access"
  ON public.travel_offer_snapshots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_quote_sessions s
      WHERE s.id = quote_session_id AND (
        s.user_id = auth.uid() OR
        public.is_store_staff(s.agency_id) OR
        (s.company_id IS NOT NULL AND public.is_store_staff(s.company_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.travel_quote_sessions s
      WHERE s.id = quote_session_id AND public.is_store_staff(s.agency_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 4. HISTÓRICO ESTRUTURADO TEMPORAL DE PREÇOS (PRICE OBSERVATIONS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_price_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  product_type TEXT NOT NULL,
  route_fingerprint TEXT NOT NULL,
  travel_start_date DATE NOT NULL,
  travel_end_date DATE,
  advance_days INTEGER NOT NULL DEFAULT 0,
  provider_code TEXT NOT NULL,
  fare_family TEXT,
  price_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  search_context_hash TEXT NOT NULL,
  offer_snapshot_id UUID REFERENCES public.travel_offer_snapshots(id) ON DELETE SET NULL,
  availability_state TEXT NOT NULL DEFAULT 'available' CHECK (availability_state IN ('available', 'last_seats', 'sold_out'))
);

CREATE INDEX IF NOT EXISTS idx_travel_price_observations_fingerprint ON public.travel_price_observations(route_fingerprint, travel_start_date);
CREATE INDEX IF NOT EXISTS idx_travel_price_observations_observed ON public.travel_price_observations(observed_at);

ALTER TABLE public.travel_price_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_price_observations_read_all" ON public.travel_price_observations;
CREATE POLICY "travel_price_observations_read_all"
  ON public.travel_price_observations
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "travel_price_observations_insert_auth" ON public.travel_price_observations;
CREATE POLICY "travel_price_observations_insert_auth"
  ON public.travel_price_observations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMIT;
