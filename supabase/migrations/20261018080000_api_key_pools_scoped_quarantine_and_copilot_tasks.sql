-- ============================================================================
-- Migration: 20261018080000_api_key_pools_scoped_quarantine_and_copilot_tasks.sql
-- Purpose:
--   1. Add scoped quota quarantine columns to public.api_key_pools:
--      - quarantine_until (timestamptz)
--      - quarantine_scope ('minute' | 'day' | 'month' | 'permanent')
--      - quarantine_reason (text)
--      - monthly_request_count (integer)
--      - last_daily_reset_date (date)
--      - last_monthly_reset_month (text)
--   2. Add composite B-Tree index for sub-2ms key selection across 1,000,000+ keys.
--   3. Create atomic RPC public.claim_healthy_api_keys_for_provider to auto-expire
--      quarantines and auto-reset daily/monthly counters on read.
-- ============================================================================

BEGIN;

ALTER TABLE IF EXISTS public.api_key_pools
  ADD COLUMN IF NOT EXISTS quarantine_until timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quarantine_scope text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quarantine_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monthly_request_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_daily_reset_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS last_monthly_reset_month text NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'api_key_pools_quarantine_scope_check'
  ) THEN
    ALTER TABLE public.api_key_pools
      ADD CONSTRAINT api_key_pools_quarantine_scope_check
      CHECK (quarantine_scope IS NULL OR quarantine_scope IN ('minute', 'day', 'month', 'permanent'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_api_key_pools_healthy_rotation
  ON public.api_key_pools (
    provider,
    is_active,
    quarantine_until,
    priority ASC,
    daily_request_count ASC,
    last_used_at ASC NULLS FIRST
  );

CREATE OR REPLACE FUNCTION public.claim_healthy_api_keys_for_provider(
  p_provider text,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  provider text,
  label text,
  encrypted_key text,
  masked_key text,
  priority integer,
  daily_request_count integer,
  monthly_request_count integer,
  last_used_at timestamptz,
  quarantine_until timestamptz,
  quarantine_scope text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_month text := to_char(CURRENT_DATE, 'YYYY-MM');
  v_now timestamptz := now();
BEGIN
  -- 1. Liberar automaticamente chaves cuja janela de quarentena temporal já expirou
  UPDATE public.api_key_pools akp
  SET
    quarantine_until = NULL,
    quarantine_scope = NULL,
    quarantine_reason = NULL,
    daily_request_count = CASE
      WHEN akp.last_daily_reset_date < v_today THEN 0
      ELSE akp.daily_request_count
    END,
    monthly_request_count = CASE
      WHEN akp.last_monthly_reset_month <> v_month THEN 0
      ELSE akp.monthly_request_count
    END,
    last_daily_reset_date = v_today,
    last_monthly_reset_month = v_month,
    updated_at = v_now
  WHERE akp.provider = p_provider
    AND akp.is_active = true
    AND (
      (akp.quarantine_until IS NOT NULL AND akp.quarantine_until <= v_now)
      OR akp.last_daily_reset_date < v_today
      OR akp.last_monthly_reset_month <> v_month
    );

  -- 2. Retornar lote de chaves saudáveis fora de quarentena ordenadas por prioridade e menor desgaste
  RETURN QUERY
  SELECT
    akp.id,
    akp.provider,
    akp.label,
    akp.encrypted_key,
    akp.masked_key,
    akp.priority,
    akp.daily_request_count,
    akp.monthly_request_count,
    akp.last_used_at,
    akp.quarantine_until,
    akp.quarantine_scope
  FROM public.api_key_pools akp
  WHERE akp.provider = p_provider
    AND akp.is_active = true
    AND (akp.quarantine_until IS NULL OR akp.quarantine_until <= v_now)
  ORDER BY
    akp.priority ASC,
    akp.daily_request_count ASC,
    akp.last_used_at ASC NULLS FIRST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_healthy_api_keys_for_provider(text, integer) TO authenticated, service_role;

COMMIT;
