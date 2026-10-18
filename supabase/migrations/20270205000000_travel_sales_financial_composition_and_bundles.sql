-- ============================================================================
-- MIGRATION: 20270205000000_travel_sales_financial_composition_and_bundles.sql
-- ESCOPO:
-- 1. Saneamento de atributos vazados (temperature/is_alcoholic) em classificados de turismo/outros
-- 2. Visibilidade Unlisted, Composição Estrita de Passageiros e Agrupador de Multi-Orçamentos
-- 3. Módulo Interno "Financeiro da Venda" (8 Blocos Auditáveis + Multi-Operadora + NF + Audit Log)
-- ============================================================================

-- 1. Saneamento de atributos residuais de conveniência em anúncios de viagens, imóveis, veículos e serviços
UPDATE public.classifieds
SET attributes = attributes - 'temperature' - 'is_alcoholic' - 'volume'
WHERE (
  attributes->>'template_style' = 'editorial'
  OR attributes ? 'destination_city'
  OR attributes ? 'itinerary_days'
  OR attributes ? 'lodgings'
  OR attributes ? 'flight_details'
  OR attributes ? 'bedrooms'
  OR attributes ? 'mileage_km'
);

-- 2. Colunas de Visibilidade Direta (Unlisted) e Composição de Passageiros em classifieds
ALTER TABLE public.classifieds
  ADD COLUMN IF NOT EXISTS visibility_mode TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility_mode IN ('public', 'unlisted', 'private')),
  ADD COLUMN IF NOT EXISTS is_custom_quote BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS passenger_composition JSONB NOT NULL DEFAULT '{"adults": 2, "children": 0, "children_max_age": 12, "infants": 0, "allow_custom_count": true}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_classifieds_visibility_mode
  ON public.classifieds (visibility_mode, status);

CREATE OR REPLACE VIEW public.classified_listings AS SELECT * FROM public.classifieds;

-- 3. Agrupador de Multi-Orçamentos (1 Link Único com Header Comparativo de Opções)
CREATE TABLE IF NOT EXISTS public.travel_quote_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  creator_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  intro_notes TEXT,
  passenger_composition JSONB NOT NULL DEFAULT '{"adults": 2, "children": 0, "children_max_age": 12, "infants": 0, "allow_custom_count": false}'::jsonb,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'expired', 'cancelled')),
  accepted_listing_id UUID REFERENCES public.classifieds(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.travel_quote_bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.travel_quote_bundles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.classifieds(id) ON DELETE CASCADE,
  option_label TEXT NOT NULL DEFAULT 'Opção 1',
  badge_text TEXT,
  custom_price_cents BIGINT,
  advisor_notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bundle_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_travel_quote_bundle_items_bundle
  ON public.travel_quote_bundle_items (bundle_id, sort_order);

-- 4. Módulo Interno "Financeiro da Venda" — Ficha Financeira Mestre (8 Blocos)
CREATE TABLE IF NOT EXISTS public.travel_sale_financial_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.travel_proposals(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.classifieds(id) ON DELETE SET NULL,

  -- Identificação da Venda
  internal_code TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_document TEXT,
  seller_name TEXT NOT NULL DEFAULT 'Consultor Principal',
  agency_unit TEXT NOT NULL DEFAULT 'Matriz',
  primary_operator TEXT NOT NULL DEFAULT 'Orinter',
  locator_code TEXT NOT NULL,
  destination TEXT NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  departure_date DATE,
  return_date DATE,
  booking_status TEXT NOT NULL DEFAULT 'confirmada'
    CHECK (booking_status IN ('rascunho', 'confirmada', 'emitida', 'em_viagem', 'concluida', 'cancelada')),

  -- Bloco 1: Composição da Venda
  gross_sale_cents BIGINT NOT NULL DEFAULT 0,
  non_commissionable_cents BIGINT NOT NULL DEFAULT 0,
  net_sale_cents BIGINT NOT NULL DEFAULT 0,

  -- Bloco 2: Comissão
  commission_mode TEXT NOT NULL DEFAULT 'percentage'
    CHECK (commission_mode IN ('amount', 'percentage')),
  commission_base_type TEXT NOT NULL DEFAULT 'net_sale'
    CHECK (commission_base_type IN ('net_sale', 'gross_sale', 'custom')),
  commission_custom_base_cents BIGINT NOT NULL DEFAULT 0,
  commission_percentage NUMERIC(6,2) NOT NULL DEFAULT 10.00,
  commission_calculated_cents BIGINT NOT NULL DEFAULT 0,
  commission_override_cents BIGINT,
  commission_final_cents BIGINT NOT NULL DEFAULT 0,
  commission_notes TEXT,

  -- Bloco 3: Over (Incentivo / Markup / Overcommission)
  over_mode TEXT NOT NULL DEFAULT 'amount'
    CHECK (over_mode IN ('amount', 'percentage')),
  over_percentage NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  over_gross_cents BIGINT NOT NULL DEFAULT 0,
  over_deductions_cents BIGINT NOT NULL DEFAULT 0,
  over_net_calculated_cents BIGINT NOT NULL DEFAULT 0,
  over_net_override_cents BIGINT,
  over_net_final_cents BIGINT NOT NULL DEFAULT 0,

  -- Bloco 4: Receita da Agência (Comissão Final + Over Líquido Final)
  agency_revenue_cents BIGINT NOT NULL DEFAULT 0,

  -- Bloco 5 & 6: Custos Internos e Resultado Final
  internal_costs_cents BIGINT NOT NULL DEFAULT 0,
  net_result_cents BIGINT NOT NULL DEFAULT 0,
  margin_on_sale_pct NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  margin_on_revenue_pct NUMERIC(6,2) NOT NULL DEFAULT 0.00,

  -- Bloco 7: Recebimento Consolidado da Operadora
  settlement_method TEXT NOT NULL DEFAULT 'fatura_abatida'
    CHECK (settlement_method IN ('fatura_abatida', 'deposito_bancario', 'pix', 'credito_operadora', 'cartao_virtual', 'misto')),
  expected_receipt_cents BIGINT NOT NULL DEFAULT 0,
  received_cents BIGINT NOT NULL DEFAULT 0,
  expected_receipt_date DATE,
  actual_receipt_date DATE,
  receivable_status TEXT NOT NULL DEFAULT 'a_receber'
    CHECK (receivable_status IN ('a_receber', 'parcialmente_recebido', 'recebido', 'divergencia', 'cancelado')),

  -- Bloco 8: Documento Fiscal / Nota Fiscal
  invoice_status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (invoice_status IN ('nao_necessaria', 'pendente', 'solicitar', 'solicitada', 'emitida', 'recebida')),
  invoice_number TEXT,
  invoice_amount_cents BIGINT,
  invoice_issue_date DATE,
  invoice_issuer TEXT,
  invoice_recipient TEXT,
  invoice_attachment_url TEXT,
  invoice_notes TEXT,

  general_notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_sale_financial_sheets_store
  ON public.travel_sale_financial_sheets (store_id, sale_date DESC);

-- 5. Taxas Não Comissionáveis Detalhadas (Bloco 1)
CREATE TABLE IF NOT EXISTS public.travel_sale_non_commissionable_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.travel_sale_financial_sheets(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL DEFAULT 'taxa_embarque'
    CHECK (fee_type IN ('taxa_embarque', 'encargo', 'servico_nao_comissionavel', 'seguro_isento', 'outra')),
  description TEXT NOT NULL,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Deduções sobre o Over (Bloco 3)
CREATE TABLE IF NOT EXISTS public.travel_sale_over_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.travel_sale_financial_sheets(id) ON DELETE CASCADE,
  deduction_type TEXT NOT NULL DEFAULT 'imposto'
    CHECK (deduction_type IN ('imposto', 'retencao', 'taxa_operadora', 'taxa_financeira', 'repasse', 'outra')),
  calc_mode TEXT NOT NULL DEFAULT 'percentage'
    CHECK (calc_mode IN ('amount', 'percentage')),
  percentage NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Custos Internos da Venda (Bloco 5)
CREATE TABLE IF NOT EXISTS public.travel_sale_internal_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.travel_sale_financial_sheets(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL DEFAULT 'comissao_vendedor'
    CHECK (cost_type IN (
      'comissao_vendedor',
      'comissao_parceiro',
      'brinde_cliente',
      'desconto_absorvido',
      'taxa_cartao_gateway',
      'transporte_extra',
      'hospedagem_extra',
      'reembolso_ajuste',
      'outro'
    )),
  description TEXT NOT NULL,
  calc_mode TEXT NOT NULL DEFAULT 'amount'
    CHECK (calc_mode IN ('amount', 'percentage')),
  percentage NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  beneficiary_name TEXT,
  due_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'previsto'
    CHECK (payment_status IN ('previsto', 'pago', 'cancelado')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Múltiplos Itens / Fornecedores por Venda (Bloco 7 Avançado)
CREATE TABLE IF NOT EXISTS public.travel_sale_supplier_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.travel_sale_financial_sheets(id) ON DELETE CASCADE,
  item_category TEXT NOT NULL DEFAULT 'hotel'
    CHECK (item_category IN ('aereo', 'hotel', 'pacote', 'transfer', 'passeio', 'seguro', 'aluguel_carro', 'cruzeiro', 'outro')),
  operator_name TEXT NOT NULL,
  locator_code TEXT NOT NULL,
  gross_amount_cents BIGINT NOT NULL DEFAULT 0,
  non_commissionable_cents BIGINT NOT NULL DEFAULT 0,
  net_amount_cents BIGINT NOT NULL DEFAULT 0,
  commission_cents BIGINT NOT NULL DEFAULT 0,
  over_net_cents BIGINT NOT NULL DEFAULT 0,
  expected_receipt_cents BIGINT NOT NULL DEFAULT 0,
  received_cents BIGINT NOT NULL DEFAULT 0,
  settlement_method TEXT NOT NULL DEFAULT 'fatura_abatida',
  expected_date DATE,
  received_date DATE,
  status TEXT NOT NULL DEFAULT 'a_receber'
    CHECK (status IN ('a_receber', 'parcialmente_recebido', 'recebido', 'divergencia', 'cancelado')),
  invoice_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Trilha de Auditoria Financeira (Bloco 8 — Governança)
CREATE TABLE IF NOT EXISTS public.travel_financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.travel_sale_financial_sheets(id) ON DELETE CASCADE,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL DEFAULT 'Operador Financeiro',
  action_type TEXT NOT NULL,
  field_changed TEXT,
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.travel_quote_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_quote_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_sale_financial_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_sale_non_commissionable_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_sale_over_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_sale_internal_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_sale_supplier_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_financial_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read quote bundles by slug" ON public.travel_quote_bundles;
CREATE POLICY "Public read quote bundles by slug"
  ON public.travel_quote_bundles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read quote bundle items" ON public.travel_quote_bundle_items;
CREATE POLICY "Public read quote bundle items"
  ON public.travel_quote_bundle_items FOR SELECT
  USING (true);
