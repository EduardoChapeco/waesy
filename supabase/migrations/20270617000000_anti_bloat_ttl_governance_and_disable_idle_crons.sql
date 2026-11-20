-- Migration: 20270617000000_anti_bloat_ttl_governance_and_disable_idle_crons.sql
-- Phase 2 & Phase 7 (EARS-RES-01, EARS-RES-02):
-- 1. Unschedules autonomous background pg_cron jobs that saturate /data & pg_wal
-- 2. Disables autonomous mining_schedules by default (manual on-demand only)
-- 3. Installs canonical TTL + row-cap retention function public.purge_transient_bloat()
-- 4. Installs lightweight DB-level payload capping trigger on public.system_error_logs

-- 1. Desativar cron jobs autônomos recorrentes no pg_cron (EARS-RES-01)
DO $$
DECLARE
  v_job RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND to_regclass('cron.job') IS NOT NULL THEN
    FOR v_job IN
      SELECT jobid, jobname
      FROM cron.job
      WHERE jobname IN (
        'waesy_whatsapp_realtime_sync_1m',
        'waesy_whatsapp_realtime_sync_5m',
        'mining_rss_fetcher_30m',
        'mining_market_data_daily',
        'mining_continuous_crawler_15m',
        'mining_cnpj_enrichment_daily'
      )
         OR command ILIKE '%dispatch_mining_cron%'
         OR command ILIKE '%dispatch_whatsapp_sync_cron%'
    LOOP
      BEGIN
        PERFORM cron.unschedule(v_job.jobid);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Falha ao desagendar job % (%): %', v_job.jobname, v_job.jobid, SQLERRM;
      END;
    END LOOP;
  END IF;
END $$;

-- 2. Pausar agendamentos de mineração autônomos (somente disparo manual autenticado)
DO $$
BEGIN
  IF to_regclass('public.mining_schedules') IS NOT NULL THEN
    UPDATE public.mining_schedules
    SET is_active = false,
        updated_at = now()
    WHERE is_active = true;
  END IF;
END $$;

-- 3. Função canônica de governança anti-bloat com TTL curto e teto de linhas (EARS-RES-02)
CREATE OR REPLACE FUNCTION public.purge_transient_bloat(
  p_retention_days integer DEFAULT 3,
  p_max_rows integer DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_days integer := GREATEST(1, LEAST(COALESCE(p_retention_days, 3), 30));
  v_cap integer := GREATEST(100, LEAST(COALESCE(p_max_rows, 5000), 50000));
  v_deleted integer := 0;
  v_total_deleted integer := 0;
  v_report jsonb := '{}'::jsonb;
  v_tbl text;
  v_time_col text;
  v_targets text[][] := ARRAY[
    ARRAY['public.system_error_logs', 'created_at'],
    ARRAY['public.system_audit_logs', 'created_at'],
    ARRAY['public.scraper_audit_log', 'created_at'],
    ARRAY['public.telemetry_logs', 'created_at'],
    ARRAY['public.ai_telemetry_logs', 'created_at'],
    ARRAY['public.ad_telemetry_events', 'created_at'],
    ARRAY['public.pixel_dispatch_log', 'created_at'],
    ARRAY['public.builder_analytics_events', 'created_at'],
    ARRAY['public.session_audit_logs', 'created_at'],
    ARRAY['public.security_audit_events', 'created_at']
  ];
  v_idx integer;
BEGIN
  -- 3.1 Limpar histórico do pg_cron (cron.job_run_details)
  IF to_regclass('cron.job_run_details') IS NOT NULL THEN
    EXECUTE format(
      'DELETE FROM cron.job_run_details WHERE start_time < now() - (%s || '' days'')::interval',
      v_days
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted;
    v_report := v_report || jsonb_build_object('cron.job_run_details', v_deleted);
  END IF;

  -- 3.2 Limpar respostas HTTP acumuladas pelo pg_net (net._http_response)
  IF to_regclass('net._http_response') IS NOT NULL THEN
    EXECUTE 'DELETE FROM net._http_response WHERE created < now() - interval ''1 day''';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted;
    v_report := v_report || jsonb_build_object('net._http_response', v_deleted);
  END IF;

  -- 3.3 Aplicar TTL curto e teto máximo de linhas nas tabelas de log/telemetria públicas
  FOR v_idx IN 1..array_length(v_targets, 1) LOOP
    v_tbl := v_targets[v_idx][1];
    v_time_col := v_targets[v_idx][2];
    IF to_regclass(v_tbl) IS NOT NULL THEN
      BEGIN
        EXECUTE format(
          'DELETE FROM %s WHERE %I < now() - (%s || '' days'')::interval',
          v_tbl,
          v_time_col,
          v_days
        );
        GET DIAGNOSTICS v_deleted = ROW_COUNT;

        EXECUTE format(
          'DELETE FROM %s WHERE ctid IN (SELECT ctid FROM %s ORDER BY %I DESC OFFSET %s)',
          v_tbl,
          v_tbl,
          v_time_col,
          v_cap
        );
        v_total_deleted := v_total_deleted + v_deleted;
        v_report := v_report || jsonb_build_object(v_tbl, v_deleted);
      EXCEPTION WHEN OTHERS THEN
        v_report := v_report || jsonb_build_object(v_tbl, SQLERRM);
      END;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'retention_days', v_days,
    'max_rows_cap', v_cap,
    'total_deleted', v_total_deleted,
    'details', v_report,
    'executed_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_transient_bloat(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_transient_bloat(integer, integer) TO service_role;

-- 4. Guard-rail de payload na camada SQL para system_error_logs (impede bloat mesmo de clientes antigos)
CREATE OR REPLACE FUNCTION public.cap_system_error_log_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.error_message IS NOT NULL AND length(NEW.error_message) > 1024 THEN
    NEW.error_message := left(NEW.error_message, 1024);
  END IF;
  IF NEW.stack_trace IS NOT NULL AND length(NEW.stack_trace) > 2048 THEN
    NEW.stack_trace := left(NEW.stack_trace, 2048);
  END IF;
  IF NEW.page_url IS NOT NULL AND length(NEW.page_url) > 500 THEN
    NEW.page_url := left(NEW.page_url, 500);
  END IF;
  IF NEW.payload IS NOT NULL AND length(NEW.payload::text) > 2048 THEN
    NEW.payload := jsonb_build_object(
      '_truncated_by_db_guard', true,
      '_original_bytes', length(NEW.payload::text),
      'preview', left(NEW.payload::text, 1024)
    );
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.system_error_logs') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_cap_system_error_log_row ON public.system_error_logs;
    CREATE TRIGGER trg_cap_system_error_log_row
      BEFORE INSERT OR UPDATE ON public.system_error_logs
      FOR EACH ROW
      EXECUTE FUNCTION public.cap_system_error_log_row();
  END IF;
END $$;
