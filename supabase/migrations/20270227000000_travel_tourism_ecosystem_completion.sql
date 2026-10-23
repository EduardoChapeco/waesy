-- ==============================================================================
-- MIGRAÇÃO CANÔNICA: TRAVEL & TURISMO ECOSYSTEM COMPLETION (100% UNIFIED)
-- Protocolo Big Tech Principal Architect Level - Plataforma Waesy
-- Data: 2027-02-27
-- Escopo:
--   1. Vínculo Multi-Tenant em travel_quotes (store_id e protocol_number)
--   2. Normalização de Alocações de Hotelaria (travel_rooming_allocations)
--   3. Histórico Imutável de Versões de Proposta (travel_proposal_versions)
--   4. Gestão de Comissionamento e Contas a Receber de Operadoras (travel_operator_commissions)
--   5. Notificações e Reacomodação de Malha Aérea ANAC (travel_flight_reaccommodations)
-- ==============================================================================

-- 1. Vínculo Multi-Tenant e Protocolo em travel_quotes
ALTER TABLE public.travel_quotes 
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS protocol_number TEXT;

CREATE INDEX IF NOT EXISTS idx_travel_quotes_store_id ON public.travel_quotes(store_id);

-- 2. Tabela de Alocações de Quartos / Rooming List (travel_rooming_allocations)
CREATE TABLE IF NOT EXISTS public.travel_rooming_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES public.group_tours(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  hotel_name TEXT NOT NULL,
  room_number TEXT,
  room_type TEXT NOT NULL DEFAULT 'double_couple', -- single, double_couple, double_twin, triple, quadruple, family
  capacity INT NOT NULL DEFAULT 2,
  guest_name TEXT NOT NULL,
  guest_document TEXT,
  document_type TEXT DEFAULT 'CPF',
  guest_phone TEXT,
  special_requests TEXT, -- berço, cama extra, acessibilidade PWD, andar alto
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, checked_in, checked_out, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_rooming_tour ON public.travel_rooming_allocations(tour_id);
CREATE INDEX IF NOT EXISTS idx_travel_rooming_store ON public.travel_rooming_allocations(store_id);

ALTER TABLE public.travel_rooming_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view travel_rooming_allocations" ON public.travel_rooming_allocations;
CREATE POLICY "Public view travel_rooming_allocations"
  ON public.travel_rooming_allocations
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Store staff manage travel_rooming_allocations" ON public.travel_rooming_allocations;
CREATE POLICY "Store staff manage travel_rooming_allocations"
  ON public.travel_rooming_allocations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = travel_rooming_allocations.store_id AND sm.profile_id = auth.uid()
    )
  );

-- 3. Histórico Imutável de Versões de Proposta (travel_proposal_versions)
CREATE TABLE IF NOT EXISTS public.travel_proposal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_summary TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_prop_versions_prop ON public.travel_proposal_versions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_travel_prop_versions_store ON public.travel_proposal_versions(store_id);

ALTER TABLE public.travel_proposal_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store staff manage travel_proposal_versions" ON public.travel_proposal_versions;
CREATE POLICY "Store staff manage travel_proposal_versions"
  ON public.travel_proposal_versions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = travel_proposal_versions.store_id AND sm.profile_id = auth.uid()
    )
  );

-- 4. Gestão de Comissões e Contas a Receber de Operadoras (travel_operator_commissions)
CREATE TABLE IF NOT EXISTS public.travel_operator_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  operator_name TEXT NOT NULL, -- CVC, Abreu, Orinter, ViagensPromo, RexturAdvance, Wooba, etc.
  booking_reference TEXT NOT NULL,
  passenger_name TEXT NOT NULL,
  destination TEXT,
  travel_departure_date DATE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gross_amount_cents BIGINT NOT NULL DEFAULT 0,
  commission_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  commission_amount_cents BIGINT NOT NULL DEFAULT 0,
  payout_rule TEXT NOT NULL DEFAULT 'departure_plus_30', -- departure_plus_30, sale_plus_30, on_checkout
  estimated_payout_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, paid, disputed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_commissions_store ON public.travel_operator_commissions(store_id);
CREATE INDEX IF NOT EXISTS idx_travel_commissions_status ON public.travel_operator_commissions(status);

ALTER TABLE public.travel_operator_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store staff manage travel_operator_commissions" ON public.travel_operator_commissions;
CREATE POLICY "Store staff manage travel_operator_commissions"
  ON public.travel_operator_commissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = travel_operator_commissions.store_id AND sm.profile_id = auth.uid()
    )
  );

-- 5. Reacomodação de Malha Aérea ANAC (travel_flight_reaccommodations)
CREATE TABLE IF NOT EXISTS public.travel_flight_reaccommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  pnr_locator TEXT NOT NULL,
  airline_code TEXT NOT NULL,
  passenger_name TEXT NOT NULL,
  original_flight_number TEXT NOT NULL,
  original_departure_time TIMESTAMPTZ NOT NULL,
  new_flight_number TEXT NOT NULL,
  new_departure_time TIMESTAMPTZ NOT NULL,
  change_reason TEXT NOT NULL DEFAULT 'malha_aerea',
  passenger_notified BOOLEAN NOT NULL DEFAULT false,
  notification_channel TEXT DEFAULT 'whatsapp',
  notification_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_flight_reaccom_store ON public.travel_flight_reaccommodations(store_id);
ALTER TABLE public.travel_flight_reaccommodations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store staff manage travel_flight_reaccommodations" ON public.travel_flight_reaccommodations;
CREATE POLICY "Store staff manage travel_flight_reaccommodations"
  ON public.travel_flight_reaccommodations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = travel_flight_reaccommodations.store_id AND sm.profile_id = auth.uid()
    )
  );

-- 5b. Garantir tabela travel_quote_requests (ausente em producao apesar de 20270130000000 registrada)
CREATE TABLE IF NOT EXISTS public.travel_quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL DEFAULT '',
  client_email TEXT,
  destination TEXT NOT NULL DEFAULT 'Cotacao via Vitrine',
  departure_date DATE,
  return_date DATE,
  passengers_count INTEGER NOT NULL DEFAULT 1 CHECK (passengers_count >= 1),
  budget_cents BIGINT CHECK (budget_cents IS NULL OR budget_cents >= 0),
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'omni_builder_vitrine',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_travel_quote_requests_store_id ON public.travel_quote_requests(store_id);
ALTER TABLE public.travel_quote_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS travel_quote_requests_store_members ON public.travel_quote_requests;
CREATE POLICY travel_quote_requests_store_members ON public.travel_quote_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_members sm WHERE sm.store_id = travel_quote_requests.store_id AND sm.profile_id = auth.uid()));

-- 6. Garantir Política de Inserção Pública para Cotações
DROP POLICY IF EXISTS "Qualquer visitante pode enviar cotação em travel_quote_requests" ON public.travel_quote_requests;
CREATE POLICY "Qualquer visitante pode enviar cotação em travel_quote_requests"
  ON public.travel_quote_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
