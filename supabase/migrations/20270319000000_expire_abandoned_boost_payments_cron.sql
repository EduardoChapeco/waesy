-- ============================================================================
-- Waesy Platform: Expiração Automática de Checkouts de Boost Abandonados
-- Migration: 20270319000000_expire_abandoned_boost_payments_cron.sql
-- ============================================================================

-- 1. Função PL/pgSQL para expirar checkouts de boost e promoções pendentes (> 24h ou após expires_at)
CREATE OR REPLACE FUNCTION public.expire_abandoned_classified_boost_payments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired_count integer := 0;
BEGIN
  WITH expired_rows AS (
    UPDATE public.classified_boost_payments
    SET 
      status = 'expired',
      failure_reason = 'checkout_abandoned_timeout_24h'
    WHERE 
      status = 'pending'
      AND (
        (expires_at IS NOT NULL AND expires_at < now())
        OR created_at < (now() - interval '24 hours')
      )
    RETURNING id
  )
  SELECT count(*) INTO v_expired_count FROM expired_rows;

  RETURN v_expired_count;
END;
$$;

-- 2. Concessão de permissões de execução
REVOKE ALL ON FUNCTION public.expire_abandoned_classified_boost_payments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_abandoned_classified_boost_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_abandoned_classified_boost_payments() TO service_role;

-- 3. Agendamento do Cron via pg_cron (se disponível no ambiente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Executa a cada hora para limpeza contínua de checkouts abandonados
    PERFORM cron.schedule(
      'expire-abandoned-boost-payments',
      '0 * * * *',
      'SELECT public.expire_abandoned_classified_boost_payments();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron indisponível ou permissões insuficientes. Execução será realizada pelo BFF e triggers.';
END $$;
