-- Migration additive: Realtime nas execucoes e passos do Copilot + helper cron pg_net
-- Nao altera cron jobs existentes de mineracao e respeita RLS multi-tenant existente.

DO $$
DECLARE
  tbl TEXT;
  target_tables TEXT[] := ARRAY[
    'copilot_executions',
    'copilot_execution_steps'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY target_tables LOOP
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = tbl
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;
    END LOOP;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_copilot_executions_paused_resume
  ON public.copilot_executions (status, current_phase, updated_at ASC)
  WHERE status = 'paused' AND current_phase = 'PARTIAL_RESULT';

CREATE OR REPLACE FUNCTION public.dispatch_copilot_cron(
  p_endpoint TEXT,
  p_app_url TEXT DEFAULT 'https://usewaesy.pages.dev',
  p_cron_token TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_request_id BIGINT;
  v_clean_path TEXT;
BEGIN
  IF p_endpoint NOT IN ('/api/cron/ai-tasks', '/api/cron/ai-jobs', '/api/cron/ai-scheduled-tasks') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Endpoint cron não permitido.');
  END IF;

  IF p_cron_token IS NULL OR length(trim(p_cron_token)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token cron ausente.');
  END IF;

  v_clean_path := p_app_url || p_endpoint;

  SELECT net.http_post(
    url := v_clean_path,
    body := jsonb_build_object('source', 'supabase_pg_cron', 'triggeredAt', now()),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || p_cron_token
    ),
    timeout_milliseconds := 25000
  ) INTO v_request_id;

  RETURN jsonb_build_object('success', true, 'requestId', v_request_id, 'endpoint', p_endpoint);
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_copilot_cron(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispatch_copilot_cron(TEXT, TEXT, TEXT) TO service_role;
