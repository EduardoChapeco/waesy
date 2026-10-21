-- ==============================================================================
-- Migration: 20270219000000_canonical_financial_ledger_and_unified_feed.sql
-- Module: Finanças, Ledger de Partidas Dobradas, Extrato Unificado e Comprovantes
-- Normativa: SPEC-FINANCAS-LEDGER-CARTEIRA-UNIFICADA, AGENTS.md B.8, B.25, B.41
-- ==============================================================================

-- 1. Contas Contábeis do Ledger de Dinheiro Movimentável
CREATE TABLE IF NOT EXISTS public.financial_ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_type text NOT NULL CHECK (
    account_type IN (
      'USER_AVAILABLE',      -- Saldo disponível movimentável do usuário
      'USER_HELD',           -- Saldo reservado/em custódia (escrow)
      'CLEARING',            -- Conta transitória de compensação bancária / BaaS
      'FEE_REVENUE',         -- Receita de taxas operacionais Waesy
      'MERCHANT_SETTLEMENT', -- Conta de liquidação de estabelecimentos parceiros
      'EXTERNAL_SOURCE'      -- Origem externa (depósitos via Pix/BaaS)
    )
  ),
  currency text NOT NULL DEFAULT 'BRL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices únicos para evitar duplicidade de contas por usuário e sistema
CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_ledger_acc_user_type_curr
  ON public.financial_ledger_accounts (profile_id, account_type, currency)
  WHERE profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_ledger_acc_sys_type_curr
  ON public.financial_ledger_accounts (account_type, currency)
  WHERE profile_id IS NULL;

-- 2. Entradas do Ledger de Partidas Dobradas (Append-Only, Hash Chain)
CREATE TABLE IF NOT EXISTS public.financial_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL,
  debit_account_id uuid NOT NULL REFERENCES public.financial_ledger_accounts(id),
  credit_account_id uuid NOT NULL REFERENCES public.financial_ledger_accounts(id),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'BRL',
  entry_type text NOT NULL CHECK (
    entry_type IN (
      'DEPOSIT',
      'WITHDRAWAL',
      'TRANSFER_P2P',
      'ORDER_PAYMENT',
      'ORDER_ESCROW_HOLD',
      'ORDER_ESCROW_RELEASE',
      'RIDE_PAYMENT',
      'PLATFORM_FEE',
      'REFUND',
      'ADJUSTMENT'
    )
  ),
  status text NOT NULL DEFAULT 'SETTLED' CHECK (
    status IN ('PENDING', 'SETTLED', 'CANCELLED', 'REVERSED')
  ),
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text UNIQUE,
  hash_chain text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_fin_ledger_entries_distinct_accounts CHECK (debit_account_id <> credit_account_id)
);

CREATE INDEX IF NOT EXISTS idx_fin_ledger_entries_debit ON public.financial_ledger_entries(debit_account_id);
CREATE INDEX IF NOT EXISTS idx_fin_ledger_entries_credit ON public.financial_ledger_entries(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_fin_ledger_entries_tx ON public.financial_ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_fin_ledger_entries_created ON public.financial_ledger_entries(created_at DESC);

-- 3. Comprovantes Digitais Verificáveis com Assinatura Criptográfica HMAC-SHA256
CREATE TABLE IF NOT EXISTS public.financial_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL UNIQUE,
  emitter_name text NOT NULL DEFAULT 'Waesy Pagamentos e Tecnologia Ltda.',
  payer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  payer_name text NOT NULL,
  payer_document text,
  payee_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  payee_name text NOT NULL,
  payee_document text,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'BRL',
  payment_method text NOT NULL,
  authentication_code text NOT NULL UNIQUE,
  hmac_signature text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_receipts_payer ON public.financial_receipts(payer_profile_id);
CREATE INDEX IF NOT EXISTS idx_fin_receipts_payee ON public.financial_receipts(payee_profile_id);
CREATE INDEX IF NOT EXISTS idx_fin_receipts_auth_code ON public.financial_receipts(authentication_code);

-- 4. Barramento Canônico de Eventos Financeiros (Extrato Unificado)
CREATE TABLE IF NOT EXISTS public.financial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_domain text NOT NULL CHECK (
    source_domain IN (
      'WALLET',
      'ORDERS',
      'MOBILITY',
      'TICKETS',
      'TOURISM',
      'PERSONAL_FINANCE',
      'REWARDS'
    )
  ),
  source_entity_id text NOT NULL,
  event_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('INCOMING', 'OUTGOING', 'NEUTRAL')),
  amount_cents bigint NOT NULL,
  counterparty_name text,
  counterparty_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  description text NOT NULL,
  category_name text,
  category_icon text,
  category_color text,
  status text NOT NULL DEFAULT 'COMPLETED' CHECK (
    status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED')
  ),
  reference_url text,
  receipt_id uuid REFERENCES public.financial_receipts(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_events_profile_occurred ON public.financial_events(profile_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_events_source ON public.financial_events(source_domain, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_fin_events_receipt ON public.financial_events(receipt_id);

-- 5. Rastreamento e Deduplicação Idempotente de Extratos Bancários Importados (OFX / CSV)
CREATE TABLE IF NOT EXISTS public.financial_imported_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_name text,
  account_id text,
  fitid_hash text NOT NULL,
  amount_cents bigint NOT NULL,
  entry_date date NOT NULL,
  description text NOT NULL,
  raw_transaction_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_imported_stmt_fitid_unique
  ON public.financial_imported_statements (profile_id, fitid_hash);

-- 6. Helper Functions no Banco

-- 6.1 get_or_create_wallet_account: Garante existência de conta contábil do usuário
CREATE OR REPLACE FUNCTION public.get_or_create_wallet_account(
  p_profile_id uuid,
  p_account_type text,
  p_currency text DEFAULT 'BRL'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  IF p_profile_id IS NOT NULL THEN
    SELECT id INTO v_account_id
    FROM public.financial_ledger_accounts
    WHERE profile_id = p_profile_id
      AND account_type = p_account_type
      AND currency = p_currency
    LIMIT 1;

    IF v_account_id IS NULL THEN
      INSERT INTO public.financial_ledger_accounts (profile_id, account_type, currency)
      VALUES (p_profile_id, p_account_type, p_currency)
      ON CONFLICT (profile_id, account_type, currency) DO UPDATE
        SET updated_at = now()
      RETURNING id INTO v_account_id;
    END IF;
  ELSE
    SELECT id INTO v_account_id
    FROM public.financial_ledger_accounts
    WHERE profile_id IS NULL
      AND account_type = p_account_type
      AND currency = p_currency
    LIMIT 1;

    IF v_account_id IS NULL THEN
      INSERT INTO public.financial_ledger_accounts (profile_id, account_type, currency)
      VALUES (NULL, p_account_type, p_currency)
      ON CONFLICT (account_type, currency) DO UPDATE
        SET updated_at = now()
      RETURNING id INTO v_account_id;
    END IF;
  END IF;

  RETURN v_account_id;
END;
$$;

-- 6.2 calculate_wallet_balance_cents: Calcula projeção imutável do saldo real disponível
CREATE OR REPLACE FUNCTION public.calculate_wallet_balance_cents(
  p_profile_id uuid,
  p_currency text DEFAULT 'BRL'
)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_acc_id uuid;
  v_credits bigint := 0;
  v_debits bigint := 0;
BEGIN
  SELECT id INTO v_user_acc_id
  FROM public.financial_ledger_accounts
  WHERE profile_id = p_profile_id
    AND account_type = 'USER_AVAILABLE'
    AND currency = p_currency
  LIMIT 1;

  IF v_user_acc_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Entradas na conta do usuário (quando a conta é CREDITADA com dinheiro novo ou recebido)
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_credits
  FROM public.financial_ledger_entries
  WHERE credit_account_id = v_user_acc_id
    AND status = 'SETTLED';

  -- Saídas da conta do usuário (quando a conta é DEBITADA para transferências ou pagamentos)
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_debits
  FROM public.financial_ledger_entries
  WHERE debit_account_id = v_user_acc_id
    AND status = 'SETTLED';

  RETURN (v_credits - v_debits);
END;
$$;

-- 7. Políticas de Segurança RLS (Deny-by-default, isolamento por profile_id)

ALTER TABLE public.financial_ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_imported_statements ENABLE ROW LEVEL SECURITY;

-- 7.1 financial_ledger_accounts: Usuário visualiza apenas suas próprias contas
CREATE POLICY "Users can view own ledger accounts"
  ON public.financial_ledger_accounts
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- 7.2 financial_ledger_entries: Usuário visualiza lançamentos onde é parte interessada
CREATE POLICY "Users can view relevant ledger entries"
  ON public.financial_ledger_entries
  FOR SELECT
  TO authenticated
  USING (
    debit_account_id IN (SELECT id FROM public.financial_ledger_accounts WHERE profile_id = auth.uid())
    OR
    credit_account_id IN (SELECT id FROM public.financial_ledger_accounts WHERE profile_id = auth.uid())
  );

-- 7.3 financial_receipts: Usuário visualiza comprovantes em que é pagador ou recebedor
CREATE POLICY "Users can view own receipts"
  ON public.financial_receipts
  FOR SELECT
  TO authenticated
  USING (payer_profile_id = auth.uid() OR payee_profile_id = auth.uid());

-- 7.4 financial_events: Usuário visualiza seus próprios eventos do extrato
CREATE POLICY "Users can view own financial events"
  ON public.financial_events
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- 7.5 financial_imported_statements: Usuário gerencia seus próprios extratos importados
CREATE POLICY "Users can manage own imported statements"
  ON public.financial_imported_statements
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Contas de sistema de fallback
DO $$
BEGIN
  PERFORM public.get_or_create_wallet_account(NULL, 'CLEARING', 'BRL');
  PERFORM public.get_or_create_wallet_account(NULL, 'FEE_REVENUE', 'BRL');
  PERFORM public.get_or_create_wallet_account(NULL, 'MERCHANT_SETTLEMENT', 'BRL');
  PERFORM public.get_or_create_wallet_account(NULL, 'EXTERNAL_SOURCE', 'BRL');
END $$;
