-- ==============================================================================
-- 20270226000000_canonical_twenty_tables_ecosystem_unification.sql
-- NORMAS: AGENTS.md (B.1 a B.41), DIRETIVA SUPREMA DE BLINDAGEM DE ESQUEMA
-- RESGATE, BLINDAGEM E INTEGRAÇÃO DAS 20 TABELAS DO ECOSSISTEMA WAESY
-- 100% IDEMPOTENTE | ZERO DROP TABLE | ZERO DATA LOSS | RLS DENY-BY-DEFAULT
-- ==============================================================================

-- ─── CLUSTER 1: CORPORATE TRAVEL & B2B ────────────────────────────────────────

-- 1. Contratos Corporativos Empresa ↔ Agência
CREATE TABLE IF NOT EXISTS public.corporate_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  contract_number text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'suspended', 'expired', 'terminated')),
  billing_terms_days integer NOT NULL DEFAULT 30,
  agency_fee_percent numeric(5,2) DEFAULT 0,
  sla_notes text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  signed_at timestamptz,
  document_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Linhas de Crédito Rotativo B2B
CREATE TABLE IF NOT EXISTS public.corporate_credit_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  credit_limit_cents bigint NOT NULL DEFAULT 0 CHECK (credit_limit_cents >= 0),
  available_limit_cents bigint NOT NULL DEFAULT 0,
  reserved_limit_cents bigint NOT NULL DEFAULT 0,
  payment_terms_days integer NOT NULL DEFAULT 30 CHECK (payment_terms_days IN (15, 30, 45, 60, 90)),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly', 'biweekly', 'monthly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'under_review')),
  approved_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Faturas Corporativas B2B (Invoices)
CREATE TABLE IF NOT EXISTS public.corporate_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  company_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  period_end date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  subtotal_cents bigint NOT NULL DEFAULT 0,
  fees_cents bigint NOT NULL DEFAULT 0,
  total_amount_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'cancelled')),
  pdf_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Itens Rateados de Fatura Corporativa
CREATE TABLE IF NOT EXISTS public.corporate_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.corporate_invoices(id) ON DELETE CASCADE,
  trip_id uuid,
  project_id uuid,
  traveler_id uuid,
  item_type text NOT NULL DEFAULT 'flight' CHECK (item_type IN ('flight', 'hotel', 'car', 'bus', 'fee', 'insurance', 'other')),
  description text NOT NULL,
  locator_code text,
  ticket_number text,
  cost_center text,
  department text,
  amount_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Orçamentos Anuais/Mensais por Centro de Custo
CREATE TABLE IF NOT EXISTS public.corporate_travel_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  fiscal_year integer NOT NULL,
  month integer CHECK (month BETWEEN 1 AND 12),
  department text,
  cost_center text,
  budget_cents bigint NOT NULL DEFAULT 0 CHECK (budget_cents >= 0),
  spent_cents bigint NOT NULL DEFAULT 0 CHECK (spent_cents >= 0),
  committed_cents bigint NOT NULL DEFAULT 0 CHECK (committed_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Adiantamentos de Viagem em Espécie/PIX
CREATE TABLE IF NOT EXISTS public.corporate_travel_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  traveler_id uuid NOT NULL,
  trip_id uuid,
  requested_amount_cents bigint NOT NULL CHECK (requested_amount_cents > 0),
  approved_amount_cents bigint,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'reconciled', 'rejected')),
  purpose text NOT NULL,
  pix_key text,
  paid_at timestamptz,
  receipt_url text,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Despesas e Reembolsos de Prestação de Contas (RDV)
CREATE TABLE IF NOT EXISTS public.corporate_travel_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  traveler_id uuid NOT NULL,
  trip_id uuid,
  advance_id uuid REFERENCES public.corporate_travel_advances(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('meal', 'transport', 'hotel_extras', 'fuel', 'toll', 'parking', 'other')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  merchant_name text,
  notes text,
  receipt_url text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'reimbursed')),
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── CLUSTER 2: MOBILIDADE, CARONAS & TRANSPORTE INTERMUNICIPAL ───────────────

-- 8. Avaliações de Passageiros e Condutores de Carona
CREATE TABLE IF NOT EXISTS public.carona_passenger_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  reviewed_user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  punctuality_rating integer CHECK (punctuality_rating BETWEEN 1 AND 5),
  driving_rating integer CHECK (driving_rating BETWEEN 1 AND 5),
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Preferências Operacionais do Condutor de Carona
CREATE TABLE IF NOT EXISTS public.carona_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL UNIQUE,
  allow_pets boolean NOT NULL DEFAULT false,
  allow_smoking boolean NOT NULL DEFAULT false,
  music_preference text NOT NULL DEFAULT 'varied' CHECK (music_preference IN ('silence', 'radio', 'varied', 'podcasts')),
  max_luggage_size text NOT NULL DEFAULT 'medium' CHECK (max_luggage_size IN ('small', 'medium', 'large')),
  chattiness text NOT NULL DEFAULT 'moderate' CHECK (chattiness IN ('quiet', 'moderate', 'talkative')),
  gender_exclusive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Horários Recorrentes de Carona
CREATE TABLE IF NOT EXISTS public.carona_recurring_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  days_of_week integer[] NOT NULL DEFAULT '{1,2,3,4,5}'::integer[],
  departure_time time NOT NULL,
  origin_city text NOT NULL,
  origin_address text NOT NULL,
  destination_city text NOT NULL,
  destination_address text NOT NULL,
  available_seats integer NOT NULL DEFAULT 3,
  price_cents integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Pontos de Parada Intermediários de Carona
CREATE TABLE IF NOT EXISTS public.carona_stop_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL,
  stop_order integer NOT NULL DEFAULT 1,
  city text NOT NULL,
  address text NOT NULL,
  latitude double precision,
  longitude double precision,
  estimated_arrival timestamptz,
  price_cents integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Linhas de Ônibus Intermunicipais
CREATE TABLE IF NOT EXISTS public.intercity_bus_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid,
  company_name text NOT NULL,
  origin_city text NOT NULL,
  origin_terminal text,
  destination_city text NOT NULL,
  destination_terminal text,
  estimated_duration_minutes integer NOT NULL DEFAULT 60,
  distance_km numeric(8,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 13. Horários e Escalas de Ônibus Intermunicipais
CREATE TABLE IF NOT EXISTS public.intercity_bus_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.intercity_bus_routes(id) ON DELETE CASCADE,
  departure_time timestamptz NOT NULL,
  arrival_time timestamptz NOT NULL,
  bus_class text NOT NULL DEFAULT 'executivo' CHECK (bus_class IN ('convencional', 'executivo', 'semi_leito', 'leito', 'leito_cama')),
  price_cents integer NOT NULL CHECK (price_cents > 0),
  total_seats integer NOT NULL DEFAULT 44,
  available_seats integer NOT NULL DEFAULT 44,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'boarding', 'in_transit', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 14. Bilhetes e Reservas de Ônibus Intermunicipais
CREATE TABLE IF NOT EXISTS public.intercity_bus_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.intercity_bus_schedules(id) ON DELETE RESTRICT,
  passenger_id uuid NOT NULL,
  passenger_name text NOT NULL,
  passenger_document text NOT NULL,
  seat_number text NOT NULL,
  total_price_cents integer NOT NULL CHECK (total_price_cents > 0),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'used', 'cancelled', 'refunded')),
  boarding_qr_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── CLUSTER 3: EVENTOS, TICKETS & INGRESSOS ──────────────────────────────────

-- 15. Lotes de Ingressos de Eventos (Batches)
CREATE TABLE IF NOT EXISTS public.event_ticket_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  batch_name text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  quantity_available integer NOT NULL CHECK (quantity_available >= 0),
  quantity_sold integer NOT NULL DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 16. Afiliados e Promoters de Eventos
CREATE TABLE IF NOT EXISTS public.event_ticket_affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  promoter_profile_id uuid NOT NULL,
  code text NOT NULL,
  commission_percent numeric(5,2) NOT NULL DEFAULT 5.0,
  commission_fixed_cents integer NOT NULL DEFAULT 0,
  total_sales_count integer NOT NULL DEFAULT 0,
  total_commission_earned_cents integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, code)
);

-- ─── CLUSTER 4: SERVIÇOS, PACOTES & RECORRÊNCIAS ──────────────────────────────

-- 17. Comissões por Pacote de Serviços para Profissionais
CREATE TABLE IF NOT EXISTS public.service_package_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  commission_percent numeric(5,2) DEFAULT 0,
  commission_fixed_cents integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 18. Recorrências e Assinaturas de Pacotes de Serviços
CREATE TABLE IF NOT EXISTS public.service_package_recurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_pass_id uuid NOT NULL,
  package_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  store_id uuid NOT NULL,
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  auto_renew boolean NOT NULL DEFAULT true,
  next_billing_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  payment_method text DEFAULT 'pix',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── CLUSTER 5: VEÍCULOS & CLASSIFICADOS ──────────────────────────────────────

-- 19. Cache de Cotações da Tabela FIPE para Veículos
CREATE TABLE IF NOT EXISTS public.classified_vehicle_fipe_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fipe_code text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  model_year integer NOT NULL,
  fuel_type text NOT NULL DEFAULT 'Gasolina',
  reference_month text NOT NULL,
  price_cents bigint NOT NULL CHECK (price_cents >= 0),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fipe_code, model_year, reference_month)
);

-- ─── CLUSTER 6: REEMBOLSOS & ESTORNOS ─────────────────────────────────────────

-- 20. Reembolsos e Estornos Financeiros Operacionais
CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id uuid,
  customer_id uuid NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  provider_refund_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── HABILITAÇÃO UNIVERSAL DE ROW LEVEL SECURITY (RLS) ────────────────────────

ALTER TABLE public.corporate_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_credit_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_travel_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_travel_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_travel_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carona_passenger_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carona_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carona_recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carona_stop_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intercity_bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intercity_bus_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intercity_bus_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_package_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_package_recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classified_vehicle_fipe_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

-- ─── POLÍTICAS DE RLS SEGURAS E PERMISSÕES ───────────────────────────────────

-- Corporate contracts access
DO $$ BEGIN
  CREATE POLICY "corporate_contracts_access" ON public.corporate_contracts
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Corporate credit lines access
DO $$ BEGIN
  CREATE POLICY "corporate_credit_lines_access" ON public.corporate_credit_lines
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Corporate invoices access
DO $$ BEGIN
  CREATE POLICY "corporate_invoices_access" ON public.corporate_invoices
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Corporate invoice items access
DO $$ BEGIN
  CREATE POLICY "corporate_invoice_items_access" ON public.corporate_invoice_items
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Corporate travel budgets access
DO $$ BEGIN
  CREATE POLICY "corporate_travel_budgets_access" ON public.corporate_travel_budgets
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Corporate travel advances access
DO $$ BEGIN
  CREATE POLICY "corporate_travel_advances_access" ON public.corporate_travel_advances
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Corporate travel expenses access
DO $$ BEGIN
  CREATE POLICY "corporate_travel_expenses_access" ON public.corporate_travel_expenses
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Carona passenger reviews access
DO $$ BEGIN
  CREATE POLICY "carona_passenger_reviews_access" ON public.carona_passenger_reviews
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Carona preferences access
DO $$ BEGIN
  CREATE POLICY "carona_preferences_access" ON public.carona_preferences
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Carona recurring schedules access
DO $$ BEGIN
  CREATE POLICY "carona_recurring_schedules_access" ON public.carona_recurring_schedules
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Carona stop points access
DO $$ BEGIN
  CREATE POLICY "carona_stop_points_access" ON public.carona_stop_points
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Intercity bus routes access
DO $$ BEGIN
  CREATE POLICY "intercity_bus_routes_read" ON public.intercity_bus_routes
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Intercity bus schedules access
DO $$ BEGIN
  CREATE POLICY "intercity_bus_schedules_read" ON public.intercity_bus_schedules
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Intercity bus bookings access
DO $$ BEGIN
  CREATE POLICY "intercity_bus_bookings_access" ON public.intercity_bus_bookings
    FOR ALL USING (passenger_id = auth.uid() OR auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Event ticket batches access
DO $$ BEGIN
  CREATE POLICY "event_ticket_batches_read" ON public.event_ticket_batches
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "event_ticket_batches_modify" ON public.event_ticket_batches
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Event ticket affiliates access
DO $$ BEGIN
  CREATE POLICY "event_ticket_affiliates_access" ON public.event_ticket_affiliates
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service package commissions access
DO $$ BEGIN
  CREATE POLICY "service_package_commissions_access" ON public.service_package_commissions
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service package recurrences access
DO $$ BEGIN
  CREATE POLICY "service_package_recurrences_access" ON public.service_package_recurrences
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Classified vehicle fipe cache access (leitura pública, escrita autenticada)
DO $$ BEGIN
  CREATE POLICY "classified_vehicle_fipe_cache_read" ON public.classified_vehicle_fipe_cache
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "classified_vehicle_fipe_cache_write" ON public.classified_vehicle_fipe_cache
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payment refunds access
DO $$ BEGIN
  CREATE POLICY "refunds_customer_read" ON public.payment_refunds
    FOR SELECT USING (customer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "refunds_store_access" ON public.payment_refunds
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
