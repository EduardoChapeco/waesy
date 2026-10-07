-- W9.3 — ciclo de vida de jobs AI/mídia e cobrança idempotente.
BEGIN;

ALTER TABLE public.ai_async_jobs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS timeout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_requested BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS worker_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_job_id TEXT,
  ADD COLUMN IF NOT EXISTS quota_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_charged BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_async_jobs_store_idempotency
  ON public.ai_async_jobs(store_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_async_jobs_claimable
  ON public.ai_async_jobs(status, timeout_at, created_at)
  WHERE status IN ('queued', 'processing', 'failed');

CREATE TABLE IF NOT EXISTS public.ai_job_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.ai_async_jobs(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  tokens INTEGER NOT NULL CHECK (tokens > 0),
  service_category TEXT NOT NULL DEFAULT 'heavy_ia_llm',
  ledger_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_job_charges ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_ai_async_job(
  p_worker_id TEXT,
  p_timeout_seconds INTEGER DEFAULT 120
)
RETURNS SETOF public.ai_async_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT id FROM public.ai_async_jobs
     WHERE status = 'queued'
       AND cancel_requested = false
       AND (timeout_at IS NULL OR timeout_at < now())
       AND attempt_count < max_attempts
     ORDER BY created_at
     FOR UPDATE SKIP LOCKED
     LIMIT 1
  )
  UPDATE public.ai_async_jobs j
     SET status = 'processing', worker_id = p_worker_id,
         attempt_count = j.attempt_count + 1,
         started_at = COALESCE(j.started_at, now()),
         timeout_at = now() + make_interval(secs => GREATEST(p_timeout_seconds, 10)),
         progress_percent = GREATEST(j.progress_percent, 1), updated_at = now()
    FROM candidate c
   WHERE j.id = c.id
  RETURNING j.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_cancel_ai_async_job(
  p_job_id UUID,
  p_user_id UUID,
  p_store_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_job public.ai_async_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_job FROM public.ai_async_jobs
   WHERE id = p_job_id AND user_id = p_user_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job não encontrado ou fora do tenant'; END IF;
  IF v_job.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('status', v_job.status, 'job_id', v_job.id, 'idempotent', true);
  END IF;
  UPDATE public.ai_async_jobs SET cancel_requested = true, status = CASE WHEN status = 'queued' THEN 'cancelled' ELSE status END, updated_at = now() WHERE id = v_job.id;
  RETURN jsonb_build_object('status', CASE WHEN v_job.status = 'queued' THEN 'cancelled' ELSE 'cancellation_requested' END, 'job_id', v_job.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.retry_ai_async_job(
  p_job_id UUID,
  p_user_id UUID,
  p_store_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_job public.ai_async_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_job FROM public.ai_async_jobs
   WHERE id = p_job_id AND user_id = p_user_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job não encontrado ou fora do tenant'; END IF;
  IF v_job.status NOT IN ('failed', 'failed_retryable') OR v_job.attempt_count >= v_job.max_attempts THEN
    RAISE EXCEPTION 'job não pode ser recuperado no estado atual';
  END IF;
  UPDATE public.ai_async_jobs SET status = 'queued', cancel_requested = false, timeout_at = NULL, error_message = NULL, progress_percent = 0, updated_at = now() WHERE id = v_job.id;
  RETURN jsonb_build_object('status', 'queued', 'job_id', v_job.id, 'attempt_count', v_job.attempt_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_ai_async_job(
  p_job_id UUID,
  p_store_id UUID,
  p_result JSONB DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_job public.ai_async_jobs%ROWTYPE; v_charge JSONB;
BEGIN
  SELECT * INTO v_job FROM public.ai_async_jobs WHERE id = p_job_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job não encontrado ou fora do tenant'; END IF;
  IF v_job.status = 'completed' THEN RETURN jsonb_build_object('status', 'completed', 'job_id', v_job.id, 'idempotent', true); END IF;
  IF v_job.cancel_requested OR v_job.status = 'cancelled' THEN
    UPDATE public.ai_async_jobs SET status = 'cancelled', finished_at = now(), updated_at = now() WHERE id = v_job.id;
    RETURN jsonb_build_object('status', 'cancelled', 'job_id', v_job.id);
  END IF;
  IF p_success THEN
    IF v_job.quota_tokens > 0 AND NOT v_job.quota_charged THEN
      INSERT INTO public.ai_job_charges(job_id, store_id, tokens) VALUES (v_job.id, v_job.store_id, v_job.quota_tokens) ON CONFLICT (job_id) DO NOTHING;
      SELECT public.consume_store_tokens_scoped(v_job.store_id, v_job.quota_tokens, 'heavy_ia_llm', 'Cobrança de job AI concluído', jsonb_build_object('job_id', v_job.id)) INTO v_charge;
      IF COALESCE((v_charge->>'success')::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'quota insuficiente para concluir job'; END IF;
    END IF;
    UPDATE public.ai_async_jobs SET status = 'completed', result = p_result, quota_charged = (v_job.quota_tokens = 0 OR true), progress_percent = 100, finished_at = now(), updated_at = now() WHERE id = v_job.id;
    RETURN jsonb_build_object('status', 'completed', 'job_id', v_job.id, 'quota_charged', (v_job.quota_tokens > 0));
  END IF;
  UPDATE public.ai_async_jobs SET status = CASE WHEN attempt_count < max_attempts THEN 'failed_retryable' ELSE 'failed' END, error_message = p_error_message, updated_at = now() WHERE id = v_job.id;
  RETURN jsonb_build_object('status', CASE WHEN v_job.attempt_count < v_job.max_attempts THEN 'failed_retryable' ELSE 'failed' END, 'job_id', v_job.id);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ai_async_job(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_cancel_ai_async_job(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.retry_ai_async_job(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_ai_async_job(UUID, UUID, JSONB, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_ai_async_job(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_cancel_ai_async_job(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.retry_ai_async_job(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_ai_async_job(UUID, UUID, JSONB, BOOLEAN, TEXT) TO service_role;

COMMIT;
