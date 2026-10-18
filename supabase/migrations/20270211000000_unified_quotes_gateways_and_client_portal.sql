-- ============================================================================
-- MIGRATION: 20270211000000_unified_quotes_gateways_and_client_portal.sql
-- DESCRIÇÃO: Ondas 2 a 5 do Ecossistema de Turismo Waesy:
--   1. Multi-Operadora InfoTravel v1 (Orinter, FRT, Incomum)
--   2. Inteligência de Aeroportos Gateway Regionais (Gramado, Maragogi, Jeri, etc.)
--   3. Configuração Real de Quartos (Rooming) + Adicionais (Bebê Conforto, etc.)
--   4. Portal "Minhas Viagens": Boletos c/ Auto-Match OCR + PDFs Originais & Cards
--   5. Pré-Análise Consular de Visto (DS-160 EUA / Global) + Passaporte MRZ/NFC
--   6. Split Financeiro (20k -> 15k Financiado + 5k Pix c/ Retenção) & Comissões
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. INTEGRAÇÕES MULTI-OPERADORA INFOTRAVEL v1 (ORINTER, FRT, INCOMUM, ETC.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_operator_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  operator_slug TEXT NOT NULL CHECK (operator_slug IN ('orinter', 'frt', 'incomum', 'cativa', 'visual', 'abreutur', 'custom_infotravel')),
  operator_display_name TEXT NOT NULL,
  engine_type TEXT NOT NULL DEFAULT 'infotravel_v1' CHECK (engine_type IN ('infotravel_v1', 'manual_portal')),
  base_url TEXT NOT NULL DEFAULT 'https://api.infotravel.com.br/api/v1',
  client_code TEXT,
  agency_code TEXT,
  username TEXT,
  vault_secret_id TEXT,
  default_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  max_boleto_installments INTEGER NOT NULL DEFAULT 15,
  max_card_installments INTEGER NOT NULL DEFAULT 10,
  boleto_min_downpayment_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  boleto_provider_type TEXT NOT NULL DEFAULT 'agency_direct'
    CHECK (boleto_provider_type IN ('incomum_chat', 'frt_funpay', 'santander_app', 'orinter_portal', 'agency_direct')),
  payment_instructions_pt TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, operator_slug)
);

ALTER TABLE public.travel_operator_integrations
  ADD COLUMN IF NOT EXISTS operator_slug TEXT,
  ADD COLUMN IF NOT EXISTS operator_display_name TEXT,
  ADD COLUMN IF NOT EXISTS engine_type TEXT NOT NULL DEFAULT 'infotravel_v1',
  ADD COLUMN IF NOT EXISTS base_url TEXT NOT NULL DEFAULT 'https://api.infotravel.com.br/api/v1',
  ADD COLUMN IF NOT EXISTS client_code TEXT,
  ADD COLUMN IF NOT EXISTS agency_code TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS vault_secret_id TEXT,
  ADD COLUMN IF NOT EXISTS default_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  ADD COLUMN IF NOT EXISTS max_boleto_installments INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_card_installments INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS boleto_min_downpayment_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS boleto_provider_type TEXT NOT NULL DEFAULT 'agency_direct',
  ADD COLUMN IF NOT EXISTS payment_instructions_pt TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

CREATE INDEX IF NOT EXISTS idx_travel_operator_integrations_store
  ON public.travel_operator_integrations(store_id, is_active);

ALTER TABLE public.travel_operator_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_operator_integrations_tenant_select" ON public.travel_operator_integrations;
CREATE POLICY "travel_operator_integrations_tenant_select"
  ON public.travel_operator_integrations
  FOR SELECT
  TO authenticated
  USING (public.is_store_staff(store_id));

DROP POLICY IF EXISTS "travel_operator_integrations_tenant_write" ON public.travel_operator_integrations;
CREATE POLICY "travel_operator_integrations_tenant_write"
  ON public.travel_operator_integrations
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

-- ----------------------------------------------------------------------------
-- 2. INTELIGÊNCIA DE AEROPORTOS GATEWAY REGIONAIS (DESTINOS SEM AEROPORTO DIRETO)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_destination_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_slug TEXT NOT NULL UNIQUE,
  destination_name TEXT NOT NULL,
  state_uf TEXT,
  country_code TEXT NOT NULL DEFAULT 'BR',
  has_own_commercial_airport BOOLEAN NOT NULL DEFAULT false,
  primary_airport_iata TEXT NOT NULL,
  primary_airport_name TEXT NOT NULL,
  primary_distance_km INTEGER NOT NULL DEFAULT 0,
  primary_transfer_duration_mins INTEGER NOT NULL DEFAULT 30,
  secondary_airport_iata TEXT,
  secondary_airport_name TEXT,
  secondary_distance_km INTEGER,
  secondary_transfer_duration_mins INTEGER,
  recommended_transfer_type TEXT NOT NULL DEFAULT 'transfer_regular'
    CHECK (recommended_transfer_type IN ('transfer_regular', 'transfer_privativo', 'transfer_4x4', 'catamara_lancha', 'locacao_veiculo', 'urbano_direto')),
  estimated_transfer_cost_per_pax_cents INTEGER NOT NULL DEFAULT 12000,
  gateway_logistics_notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.travel_destination_gateways ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_destination_gateways_public_read" ON public.travel_destination_gateways;
CREATE POLICY "travel_destination_gateways_public_read"
  ON public.travel_destination_gateways
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.travel_destination_gateways (
  destination_slug, destination_name, state_uf, country_code, has_own_commercial_airport,
  primary_airport_iata, primary_airport_name, primary_distance_km, primary_transfer_duration_mins,
  secondary_airport_iata, secondary_airport_name, secondary_distance_km, secondary_transfer_duration_mins,
  recommended_transfer_type, estimated_transfer_cost_per_pax_cents, gateway_logistics_notes
) VALUES
  ('gramado', 'Gramado e Canela', 'RS', 'BR', false, 'POA', 'Aeroporto Salgado Filho (Porto Alegre)', 115, 120, 'CXJ', 'Aeroporto Regional Hugo Cantergiani (Caxias do Sul)', 68, 75, 'transfer_regular', 18000, 'Gramado não opera voos comerciais de grande porte. O desembarque ocorre via Porto Alegre (POA) ou Caxias do Sul (CXJ) + Transfer Terrestre pela Rota Romântica.'),
  ('maragogi', 'Maragogi', 'AL', 'BR', false, 'MCZ', 'Aeroporto Zumbi dos Palmares (Maceió)', 125, 130, 'REC', 'Aeroporto Internacional dos Guararapes (Recife)', 130, 140, 'transfer_privativo', 19000, 'Maragogi fica equidistante entre Maceió (MCZ) e Recife (REC). O sistema pesquisa ambos os aeroportos gateways e acopla o receptivo rodoviário pelo litoral.'),
  ('porto-de-galinhas', 'Porto de Galinhas', 'PE', 'BR', false, 'REC', 'Aeroporto Internacional dos Guararapes (Recife)', 52, 55, 'MCZ', 'Aeroporto Zumbi dos Palmares (Maceió)', 195, 180, 'transfer_regular', 11000, 'Acesso principal pelo Aeroporto do Recife (REC) seguido de 50 minutos de transfer via rodovia pedagiada.'),
  ('jericoacoara', 'Jericoacoara', 'CE', 'BR', false, 'JJD', 'Aeroporto Regional de Jericoacoara (Cruz)', 30, 45, 'FOR', 'Aeroporto Internacional Pinto Martins (Fortaleza)', 295, 270, 'transfer_4x4', 22000, 'Acesso à Vila de Jericoacoara exige veículo 4x4 credenciado pelas dunas a partir do Aeroporto de Cruz (JJD - 45 min) ou Fortaleza (FOR - 4h30).'),
  ('bombinhas', 'Bombinhas e Beto Carrero', 'SC', 'BR', false, 'NVT', 'Aeroporto Internacional de Navegantes', 60, 70, 'FLN', 'Aeroporto Internacional Hercílio Luz (Florianópolis)', 78, 85, 'transfer_regular', 14000, 'Atendido prioritariamente por Navegantes (NVT - ideal para Beto Carrero e Balneário Camboriú) ou Florianópolis (FLN).'),
  ('morro-de-sao-paulo', 'Morro de São Paulo', 'BA', 'BR', false, 'SSA', 'Aeroporto Internacional de Salvador', 60, 140, 'IOS', 'Aeroporto Jorge Amado (Ilhéus)', 240, 220, 'catamara_lancha', 28000, 'Ilha sem tráfego de veículos. Desembarque em Salvador (SSA) + travessia marítima em Catamarã ou Transfer Semiterrestre via Valença.'),
  ('buenos-aires', 'Buenos Aires', 'CABA', 'AR', true, 'AEP', 'Aeroparque Jorge Newbery (Centro)', 8, 25, 'EZE', 'Aeroporto Internacional de Ezeiza', 32, 45, 'transfer_privativo', 16000, 'Possui dois aeroportos internacionais: Aeroparque (AEP - central, 20 min dos hotéis da Recoleta/Centro) e Ezeiza (EZE - 45 min de transfer).')
ON CONFLICT (destination_slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. CONFIGURAÇÃO REAL DE QUARTOS (ROOMING) + ADICIONAIS ESPECÍFICOS POR QUARTO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_quote_room_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  quote_id UUID,
  proposal_id UUID,
  bundle_item_id UUID REFERENCES public.travel_quote_bundle_items(id) ON DELETE CASCADE,
  room_number INTEGER NOT NULL DEFAULT 1,
  room_label TEXT NOT NULL DEFAULT 'Quarto 1 — Casal',
  room_category TEXT NOT NULL DEFAULT 'Standard',
  meal_plan TEXT NOT NULL DEFAULT 'Café da Manhã',
  adults_count INTEGER NOT NULL DEFAULT 2 CHECK (adults_count >= 1),
  children_count INTEGER NOT NULL DEFAULT 0 CHECK (children_count >= 0),
  children_ages INTEGER[] NOT NULL DEFAULT '{}'::integer[],
  addons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  room_base_cents INTEGER NOT NULL DEFAULT 0,
  room_addons_cents INTEGER NOT NULL DEFAULT 0,
  room_total_cents INTEGER NOT NULL DEFAULT 0,
  payer_name TEXT,
  payer_cpf TEXT,
  payer_email TEXT,
  payer_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_quote_room_configs_quote
  ON public.travel_quote_room_configs(store_id, quote_id, proposal_id);

ALTER TABLE public.travel_quote_room_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_quote_room_configs_tenant_all" ON public.travel_quote_room_configs;
CREATE POLICY "travel_quote_room_configs_tenant_all"
  ON public.travel_quote_room_configs
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

-- ----------------------------------------------------------------------------
-- 4. PORTAL "MINHAS VIAGENS": BOLETOS, PARCELAS E AUTO-MATCH DE COMPROVANTES OCR
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_trip_installment_boletos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.tourism_trips(id) ON DELETE CASCADE,
  client_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  installment_number INTEGER NOT NULL CHECK (installment_number >= 1),
  total_installments INTEGER NOT NULL DEFAULT 1,
  due_date DATE NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  operator_slug TEXT NOT NULL DEFAULT 'orinter',
  payment_channel TEXT NOT NULL DEFAULT 'agency_pix'
    CHECK (payment_channel IN ('incomum_chat', 'frt_funpay', 'santander_app', 'orinter_portal', 'agency_pix', 'credit_card', 'boleto_bancario')),
  boleto_pdf_url TEXT,
  digitable_line TEXT,
  pix_copia_e_cola TEXT,
  external_payment_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'receipt_uploaded', 'reconciled', 'overdue', 'waived')),
  receipt_file_url TEXT,
  receipt_uploaded_at TIMESTAMPTZ,
  ocr_extracted_amount_cents INTEGER,
  ocr_extracted_date DATE,
  ocr_extracted_payer TEXT,
  ocr_match_confidence NUMERIC(4,2),
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_travel_trip_installment_boletos_trip
  ON public.travel_trip_installment_boletos(trip_id, installment_number);

ALTER TABLE public.travel_trip_installment_boletos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_trip_installment_boletos_access" ON public.travel_trip_installment_boletos;
CREATE POLICY "travel_trip_installment_boletos_access"
  ON public.travel_trip_installment_boletos
  FOR ALL
  TO authenticated
  USING (
    client_profile_id = auth.uid()
    OR public.is_store_staff(store_id)
  )
  WITH CHECK (
    client_profile_id = auth.uid()
    OR public.is_store_staff(store_id)
  );

-- ----------------------------------------------------------------------------
-- 5. DOCUMENTOS OFICIAIS DA VIAGEM (PDFs ORIGINAIS + JSON OCR PARA O COPILOT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_trip_official_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.tourism_trips(id) ON DELETE CASCADE,
  doc_category TEXT NOT NULL
    CHECK (doc_category IN (
      'operator_confirmation',
      'signed_contract',
      'payment_receipt',
      'hotel_voucher',
      'flight_eticket',
      'transfer_voucher',
      'insurance_policy'
    )),
  operator_name TEXT NOT NULL DEFAULT 'Orinter Tour & Travel',
  reservation_code TEXT,
  hotel_confirmation_id TEXT,
  transfer_confirmation_id TEXT,
  title TEXT NOT NULL,
  original_pdf_url TEXT NOT NULL,
  ocr_extracted_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  cancellation_rules_text TEXT,
  fine_penalty_schedule_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  emergency_phone_24h TEXT,
  is_visible_to_client BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_trip_official_documents_trip
  ON public.travel_trip_official_documents(trip_id, is_visible_to_client);

ALTER TABLE public.travel_trip_official_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_trip_official_documents_read" ON public.travel_trip_official_documents;
CREATE POLICY "travel_trip_official_documents_read"
  ON public.travel_trip_official_documents
  FOR SELECT
  TO authenticated
  USING (
    is_visible_to_client = true
    OR public.is_store_staff(store_id)
  );

-- ----------------------------------------------------------------------------
-- 6. MOTOR DE PRÉ-ANÁLISE CONSULAR DE VISTO (DS-160 EUA / GLOBAL) & PASSAPORTE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_visa_ds160_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_id UUID,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  applicant_name TEXT NOT NULL,
  applicant_cpf TEXT,
  destination_country TEXT NOT NULL DEFAULT 'Estados Unidos',
  visa_type TEXT NOT NULL DEFAULT 'B1/B2 (Turismo e Negócios — DS-160)',
  passport_number TEXT,
  passport_expiry_date DATE,
  passport_mrz_verified BOOLEAN NOT NULL DEFAULT false,
  passport_nfc_verified BOOLEAN NOT NULL DEFAULT false,
  monthly_income_cents INTEGER NOT NULL DEFAULT 0,
  occupation_type TEXT NOT NULL DEFAULT 'clt'
    CHECK (occupation_type IN ('empresario', 'clt', 'servidor_publico', 'profissional_liberal', 'estudante', 'aposentado', 'autonomo', 'desempregado')),
  employment_tenure_months INTEGER NOT NULL DEFAULT 0,
  has_income_tax_return BOOLEAN NOT NULL DEFAULT true,
  has_property_in_brazil BOOLEAN NOT NULL DEFAULT false,
  has_dependents_in_brazil BOOLEAN NOT NULL DEFAULT false,
  previous_international_trips TEXT[] NOT NULL DEFAULT '{}'::text[],
  has_relatives_in_destination BOOLEAN NOT NULL DEFAULT false,
  relatives_legal_status TEXT DEFAULT 'none',
  previous_visa_refusal BOOLEAN NOT NULL DEFAULT false,
  refusal_section_code TEXT,
  trip_sponsor_type TEXT NOT NULL DEFAULT 'self'
    CHECK (trip_sponsor_type IN ('self', 'parents_family', 'company_employer', 'other')),
  estimated_trip_cost_cents INTEGER NOT NULL DEFAULT 2000000,
  planned_stay_days INTEGER NOT NULL DEFAULT 10,
  consular_ties_score INTEGER NOT NULL DEFAULT 0 CHECK (consular_ties_score BETWEEN 0 AND 100),
  readiness_tier TEXT NOT NULL DEFAULT 'moderate_review'
    CHECK (readiness_tier IN ('strong_ties', 'moderate_review', 'high_risk_214b')),
  red_flags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_evidence_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  consular_assessment_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_visa_ds160_evaluations_store
  ON public.travel_visa_ds160_evaluations(store_id, created_at DESC);

ALTER TABLE public.travel_visa_ds160_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_visa_ds160_evaluations_tenant_all" ON public.travel_visa_ds160_evaluations;
CREATE POLICY "travel_visa_ds160_evaluations_tenant_all"
  ON public.travel_visa_ds160_evaluations
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

-- ----------------------------------------------------------------------------
-- 7. SPLIT FINANCEIRO COM RETENÇÃO DE COMISSÃO & FOLHA DE COMISSÕES DE AGENTES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_agent_commission_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  reservation_code TEXT,
  operator_name TEXT NOT NULL DEFAULT 'Orinter',
  agent_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  lead_source TEXT NOT NULL DEFAULT 'whatsapp',
  gross_sale_cents INTEGER NOT NULL CHECK (gross_sale_cents >= 0),
  supplier_net_cents INTEGER NOT NULL CHECK (supplier_net_cents >= 0),
  agency_commission_cents INTEGER NOT NULL CHECK (agency_commission_cents >= 0),
  financed_by_operator_cents INTEGER NOT NULL DEFAULT 0,
  pix_received_by_agency_cents INTEGER NOT NULL DEFAULT 0,
  retained_commission_from_pix_cents INTEGER NOT NULL DEFAULT 0,
  net_remittance_to_operator_cents INTEGER NOT NULL DEFAULT 0,
  customer_pix_receipt_url TEXT,
  operator_remittance_receipt_url TEXT,
  agent_commission_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  agent_commission_cents INTEGER NOT NULL DEFAULT 0,
  payout_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'approved_for_payroll', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_agent_commission_splits_store
  ON public.travel_agent_commission_splits(store_id, payout_status, created_at DESC);

ALTER TABLE public.travel_agent_commission_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_agent_commission_splits_tenant_all" ON public.travel_agent_commission_splits;
CREATE POLICY "travel_agent_commission_splits_tenant_all"
  ON public.travel_agent_commission_splits
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

COMMIT;
