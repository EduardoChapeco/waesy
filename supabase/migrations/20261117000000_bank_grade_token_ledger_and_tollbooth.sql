-- ============================================================================
-- WAESY BANK-GRADE TOKENOMICS: LEDGER IMUTÁVEL, ANTI-CHEAT & TOLLBOOTH INTERCEPTOR
-- Protocolo Militar: Row-Level Locking ACID, Selagem Criptográfica SHA-256 e Auto-Freeze
-- ============================================================================

-- 1. Ampliar CHECK constraint de action_type para cobrir Harvesters B2B e IA
ALTER TABLE public.token_ledger_transactions
  DROP CONSTRAINT IF EXISTS token_ledger_transactions_action_type_check;

ALTER TABLE public.token_ledger_transactions
  ADD CONSTRAINT token_ledger_transactions_action_type_check CHECK (
    action_type = ANY (ARRAY[
      'welcome_bonus'::text,
      'package_purchase'::text,
      'admin_grant'::text,
      'curation_reward'::text,
      'refund'::text,
      'burn_feed_view'::text,
      'burn_visibility_boost'::text,
      'burn_whatsapp_alert'::text,
      'burn_push_notification'::text,
      'burn_lead_unlock'::text,
      'burn_ai_agent_chat'::text,
      'burn_verified_daily'::text,
      'burn_market_insight'::text,
      'burn_scrape_url'::text,
      'burn_rss_import'::text,
      'burn_ai_curate'::text,
      'burn_ai_rewrite'::text,
      'burn_ai_summarize'::text,
      'burn_content_import_url'::text,
      'burn_batch_crawl'::text,
      'burn_tender_unlock'::text,
      'burn_tender_digest'::text,
      'burn_magic_onboarding'::text,
      'burn_lead_enrich'::text,
      'system_burn_service'::text
    ])
  );

-- 2. Garantir Inicialização Canônica de Carteira com Registro Gênesis Selado
CREATE OR REPLACE FUNCTION public.ensure_store_token_wallet(p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet RECORD;
  v_tx_id UUID;
  v_seal TEXT;
  v_genesis_seal TEXT := 'GENESIS_WIDER_VAULT_2026';
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- Verificar existência com Lock de Linha
  SELECT * INTO v_wallet
  FROM public.store_token_wallets
  WHERE store_id = p_store_id
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'ALREADY_EXISTS',
      'wallet_id', v_wallet.id,
      'balance', v_wallet.balance,
      'is_locked', v_wallet.is_locked
    );
  END IF;

  -- 1. Criar Carteira com Bônus Oficial de Boas-Vindas (50.000 Tokens)
  INSERT INTO public.store_token_wallets (
    store_id,
    balance,
    promotional_balance,
    purchased_balance,
    lifetime_purchased,
    lifetime_consumed,
    estimated_time_saved_hours,
    is_locked,
    last_reconciled_at,
    created_at,
    updated_at
  )
  VALUES (
    p_store_id,
    50000,
    50000,
    0,
    50000,
    0,
    24.0,
    false,
    v_now,
    v_now,
    v_now
  )
  RETURNING * INTO v_wallet;

  -- 2. Gerar ID e Selo Criptográfico SHA-256 para Transação Gênesis
  v_tx_id := gen_random_uuid();
  v_seal := public.generate_token_transaction_seal(
    v_tx_id,
    p_store_id,
    50000,
    50000,
    'welcome_bonus',
    v_now,
    v_genesis_seal
  );

  -- 3. Inserir Transação Gênesis no Ledger Imutável
  INSERT INTO public.token_ledger_transactions (
    id,
    store_id,
    amount,
    balance_after,
    action_type,
    origin_type,
    origin_reference_id,
    description,
    metadata,
    time_saved_minutes,
    tamper_seal,
    prev_seal,
    idempotency_key,
    created_at
  )
  VALUES (
    v_tx_id,
    p_store_id,
    50000,
    50000,
    'welcome_bonus',
    'master_admin_grant',
    'SYSTEM_GENESIS_WELCOME_VAULT',
    'Bônus de Boas-Vindas Waesy (50.000 Tokens de Aceleração)',
    jsonb_build_object(
      'grant_type', 'genesis_welcome_grant',
      'system_standard', 'BACEN_PCI_SHA256'
    ),
    1440,
    v_seal,
    v_genesis_seal,
    'GENESIS_WALLET_' || p_store_id::text,
    v_now
  );

  -- 4. Atualizar hash de integridade na carteira
  UPDATE public.store_token_wallets
  SET last_integrity_hash = v_seal
  WHERE id = v_wallet.id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'CREATED_WITH_GENESIS_SEAL',
    'wallet_id', v_wallet.id,
    'balance', 50000,
    'transaction_seal', v_seal
  );
END;
$$;

-- 3. Stored Procedure ACID: Tollbooth Interceptor (Cobrança Universal Pré-Voo)
CREATE OR REPLACE FUNCTION public.charge_token_tollbooth(
  p_store_id UUID,
  p_tokens_to_consume INTEGER,
  p_action_type TEXT,
  p_description TEXT,
  p_idempotency_key TEXT,
  p_service_category TEXT DEFAULT 'general',
  p_time_saved_minutes INTEGER DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet RECORD;
  v_init_res JSONB;
  v_existing_tx RECORD;
  v_ledger_sum INTEGER := 0;
  v_is_hard_cost BOOLEAN := false;
  v_promo_deduct INTEGER := 0;
  v_purchased_deduct INTEGER := 0;
  v_new_promo INTEGER;
  v_new_purchased INTEGER;
  v_new_total INTEGER;
  v_prev_seal TEXT := 'GENESIS_WIDER_VAULT_2026';
  v_new_seal TEXT;
  v_tx_id UUID;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- Validação de entrada
  IF p_tokens_to_consume <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT', 'message', 'Quantidade de tokens deve ser maior que zero.');
  END IF;

  -- 1. Assegurar que a carteira existe
  SELECT * INTO v_wallet
  FROM public.store_token_wallets
  WHERE store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_init_res := public.ensure_store_token_wallet(p_store_id);
    SELECT * INTO v_wallet
    FROM public.store_token_wallets
    WHERE store_id = p_store_id
    FOR UPDATE;
  END IF;

  -- 2. Idempotência Rigorosa
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT id, balance_after, tamper_seal INTO v_existing_tx
    FROM public.token_ledger_transactions
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'transaction_id', v_existing_tx.id,
        'balance_after', v_existing_tx.balance_after,
        'transaction_seal', v_existing_tx.tamper_seal,
        'message', 'Operação já processada anteriormente (idempotente).'
      );
    END IF;
  END IF;

  -- 3. Verificação de Bloqueio Cautelar (Freeze)
  IF v_wallet.is_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'WALLET_FROZEN',
      'message', COALESCE(v_wallet.lock_reason, 'Esta carteira está bloqueada para averiguação de segurança.'),
      'current_balance', v_wallet.balance
    );
  END IF;

  -- 4. Verificação Pré-Voo de Integridade e Conciliação do Ledger (Anti-Tamper)
  SELECT COALESCE(SUM(amount), 0) INTO v_ledger_sum
  FROM public.token_ledger_transactions
  WHERE store_id = p_store_id;

  IF v_wallet.balance <> v_ledger_sum THEN
    -- Injeção ou adulteração detectada: CONGELAMENTO IMEDIATO
    UPDATE public.store_token_wallets
    SET
      is_locked = true,
      lock_reason = 'DIVERGÊNCIA FORENSE DETECTADA: Saldo na carteira (' || v_wallet.balance || ') diverge do somatório do ledger (' || v_ledger_sum || '). Conta congelada automaticamente.',
      last_reconciled_at = v_now,
      updated_at = v_now
    WHERE store_id = p_store_id;

    INSERT INTO public.security_audit_events (
      severity,
      event_type,
      entity_type,
      entity_id,
      details
    )
    VALUES (
      'critical',
      'TAMPER_INJECTION_BLOCKED',
      'store_token_wallet',
      p_store_id,
      jsonb_build_object(
        'store_id', p_store_id,
        'action_type', p_action_type,
        'wallet_balance', v_wallet.balance,
        'ledger_sum', v_ledger_sum,
        'divergence', (v_wallet.balance - v_ledger_sum),
        'attempted_tokens', p_tokens_to_consume,
        'idempotency_key', p_idempotency_key
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'WALLET_FROZEN_TAMPERED',
      'message', 'Bloqueio preventivo ativado: divergência matemática detectada entre o saldo e o livro-razão auditado.'
    );
  END IF;

  -- 5. Checagem de Hard-Cost vs Saldo Promocional
  IF p_service_category IN ('fiscal_nfe', 'heavy_ia_llm', 'firecrawl_scraper', 'steel_browser', 'whatsapp_api', 'tender_ai_digest') THEN
    v_is_hard_cost := true;
  END IF;

  IF v_is_hard_cost THEN
    -- Serviços de custo real exigem saldo de compras reais
    IF v_wallet.purchased_balance < p_tokens_to_consume THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INSUFFICIENT_PURCHASED_TOKENS',
        'message', 'Este recurso avançado de infraestrutura requer Tokens de Compra (saldo adquirido). Seu saldo promocional de mídia não pode ser utilizado para custos de terceiros.',
        'current_balance', v_wallet.balance,
        'purchased_balance', v_wallet.purchased_balance,
        'tokens_required', p_tokens_to_consume
      );
    END IF;

    v_purchased_deduct := p_tokens_to_consume;
    v_promo_deduct := 0;
  ELSE
    -- Serviços internos: queima promocional primeiro, depois comprado
    IF v_wallet.balance < p_tokens_to_consume THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INSUFFICIENT_TOKENS',
        'message', 'Saldo insuficiente de Tokens (' || v_wallet.balance || ' disponíveis). Necessário: ' || p_tokens_to_consume || ' Tokens.',
        'current_balance', v_wallet.balance,
        'tokens_required', p_tokens_to_consume
      );
    END IF;

    IF v_wallet.promotional_balance >= p_tokens_to_consume THEN
      v_promo_deduct := p_tokens_to_consume;
      v_purchased_deduct := 0;
    ELSE
      v_promo_deduct := v_wallet.promotional_balance;
      v_purchased_deduct := p_tokens_to_consume - v_wallet.promotional_balance;
    END IF;
  END IF;

  -- 6. Calcular novos saldos
  v_new_promo := v_wallet.promotional_balance - v_promo_deduct;
  v_new_purchased := v_wallet.purchased_balance - v_purchased_deduct;
  v_new_total := v_new_promo + v_new_purchased;

  -- 7. Obter último selo criptográfico da cadeia
  SELECT tamper_seal INTO v_prev_seal
  FROM public.token_ledger_transactions
  WHERE store_id = p_store_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  IF v_prev_seal IS NULL THEN
    v_prev_seal := 'GENESIS_WIDER_VAULT_2026';
  END IF;

  -- 8. Gerar ID e Selo Criptográfico SHA-256 para este débito
  v_tx_id := gen_random_uuid();
  v_new_seal := public.generate_token_transaction_seal(
    v_tx_id,
    p_store_id,
    -p_tokens_to_consume,
    v_new_total,
    p_action_type,
    v_now,
    v_prev_seal
  );

  -- 9. Inserir no Ledger Imutável
  INSERT INTO public.token_ledger_transactions (
    id,
    store_id,
    amount,
    balance_after,
    action_type,
    origin_type,
    origin_reference_id,
    description,
    metadata,
    time_saved_minutes,
    tamper_seal,
    prev_seal,
    idempotency_key,
    created_at
  )
  VALUES (
    v_tx_id,
    p_store_id,
    -p_tokens_to_consume,
    v_new_total,
    p_action_type,
    'system_burn_service',
    'TOLLBOOTH_INTERCEPTOR',
    p_description,
    p_metadata || jsonb_build_object(
      'service_category', p_service_category,
      'is_hard_cost', v_is_hard_cost,
      'promo_deducted', v_promo_deduct,
      'purchased_deducted', v_purchased_deduct
    ),
    p_time_saved_minutes,
    v_new_seal,
    v_prev_seal,
    p_idempotency_key,
    v_now
  );

  -- 10. Atualizar Carteira de Tokens com Lock Concluído
  UPDATE public.store_token_wallets
  SET
    balance = v_new_total,
    promotional_balance = v_new_promo,
    purchased_balance = v_new_purchased,
    lifetime_consumed = v_wallet.lifetime_consumed + p_tokens_to_consume,
    estimated_time_saved_hours = v_wallet.estimated_time_saved_hours + (p_time_saved_minutes::numeric / 60.0),
    last_integrity_hash = v_new_seal,
    last_reconciled_at = v_now,
    updated_at = v_now
  WHERE store_id = p_store_id;

  RETURN jsonb_build_object(
    'success', true,
    'tokens_consumed', p_tokens_to_consume,
    'new_balance', v_new_total,
    'new_promotional_balance', v_new_promo,
    'new_purchased_balance', v_new_purchased,
    'transaction_id', v_tx_id,
    'transaction_seal', v_new_seal,
    'time_saved_minutes', p_time_saved_minutes
  );
END;
$$;

-- 4. Stored Procedure ACID: Crédito Rigoroso com Verificação de Origem e Selo
CREATE OR REPLACE FUNCTION public.credit_store_tokens_strict(
  p_store_id UUID,
  p_tokens_to_credit INTEGER,
  p_origin_type TEXT,
  p_origin_reference_id TEXT,
  p_description TEXT,
  p_idempotency_key TEXT,
  p_is_purchased BOOLEAN DEFAULT true,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet RECORD;
  v_existing_tx RECORD;
  v_new_promo INTEGER;
  v_new_purchased INTEGER;
  v_new_total INTEGER;
  v_prev_seal TEXT := 'GENESIS_WIDER_VAULT_2026';
  v_new_seal TEXT;
  v_tx_id UUID;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- 1. Blindagem de Origem Autorizada
  IF p_origin_type NOT IN ('gateway_confirmed_payment', 'master_admin_grant', 'kyc_verified_referral_bounty', 'reversal_refund') THEN
    RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA: Origem de crédito (%) não autorizada pelo Banco Central Waesy.', p_origin_type;
  END IF;

  IF p_tokens_to_credit <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT', 'message', 'Quantidade de crédito deve ser positiva.');
  END IF;

  -- 2. Garantir Carteira
  SELECT * INTO v_wallet
  FROM public.store_token_wallets
  WHERE store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    PERFORM public.ensure_store_token_wallet(p_store_id);
    SELECT * INTO v_wallet
    FROM public.store_token_wallets
    WHERE store_id = p_store_id
    FOR UPDATE;
  END IF;

  -- 3. Idempotência
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT id, balance_after, tamper_seal INTO v_existing_tx
    FROM public.token_ledger_transactions
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'transaction_id', v_existing_tx.id,
        'balance_after', v_existing_tx.balance_after,
        'transaction_seal', v_existing_tx.tamper_seal
      );
    END IF;
  END IF;

  -- 4. Cálculo de Novos Saldos por Balde
  IF p_is_purchased THEN
    v_new_purchased := v_wallet.purchased_balance + p_tokens_to_credit;
    v_new_promo := v_wallet.promotional_balance;
  ELSE
    v_new_promo := v_wallet.promotional_balance + p_tokens_to_credit;
    v_new_purchased := v_wallet.purchased_balance;
  END IF;
  v_new_total := v_new_promo + v_new_purchased;

  -- 5. Obter último selo
  SELECT tamper_seal INTO v_prev_seal
  FROM public.token_ledger_transactions
  WHERE store_id = p_store_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  IF v_prev_seal IS NULL THEN
    v_prev_seal := 'GENESIS_WIDER_VAULT_2026';
  END IF;

  -- 6. Gerar ID e Selo Criptográfico
  v_tx_id := gen_random_uuid();
  v_new_seal := public.generate_token_transaction_seal(
    v_tx_id,
    p_store_id,
    p_tokens_to_credit,
    v_new_total,
    CASE 
      WHEN p_origin_type = 'master_admin_grant' THEN 'admin_grant'
      WHEN p_origin_type = 'reversal_refund' THEN 'refund'
      WHEN p_origin_type = 'kyc_verified_referral_bounty' THEN 'curation_reward'
      ELSE 'package_purchase'
    END,
    v_now,
    v_prev_seal
  );

  -- 7. Inserir no Ledger
  INSERT INTO public.token_ledger_transactions (
    id,
    store_id,
    amount,
    balance_after,
    action_type,
    origin_type,
    origin_reference_id,
    description,
    metadata,
    time_saved_minutes,
    tamper_seal,
    prev_seal,
    idempotency_key,
    created_at
  )
  VALUES (
    v_tx_id,
    p_store_id,
    p_tokens_to_credit,
    v_new_total,
    CASE 
      WHEN p_origin_type = 'master_admin_grant' THEN 'admin_grant'
      WHEN p_origin_type = 'reversal_refund' THEN 'refund'
      WHEN p_origin_type = 'kyc_verified_referral_bounty' THEN 'curation_reward'
      ELSE 'package_purchase'
    END,
    p_origin_type,
    p_origin_reference_id,
    p_description,
    p_metadata,
    0,
    v_new_seal,
    v_prev_seal,
    p_idempotency_key,
    v_now
  );

  -- 8. Atualizar Carteira
  UPDATE public.store_token_wallets
  SET
    balance = v_new_total,
    promotional_balance = v_new_promo,
    purchased_balance = v_new_purchased,
    lifetime_purchased = v_wallet.lifetime_purchased + p_tokens_to_credit,
    total_master_grants = CASE WHEN p_origin_type = 'master_admin_grant' THEN v_wallet.total_master_grants + 1 ELSE v_wallet.total_master_grants END,
    total_gateway_purchases = CASE WHEN p_origin_type = 'gateway_confirmed_payment' THEN v_wallet.total_gateway_purchases + 1 ELSE v_wallet.total_gateway_purchases END,
    total_verified_bounties = CASE WHEN p_origin_type = 'kyc_verified_referral_bounty' THEN v_wallet.total_verified_bounties + 1 ELSE v_wallet.total_verified_bounties END,
    last_integrity_hash = v_new_seal,
    last_reconciled_at = v_now,
    updated_at = v_now
  WHERE store_id = p_store_id;

  RETURN jsonb_build_object(
    'success', true,
    'tokens_credited', p_tokens_to_credit,
    'new_balance', v_new_total,
    'new_promotional_balance', v_new_promo,
    'new_purchased_balance', v_new_purchased,
    'transaction_id', v_tx_id,
    'transaction_seal', v_new_seal
  );
END;
$$;

-- 5. Backfill de Inicialização para Lojas Existentes
DO $$
DECLARE
  v_store RECORD;
BEGIN
  FOR v_store IN SELECT id FROM public.stores LOOP
    PERFORM public.ensure_store_token_wallet(v_store.id);
  END LOOP;
END;
$$;
