-- WhatsApp worker + multi-instância/multi-provedor.
-- O worker deve ser executado server-side com service_role.

ALTER TABLE public.whatsapp_outbox
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 8;

ALTER TABLE public.whatsapp_outbox DROP CONSTRAINT IF EXISTS whatsapp_outbox_status_check;
ALTER TABLE public.whatsapp_outbox
  ADD CONSTRAINT whatsapp_outbox_status_check CHECK (
    status IN ('pending', 'processing', 'accepted', 'sent', 'failed', 'dead_letter', 'cancelled')
  );

ALTER TABLE public.whatsapp_outbox
  ADD CONSTRAINT whatsapp_outbox_attempts_valid CHECK (attempts >= 0 AND attempts <= max_attempts),
  ADD CONSTRAINT whatsapp_outbox_max_attempts_valid CHECK (max_attempts BETWEEN 1 AND 20);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_claimable
  ON public.whatsapp_outbox (next_attempt_at, created_at)
  WHERE status IN ('pending', 'failed', 'processing');

CREATE TABLE IF NOT EXISTS public.whatsapp_outbox_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id UUID NOT NULL REFERENCES public.whatsapp_outbox(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('accepted', 'retryable_failure', 'permanent_failure', 'dead_letter', 'skipped')),
  provider TEXT NOT NULL,
  http_status INTEGER,
  external_message_id TEXT,
  error_code TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_attempts_outbox
  ON public.whatsapp_outbox_attempts (outbox_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_attempts_store
  ON public.whatsapp_outbox_attempts (store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_channel_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('meta_cloud_api', 'evolution_api', 'wasender_api', 'render_bridge', 'custom_webhook')),
  connection_mode TEXT NOT NULL CHECK (connection_mode IN ('official', 'unofficial')),
  instance_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'connected', 'degraded', 'disconnected', 'disabled', 'error')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  phone_number_id TEXT,
  business_account_id TEXT,
  display_phone_number TEXT,
  external_instance_id TEXT,
  webhook_url TEXT,
  public_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_payload_encrypted TEXT,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  health_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_health_check_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, instance_key),
  CHECK (connection_mode = 'official' OR provider <> 'meta_cloud_api'),
  CHECK (is_default = false OR is_active = true)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_default_instance_per_store
  ON public.whatsapp_channel_instances (store_id)
  WHERE is_default = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_channel_instances_store
  ON public.whatsapp_channel_instances (store_id, is_active, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_channel_instances_phone
  ON public.whatsapp_channel_instances (phone_number_id)
  WHERE phone_number_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.whatsapp_channel_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.whatsapp_channel_instances(id) ON DELETE SET NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  request_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_channel_audit_store
  ON public.whatsapp_channel_audit_events (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_channel_audit_instance
  ON public.whatsapp_channel_audit_events (instance_id, created_at DESC);

-- Claims atômicos: dois workers concorrentes nunca recebem o mesmo item.
CREATE OR REPLACE FUNCTION public.claim_whatsapp_outbox(
  p_worker_id TEXT,
  p_batch_size INTEGER DEFAULT 25,
  p_lease_seconds INTEGER DEFAULT 300
) RETURNS SETOF public.whatsapp_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'whatsapp outbox worker requires service_role';
  END IF;
  IF p_batch_size < 1 OR p_batch_size > 100 THEN
    RAISE EXCEPTION 'invalid batch size';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.whatsapp_outbox
    WHERE attempts < max_attempts
      AND (
        (status IN ('pending', 'failed') AND next_attempt_at <= now())
        OR (status = 'processing' AND locked_at < now() - make_interval(secs => p_lease_seconds))
      )
    ORDER BY next_attempt_at ASC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_batch_size
  )
  UPDATE public.whatsapp_outbox o
  SET status = 'processing',
      locked_by = p_worker_id,
      locked_at = now(),
      last_attempt_at = now(),
      attempts = o.attempts + 1,
      updated_at = now()
  FROM candidates c
  WHERE o.id = c.id
  RETURNING o.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_outbox(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_outbox(TEXT, INTEGER, INTEGER) TO service_role;

ALTER TABLE public.whatsapp_outbox_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_outbox_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_channel_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_channel_instances FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_channel_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_channel_audit_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_outbox_attempts_deny_client ON public.whatsapp_outbox_attempts;
CREATE POLICY whatsapp_outbox_attempts_deny_client ON public.whatsapp_outbox_attempts
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS whatsapp_channel_instances_deny_client ON public.whatsapp_channel_instances;
CREATE POLICY whatsapp_channel_instances_deny_client ON public.whatsapp_channel_instances
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS whatsapp_channel_audit_deny_client ON public.whatsapp_channel_audit_events;
CREATE POLICY whatsapp_channel_audit_deny_client ON public.whatsapp_channel_audit_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.whatsapp_channel_instances IS
  'Instâncias isoladas por loja; oficial Meta e conectores não oficiais nunca compartilham credenciais.';
COMMENT ON FUNCTION public.claim_whatsapp_outbox(TEXT, INTEGER, INTEGER) IS
  'Claim transacional com SKIP LOCKED e lease expirável para workers WhatsApp.';
