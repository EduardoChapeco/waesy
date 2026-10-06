-- Onda 3: telemetria operacional real, heartbeat de worker e métricas realtime.

CREATE TABLE IF NOT EXISTS public.whatsapp_worker_heartbeats (
  worker_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'starting' CHECK (status IN ('starting','running','degraded','idle','failed')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at TIMESTAMPTZ,
  last_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_worker_heartbeats_seen ON public.whatsapp_worker_heartbeats(last_seen_at DESC);
ALTER TABLE public.whatsapp_worker_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_worker_heartbeats FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whatsapp_worker_heartbeats_staff_select ON public.whatsapp_worker_heartbeats;
CREATE POLICY whatsapp_worker_heartbeats_staff_select ON public.whatsapp_worker_heartbeats FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.profile_id = auth.uid() AND wm.role IN ('owner','admin','manager','platform_admin','master'))
);
DROP POLICY IF EXISTS whatsapp_worker_heartbeats_client_insert ON public.whatsapp_worker_heartbeats;
DROP POLICY IF EXISTS whatsapp_worker_heartbeats_client_update ON public.whatsapp_worker_heartbeats;
DROP POLICY IF EXISTS whatsapp_worker_heartbeats_client_delete ON public.whatsapp_worker_heartbeats;
CREATE POLICY whatsapp_worker_heartbeats_client_insert ON public.whatsapp_worker_heartbeats FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY whatsapp_worker_heartbeats_client_update ON public.whatsapp_worker_heartbeats FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY whatsapp_worker_heartbeats_client_delete ON public.whatsapp_worker_heartbeats FOR DELETE TO anon, authenticated USING (false);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_outbox_attempts') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_outbox_attempts;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_worker_heartbeats') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_worker_heartbeats;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_whatsapp_operations_metrics(p_store_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_store UUID := p_store_id; v_result JSONB;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    SELECT wm.store_id INTO v_store FROM public.workspace_members wm WHERE wm.profile_id = auth.uid() AND (p_store_id IS NULL OR wm.store_id = p_store_id) ORDER BY wm.store_id LIMIT 1;
    IF v_store IS NULL THEN RAISE EXCEPTION 'store access denied'; END IF;
  END IF;
  SELECT jsonb_build_object(
    'store_id', v_store,
    'queue', jsonb_build_object(
      'pending', (SELECT count(*) FROM whatsapp_outbox WHERE store_id = v_store AND status = 'pending'),
      'processing', (SELECT count(*) FROM whatsapp_outbox WHERE store_id = v_store AND status = 'processing'),
      'failed', (SELECT count(*) FROM whatsapp_outbox WHERE store_id = v_store AND status = 'failed'),
      'dead_letter', (SELECT count(*) FROM whatsapp_outbox WHERE store_id = v_store AND status = 'dead_letter'),
      'accepted_24h', (SELECT count(*) FROM whatsapp_outbox WHERE store_id = v_store AND status IN ('accepted','sent') AND updated_at >= now() - interval '24 hours'),
      'oldest_pending_seconds', COALESCE((SELECT EXTRACT(epoch FROM (now() - min(created_at)))::integer FROM whatsapp_outbox WHERE store_id = v_store AND status IN ('pending','processing','failed')), 0),
      'retryable_failures_24h', (SELECT count(*) FROM whatsapp_outbox_attempts WHERE store_id = v_store AND outcome = 'retryable_failure' AND created_at >= now() - interval '24 hours'),
      'p95_latency_ms_24h', COALESCE((SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) FROM whatsapp_outbox_attempts WHERE store_id = v_store AND duration_ms IS NOT NULL AND created_at >= now() - interval '24 hours'), 0),
      'throughput_24h', (SELECT count(*) FROM whatsapp_outbox_attempts WHERE store_id = v_store AND outcome = 'accepted' AND created_at >= now() - interval '24 hours')
    ),
    'conversations', jsonb_build_object(
      'open', (SELECT count(*) FROM chat_threads WHERE store_id = v_store AND status = 'open'),
      'unassigned', (SELECT count(*) FROM chat_threads WHERE store_id = v_store AND status = 'open' AND assigned_to_profile_id IS NULL),
      'first_response_avg_seconds', COALESCE((SELECT avg(EXTRACT(epoch FROM (first_response_at - created_at))) FROM chat_threads WHERE store_id = v_store AND first_response_at IS NOT NULL AND created_at >= now() - interval '24 hours'), 0),
      'first_response_p95_seconds', COALESCE((SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM (first_response_at - created_at))) FROM chat_threads WHERE store_id = v_store AND first_response_at IS NOT NULL AND created_at >= now() - interval '24 hours'), 0)
    ),
    'agents', COALESCE((SELECT jsonb_agg(x) FROM (SELECT assigned_to_profile_id AS profile_id, count(*) FILTER (WHERE status = 'open') AS open_threads, count(*) AS total_threads, avg(EXTRACT(epoch FROM (first_response_at - created_at))) FILTER (WHERE first_response_at IS NOT NULL) AS avg_first_response_seconds, count(*) FILTER (WHERE first_response_at IS NOT NULL) AS responded_threads FROM chat_threads WHERE store_id = v_store AND assigned_to_profile_id IS NOT NULL GROUP BY assigned_to_profile_id ORDER BY open_threads DESC) x), '[]'::jsonb),
    'providers', COALESCE((SELECT jsonb_agg(y) FROM (SELECT provider, count(*) AS attempts, count(*) FILTER (WHERE outcome = 'accepted') AS accepted, count(*) FILTER (WHERE outcome IN ('retryable_failure','permanent_failure','dead_letter')) AS failures, avg(duration_ms) AS avg_duration_ms, percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration_ms FROM whatsapp_outbox_attempts WHERE store_id = v_store AND created_at >= now() - interval '24 hours' GROUP BY provider ORDER BY attempts DESC) y), '[]'::jsonb),
    'health', jsonb_build_object(
      'worker_status', COALESCE((SELECT CASE WHEN last_seen_at < now() - interval '5 minutes' THEN 'stale' ELSE status END FROM whatsapp_worker_heartbeats ORDER BY last_seen_at DESC LIMIT 1), 'unknown'),
      'worker_last_seen_at', (SELECT last_seen_at FROM whatsapp_worker_heartbeats ORDER BY last_seen_at DESC LIMIT 1),
      'worker_last_run_at', (SELECT last_run_at FROM whatsapp_worker_heartbeats ORDER BY last_run_at DESC LIMIT 1),
      'worker_count', (SELECT count(*) FROM whatsapp_worker_heartbeats WHERE last_seen_at >= now() - interval '5 minutes'),
      'generated_at', now()
    ),
    'generated_at', now()
  ) INTO v_result;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.get_whatsapp_operations_metrics(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_operations_metrics(UUID) TO authenticated, service_role;

COMMENT ON TABLE public.whatsapp_worker_heartbeats IS 'Heartbeat persistido dos workers WhatsApp; usado para health real e não para simulação de disponibilidade.';
COMMENT ON FUNCTION public.get_whatsapp_operations_metrics(UUID) IS 'Métricas operacionais reais tenant-scoped de fila, latência, retries, atendentes, providers e heartbeat.';
