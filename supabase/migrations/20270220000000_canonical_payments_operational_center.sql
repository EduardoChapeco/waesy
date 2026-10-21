-- ==============================================================================
-- Migration: 20270220000000_canonical_payments_operational_center.sql
-- Module: Pagamentos — Centro Operacional de Cobranças, Pagamentos e Recebimentos
-- Normativa: SPEC-PAGAMENTOS-OPERACIONAL-END-TO-END, AGENTS.md B.8, B.25, B.41
-- ==============================================================================

-- 1. Cobranças Operacionais Unificadas (O que precisa ser pago / recebido)
CREATE TABLE IF NOT EXISTS public.payment_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  origin_type text NOT NULL CHECK (
    origin_type IN (
      'order',
      'mobility_trip',
      'carne_installment',
      'ticket',
      'tourism_booking',
      'p2p_transfer',
      'pix_charge',
      'subscription',
      'platform_invoice'
    )
  ),
  origin_id text,
  origin_token text,
  description text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'expired')
  ),
  payment_method text,
  due_date timestamptz,
  paid_at timestamptz,
  pix_emv_payload text,
  pix_txid text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_charges_customer ON public.payment_charges(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_charges_status ON public.payment_charges(status);
CREATE INDEX IF NOT EXISTS idx_payment_charges_origin ON public.payment_charges(origin_type, origin_id);
CREATE INDEX IF NOT EXISTS idx_payment_charges_created ON public.payment_charges(created_at DESC);

-- 2. Reembolsos Operacionais (Movimentação reversora imutável)
CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id uuid REFERENCES public.payment_charges(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  provider_refund_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_charge ON public.payment_refunds(charge_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_customer ON public.payment_refunds(customer_id);

-- 3. Faturas Agregadas Comerciais (Invoices com múltiplos itens ou parcelamentos)
CREATE TABLE IF NOT EXISTS public.payment_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  title text NOT NULL,
  billing_period text,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  due_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'overdue', 'cancelled')
  ),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_invoices_customer ON public.payment_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_due ON public.payment_invoices(due_date);

-- 4. Habilitação de RLS em todas as tabelas
ALTER TABLE public.payment_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_invoices ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para payment_charges
CREATE POLICY "charges_customer_read"
  ON public.payment_charges FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "charges_customer_insert"
  ON public.payment_charges FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "charges_customer_update"
  ON public.payment_charges FOR UPDATE
  USING (customer_id = auth.uid());

-- Políticas de RLS para payment_refunds
CREATE POLICY "refunds_customer_read"
  ON public.payment_refunds FOR SELECT
  USING (customer_id = auth.uid());

-- Políticas de RLS para payment_invoices
CREATE POLICY "invoices_customer_read"
  ON public.payment_invoices FOR SELECT
  USING (customer_id = auth.uid());

-- 5. RPC Atômica para Criação de Cobrança Pix com Valor (Dinâmica)
CREATE OR REPLACE FUNCTION public.create_dynamic_pix_charge_atomic(
  p_customer_id uuid,
  p_amount_cents integer,
  p_description text,
  p_pix_payload text,
  p_pix_txid text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_charge_id uuid;
  v_due_date timestamptz;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Valor da cobrança deve ser estritamente positivo';
  END IF;

  IF p_description IS NULL OR length(trim(p_description)) = 0 THEN
    RAISE EXCEPTION 'Descrição da cobrança é obrigatória';
  END IF;

  v_due_date := now() + interval '30 minutes';

  INSERT INTO public.payment_charges (
    customer_id,
    origin_type,
    origin_token,
    description,
    amount_cents,
    currency,
    status,
    payment_method,
    due_date,
    pix_emv_payload,
    pix_txid,
    metadata
  ) VALUES (
    p_customer_id,
    'pix_charge',
    coalesce(p_pix_txid, 'PIX-' || upper(substr(md5(random()::text), 1, 8))),
    trim(p_description),
    p_amount_cents,
    'BRL',
    'pending',
    'pix',
    v_due_date,
    p_pix_payload,
    p_pix_txid,
    p_metadata
  )
  RETURNING id INTO v_charge_id;

  RETURN jsonb_build_object(
    'charge_id', v_charge_id,
    'amount_cents', p_amount_cents,
    'status', 'pending',
    'pix_payload', p_pix_payload,
    'pix_txid', p_pix_txid,
    'expires_at', v_due_date
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_dynamic_pix_charge_atomic(uuid, integer, text, text, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_dynamic_pix_charge_atomic(uuid, integer, text, text, text, jsonb) TO authenticated, service_role;
