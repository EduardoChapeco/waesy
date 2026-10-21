-- ============================================================================
-- WAESY PLATFORM MIGRATION: 20270217000000_canonical_wz_and_gift_cards_ecosystem.sql
-- UNIFICAÇÃO CANÔNICA $WZ, BUCKETS DE ESCOPO, LEDGER IMUTÁVEL E VALES-PRESENTE
-- ============================================================================

BEGIN;

-- 1. TABELA DE TAXAS DE CONVERSÃO VERSIONADAS DO $WZ
-- SSOT central para conversões BRL <-> $WZ (Nunca valores soltos no código)
CREATE TABLE IF NOT EXISTS public.wz_conversion_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL UNIQUE,
  wz_units_per_brl_cent NUMERIC(18, 4) NOT NULL DEFAULT 14.2857, -- 100.000 WZ = R$ 7,00 (700 centavos)
  brl_cents_per_million_wz INTEGER NOT NULL DEFAULT 700,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir taxa gênesis V1 caso inexista
INSERT INTO public.wz_conversion_rates (version, wz_units_per_brl_cent, brl_cents_per_million_wz, is_active, notes)
VALUES (1, 14.2857, 700, true, 'Taxa Gênesis: 100.000 WZ = R$ 7,00')
ON CONFLICT (version) DO NOTHING;

-- 2. TABELA DE BUCKETS / CONTAS DE $WZ (ESCOPOS E FONTES DE FINANCIAMENTO)
-- Cada usuário pode ter múltiplos buckets de WZ (Global Waesy, Loja A, Loja B, Campanhas)
CREATE TABLE IF NOT EXISTS public.wz_token_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_code TEXT NOT NULL DEFAULT 'WZ',
  issuer_type TEXT NOT NULL CHECK (issuer_type IN ('WAESY', 'MERCHANT', 'CAMPAIGN')),
  issuer_id UUID, -- NULL para Waesy Global, ou stores.id para Merchant
  funding_source TEXT NOT NULL CHECK (funding_source IN (
    'PLATFORM_PURCHASED',
    'PLATFORM_PROMOTIONAL',
    'MERCHANT_FUNDED',
    'PURCHASED',
    'CAMPAIGN_FUNDED',
    'CASHBACK',
    'REFUND_CREDIT',
    'CUSTOMER_SERVICE',
    'REFERRAL'
  )),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('GLOBAL', 'MERCHANT', 'CAMPAIGN')),
  scope_id UUID, -- NULL para GLOBAL, ou stores.id para MERCHANT
  available_balance NUMERIC(38, 0) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  reserved_balance NUMERIC(38, 0) NOT NULL DEFAULT 0 CHECK (reserved_balance >= 0),
  consumed_balance NUMERIC(38, 0) NOT NULL DEFAULT 0 CHECK (consumed_balance >= 0),
  expires_at TIMESTAMPTZ,
  transferable BOOLEAN NOT NULL DEFAULT false,
  cash_redeemable BOOLEAN NOT NULL DEFAULT false, -- Lojas NUNCA podem ter cash_redeemable = true
  allowed_features TEXT[] NOT NULL DEFAULT ARRAY['CHECKOUT'], -- 'CHECKOUT', 'AI', 'BOOST', 'WAESY_GO'
  campaign_id UUID,
  gift_card_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'depleted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, issuer_type, scope_type, scope_id, funding_source)
);

CREATE INDEX IF NOT EXISTS idx_wz_buckets_user ON public.wz_token_buckets(user_id);
CREATE INDEX IF NOT EXISTS idx_wz_buckets_scope ON public.wz_token_buckets(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_wz_buckets_status ON public.wz_token_buckets(status);

-- 3. TABELA DE LEDGER IMUTÁVEL DE $WZ (FONTE ÚNICA DA VERDADE BASEADA EM EVENTOS)
CREATE TABLE IF NOT EXISTS public.wz_token_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id UUID NOT NULL REFERENCES public.wz_token_buckets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'ISSUED',
    'PURCHASED',
    'GRANTED',
    'RESERVED',
    'RELEASED',
    'CONSUMED',
    'REFUNDED',
    'EXPIRED',
    'REVOKED',
    'ADJUSTED'
  )),
  amount_wz NUMERIC(38, 0) NOT NULL, -- Pode ser positivo (crédito) ou negativo (débito)
  balance_after_wz NUMERIC(38, 0) NOT NULL,
  operation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  rate_version INTEGER REFERENCES public.wz_conversion_rates(version),
  brl_equivalent_cents BIGINT,
  counterparty_type TEXT,
  counterparty_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  tamper_seal TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wz_ledger_bucket ON public.wz_token_ledger(bucket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wz_ledger_user ON public.wz_token_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wz_ledger_op ON public.wz_token_ledger(operation_id);

-- 4. TABELA DE PRODUTOS DE VALE-PRESENTE (CATÁLOGO / COMMERCE PRODUCT)
CREATE TABLE IF NOT EXISTS public.gift_card_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE, -- NULL para Vale Waesy Global
  issuer_type TEXT NOT NULL DEFAULT 'MERCHANT' CHECK (issuer_type IN ('WAESY', 'MERCHANT')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  headline TEXT,
  description TEXT,
  scope TEXT NOT NULL DEFAULT 'MERCHANT' CHECK (scope IN ('GLOBAL', 'MERCHANT')),
  min_amount_wz NUMERIC(38, 0) NOT NULL DEFAULT 50000,
  max_amount_wz NUMERIC(38, 0) NOT NULL DEFAULT 10000000,
  fixed_denominations_wz JSONB NOT NULL DEFAULT '[100000, 250000, 500000, 1000000]'::JSONB,
  allow_custom_amount BOOLEAN NOT NULL DEFAULT true,
  allow_personalization BOOLEAN NOT NULL DEFAULT true,
  allow_image BOOLEAN NOT NULL DEFAULT true,
  allow_gif BOOLEAN NOT NULL DEFAULT true,
  allow_video BOOLEAN NOT NULL DEFAULT false,
  allow_scheduled_delivery BOOLEAN NOT NULL DEFAULT true,
  allow_printable_version BOOLEAN NOT NULL DEFAULT true,
  design_templates JSONB NOT NULL DEFAULT '[]'::JSONB,
  recipient_rules JSONB DEFAULT '{}'::JSONB,
  expires_in_days INTEGER, -- NULL para sem expiração
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_gift_card_products_store ON public.gift_card_products(store_id);

-- 5. EVOLUÇÃO DA TABELA DE INSTÂNCIAS DE VALE-PRESENTE (gift_cards)
-- Preserva tabela existente adicionando todas as colunas canônicas $WZ
ALTER TABLE public.gift_cards
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.gift_card_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS issuer_type TEXT NOT NULL DEFAULT 'MERCHANT' CHECK (issuer_type IN ('WAESY', 'MERCHANT')),
  ADD COLUMN IF NOT EXISTS funding_source TEXT NOT NULL DEFAULT 'PURCHASED' CHECK (funding_source IN ('PURCHASED', 'MERCHANT_FUNDED')),
  ADD COLUMN IF NOT EXISTS wz_initial NUMERIC(38, 0) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wz_remaining NUMERIC(38, 0) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchaser_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS recipient_binding_type TEXT NOT NULL DEFAULT 'BEARER' CHECK (recipient_binding_type IN ('BEARER', 'WAESY_USER', 'VERIFIED_CPF')),
  ADD COLUMN IF NOT EXISTS recipient_binding_hash TEXT,
  ADD COLUMN IF NOT EXISTS redemption_code_hash TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS code_display TEXT,
  ADD COLUMN IF NOT EXISTS claim_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS personal_message TEXT,
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS card_design_id TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS token_bucket_id UUID REFERENCES public.wz_token_buckets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gift_cards_claim_token ON public.gift_cards(claim_token);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code_hash ON public.gift_cards(redemption_code_hash);
CREATE INDEX IF NOT EXISTS idx_gift_cards_purchaser ON public.gift_cards(purchaser_user_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient ON public.gift_cards(recipient_user_id);

-- 6. TABELA DE MÍDIA PERSONALIZADA DO VALE-PRESENTE (VÍDEO / FOTO / GIF)
CREATE TABLE IF NOT EXISTS public.gift_card_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO', 'ANIMATION')),
  storage_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  duration_seconds INTEGER,
  width INTEGER,
  height INTEGER,
  focal_point JSONB DEFAULT '{"x": 0.5, "y": 0.5}'::JSONB,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'processing', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_card_media_card ON public.gift_card_media(gift_card_id);

-- 7. TABELA DE EVENTOS DO VALE-PRESENTE (AUDITORIA E TELEMETRIA)
CREATE TABLE IF NOT EXISTS public.gift_card_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'CREATED',
    'PAYMENT_CONFIRMED',
    'ISSUED',
    'SCHEDULED',
    'DELIVERED',
    'OPENED',
    'CLAIMED',
    'PARTIALLY_REDEEMED',
    'REDEEMED',
    'SUSPENDED',
    'CANCELLED',
    'REFUNDED',
    'EXPIRED'
  )),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_card_events_card ON public.gift_card_events(gift_card_id, created_at DESC);

-- 8. STORED PROCEDURES ACID: GESTÃO DO MOTOR DE $WZ E BUCKETS

-- 8.1. Obter ou Criar Bucket Atômico
CREATE OR REPLACE FUNCTION public.wz_get_or_create_bucket(
  p_user_id UUID,
  p_issuer_type TEXT,
  p_issuer_id UUID,
  p_funding_source TEXT,
  p_scope_type TEXT,
  p_scope_id UUID,
  p_allowed_features TEXT[] DEFAULT ARRAY['CHECKOUT']
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bucket_id UUID;
  v_features TEXT[];
BEGIN
  -- Regra de negócio: buckets emitidos por lojista NUNCA podem ter 'AI' ou 'BOOST'
  IF p_scope_type = 'MERCHANT' OR p_funding_source = 'MERCHANT_FUNDED' THEN
    v_features := ARRAY['CHECKOUT'];
  ELSE
    v_features := COALESCE(p_allowed_features, ARRAY['CHECKOUT', 'AI', 'BOOST', 'WAESY_GO']);
  END IF;

  SELECT id INTO v_bucket_id
  FROM public.wz_token_buckets
  WHERE user_id = p_user_id
    AND issuer_type = p_issuer_type
    AND scope_type = p_scope_type
    AND (scope_id IS NOT DISTINCT FROM p_scope_id)
    AND funding_source = p_funding_source;

  IF v_bucket_id IS NULL THEN
    INSERT INTO public.wz_token_buckets (
      user_id,
      issuer_type,
      issuer_id,
      funding_source,
      scope_type,
      scope_id,
      available_balance,
      reserved_balance,
      consumed_balance,
      allowed_features,
      cash_redeemable
    ) VALUES (
      p_user_id,
      p_issuer_type,
      p_issuer_id,
      p_funding_source,
      p_scope_type,
      p_scope_id,
      0,
      0,
      0,
      v_features,
      false -- NUNCA cash redeemable por padrão
    )
    RETURNING id INTO v_bucket_id;
  END IF;

  RETURN v_bucket_id;
END;
$$;

-- 8.2. Conceder $WZ Atomicamente (Gravação no Bucket + Entrada no Ledger)
CREATE OR REPLACE FUNCTION public.wz_grant_tokens_atomic(
  p_user_id UUID,
  p_issuer_type TEXT,
  p_issuer_id UUID,
  p_funding_source TEXT,
  p_scope_type TEXT,
  p_scope_id UUID,
  p_amount NUMERIC(38, 0),
  p_operation_id TEXT,
  p_idempotency_key TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bucket_id UUID;
  v_new_available NUMERIC(38, 0);
  v_seal TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT', 'message', 'O valor deve ser positivo');
  END IF;

  -- Obter ou criar bucket
  v_bucket_id := public.wz_get_or_create_bucket(
    p_user_id,
    p_issuer_type,
    p_issuer_id,
    p_funding_source,
    p_scope_type,
    p_scope_id
  );

  -- Bloquear bucket para atualização atômica
  SELECT available_balance + p_amount INTO v_new_available
  FROM public.wz_token_buckets
  WHERE id = v_bucket_id
  FOR UPDATE;

  UPDATE public.wz_token_buckets
  SET available_balance = v_new_available,
      updated_at = now()
  WHERE id = v_bucket_id;

  v_seal := encode(digest(p_idempotency_key || ':' || p_user_id::text || ':' || p_amount::text || ':' || now()::text, 'sha256'), 'hex');

  -- Registrar no ledger
  INSERT INTO public.wz_token_ledger (
    bucket_id,
    user_id,
    entry_type,
    amount_wz,
    balance_after_wz,
    operation_id,
    idempotency_key,
    description,
    metadata,
    tamper_seal
  ) VALUES (
    v_bucket_id,
    p_user_id,
    'GRANTED',
    p_amount,
    v_new_available,
    p_operation_id,
    p_idempotency_key,
    p_description,
    p_metadata,
    v_seal
  );

  RETURN jsonb_build_object(
    'success', true,
    'bucket_id', v_bucket_id,
    'amount_granted', p_amount,
    'new_available', v_new_available,
    'tamper_seal', v_seal
  );
END;
$$;

-- 8.3. Reserva de $WZ para Compras / Checkout
CREATE OR REPLACE FUNCTION public.wz_reserve_tokens_atomic(
  p_user_id UUID,
  p_store_id UUID,
  p_amount NUMERIC(38, 0),
  p_operation_id TEXT,
  p_idempotency_key TEXT,
  p_required_feature TEXT DEFAULT 'CHECKOUT'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining NUMERIC(38, 0) := p_amount;
  v_bucket RECORD;
  v_deduct NUMERIC(38, 0);
  v_reservations JSONB := '[]'::JSONB;
  v_total_available NUMERIC(38, 0) := 0;
BEGIN
  -- 1. Calcular total disponível em buckets elegíveis
  -- Elegíveis: (scope_type = 'MERCHANT' E scope_id = p_store_id) OU (scope_type = 'GLOBAL')
  SELECT COALESCE(SUM(available_balance), 0) INTO v_total_available
  FROM public.wz_token_buckets
  WHERE user_id = p_user_id
    AND status = 'active'
    AND p_required_feature = ANY(allowed_features)
    AND (
      (scope_type = 'MERCHANT' AND scope_id = p_store_id)
      OR
      (scope_type = 'GLOBAL')
    );

  IF v_total_available < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_FUNDS',
      'required', p_amount,
      'available', v_total_available,
      'message', 'Saldo em $WZ elegível insuficiente para esta compra.'
    );
  END IF;

  -- 2. Consumir na ordem canônica:
  -- 1) Buckets da loja específica que expiram mais cedo
  -- 2) Demais buckets da loja específica
  -- 3) Buckets globais
  FOR v_bucket IN
    SELECT *
    FROM public.wz_token_buckets
    WHERE user_id = p_user_id
      AND status = 'active'
      AND available_balance > 0
      AND p_required_feature = ANY(allowed_features)
      AND (
        (scope_type = 'MERCHANT' AND scope_id = p_store_id)
        OR
        (scope_type = 'GLOBAL')
      )
    ORDER BY
      CASE WHEN scope_type = 'MERCHANT' THEN 0 ELSE 1 END,
      expires_at ASC NULLS LAST,
      created_at ASC
    FOR UPDATE
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;

    v_deduct := LEAST(v_bucket.available_balance, v_remaining);
    
    UPDATE public.wz_token_buckets
    SET available_balance = available_balance - v_deduct,
        reserved_balance = reserved_balance + v_deduct,
        updated_at = now()
    WHERE id = v_bucket.id;

    v_remaining := v_remaining - v_deduct;

    v_reservations := v_reservations || jsonb_build_object(
      'bucket_id', v_bucket.id,
      'amount', v_deduct,
      'scope_type', v_bucket.scope_type,
      'scope_id', v_bucket.scope_id,
      'funding_source', v_bucket.funding_source
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'operation_id', p_operation_id,
    'total_reserved', p_amount,
    'reservations', v_reservations
  );
END;
$$;

-- 8.4. Confirmação / Commit da Reserva de $WZ
CREATE OR REPLACE FUNCTION public.wz_commit_reserved_tokens_atomic(
  p_user_id UUID,
  p_operation_id TEXT,
  p_reservations JSONB,
  p_idempotency_key TEXT,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_bucket_id UUID;
  v_amount NUMERIC(38, 0);
  v_seal TEXT;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_reservations) AS x(bucket_id UUID, amount NUMERIC(38, 0))
  LOOP
    v_bucket_id := v_item.bucket_id;
    v_amount := v_item.amount;

    UPDATE public.wz_token_buckets
    SET reserved_balance = reserved_balance - v_amount,
        consumed_balance = consumed_balance + v_amount,
        updated_at = now()
    WHERE id = v_bucket_id;

    v_seal := encode(digest(p_idempotency_key || ':' || v_bucket_id::text || ':' || v_amount::text, 'sha256'), 'hex');

    INSERT INTO public.wz_token_ledger (
      bucket_id,
      user_id,
      entry_type,
      amount_wz,
      balance_after_wz,
      operation_id,
      idempotency_key,
      description,
      tamper_seal
    )
    SELECT
      v_bucket_id,
      p_user_id,
      'CONSUMED',
      -v_amount,
      available_balance,
      p_operation_id,
      p_idempotency_key || ':' || v_bucket_id::text,
      p_description,
      v_seal
    FROM public.wz_token_buckets
    WHERE id = v_bucket_id;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8.5. Liberação / Rollback de Reserva em Caso de Falha
CREATE OR REPLACE FUNCTION public.wz_release_reserved_tokens_atomic(
  p_reservations JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_reservations) AS x(bucket_id UUID, amount NUMERIC(38, 0))
  LOOP
    UPDATE public.wz_token_buckets
    SET reserved_balance = reserved_balance - v_item.amount,
        available_balance = available_balance + v_item.amount,
        updated_at = now()
    WHERE id = v_item.bucket_id;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8.6. Resgatar Vale-Presente Atomicamente (Claim Gift Card)
CREATE OR REPLACE FUNCTION public.wz_claim_gift_card_atomic(
  p_user_id UUID,
  p_claim_token TEXT,
  p_user_cpf_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card RECORD;
  v_scope_type TEXT;
  v_scope_id UUID;
  v_issuer_type TEXT;
  v_issuer_id UUID;
  v_bucket_id UUID;
  v_res JSONB;
BEGIN
  SELECT * INTO v_card
  FROM public.gift_cards
  WHERE claim_token = p_claim_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'CARD_NOT_FOUND', 'message', 'Vale-presente inválido ou inexistente.');
  END IF;

  IF v_card.status = 'claimed' OR v_card.status = 'redeemed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLAIMED', 'message', 'Este vale-presente já foi resgatado.');
  END IF;

  IF v_card.status <> 'active' AND v_card.status <> 'delivered' AND v_card.status <> 'opened' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INACTIVE_CARD', 'message', 'Este vale-presente não está ativo.');
  END IF;

  IF v_card.wz_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_BALANCE', 'message', 'Este vale-presente não possui saldo remanescente.');
  END IF;

  -- Verificação de binding se restrito a CPF verificado
  IF v_card.recipient_binding_type = 'VERIFIED_CPF' THEN
    IF v_card.recipient_binding_hash IS NOT NULL AND v_card.recipient_binding_hash <> p_user_cpf_hash THEN
      RETURN jsonb_build_object('success', false, 'error', 'CPF_MISMATCH', 'message', 'Este vale-presente é exclusivo para o CPF do destinatário especificado.');
    END IF;
  END IF;

  -- Determinar escopo econômico
  IF v_card.store_id IS NOT NULL THEN
    v_scope_type := 'MERCHANT';
    v_scope_id := v_card.store_id;
    v_issuer_type := 'MERCHANT';
    v_issuer_id := v_card.store_id;
  ELSE
    v_scope_type := 'GLOBAL';
    v_scope_id := NULL;
    v_issuer_type := 'WAESY';
    v_issuer_id := NULL;
  END IF;

  -- Creditar no bucket $WZ correspondente do usuário
  v_res := public.wz_grant_tokens_atomic(
    p_user_id,
    v_issuer_type,
    v_issuer_id,
    v_card.funding_source,
    v_scope_type,
    v_scope_id,
    v_card.wz_remaining,
    'claim_gc:' || v_card.id::text,
    'gc_claim_' || v_card.id::text || '_' || p_user_id::text,
    'Resgate de Vale-Presente: ' || COALESCE(v_card.code_display, 'GC'),
    jsonb_build_object('gift_card_id', v_card.id, 'origin_order_id', v_card.order_id)
  );

  v_bucket_id := (v_res->>'bucket_id')::UUID;

  -- Atualizar status da instância do cartão
  UPDATE public.gift_cards
  SET status = 'claimed',
      claimed_at = now(),
      recipient_user_id = p_user_id,
      token_bucket_id = v_bucket_id,
      updated_at = now()
  WHERE id = v_card.id;

  -- Registrar evento
  INSERT INTO public.gift_card_events (gift_card_id, event_type, actor_id, payload)
  VALUES (v_card.id, 'CLAIMED', p_user_id, jsonb_build_object('bucket_id', v_bucket_id, 'wz_claimed', v_card.wz_remaining));

  RETURN jsonb_build_object(
    'success', true,
    'gift_card_id', v_card.id,
    'wz_claimed', v_card.wz_remaining,
    'scope_type', v_scope_type,
    'scope_id', v_scope_id,
    'bucket_id', v_bucket_id,
    'message', 'Vale-presente resgatado com sucesso em sua conta $WZ!'
  );
END;
$$;

-- 9. MIGRAÇÃO HISTÓRICA: BACKFILL DE DADOS EXISTENTES (customer_credits -> wz_token_buckets)
CREATE OR REPLACE FUNCTION public.wz_migrate_legacy_credits_and_tokens()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credit RECORD;
  v_wallet RECORD;
  v_gc RECORD;
  v_migrated_credits INTEGER := 0;
  v_migrated_wallets INTEGER := 0;
  v_migrated_gc INTEGER := 0;
  v_wz_amount NUMERIC(38, 0);
  v_bucket_id UUID;
BEGIN
  -- 1. Migrar customer_credits existentes para wz_token_buckets (MERCHANT_FUNDED, escopo store_id)
  -- Conversão: 1 centavo = 14.2857 WZ (ou arredondamento canônico)
  FOR v_credit IN
    SELECT * FROM public.customer_credits WHERE balance_cents > 0
  LOOP
    v_wz_amount := ROUND(v_credit.balance_cents * 14.2857);
    IF v_wz_amount > 0 THEN
      PERFORM public.wz_grant_tokens_atomic(
        v_credit.customer_id,
        'MERCHANT',
        v_credit.store_id,
        'MERCHANT_FUNDED',
        'MERCHANT',
        v_credit.store_id,
        v_wz_amount,
        'migration_legacy_credit:' || v_credit.id::text,
        'migration_credit_' || v_credit.id::text,
        'Saldo migrado do sistema legado de créditos em loja',
        jsonb_build_object('legacy_credit_id', v_credit.id, 'legacy_balance_cents', v_credit.balance_cents)
      );
      v_migrated_credits := v_migrated_credits + 1;
    END IF;
  END LOOP;

  -- 2. Migrar user_token_wallets existentes para wz_token_buckets (PLATFORM_PROMOTIONAL, escopo GLOBAL)
  FOR v_wallet IN
    SELECT * FROM public.user_token_wallets WHERE balance > 0
  LOOP
    PERFORM public.wz_grant_tokens_atomic(
      v_wallet.user_id,
      'WAESY',
      NULL,
      'PLATFORM_PROMOTIONAL',
      'GLOBAL',
      NULL,
      v_wallet.balance,
      'migration_legacy_wallet:' || v_wallet.id::text,
      'migration_wallet_' || v_wallet.id::text,
      'Saldo de tokens migrado da carteira civil legada',
      jsonb_build_object('legacy_wallet_id', v_wallet.id)
    );
    v_migrated_wallets := v_migrated_wallets + 1;
  END LOOP;

  -- 3. Atualizar instâncias de gift_cards legadas com $WZ equivalentes
  FOR v_gc IN
    SELECT * FROM public.gift_cards WHERE (wz_initial = 0 OR wz_initial IS NULL) AND (initial_balance_cents > 0 OR initial_value_cents > 0)
  LOOP
    v_wz_amount := ROUND(COALESCE(v_gc.initial_balance_cents, v_gc.initial_value_cents, 0) * 14.2857);
    UPDATE public.gift_cards
    SET wz_initial = v_wz_amount,
        wz_remaining = ROUND(COALESCE(v_gc.current_balance_cents, v_gc.balance_cents, 0) * 14.2857),
        code_display = '•••• •••• ' || RIGHT(code, 4),
        claim_token = COALESCE(claim_token, encode(digest(id::text || code || now()::text, 'sha256'), 'hex')),
        updated_at = now()
    WHERE id = v_gc.id;
    v_migrated_gc := v_migrated_gc + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'migrated_credits', v_migrated_credits,
    'migrated_wallets', v_migrated_wallets,
    'migrated_gift_cards', v_migrated_gc
  );
END;
$$;

-- Executar a migração inicial
SELECT public.wz_migrate_legacy_credits_and_tokens();

-- 10. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.wz_conversion_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wz_token_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wz_token_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_events ENABLE ROW LEVEL SECURITY;

-- wz_conversion_rates: leitura pública
DROP POLICY IF EXISTS "wz_conversion_rates_read" ON public.wz_conversion_rates;
CREATE POLICY "wz_conversion_rates_read" ON public.wz_conversion_rates
  FOR SELECT TO authenticated, anon USING (true);

-- wz_token_buckets: usuário vê seus próprios buckets; lojista vê buckets de sua loja
DROP POLICY IF EXISTS "wz_token_buckets_user_select" ON public.wz_token_buckets;
CREATE POLICY "wz_token_buckets_user_select" ON public.wz_token_buckets
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR
    scope_id IN (
      SELECT store_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

-- wz_token_ledger: usuário vê seus próprios registros
DROP POLICY IF EXISTS "wz_token_ledger_user_select" ON public.wz_token_ledger;
CREATE POLICY "wz_token_ledger_user_select" ON public.wz_token_ledger
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- gift_card_products: público para produtos ativos; gerentes gerenciam da sua loja
DROP POLICY IF EXISTS "gift_card_products_public_select" ON public.gift_card_products;
CREATE POLICY "gift_card_products_public_select" ON public.gift_card_products
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS "gift_card_products_manager_all" ON public.gift_card_products;
CREATE POLICY "gift_card_products_manager_all" ON public.gift_card_products
  FOR ALL TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

-- gift_card_media: leitura pública de mídia vinculada a cartões
DROP POLICY IF EXISTS "gift_card_media_public_select" ON public.gift_card_media;
CREATE POLICY "gift_card_media_public_select" ON public.gift_card_media
  FOR SELECT TO authenticated, anon
  USING (true);

COMMIT;
