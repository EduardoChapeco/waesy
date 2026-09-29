-- ==============================================================================
-- MIGRATION: 20261203000000_v139_omni_checkout_logistics_and_trust_safety.sql
-- V139: THE OMNI-CHECKOUT, LOGISTICS ENGINE & TRUST/SAFETY PROTOCOL
-- ==============================================================================

-- 1. TABELA user_addresses (Endereços Salvos com Zero-Amnesia e Suporte a Condomínios)
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Principal', -- 'Casa', 'Trabalho', 'Apartamento', 'Outro'
  recipient_name TEXT,
  recipient_phone TEXT,
  zipcode TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  reference_point TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  is_default BOOLEAN DEFAULT false,
  is_apartment BOOLEAN DEFAULT false,
  block_tower TEXT,
  intercom_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_zipcode ON public.user_addresses(zipcode);

-- RLS para user_addresses
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "user_addresses_owner_read" ON public.user_addresses;
  DROP POLICY IF EXISTS "user_addresses_owner_write" ON public.user_addresses;
  DROP POLICY IF EXISTS "user_addresses_owner_delete" ON public.user_addresses;
END $$;

CREATE POLICY "user_addresses_owner_read" ON public.user_addresses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_addresses_owner_write" ON public.user_addresses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_addresses_owner_update" ON public.user_addresses
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_addresses_owner_delete" ON public.user_addresses
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. EXPANSÃO DA TABELA couriers (The Motoboy Matrix & Logística de Porta)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'couriers') THEN
    ALTER TABLE public.couriers
      ADD COLUMN IF NOT EXISTS allows_door_delivery BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS door_delivery_fee_cents INTEGER DEFAULT 500,
      ADD COLUMN IF NOT EXISTS max_waiting_time_minutes INTEGER DEFAULT 15,
      ADD COLUMN IF NOT EXISTS waiting_penalty_per_min_cents INTEGER DEFAULT 100;
  END IF;
END $$;

-- 3. EXPANSÃO DA TABELA orders (Logística de Porta, Penalidades e Cancelamento Seguro)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    ALTER TABLE public.orders
      ADD COLUMN IF NOT EXISTS delivery_to_door BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS door_delivery_fee_cents INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS delivery_location_type TEXT DEFAULT 'address', -- 'house', 'apartment_door', 'apartment_reception', 'commercial'
      ADD COLUMN IF NOT EXISTS courier_arrived_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS waiting_time_minutes INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS waiting_penalty_cents INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cancelled_by_role TEXT, -- 'customer', 'store', 'courier', 'platform_admin'
      ADD COLUMN IF NOT EXISTS store_cancellation_reason TEXT, -- 'suspected_fraud', 'abusive_customer', 'high_risk_area', 'ai_manipulation_attempt', 'stock_out', 'other'
      ADD COLUMN IF NOT EXISTS is_safe_cancellation BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 4. TABELA user_reputation (Central de Convivência & User Scoring)
CREATE TABLE IF NOT EXISTS public.user_reputation (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trust_score INTEGER DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
  strikes INTEGER DEFAULT 0,
  avg_pickup_time_minutes NUMERIC(5, 2) DEFAULT 4.0,
  complaint_rate_pct NUMERIC(5, 2) DEFAULT 0.0,
  total_orders_completed INTEGER DEFAULT 0,
  total_orders_cancelled INTEGER DEFAULT 0,
  scam_attempts_detected INTEGER DEFAULT 0,
  last_strike_reason TEXT,
  last_strike_at TIMESTAMPTZ,
  status TEXT DEFAULT 'good_standing' CHECK (status IN ('good_standing', 'warning', 'restricted', 'banned')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "user_reputation_owner_read" ON public.user_reputation;
  DROP POLICY IF EXISTS "user_reputation_staff_read" ON public.user_reputation;
END $$;

CREATE POLICY "user_reputation_owner_read" ON public.user_reputation
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_reputation_staff_read" ON public.user_reputation
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE profile_id = auth.uid()
  ));

-- 5. RPC: Registro de Chegada do Entregador & Início da Janela de 15 Minutos
CREATE OR REPLACE FUNCTION public.record_courier_arrival(
  p_order_id UUID,
  p_courier_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, status, courier_arrived_at INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;

  IF v_order.courier_arrived_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_arrived', true,
      'arrived_at', v_order.courier_arrived_at
    );
  END IF;

  UPDATE public.orders
  SET
    courier_arrived_at = now(),
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'arrived_at', now(),
    'tolerance_minutes', 15
  );
END;
$$;

-- 6. RPC: Cálculo e Aplicação de Taxa de Espera (Após 15 minutos)
CREATE OR REPLACE FUNCTION public.calculate_courier_waiting_penalty(
  p_order_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_elapsed_mins INTEGER;
  v_penalty_mins INTEGER;
  v_penalty_cents INTEGER := 0;
  v_rate_per_min INTEGER := 100; -- R$ 1,00 por minuto excedente
  v_tolerance INTEGER := 15;
BEGIN
  SELECT id, courier_arrived_at, waiting_penalty_cents, total_cents INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND OR v_order.courier_arrived_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chegada não registrada');
  END IF;

  v_elapsed_mins := EXTRACT(EPOCH FROM (now() - v_order.courier_arrived_at))::INTEGER / 60;

  IF v_elapsed_mins > v_tolerance THEN
    v_penalty_mins := v_elapsed_mins - v_tolerance;
    v_penalty_cents := v_penalty_mins * v_rate_per_min;

    UPDATE public.orders
    SET
      waiting_time_minutes = v_elapsed_mins,
      waiting_penalty_cents = v_penalty_cents,
      updated_at = now()
    WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'elapsed_minutes', v_elapsed_mins,
    'penalty_minutes', COALESCE(v_penalty_mins, 0),
    'penalty_cents', v_penalty_cents
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_courier_arrival(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_courier_arrival(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.calculate_courier_waiting_penalty(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_courier_waiting_penalty(UUID) TO authenticated, service_role;

