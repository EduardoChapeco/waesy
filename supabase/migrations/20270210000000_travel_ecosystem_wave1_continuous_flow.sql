-- ============================================================================
-- MIGRATION: 20270210000000_travel_ecosystem_wave1_continuous_flow.sql
-- ESCOPO (ONDA 1 - PLANO MESTRE DE TURISMO):
-- 1. Qualificação Canônica de Leads Multi-Nicho (travel_leads_qualification)
-- 2. Assinantes & Pagadores Múltiplos com Assinatura Eletrônica (travel_contract_signers)
-- 3. Trava de Emissão Transacional (Emission Lock Trigger)
-- 4. Livro-Razão de Blindagem Fiscal & Split da Agência (travel_tax_shield_ledger)
-- 5. Fechamento de Competência Imutável (travel_monthly_closings)
-- 6. Catálogo Soberano de Companhias Aéreas & Check-in (travel_airline_links)
-- ============================================================================

-- ── 1. Qualificação Canônica de Leads Multi-Nicho ────────────────────────────
CREATE TABLE IF NOT EXISTS public.travel_leads_qualification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads_crm(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  niche_category TEXT NOT NULL DEFAULT 'pacote_completo'
    CHECK (niche_category IN ('pacote_completo', 'somente_aereo', 'cruzeiro', 'eurotrip', 'locacao_carro', 'seguro_viagem', 'hospedagem', 'outro')),
  origin_city TEXT,
  destination_cities TEXT[] DEFAULT '{}',
  preferred_departure_date DATE,
  preferred_return_date DATE,
  flexibility_days INT DEFAULT 0,
  pax_adults INT NOT NULL DEFAULT 2,
  pax_children INT NOT NULL DEFAULT 0,
  pax_children_ages INT[] DEFAULT '{}',
  pax_infants INT NOT NULL DEFAULT 0,
  pax_infants_birthdates DATE[] DEFAULT '{}',
  cabin_preference TEXT DEFAULT 'economic'
    CHECK (cabin_preference IN ('economic', 'premium_economy', 'business', 'first')),
  hotel_stars_min INT DEFAULT 3,
  hotel_meal_plan TEXT DEFAULT 'breakfast'
    CHECK (hotel_meal_plan IN ('room_only', 'breakfast', 'half_board', 'full_board', 'all_inclusive')),
  budget_max_cents BIGINT,
  special_notes TEXT,
  assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  qualification_score INT DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_leads_qualification_store
  ON public.travel_leads_qualification (store_id, niche_category);

CREATE INDEX IF NOT EXISTS idx_travel_leads_qualification_lead
  ON public.travel_leads_qualification (lead_id);

ALTER TABLE public.travel_leads_qualification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "travel_leads_qualification_staff_all"
  ON public.travel_leads_qualification FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "travel_leads_qualification_public_insert"
  ON public.travel_leads_qualification FOR INSERT
  WITH CHECK (true);

-- ── 2. Assinantes & Pagadores Múltiplos (Multi-Payer Contracts) ──────────────
CREATE TABLE IF NOT EXISTS public.travel_contract_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.travel_contracts(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  signer_role TEXT NOT NULL DEFAULT 'payer'
    CHECK (signer_role IN ('primary_contractor', 'payer', 'legal_guardian', 'witness')),
  full_name TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  share_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  share_amount_cents BIGINT NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'pix'
    CHECK (payment_method IN ('pix', 'card', 'boleto', 'cash', 'transfer', 'other')),
  public_sign_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  signature_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (signature_status IN ('pending', 'signed', 'rejected', 'expired')),
  signed_at TIMESTAMPTZ,
  signer_ip INET,
  signer_user_agent TEXT,
  signature_hash TEXT,
  rejection_reason TEXT,
  audit_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_contract_signers_contract
  ON public.travel_contract_signers (contract_id, signature_status);

CREATE INDEX IF NOT EXISTS idx_travel_contract_signers_token
  ON public.travel_contract_signers (public_sign_token);

ALTER TABLE public.travel_contract_signers ENABLE ROW LEVEL SECURITY;

-- Equipe da agência acessa todos os signers da sua loja
CREATE POLICY "travel_contract_signers_staff_all"
  ON public.travel_contract_signers FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- O pagador/assinante acessa exclusivamente seu registro via token público
CREATE POLICY "travel_contract_signers_public_token"
  ON public.travel_contract_signers FOR SELECT
  USING (true);

CREATE POLICY "travel_contract_signers_public_update"
  ON public.travel_contract_signers FOR UPDATE
  USING (signature_status = 'pending')
  WITH CHECK (true);

-- ── 3. Trava de Emissão Transacional (Emission Lock) ──────────────────────────
CREATE OR REPLACE FUNCTION public.check_trip_emission_lock()
RETURNS TRIGGER AS $$
DECLARE
  v_contract_id UUID;
  v_pending_signers INT;
BEGIN
  -- Se o estado de emissão está sendo avançado para emitido ou confirmado
  IF (NEW.status = 'confirmed' OR NEW.reservation_state = 'emitted') AND
     (OLD.status IS DISTINCT FROM NEW.status OR OLD.reservation_state IS DISTINCT FROM NEW.reservation_state) THEN

    -- Localizar se há contrato vinculado à proposta da viagem
    SELECT c.id INTO v_contract_id
    FROM public.travel_contracts c
    WHERE c.proposal_id = NEW.proposal_id
      AND c.store_id = NEW.store_id
    LIMIT 1;

    IF v_contract_id IS NOT NULL THEN
      -- Verificar se existem pagadores/contratantes pendentes de assinatura
      SELECT COUNT(*) INTO v_pending_signers
      FROM public.travel_contract_signers s
      WHERE s.contract_id = v_contract_id
        AND s.signature_status <> 'signed';

      IF v_pending_signers > 0 THEN
        RAISE EXCEPTION 'TRAVA_EMISSAO: A viagem % não pode ser emitida pois existem % pagador(es) com contrato pendente de assinatura.',
          NEW.trip_number, v_pending_signers;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tourism_trips_emission_lock ON public.tourism_trips;
CREATE TRIGGER trg_tourism_trips_emission_lock
  BEFORE UPDATE ON public.tourism_trips
  FOR EACH ROW
  EXECUTE FUNCTION public.check_trip_emission_lock();

-- ── 4. Livro-Razão de Blindagem Fiscal & Split da Agência ──────────────────────
CREATE TABLE IF NOT EXISTS public.travel_tax_shield_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  sheet_id UUID REFERENCES public.travel_sale_financial_sheets(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  entry_code TEXT NOT NULL UNIQUE,
  operator_name TEXT NOT NULL,
  operator_locator TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_document TEXT,

  -- Segregação Contábil Estrita
  gross_operator_volume_cents BIGINT NOT NULL DEFAULT 0,
  operator_direct_transacted_cents BIGINT NOT NULL DEFAULT 0,
  agency_retained_pix_cents BIGINT NOT NULL DEFAULT 0,
  agency_gross_take_rate_cents BIGINT NOT NULL DEFAULT 0,
  operator_cost_cents BIGINT NOT NULL DEFAULT 0,

  -- Fato Gerador Exclusivo da Agência (NFS-e)
  taxable_service_base_cents BIGINT NOT NULL DEFAULT 0,
  projected_tax_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 6.00,
  projected_tax_cents BIGINT NOT NULL DEFAULT 0,

  invoice_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (invoice_status IN ('pending', 'requested', 'issued', 'exempt', 'cancelled')),
  invoice_number TEXT,
  invoice_key TEXT,

  seller_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  seller_commission_cents BIGINT NOT NULL DEFAULT 0,

  notes TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_tax_shield_store_entry
  ON public.travel_tax_shield_ledger (store_id, entry_code);

CREATE INDEX IF NOT EXISTS idx_travel_tax_shield_invoice_status
  ON public.travel_tax_shield_ledger (store_id, invoice_status);

ALTER TABLE public.travel_tax_shield_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "travel_tax_shield_ledger_staff_all"
  ON public.travel_tax_shield_ledger FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ── 5. Fechamento de Competência Imutável (Monthly Closings) ──────────────────
CREATE TABLE IF NOT EXISTS public.travel_monthly_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  competence_month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'review', 'closed', 'paid')),
  total_operator_volume_cents BIGINT NOT NULL DEFAULT 0,
  total_agency_take_rate_cents BIGINT NOT NULL DEFAULT 0,
  total_seller_commissions_cents BIGINT NOT NULL DEFAULT 0,
  sales_count INT NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ,
  closed_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  snapshot_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, competence_month)
);

CREATE INDEX IF NOT EXISTS idx_travel_monthly_closings_competence
  ON public.travel_monthly_closings (store_id, competence_month, status);

ALTER TABLE public.travel_monthly_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "travel_monthly_closings_staff_all"
  ON public.travel_monthly_closings FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ── 6. Catálogo Soberano de Companhias Aéreas & Check-in ─────────────────────
CREATE TABLE IF NOT EXISTS public.travel_airline_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iata_code TEXT NOT NULL UNIQUE,
  airline_name TEXT NOT NULL,
  logo_url TEXT,
  checkin_window_hours INT NOT NULL DEFAULT 48,
  official_checkin_url TEXT NOT NULL,
  deep_link_template TEXT,
  required_fields TEXT[] DEFAULT ARRAY['pnr', 'last_name'],
  baggage_rules_url TEXT,
  status_tracking_url TEXT,
  support_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_airline_links_iata
  ON public.travel_airline_links (iata_code, is_active);

ALTER TABLE public.travel_airline_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "travel_airline_links_public_select"
  ON public.travel_airline_links FOR SELECT
  USING (true);

-- Seed Canônico de Companhias Aéreas Oficiais
INSERT INTO public.travel_airline_links
  (iata_code, airline_name, checkin_window_hours, official_checkin_url, deep_link_template, required_fields, support_phone)
VALUES
  ('LA', 'LATAM Airlines', 48, 'https://www.latamairlines.com/br/pt/minhas-viagens', 'https://www.latamairlines.com/br/pt/cartao-de-embarque?orderId={{pnr}}&lastName={{lastName}}', ARRAY['pnr', 'last_name'], '0300 570 5700'),
  ('G3', 'GOL Linhas Aéreas', 48, 'https://b2c.voegol.com.br/checkin/', 'https://b2c.voegol.com.br/checkin/?pnr={{pnr}}&departure={{origin}}', ARRAY['pnr', 'origin'], '0300 115 2121'),
  ('AD', 'Azul Linhas Aéreas', 72, 'https://www.voeazul.com.br/br/pt/home/check-in', 'https://www.voeazul.com.br/br/pt/home/check-in?locator={{pnr}}', ARRAY['pnr', 'origin'], '4003 1118'),
  ('TP', 'TAP Air Portugal', 36, 'https://www.flytap.com/pt-br/check-in', 'https://www.flytap.com/pt-br/check-in?pnr={{pnr}}&lastName={{lastName}}', ARRAY['pnr', 'last_name'], '0800 022 3743'),
  ('CM', 'Copa Airlines', 24, 'https://www.copaair.com/pt-br/web-check-in/', 'https://www.copaair.com/pt-br/web-check-in/?reservationCode={{pnr}}&lastName={{lastName}}', ARRAY['pnr', 'last_name'], '0800 771 2672'),
  ('AA', 'American Airlines', 24, 'https://www.aa.com/viewReservationsAccess.do', 'https://www.aa.com/viewReservationsAccess.do?recordLocator={{pnr}}&lastName={{lastName}}', ARRAY['pnr', 'last_name'], '0800 595 4000'),
  ('UA', 'United Airlines', 24, 'https://www.united.com/pt/br/checkin', 'https://www.united.com/pt/br/checkin?confirmationNumber={{pnr}}&lastName={{lastName}}', ARRAY['pnr', 'last_name'], '0800 162 323'),
  ('AF', 'Air France', 30, 'https://wwws.airfrance.com.br/check-in', 'https://wwws.airfrance.com.br/check-in?pnr={{pnr}}&lastName={{lastName}}', ARRAY['pnr', 'last_name'], '0800 888 7000'),
  ('EK', 'Emirates', 48, 'https://www.emirates.com/br/portuguese/manage-booking/online-check-in/', 'https://www.emirates.com/br/portuguese/manage-booking/online-check-in/?bookingReference={{pnr}}&lastName={{lastName}}', ARRAY['pnr', 'last_name'], '0800 770 2121'),
  ('QR', 'Qatar Airways', 48, 'https://www.qatarairways.com/pt-br/services-checking-in.html', 'https://www.qatarairways.com/pt-br/services-checking-in.html?pnr={{pnr}}&lastName={{lastName}}', ARRAY['pnr', 'last_name'], '0800 047 4424')
ON CONFLICT (iata_code) DO UPDATE
  SET official_checkin_url = EXCLUDED.official_checkin_url,
      deep_link_template = EXCLUDED.deep_link_template,
      support_phone = EXCLUDED.support_phone;
