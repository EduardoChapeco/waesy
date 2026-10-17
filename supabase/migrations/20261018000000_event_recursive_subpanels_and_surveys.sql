-- =============================================================================
-- MIGRATION: 20261018000000_event_recursive_subpanels_and_surveys.sql
-- ECOSSISTEMA Waesy: SUBPAINÉIS RECURSIVOS, PERSISTÊNCIA DE PEDIDOS,
-- FATURAMENTO DE CONCESSÃO & PESQUISAS INTELIGENTES NO EVENTO
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Estender event_subpanels com Colunas Comerciais, Templates POS e Vínculo a Parceiros
-- ---------------------------------------------------------------------------
ALTER TABLE public.event_subpanels 
  ADD COLUMN IF NOT EXISTS concession_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS concession_fixed_cents INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_online_orders BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_custom_price BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_tipo TEXT NOT NULL DEFAULT 'bar_simples',
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.eventos_parceiros(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subpanels_partner ON public.event_subpanels(partner_id) WHERE partner_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 1.B Estender public.tickets com Padrão Criptográfico WCTS-1 (HMAC-SHA256 & Telemetria)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS human_code TEXT,
  ADD COLUMN IF NOT EXISTS hmac_signature TEXT,
  ADD COLUMN IF NOT EXISTS issued_at_epoch BIGINT,
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS recipient_tax_id TEXT,
  ADD COLUMN IF NOT EXISTS checkin_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checkin_latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS checkin_longitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS checkin_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_human_code ON public.tickets(human_code) WHERE human_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_qr_hash ON public.tickets(qr_hash) WHERE qr_hash IS NOT NULL;

-- Garantir anti-injeção em public.tickets: remover qualquer política de INSERT aberta a clientes
DROP POLICY IF EXISTS "tickets_public_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_authenticated_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_staff_insert" ON public.tickets;
CREATE POLICY "tickets_staff_insert" ON public.tickets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = tickets.event_id AND public.is_store_staff(e.store_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Tabela de Pedidos do Subpainel (POS no Local e Pedidos Mobile de Participantes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_subpanel_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subpanel_id           UUID NOT NULL REFERENCES public.event_subpanels(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  store_id              UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number          TEXT NOT NULL,
  customer_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name         TEXT,
  customer_phone        TEXT,
  order_type            TEXT NOT NULL DEFAULT 'counter_pos' 
                          CHECK (order_type IN ('counter_pos', 'mobile_attendee', 'table_service')),
  table_or_location     TEXT,
  status                TEXT NOT NULL DEFAULT 'completed' 
                          CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_method        TEXT NOT NULL DEFAULT 'pix' 
                          CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'cash', 'cashless_token')),
  subtotal_cents        INT NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  concession_fee_cents  INT NOT NULL DEFAULT 0 CHECK (concession_fee_cents >= 0),
  total_cents           INT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subpanel_orders_subpanel ON public.event_subpanel_orders(subpanel_id);
CREATE INDEX IF NOT EXISTS idx_subpanel_orders_event ON public.event_subpanel_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_subpanel_orders_store ON public.event_subpanel_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_subpanel_orders_status ON public.event_subpanel_orders(status);
CREATE INDEX IF NOT EXISTS idx_subpanel_orders_created ON public.event_subpanel_orders(created_at);

-- ---------------------------------------------------------------------------
-- 3. Itens do Pedido do Subpainel
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_subpanel_order_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES public.event_subpanel_orders(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES public.event_store_products(id) ON DELETE SET NULL,
  product_name          TEXT NOT NULL,
  quantity              INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents      INT NOT NULL CHECK (unit_price_cents >= 0),
  total_price_cents     INT NOT NULL CHECK (total_price_cents >= 0),
  notes                 TEXT
);

CREATE INDEX IF NOT EXISTS idx_subpanel_order_items_order ON public.event_subpanel_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_subpanel_order_items_product ON public.event_subpanel_order_items(product_id);

-- ---------------------------------------------------------------------------
-- 4. Pesquisas e Enquetes Inteligentes do Evento (Schema-Driven)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_surveys (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  store_id              UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL CHECK (char_length(title) >= 3),
  description           TEXT,
  target_audience       TEXT NOT NULL DEFAULT 'attendees' 
                          CHECK (target_audience IN ('attendees', 'sponsors', 'vendors', 'staff')),
  form_schema           JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at             TIMESTAMPTZ,
  ends_at               TIMESTAMPTZ,
  require_geofence      BOOLEAN NOT NULL DEFAULT false,
  venue_latitude        NUMERIC(10,7),
  venue_longitude       NUMERIC(10,7),
  geo_radius_meters     INT DEFAULT 500 CHECK (geo_radius_meters IS NULL OR geo_radius_meters > 0),
  is_active             BOOLEAN NOT NULL DEFAULT true,
  responses_count       INT NOT NULL DEFAULT 0 CHECK (responses_count >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_surveys_event ON public.event_surveys(event_id);
CREATE INDEX IF NOT EXISTS idx_event_surveys_store ON public.event_surveys(store_id);
CREATE INDEX IF NOT EXISTS idx_event_surveys_audience ON public.event_surveys(target_audience, is_active);

-- ---------------------------------------------------------------------------
-- 5. Respostas das Pesquisas do Evento
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_survey_responses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id             UUID NOT NULL REFERENCES public.event_surveys(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  respondent_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  respondent_name       TEXT,
  respondent_email      TEXT,
  answers               JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_location     BOOLEAN NOT NULL DEFAULT false,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON public.event_survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_event ON public.event_survey_responses(event_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_profile ON public.event_survey_responses(respondent_profile_id);

-- ---------------------------------------------------------------------------
-- 6. Políticas de Segurança RLS (Zero-Trust Multi-Tenant)
-- ---------------------------------------------------------------------------
ALTER TABLE public.event_subpanel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_subpanel_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_survey_responses ENABLE ROW LEVEL SECURITY;

-- event_subpanel_orders: Equipe da Loja/Produtora tem controle total
DROP POLICY IF EXISTS staff_manage_subpanel_orders ON public.event_subpanel_orders;
CREATE POLICY staff_manage_subpanel_orders
  ON public.event_subpanel_orders FOR ALL
  USING (public.is_store_staff(store_id));

-- Leitura restrita ao cliente dono do pedido ou staff da produtora (acesso por token via BFF service_role)
DROP POLICY IF EXISTS token_or_customer_read_subpanel_orders ON public.event_subpanel_orders;
CREATE POLICY token_or_customer_read_subpanel_orders
  ON public.event_subpanel_orders FOR SELECT
  USING (
    customer_id = auth.uid() 
    OR public.is_store_staff(store_id)
  );

-- event_subpanel_order_items: Segue a política do pedido pai
DROP POLICY IF EXISTS staff_manage_subpanel_order_items ON public.event_subpanel_order_items;
CREATE POLICY staff_manage_subpanel_order_items
  ON public.event_subpanel_order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_subpanel_orders ord
      WHERE ord.id = event_subpanel_order_items.order_id
        AND public.is_store_staff(ord.store_id)
    )
  );

DROP POLICY IF EXISTS public_read_subpanel_order_items ON public.event_subpanel_order_items;
DROP POLICY IF EXISTS customer_or_staff_read_subpanel_order_items ON public.event_subpanel_order_items;
CREATE POLICY customer_or_staff_read_subpanel_order_items
  ON public.event_subpanel_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_subpanel_orders ord
      WHERE ord.id = event_subpanel_order_items.order_id
        AND (ord.customer_id = auth.uid() OR public.is_store_staff(ord.store_id))
    )
  );

-- event_surveys: Staff gerencia
DROP POLICY IF EXISTS staff_manage_event_surveys ON public.event_surveys;
CREATE POLICY staff_manage_event_surveys
  ON public.event_surveys FOR ALL
  USING (public.is_store_staff(store_id));

-- Público lê pesquisas ativas
DROP POLICY IF EXISTS public_read_active_event_surveys ON public.event_surveys;
CREATE POLICY public_read_active_event_surveys
  ON public.event_surveys FOR SELECT
  USING (is_active = true);

-- event_survey_responses: Qualquer um pode inserir respostas em pesquisas ativas
DROP POLICY IF EXISTS public_insert_survey_responses ON public.event_survey_responses;
CREATE POLICY public_insert_survey_responses
  ON public.event_survey_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_surveys s 
      WHERE s.id = survey_id AND s.is_active = true
    )
  );

-- Staff lê todas as respostas de suas pesquisas
DROP POLICY IF EXISTS staff_read_survey_responses ON public.event_survey_responses;
CREATE POLICY staff_read_survey_responses
  ON public.event_survey_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_surveys s
      WHERE s.id = survey_id AND public.is_store_staff(s.store_id)
    )
  );

