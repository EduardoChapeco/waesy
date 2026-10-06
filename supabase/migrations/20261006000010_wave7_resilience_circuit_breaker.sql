-- Onda 7: resiliência outbound por instância, circuit breaker e retransmissão segura.

CREATE TABLE IF NOT EXISTS public.whatsapp_provider_circuit_breakers (
  instance_id UUID PRIMARY KEY REFERENCES public.whatsapp_channel_instances(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  failure_threshold INTEGER NOT NULL DEFAULT 5 CHECK (failure_threshold BETWEEN 1 AND 20),
  cooldown_seconds INTEGER NOT NULL DEFAULT 60 CHECK (cooldown_seconds BETWEEN 10 AND 86400),
  opened_at TIMESTAMPTZ,
  next_probe_at TIMESTAMPTZ,
  half_open_owner TEXT,
  half_open_acquired_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message TEXT,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_circuit_store_state
  ON public.whatsapp_provider_circuit_breakers(store_id, state, updated_at DESC);

ALTER TABLE public.whatsapp_provider_circuit_breakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_provider_circuit_breakers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whatsapp_circuit_deny_client ON public.whatsapp_provider_circuit_breakers;
CREATE POLICY whatsapp_circuit_deny_client ON public.whatsapp_provider_circuit_breakers
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_provider_circuit_breakers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_provider_circuit_breakers;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.acquire_whatsapp_provider_circuit(
  p_instance_id UUID,
  p_worker_id TEXT
) RETURNS TABLE(allowed BOOLEAN, circuit_state TEXT, retry_after_seconds INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_breaker public.whatsapp_provider_circuit_breakers;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'whatsapp circuit breaker requires service_role';
  END IF;
  INSERT INTO public.whatsapp_provider_circuit_breakers (instance_id, store_id, provider)
  SELECT id, store_id, provider FROM public.whatsapp_channel_instances WHERE id = p_instance_id
  ON CONFLICT (instance_id) DO NOTHING;
  SELECT * INTO v_breaker FROM public.whatsapp_provider_circuit_breakers WHERE instance_id = p_instance_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'missing'::TEXT, 300;
    RETURN;
  END IF;
  IF v_breaker.state = 'closed' THEN
    RETURN QUERY SELECT true, 'closed'::TEXT, 0;
    RETURN;
  END IF;
  IF v_breaker.state = 'open' AND COALESCE(v_breaker.next_probe_at, now() + interval '1 day') <= now() THEN
    UPDATE public.whatsapp_provider_circuit_breakers SET state = 'half_open', half_open_owner = p_worker_id, half_open_acquired_at = now(), updated_at = now() WHERE instance_id = p_instance_id;
    RETURN QUERY SELECT true, 'half_open'::TEXT, 0;
    RETURN;
  END IF;
  IF v_breaker.state = 'half_open' AND v_breaker.half_open_owner = p_worker_id AND COALESCE(v_breaker.half_open_acquired_at, now()) >= now() - interval '5 minutes' THEN
    RETURN QUERY SELECT true, 'half_open'::TEXT, 0;
    RETURN;
  END IF;
  RETURN QUERY SELECT false, v_breaker.state, GREATEST(1, CEIL(EXTRACT(epoch FROM (COALESCE(v_breaker.next_probe_at, now() + interval '60 seconds') - now())))::INTEGER);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_whatsapp_provider_circuit_result(
  p_instance_id UUID,
  p_worker_id TEXT,
  p_success BOOLEAN,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
) RETURNS public.whatsapp_provider_circuit_breakers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_breaker public.whatsapp_provider_circuit_breakers;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'whatsapp circuit breaker requires service_role';
  END IF;
  SELECT * INTO v_breaker FROM public.whatsapp_provider_circuit_breakers WHERE instance_id = p_instance_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'circuit breaker not found'; END IF;
  IF p_success THEN
    UPDATE public.whatsapp_provider_circuit_breakers SET state = 'closed', consecutive_failures = 0, opened_at = NULL, next_probe_at = NULL, half_open_owner = NULL, half_open_acquired_at = NULL, last_success_at = now(), last_error_code = NULL, last_error_message = NULL, updated_at = now() WHERE instance_id = p_instance_id;
  ELSIF v_breaker.half_open_owner IS NULL OR v_breaker.half_open_owner = p_worker_id THEN
    UPDATE public.whatsapp_provider_circuit_breakers
    SET consecutive_failures = consecutive_failures + 1,
        state = CASE WHEN state = 'half_open' OR consecutive_failures + 1 >= failure_threshold THEN 'open' ELSE 'closed' END,
        opened_at = CASE WHEN state = 'half_open' OR consecutive_failures + 1 >= failure_threshold THEN now() ELSE opened_at END,
        next_probe_at = CASE WHEN state = 'half_open' OR consecutive_failures + 1 >= failure_threshold THEN now() + make_interval(secs => cooldown_seconds) ELSE next_probe_at END,
        half_open_owner = NULL, half_open_acquired_at = NULL, last_error_code = p_error_code, last_error_message = left(p_error_message, 1000), last_failure_at = now(), updated_at = now()
    WHERE instance_id = p_instance_id;
  END IF;
  SELECT * INTO v_breaker FROM public.whatsapp_provider_circuit_breakers WHERE instance_id = p_instance_id;
  RETURN v_breaker;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_whatsapp_provider_circuit(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_whatsapp_provider_circuit_result(UUID, TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_whatsapp_provider_circuit(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_whatsapp_provider_circuit_result(UUID, TEXT, BOOLEAN, TEXT, TEXT) TO service_role;

COMMENT ON TABLE public.whatsapp_provider_circuit_breakers IS 'Estado persistente e isolado por instância do circuit breaker outbound WhatsApp.';
