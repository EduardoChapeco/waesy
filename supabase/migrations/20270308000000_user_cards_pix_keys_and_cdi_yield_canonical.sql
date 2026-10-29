-- ==============================================================================
-- Migration: 20270308000000_user_cards_pix_keys_and_cdi_yield_canonical.sql
-- Module: Finanças, Cartões de Crédito Reais, Chaves Pix e Rendimento CDI
-- Normativa: SPEC-20261028-FINANCAS-CANONICAL-REAL-PARITY, AGENTS.md B.8, B.25
-- ==============================================================================

-- 1. Cartões de Crédito dos Usuários (Físicos e Virtuais Reais)
CREATE TABLE IF NOT EXISTS public.user_credit_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_type text NOT NULL CHECK (card_type IN ('VIRTUAL', 'PHYSICAL')),
  card_holder_name text NOT NULL,
  last_four_digits text NOT NULL CHECK (char_length(last_four_digits) = 4),
  brand text NOT NULL DEFAULT 'MASTERCARD' CHECK (brand IN ('MASTERCARD', 'VISA', 'ELO')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'CANCELLED')),
  credit_limit_cents bigint NOT NULL DEFAULT 500000 CHECK (credit_limit_cents >= 0),
  user_spending_limit_cents bigint NOT NULL DEFAULT 500000 CHECK (user_spending_limit_cents >= 0),
  is_temporary_blocked boolean NOT NULL DEFAULT false,
  expiration_month integer NOT NULL CHECK (expiration_month BETWEEN 1 AND 12),
  expiration_year integer NOT NULL CHECK (expiration_year >= 2026),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_credit_cards_profile ON public.user_credit_cards(profile_id);

ALTER TABLE public.user_credit_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ucc_select_own" ON public.user_credit_cards;
CREATE POLICY "ucc_select_own" ON public.user_credit_cards
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "ucc_insert_own" ON public.user_credit_cards;
CREATE POLICY "ucc_insert_own" ON public.user_credit_cards
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "ucc_update_own" ON public.user_credit_cards;
CREATE POLICY "ucc_update_own" ON public.user_credit_cards
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "ucc_delete_own" ON public.user_credit_cards;
CREATE POLICY "ucc_delete_own" ON public.user_credit_cards
  FOR DELETE USING (profile_id = auth.uid());


-- 2. Faturas Mensais do Cartão de Crédito
CREATE TABLE IF NOT EXISTS public.card_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.user_credit_cards(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference_month integer NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  reference_year integer NOT NULL CHECK (reference_year >= 2026),
  due_date date NOT NULL,
  closing_date date NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'PAID', 'OVERDUE')),
  amount_cents bigint NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  paid_amount_cents bigint NOT NULL DEFAULT 0 CHECK (paid_amount_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_card_invoice_month UNIQUE (card_id, reference_year, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_card_invoices_profile ON public.card_invoices(profile_id);
CREATE INDEX IF NOT EXISTS idx_card_invoices_card ON public.card_invoices(card_id);

ALTER TABLE public.card_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ci_select_own" ON public.card_invoices;
CREATE POLICY "ci_select_own" ON public.card_invoices
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "ci_insert_own" ON public.card_invoices;
CREATE POLICY "ci_insert_own" ON public.card_invoices
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "ci_update_own" ON public.card_invoices;
CREATE POLICY "ci_update_own" ON public.card_invoices
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());


-- 3. Lançamentos / Compras na Fatura do Cartão
CREATE TABLE IF NOT EXISTS public.card_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.card_invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  transacted_at timestamptz NOT NULL DEFAULT now(),
  installment_number integer NOT NULL DEFAULT 1 CHECK (installment_number >= 1),
  total_installments integer NOT NULL DEFAULT 1 CHECK (total_installments >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_invoice_items_invoice ON public.card_invoice_items(invoice_id);

ALTER TABLE public.card_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cii_select_own" ON public.card_invoice_items;
CREATE POLICY "cii_select_own" ON public.card_invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.card_invoices ci
      WHERE ci.id = card_invoice_items.invoice_id
        AND ci.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cii_insert_own" ON public.card_invoice_items;
CREATE POLICY "cii_insert_own" ON public.card_invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.card_invoices ci
      WHERE ci.id = card_invoice_items.invoice_id
        AND ci.profile_id = auth.uid()
    )
  );


-- 4. Chaves Pix do Usuário
CREATE TABLE IF NOT EXISTS public.user_pix_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_type text NOT NULL CHECK (key_type IN ('CPF', 'EMAIL', 'PHONE', 'RANDOM')),
  key_value text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_pix_key_val ON public.user_pix_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_user_pix_keys_profile ON public.user_pix_keys(profile_id);

ALTER TABLE public.user_pix_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "upk_select_own" ON public.user_pix_keys;
CREATE POLICY "upk_select_own" ON public.user_pix_keys
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "upk_insert_own" ON public.user_pix_keys;
CREATE POLICY "upk_insert_own" ON public.user_pix_keys
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "upk_update_own" ON public.user_pix_keys;
CREATE POLICY "upk_update_own" ON public.user_pix_keys
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "upk_delete_own" ON public.user_pix_keys;
CREATE POLICY "upk_delete_own" ON public.user_pix_keys
  FOR DELETE USING (profile_id = auth.uid());


-- 5. Configurações de Rendimento da Carteira (Conta Remunerada / CDI)
CREATE TABLE IF NOT EXISTS public.user_wallet_yield_settings (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_yield_enabled boolean NOT NULL DEFAULT false,
  benchmark_name text NOT NULL DEFAULT 'CDI',
  benchmark_rate_percentage numeric(5,2) NOT NULL DEFAULT 100.00,
  accumulated_yield_cents bigint NOT NULL DEFAULT 0 CHECK (accumulated_yield_cents >= 0),
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_wallet_yield_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uwys_select_own" ON public.user_wallet_yield_settings;
CREATE POLICY "uwys_select_own" ON public.user_wallet_yield_settings
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "uwys_insert_own" ON public.user_wallet_yield_settings;
CREATE POLICY "uwys_insert_own" ON public.user_wallet_yield_settings
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "uwys_update_own" ON public.user_wallet_yield_settings;
CREATE POLICY "uwys_update_own" ON public.user_wallet_yield_settings
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
