-- ============================================================================
-- Waesy Platform: Agendamentos Nativos via pg_cron e Telemetria de Rotina
-- Migration: 20261114000000_mining_pg_cron_schedules.sql
-- ============================================================================

-- 1. Habilitação tolerante e defensiva de extensões pg_cron e pg_net
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron não pode ser habilitado diretamente neste ambiente (requer superuser ou cloud dashboard). Prosseguindo com fallback de tabela mining_schedules.';
END $$;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net não pode ser habilitado diretamente neste ambiente. Prosseguindo com fallback de telemetria.';
END $$;

-- 2. Atualização dos Cron Expressions canônicos na tabela mining_schedules
UPDATE public.mining_schedules
SET 
  cron_expression = '0 8,18 * * *',
  description = 'Mineração das séries oficiais do Banco Central do Brasil (SGS): IPCA, SELIC, CDI, Câmbio PTAX e Atividade Econômica. Executado 2x ao dia às 08h e 18h.',
  updated_at = now()
WHERE job_type = 'market-data';

UPDATE public.mining_schedules
SET 
  cron_expression = '*/30 * * * *',
  description = 'Varredura, parsing e detecção incremental de novos artigos em feeds RSS/Atom municipais e regionais. Executado a cada 30 minutos.',
  updated_at = now()
WHERE job_type = 'rss-fetcher';

UPDATE public.mining_schedules
SET 
  cron_expression = '0 */2 * * *',
  description = 'Exploração contínua em profundidade de links na fila de crawling com heurísticas anti-bloqueio. Executado a cada 2 horas.',
  updated_at = now()
WHERE job_type = 'continuous-crawler';

UPDATE public.mining_schedules
SET 
  cron_expression = '0 2 * * *',
  description = 'Enriquecimento cadastral de empresas com dados oficiais da Receita Federal (QSA, CNAEs, Porte). Executado diariamente às 02h.',
  updated_at = now()
WHERE job_type = 'cnpj-enrichment';

-- 3. Stored Procedure Central para Despacho e Telemetria de Cron
CREATE OR REPLACE FUNCTION public.dispatch_mining_cron(p_job_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule RECORD;
  v_audit_id UUID;
BEGIN
  -- Verifica se o agendamento existe e está ativo
  SELECT * INTO v_schedule
  FROM public.mining_schedules
  WHERE job_type = p_job_type;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado: ' || p_job_type);
  END IF;

  IF NOT v_schedule.is_active THEN
    RETURN jsonb_build_object('success', false, 'message', 'Job desativado: ' || p_job_type);
  END IF;

  -- Atualiza o último ciclo de execução
  UPDATE public.mining_schedules
  SET 
    last_run_at = now(),
    updated_at = now()
  WHERE job_type = p_job_type;

  -- Registra telemetria do disparo em scraper_audit_log
  INSERT INTO public.scraper_audit_log (
    scraper_name,
    status,
    duration_ms,
    items_processed,
    items_inserted,
    metadata
  )
  VALUES (
    p_job_type || '-cron',
    'dispatched',
    0,
    0,
    0,
    jsonb_build_object(
      'source', 'pg_cron',
      'cron_expression', v_schedule.cron_expression,
      'triggered_at', now()
    )
  )
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_type', p_job_type,
    'audit_id', v_audit_id,
    'triggered_at', now()
  );
END;
$$;

-- 4. Agendamentos no pg_cron (se disponível)
DO $$
BEGIN
  -- Se pg_cron estiver ativo no schema extensions ou public
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove agendamentos antigos para evitar duplicações
    PERFORM cron.unschedule('mining_market_data_daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mining_market_data_daily');
    PERFORM cron.unschedule('mining_rss_fetcher_30m') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mining_rss_fetcher_30m');

    -- Registra novos agendamentos oficiais
    PERFORM cron.schedule('mining_market_data_daily', '0 8,18 * * *', 'SELECT public.dispatch_mining_cron(''market-data'');');
    PERFORM cron.schedule('mining_rss_fetcher_30m', '*/30 * * * *', 'SELECT public.dispatch_mining_cron(''rss-fetcher'');');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Não foi possível registrar cron.schedule diretamente nesta conexão. Os agendamentos permanecem salvos em mining_schedules.';
END $$;
