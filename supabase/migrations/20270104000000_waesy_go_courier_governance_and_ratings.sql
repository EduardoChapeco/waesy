-- Migration: 20270104000000_waesy_go_courier_governance_and_ratings.sql
-- Propósito: Governança Completa Waesy Go (Entregadores, Motoristas, Fretes e Frotas Comerciais),
-- Tarifação Autônoma, Tolerância de 3 Minutos, Débito por Não-Comparecimento no CPF,
-- Fatura de R$ 0,99 da Plataforma, Despesas de Combustível e Avaliações Bilaterais.

-- ============================================================
-- 1. Expansão de courier_profiles com Tarifação Autônoma e Governança
-- ============================================================
ALTER TABLE public.courier_profiles
  ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'mixed', -- 'mixed', 'delivery_only', 'rides_only', 'commercial_only', 'moving_only'
  ADD COLUMN IF NOT EXISTS passenger_preference TEXT DEFAULT 'all', -- 'all', 'women_only'
  ADD COLUMN IF NOT EXISTS condo_entry_fee_cents INTEGER DEFAULT 300, -- R$ 3,00 para entrar em condomínio
  ADD COLUMN IF NOT EXISTS apartment_floor_fee_cents INTEGER DEFAULT 500, -- R$ 5,00 para subir no apartamento (entrega na porta)
  ADD COLUMN IF NOT EXISTS vehicle_capacity_kg NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicle_capacity_m3 NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS serviced_neighborhoods TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS serviced_cities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS working_hours_start TEXT DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS working_hours_end TEXT DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS platform_fixed_fee_cents INTEGER DEFAULT 99, -- R$ 0,99 fixo por corrida
  ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT;

-- ============================================================
-- 2. Tabela de Débitos Compulsórios por Inadimplência / No-Show no CPF
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_debt_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_cpf TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  request_id UUID REFERENCES public.mobility_requests(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL, -- 'no_show_3min_tolerance', 'cancelled_in_transit', 'unpaid_manual_ride'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'forgiven', 'in_dispute'
  blocked_services TEXT[] DEFAULT '{"mobility_rides", "food_delivery", "marketplace_shipping"}',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_debt_cpf ON public.customer_debt_ledger(customer_cpf);
CREATE INDEX IF NOT EXISTS idx_customer_debt_customer_id ON public.customer_debt_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_debt_status ON public.customer_debt_ledger(status);

ALTER TABLE public.customer_debt_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own debts" ON public.customer_debt_ledger;
DROP POLICY IF EXISTS "Platform admins can manage all debts" ON public.customer_debt_ledger;

CREATE POLICY "Users can view their own debts"
  ON public.customer_debt_ledger FOR SELECT
  USING (customer_id = auth.uid() OR customer_cpf IN (
    SELECT cpf FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Platform admins can manage all debts"
  ON public.customer_debt_ledger FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'master', 'platform_admin')
  ));

-- ============================================================
-- 3. Registro de Despesas Operacionais do Condutor (Combustível & Manutenção)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courier_expense_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_profile_id UUID NOT NULL REFERENCES public.courier_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_type TEXT NOT NULL, -- 'fuel', 'maintenance', 'insurance', 'tires', 'cleaning', 'other'
  amount_cents INTEGER NOT NULL,
  liters NUMERIC(6,2),
  fuel_type TEXT, -- 'gasoline', 'ethanol', 'diesel', 'cng', 'electric'
  odometer_km INTEGER,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courier_expenses_courier_id ON public.courier_expense_logs(courier_profile_id);
CREATE INDEX IF NOT EXISTS idx_courier_expenses_user_id ON public.courier_expense_logs(user_id);

ALTER TABLE public.courier_expense_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couriers can manage their own expenses" ON public.courier_expense_logs;

CREATE POLICY "Couriers can manage their own expenses"
  ON public.courier_expense_logs FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 4. Avaliações Bilaterais de Mobilidade e Entregas (Estrelas & Tags)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mobility_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.mobility_requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  courier_profile_id UUID REFERENCES public.courier_profiles(id) ON DELETE CASCADE,
  role_reviewed TEXT NOT NULL CHECK (role_reviewed IN ('courier', 'customer')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_request_reviewer UNIQUE (request_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_mobility_ratings_request ON public.mobility_ratings(request_id);
CREATE INDEX IF NOT EXISTS idx_mobility_ratings_courier ON public.mobility_ratings(courier_profile_id);
CREATE INDEX IF NOT EXISTS idx_mobility_ratings_reviewee ON public.mobility_ratings(reviewee_id);

ALTER TABLE public.mobility_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved ratings" ON public.mobility_ratings;
DROP POLICY IF EXISTS "Participants can submit rating" ON public.mobility_ratings;

CREATE POLICY "Public read approved ratings"
  ON public.mobility_ratings FOR SELECT
  USING (true);

CREATE POLICY "Participants can submit rating"
  ON public.mobility_ratings FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);
