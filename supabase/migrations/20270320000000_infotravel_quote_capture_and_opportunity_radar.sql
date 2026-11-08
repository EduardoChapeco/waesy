-- ============================================================================
-- MIGRATION: 20270320000000_infotravel_quote_capture_and_opportunity_radar.sql
-- DESCRIÇÃO: Captura de cotações Infotravel, ledger de preços observados,
--            demandas de clientes e radar de oportunidades de viagem.
-- NORMAS: AGENTS.md (B.1 a B.41), SPEC-INFOTRAVEL-QUOTE-CAPTURE-AND-OPPORTUNITY-RADAR
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CAPTURA BRUTA DE COTAÇÕES (TRAVEL_QUOTE_CAPTURES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_quote_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  demand_id UUID, -- FK adicionada após a criação de travel_client_demands
  operator_slug TEXT NOT NULL DEFAULT 'infotravel_default',
  source_page TEXT NOT NULL CHECK (source_page IN ('carrinho', 'aereo_resultado', 'hotel_resultado', 'circuito_resultado', 'orcamento_salvo')),
  search_payload_hash TEXT NOT NULL,
  origin_city TEXT,
  destination_city TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  adults_count INTEGER NOT NULL DEFAULT 1 CHECK (adults_count >= 1),
  children_count INTEGER NOT NULL DEFAULT 0 CHECK (children_count >= 0),
  infants_count INTEGER NOT NULL DEFAULT 0 CHECK (infants_count >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0),
  per_adult_cents BIGINT CHECK (per_adult_cents >= 0),
  taxes_cents BIGINT NOT NULL DEFAULT 0 CHECK (taxes_cents >= 0),
  summary_pitch_text TEXT,
  raw_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_quote_captures_store_dest ON public.travel_quote_captures(store_id, destination_city, start_date);
CREATE INDEX IF NOT EXISTS idx_travel_quote_captures_hash ON public.travel_quote_captures(search_payload_hash);
CREATE INDEX IF NOT EXISTS idx_travel_quote_captures_lead ON public.travel_quote_captures(lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE public.travel_quote_captures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_quote_captures_tenant_isolation" ON public.travel_quote_captures;
CREATE POLICY "travel_quote_captures_tenant_isolation"
  ON public.travel_quote_captures
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(store_id) OR
    (user_id IS NOT NULL AND user_id = auth.uid())
  )
  WITH CHECK (
    public.is_store_staff(store_id)
  );

-- ----------------------------------------------------------------------------
-- 2. ITENS DETALHADOS DA COTAÇÃO (TRAVEL_QUOTE_CAPTURE_ITEMS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_quote_capture_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id UUID NOT NULL REFERENCES public.travel_quote_captures(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('flight', 'hotel', 'circuit', 'transfer', 'activity', 'insurance', 'other')),
  title TEXT NOT NULL,
  provider_or_airline TEXT,
  utilization_period TEXT,
  flight_stops INTEGER DEFAULT 0,
  cabin_class TEXT,
  hotel_room_type TEXT,
  meal_plan TEXT,
  fare_amount_cents BIGINT NOT NULL DEFAULT 0,
  tax_amount_cents BIGINT NOT NULL DEFAULT 0,
  total_amount_cents BIGINT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_quote_items_capture ON public.travel_quote_capture_items(capture_id);

ALTER TABLE public.travel_quote_capture_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_quote_capture_items_tenant_isolation" ON public.travel_quote_capture_items;
CREATE POLICY "travel_quote_capture_items_tenant_isolation"
  ON public.travel_quote_capture_items
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(store_id)
  )
  WITH CHECK (
    public.is_store_staff(store_id)
  );

-- ----------------------------------------------------------------------------
-- 3. DEMANDAS E DESEJOS DE CLIENTES (TRAVEL_CLIENT_DEMANDS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_client_demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  destination_city TEXT NOT NULL,
  destination_country TEXT,
  earliest_departure DATE NOT NULL,
  latest_departure DATE NOT NULL,
  duration_days_min INTEGER DEFAULT 5,
  duration_days_max INTEGER DEFAULT 15,
  budget_max_cents BIGINT NOT NULL CHECK (budget_max_cents > 0),
  adults_count INTEGER NOT NULL DEFAULT 2 CHECK (adults_count >= 1),
  children_count INTEGER NOT NULL DEFAULT 0,
  preferred_product_type TEXT NOT NULL DEFAULT 'package' CHECK (preferred_product_type IN ('flight', 'hotel', 'package', 'circuit', 'any')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matched', 'closed_won', 'closed_lost', 'dormant')),
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adiciona a FK na tabela de captures para vincular explicitamente a demanda
ALTER TABLE public.travel_quote_captures
  DROP CONSTRAINT IF EXISTS fk_travel_quote_captures_demand,
  ADD CONSTRAINT fk_travel_quote_captures_demand
  FOREIGN KEY (demand_id) REFERENCES public.travel_client_demands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_travel_client_demands_store_active ON public.travel_client_demands(store_id, status, destination_city);
CREATE INDEX IF NOT EXISTS idx_travel_client_demands_dates ON public.travel_client_demands(earliest_departure, latest_departure);

ALTER TABLE public.travel_client_demands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_client_demands_tenant_isolation" ON public.travel_client_demands;
CREATE POLICY "travel_client_demands_tenant_isolation"
  ON public.travel_client_demands
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(store_id)
  )
  WITH CHECK (
    public.is_store_staff(store_id)
  );

-- ----------------------------------------------------------------------------
-- 4. RADAR DE OPORTUNIDADES GERADAS (TRAVEL_OPPORTUNITIES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  demand_id UUID NOT NULL REFERENCES public.travel_client_demands(id) ON DELETE CASCADE,
  capture_id UUID NOT NULL REFERENCES public.travel_quote_captures(id) ON DELETE CASCADE,
  match_score NUMERIC(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons TEXT[] NOT NULL DEFAULT '{}',
  quoted_total_cents BIGINT NOT NULL,
  client_budget_cents BIGINT NOT NULL,
  variance_pct NUMERIC(6,2) NOT NULL, -- Ex: -8.50% (mais barato) ou +4.20% (levemente acima do budget)
  historical_reference_median_cents BIGINT,
  historical_sample_size INTEGER DEFAULT 0,
  tariff_temperature TEXT CHECK (tariff_temperature IN ('cold', 'moderate', 'warm', 'insufficient_data')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'viewed', 'contacted', 'dismissed', 'expired')),
  dismiss_reason TEXT,
  whatsapp_pitch_draft TEXT,
  dismissed_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_travel_opportunity_demand_capture UNIQUE (demand_id, capture_id)
);

CREATE INDEX IF NOT EXISTS idx_travel_opportunities_store_status ON public.travel_opportunities(store_id, status, match_score DESC);

ALTER TABLE public.travel_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_opportunities_tenant_isolation" ON public.travel_opportunities;
CREATE POLICY "travel_opportunities_tenant_isolation"
  ON public.travel_opportunities
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(store_id)
  )
  WITH CHECK (
    public.is_store_staff(store_id)
  );

-- ----------------------------------------------------------------------------
-- 5. LEDGER HISTÓRICO DE PREÇOS IMUTÁVEL (TRAVEL_PRICE_OBSERVATIONS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_price_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL CHECK (product_type IN ('flight', 'hotel', 'package', 'circuit', 'transfer', 'activity')),
  route_fingerprint TEXT NOT NULL,
  travel_start_date DATE NOT NULL,
  travel_end_date DATE,
  advance_days INTEGER NOT NULL CHECK (advance_days >= 0),
  provider_code TEXT NOT NULL,
  fare_family TEXT,
  price_cents BIGINT NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  search_context_hash TEXT NOT NULL,
  availability_state TEXT NOT NULL DEFAULT 'available',
  source TEXT NOT NULL DEFAULT 'extension_capture',
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.travel_price_observations ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.travel_price_observations ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'extension_capture';

CREATE INDEX IF NOT EXISTS idx_travel_price_obs_lookup ON public.travel_price_observations(store_id, route_fingerprint, travel_start_date);
CREATE INDEX IF NOT EXISTS idx_travel_price_obs_temporal ON public.travel_price_observations(observed_at);

ALTER TABLE public.travel_price_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_price_observations_tenant_isolation" ON public.travel_price_observations;
CREATE POLICY "travel_price_observations_tenant_isolation"
  ON public.travel_price_observations
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(store_id)
  )
  WITH CHECK (
    public.is_store_staff(store_id)
  );

COMMIT;
