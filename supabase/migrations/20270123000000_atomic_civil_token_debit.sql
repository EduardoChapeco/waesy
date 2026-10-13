-- W2/W4 — Débito civil transacional, idempotente e auditável.
-- Depende de user_daily_token_quotas, user_token_wallets e audit_logs.
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_token_debit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  requested_tokens BIGINT NOT NULL CHECK (requested_tokens > 0),
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

ALTER TABLE public.user_token_debit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_token_debit_ledger_service_only ON public.user_token_debit_ledger;
CREATE POLICY user_token_debit_ledger_service_only
  ON public.user_token_debit_ledger FOR ALL TO service_role
  USING (true) WITH CHECK (true);
REVOKE ALL ON public.user_token_debit_ledger FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.user_token_debit_ledger TO service_role;

CREATE OR REPLACE FUNCTION public.consume_user_civil_tokens_atomic(
  p_user_id UUID,
  p_operation TEXT,
  p_amount BIGINT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_quota public.user_daily_token_quotas%ROWTYPE;
  v_wallet public.user_token_wallets%ROWTYPE;
  v_date DATE := (now() AT TIME ZONE 'utc')::DATE;
  v_quota_available BIGINT;
  v_from_quota BIGINT;
  v_from_extra BIGINT;
  v_result JSONB;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'token debit requires service_role';
  END IF;
  IF p_user_id IS NULL OR COALESCE(trim(p_operation), '') = '' THEN
    RAISE EXCEPTION 'user and operation are required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000000 THEN
    RAISE EXCEPTION 'token amount is outside the permitted range';
  END IF;
  IF COALESCE(trim(p_idempotency_key), '') = '' OR length(p_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'idempotency key is required';
  END IF;

  -- A quota row is the per-user lock that serializes concurrent debits.
  INSERT INTO public.user_daily_token_quotas(user_id, quota_date, used_tokens)
  VALUES (p_user_id, v_date, 0)
  ON CONFLICT (user_id, quota_date) DO NOTHING;

  SELECT * INTO v_quota
    FROM public.user_daily_token_quotas
   WHERE user_id = p_user_id AND quota_date = v_date
   FOR UPDATE;

  SELECT result INTO v_result
    FROM public.user_token_debit_ledger
   WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_result || jsonb_build_object('idempotent', true);
  END IF;

  SELECT * INTO v_wallet
    FROM public.user_token_wallets
   WHERE user_id = p_user_id
   FOR UPDATE;

  v_quota_available := GREATEST(0, 100000 - COALESCE(v_quota.used_tokens, 0));
  v_from_quota := LEAST(v_quota_available, p_amount);
  v_from_extra := p_amount - v_from_quota;

  IF v_from_extra > 0 AND (v_wallet.id IS NULL OR COALESCE(v_wallet.balance, 0) < v_from_extra) THEN
    RAISE EXCEPTION 'insufficient token quota';
  END IF;

  IF v_from_extra > 0 THEN
    UPDATE public.user_token_wallets
       SET balance = balance - v_from_extra,
           lifetime_redeemed = lifetime_redeemed + v_from_extra,
           updated_at = now()
     WHERE id = v_wallet.id;
  END IF;

  UPDATE public.user_daily_token_quotas
     SET used_tokens = used_tokens + v_from_quota,
         updated_at = now()
   WHERE id = v_quota.id;

  v_result := jsonb_build_object(
    'success', true,
    'idempotent', false,
    'debited', p_amount,
    'fromQuota', v_from_quota,
    'fromExtra', v_from_extra,
    'remainingDaily', GREATEST(0, 100000 - (v_quota.used_tokens + v_from_quota))
  );

  INSERT INTO public.user_token_debit_ledger(user_id, idempotency_key, operation, requested_tokens, result)
  VALUES (p_user_id, p_idempotency_key, p_operation, p_amount, v_result);

  INSERT INTO public.audit_logs(user_id, entity_type, action, payload_snapshot, created_at)
  VALUES (
    p_user_id,
    'user_token_consumption',
    'token_debit:' || p_operation,
    jsonb_build_object(
      'operation', p_operation,
      'amount_total', p_amount,
      'debited_quota', v_from_quota,
      'debited_extra', v_from_extra,
      'idempotency_key', p_idempotency_key,
      'metadata', COALESCE(p_metadata, '{}'::JSONB),
      'timestamp', now()
    ),
    now()
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_user_civil_tokens_atomic(UUID, TEXT, BIGINT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_user_civil_tokens_atomic(UUID, TEXT, BIGINT, TEXT, JSONB) TO service_role;

COMMIT;
