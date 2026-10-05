-- ============================================================================
-- Waesy Platform: Industrialização de Crawlers, pg_net Dispatch & Indicadores
-- Migration: 20261231120000_industrialize_mining_cron_and_net.sql
-- ============================================================================

-- 1. Tabela canônica de Indicadores Econômicos e Financeiros Reais
CREATE TABLE IF NOT EXISTS public.economic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'economic',
  unit TEXT NOT NULL DEFAULT '%',
  current_value NUMERIC NOT NULL,
  previous_value NUMERIC,
  variation_percent NUMERIC,
  reference_date DATE NOT NULL,
  time_series JSONB DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'bcb_sgs',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_economic_indicators_code ON public.economic_indicators(code);
CREATE INDEX IF NOT EXISTS idx_economic_indicators_type ON public.economic_indicators(type);

ALTER TABLE public.economic_indicators ENABLE ROW LEVEL SECURITY;

-- Política de leitura irrestrita para vitrines públicas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'economic_indicators' AND policyname = 'economic_indicators_public_read'
  ) THEN
    CREATE POLICY economic_indicators_public_read ON public.economic_indicators
      FOR SELECT USING (true);
  END IF;
END $$;

-- 2. Garantir extensão pg_net habilitada
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

-- 3. Stored Procedure Industrializada com Despacho Real via pg_net
CREATE OR REPLACE FUNCTION public.dispatch_mining_cron(p_job_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule RECORD;
  v_audit_id UUID;
  v_request_id BIGINT;
  v_app_url TEXT := 'https://usewaesy.pages.dev';
  v_cron_token TEXT := 'waesy_omni_cron_key_v2026';
BEGIN
  -- 1. Valida se o agendamento existe e está ativo
  SELECT * INTO v_schedule
  FROM public.mining_schedules
  WHERE job_type = p_job_type;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado: ' || p_job_type);
  END IF;

  IF NOT v_schedule.is_active THEN
    RETURN jsonb_build_object('success', false, 'message', 'Job desativado: ' || p_job_type);
  END IF;

  -- 2. Atualiza timestamp de execução na tabela de agendamentos
  UPDATE public.mining_schedules
  SET 
    last_run_at = now(),
    updated_at = now()
  WHERE job_type = p_job_type;

  -- 3. Despacha requisição HTTP assíncrona real via extensão pg_net
  BEGIN
    SELECT net.http_post(
      url := v_app_url || '/api/cron/mining-worker',
      body := jsonb_build_object(
        'jobType', p_job_type,
        'triggeredAt', now(),
        'source', 'pg_cron_pg_net'
      ),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_cron_token,
        'X-Waesy-Cron-Source', 'supabase_pg_cron'
      ),
      timeout_milliseconds := 25000
    ) INTO v_request_id;
  EXCEPTION WHEN OTHERS THEN
    v_request_id := NULL;
  END;

  -- 4. Registra auditoria com o ID da requisição de rede do pg_net
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
    'dispatched_network',
    0,
    0,
    0,
    jsonb_build_object(
      'source', 'pg_cron_pg_net',
      'net_request_id', v_request_id,
      'cron_expression', v_schedule.cron_expression,
      'triggered_at', now()
    )
  )
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_type', p_job_type,
    'net_request_id', v_request_id,
    'audit_id', v_audit_id,
    'triggered_at', now()
  );
END;
$$;
