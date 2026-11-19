-- ============================================================================
-- Migration: WhatsApp Realtime Live State, RLS Parity, Indexes & Sync Cron
-- Spec: docs/specs/SPEC-20261116-WHATSAPP-REALTIME-SYNC-E2E.md
-- ============================================================================

-- 1. Consolidar helper is_store_staff incluindo donos em stores (context_profile_id / claimed_by / organization_id)
CREATE OR REPLACE FUNCTION public.is_store_staff(target_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN target_store_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = target_store_id
        AND wm.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = target_store_id
        AND (
          s.organization_id = (SELECT auth.uid())
          OR s.context_profile_id = (SELECT auth.uid())
          OR s.claimed_by = (SELECT auth.uid())
        )
    )
    OR public.is_platform_admin()
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_chat_thread(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN p_thread_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.chat_threads ct
      WHERE ct.id = p_thread_id
        AND (
          ct.customer_id = (SELECT auth.uid())
          OR public.is_platform_admin()
          OR public.is_store_staff(ct.store_id)
        )
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.is_store_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_store_staff(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_access_chat_thread(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_chat_thread(uuid) TO authenticated, service_role;

-- 2. Projecao Zero-Trust Ao Vivo de Instancias WhatsApp (sem exposicao de secret_payload_encrypted)
CREATE TABLE IF NOT EXISTS public.whatsapp_channel_live_state (
  instance_id uuid PRIMARY KEY REFERENCES public.whatsapp_channel_instances(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  instance_key text NOT NULL,
  display_name text NOT NULL,
  provider text NOT NULL DEFAULT 'evolution_api',
  status text NOT NULL DEFAULT 'disconnected',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  display_phone_number text,
  external_instance_id text,
  sync_mode text NOT NULL DEFAULT 'new_only',
  diagnostic_state text,
  diagnostic_reason text,
  last_webhook_at timestamptz,
  last_webhook_state text,
  last_webhook_event text,
  last_connected_at timestamptz,
  last_synced_at timestamptz,
  last_auto_sync_at timestamptz,
  last_health_check_at timestamptz,
  last_error_message text,
  has_qr_code boolean NOT NULL DEFAULT false,
  qr_code_url text,
  pairing_code text,
  health_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_live_state_store_id
  ON public.whatsapp_channel_live_state (store_id, is_active, is_default DESC);

CREATE OR REPLACE FUNCTION public._safe_parse_timestamptz(p_raw text)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_raw IS NULL OR btrim(p_raw) = '' THEN
    RETURN NULL;
  END IF;
  RETURN p_raw::timestamptz;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_whatsapp_channel_live_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cfg jsonb := COALESCE(NEW.public_config, '{}'::jsonb);
  v_qr text := NULLIF(btrim(COALESCE(v_cfg->>'qr_code_url', '')), '');
  v_pairing text := NULLIF(btrim(COALESCE(v_cfg->>'pairing_code', '')), '');
BEGIN
  INSERT INTO public.whatsapp_channel_live_state (
    instance_id,
    store_id,
    instance_key,
    display_name,
    provider,
    status,
    is_active,
    is_default,
    display_phone_number,
    external_instance_id,
    sync_mode,
    diagnostic_state,
    diagnostic_reason,
    last_webhook_at,
    last_webhook_state,
    last_webhook_event,
    last_connected_at,
    last_synced_at,
    last_auto_sync_at,
    last_health_check_at,
    last_error_message,
    has_qr_code,
    qr_code_url,
    pairing_code,
    health_status,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.store_id,
    NEW.instance_key,
    NEW.display_name,
    NEW.provider,
    NEW.status,
    NEW.is_active,
    NEW.is_default,
    NEW.display_phone_number,
    NEW.external_instance_id,
    NEW.sync_mode,
    NULLIF(btrim(COALESCE(v_cfg->>'diagnostic_state', '')), ''),
    NULLIF(btrim(COALESCE(v_cfg->>'diagnostic_reason', '')), ''),
    public._safe_parse_timestamptz(v_cfg->>'last_webhook_at'),
    NULLIF(btrim(COALESCE(v_cfg->>'last_webhook_state', '')), ''),
    NULLIF(btrim(COALESCE(v_cfg->>'last_webhook_event', '')), ''),
    public._safe_parse_timestamptz(v_cfg->>'last_connected_at'),
    public._safe_parse_timestamptz(v_cfg->>'last_synced_at'),
    public._safe_parse_timestamptz(v_cfg->>'last_auto_sync_at'),
    NEW.last_health_check_at,
    COALESCE(NEW.last_error_message, NULLIF(btrim(COALESCE(v_cfg->>'last_error_message', '')), '')),
    (v_qr IS NOT NULL),
    v_qr,
    v_pairing,
    COALESCE(NEW.health_status, '{}'::jsonb),
    COALESCE(NEW.updated_at, now())
  )
  ON CONFLICT (instance_id) DO UPDATE SET
    store_id = EXCLUDED.store_id,
    instance_key = EXCLUDED.instance_key,
    display_name = EXCLUDED.display_name,
    provider = EXCLUDED.provider,
    status = EXCLUDED.status,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    display_phone_number = EXCLUDED.display_phone_number,
    external_instance_id = EXCLUDED.external_instance_id,
    sync_mode = EXCLUDED.sync_mode,
    diagnostic_state = EXCLUDED.diagnostic_state,
    diagnostic_reason = EXCLUDED.diagnostic_reason,
    last_webhook_at = EXCLUDED.last_webhook_at,
    last_webhook_state = EXCLUDED.last_webhook_state,
    last_webhook_event = EXCLUDED.last_webhook_event,
    last_connected_at = EXCLUDED.last_connected_at,
    last_synced_at = EXCLUDED.last_synced_at,
    last_auto_sync_at = EXCLUDED.last_auto_sync_at,
    last_health_check_at = EXCLUDED.last_health_check_at,
    last_error_message = EXCLUDED.last_error_message,
    has_qr_code = EXCLUDED.has_qr_code,
    qr_code_url = EXCLUDED.qr_code_url,
    pairing_code = EXCLUDED.pairing_code,
    health_status = EXCLUDED.health_status,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_whatsapp_channel_live_state ON public.whatsapp_channel_instances;
CREATE TRIGGER trg_sync_whatsapp_channel_live_state
  AFTER INSERT OR UPDATE ON public.whatsapp_channel_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_whatsapp_channel_live_state();

-- Backfill inicial da projecao segura
INSERT INTO public.whatsapp_channel_live_state (
  instance_id,
  store_id,
  instance_key,
  display_name,
  provider,
  status,
  is_active,
  is_default,
  display_phone_number,
  external_instance_id,
  sync_mode,
  diagnostic_state,
  diagnostic_reason,
  last_webhook_at,
  last_webhook_state,
  last_webhook_event,
  last_connected_at,
  last_synced_at,
  last_auto_sync_at,
  last_health_check_at,
  last_error_message,
  has_qr_code,
  qr_code_url,
  pairing_code,
  health_status,
  updated_at
)
SELECT
  i.id,
  i.store_id,
  i.instance_key,
  i.display_name,
  i.provider,
  i.status,
  i.is_active,
  i.is_default,
  i.display_phone_number,
  i.external_instance_id,
  i.sync_mode,
  NULLIF(btrim(COALESCE(i.public_config->>'diagnostic_state', '')), ''),
  NULLIF(btrim(COALESCE(i.public_config->>'diagnostic_reason', '')), ''),
  public._safe_parse_timestamptz(i.public_config->>'last_webhook_at'),
  NULLIF(btrim(COALESCE(i.public_config->>'last_webhook_state', '')), ''),
  NULLIF(btrim(COALESCE(i.public_config->>'last_webhook_event', '')), ''),
  public._safe_parse_timestamptz(i.public_config->>'last_connected_at'),
  public._safe_parse_timestamptz(i.public_config->>'last_synced_at'),
  public._safe_parse_timestamptz(i.public_config->>'last_auto_sync_at'),
  i.last_health_check_at,
  COALESCE(i.last_error_message, NULLIF(btrim(COALESCE(i.public_config->>'last_error_message', '')), '')),
  (NULLIF(btrim(COALESCE(i.public_config->>'qr_code_url', '')), '') IS NOT NULL),
  NULLIF(btrim(COALESCE(i.public_config->>'qr_code_url', '')), ''),
  NULLIF(btrim(COALESCE(i.public_config->>'pairing_code', '')), ''),
  COALESCE(i.health_status, '{}'::jsonb),
  COALESCE(i.updated_at, now())
FROM public.whatsapp_channel_instances i
ON CONFLICT (instance_id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  instance_key = EXCLUDED.instance_key,
  display_name = EXCLUDED.display_name,
  provider = EXCLUDED.provider,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  display_phone_number = EXCLUDED.display_phone_number,
  external_instance_id = EXCLUDED.external_instance_id,
  sync_mode = EXCLUDED.sync_mode,
  diagnostic_state = EXCLUDED.diagnostic_state,
  diagnostic_reason = EXCLUDED.diagnostic_reason,
  last_webhook_at = EXCLUDED.last_webhook_at,
  last_webhook_state = EXCLUDED.last_webhook_state,
  last_webhook_event = EXCLUDED.last_webhook_event,
  last_connected_at = EXCLUDED.last_connected_at,
  last_synced_at = EXCLUDED.last_synced_at,
  last_auto_sync_at = EXCLUDED.last_auto_sync_at,
  last_health_check_at = EXCLUDED.last_health_check_at,
  last_error_message = EXCLUDED.last_error_message,
  has_qr_code = EXCLUDED.has_qr_code,
  qr_code_url = EXCLUDED.qr_code_url,
  pairing_code = EXCLUDED.pairing_code,
  health_status = EXCLUDED.health_status,
  updated_at = EXCLUDED.updated_at;

ALTER TABLE public.whatsapp_channel_live_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.whatsapp_channel_live_state FROM anon, authenticated;
GRANT SELECT ON public.whatsapp_channel_live_state TO authenticated;
GRANT ALL ON public.whatsapp_channel_live_state TO service_role;

DROP POLICY IF EXISTS "whatsapp_channel_live_state_staff_select" ON public.whatsapp_channel_live_state;
CREATE POLICY "whatsapp_channel_live_state_staff_select"
  ON public.whatsapp_channel_live_state
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin() OR public.is_store_staff(store_id));

DROP POLICY IF EXISTS "whatsapp_channel_live_state_deny_write" ON public.whatsapp_channel_live_state;
DROP POLICY IF EXISTS "whatsapp_channel_live_state_deny_insert" ON public.whatsapp_channel_live_state;
CREATE POLICY "whatsapp_channel_live_state_deny_insert"
  ON public.whatsapp_channel_live_state
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "whatsapp_channel_live_state_deny_update" ON public.whatsapp_channel_live_state;
CREATE POLICY "whatsapp_channel_live_state_deny_update"
  ON public.whatsapp_channel_live_state
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "whatsapp_channel_live_state_deny_delete" ON public.whatsapp_channel_live_state;
CREATE POLICY "whatsapp_channel_live_state_deny_delete"
  ON public.whatsapp_channel_live_state
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- 3. Correcao de RLS Realtime em chat_threads, chat_messages, whatsapp_outbox e whatsapp_outbox_attempts
DROP POLICY IF EXISTS "chat_threads_wave2_select" ON public.chat_threads;
CREATE POLICY "chat_threads_wave2_select"
  ON public.chat_threads
  FOR SELECT
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    OR public.is_platform_admin()
    OR public.is_store_staff(store_id)
  );

DROP POLICY IF EXISTS "chat_messages_wave2_select" ON public.chat_messages;
CREATE POLICY "chat_messages_wave2_select"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = (SELECT auth.uid())
    OR public.can_access_chat_thread(thread_id)
  );

-- whatsapp_outbox e whatsapp_outbox_attempts: staff pode ler status Realtime, escrita permanece deny-by-default no client
DROP POLICY IF EXISTS "whatsapp_outbox_deny_client" ON public.whatsapp_outbox;
DROP POLICY IF EXISTS "whatsapp_outbox_staff_select" ON public.whatsapp_outbox;
CREATE POLICY "whatsapp_outbox_staff_select"
  ON public.whatsapp_outbox
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin() OR public.is_store_staff(store_id));

DROP POLICY IF EXISTS "whatsapp_outbox_deny_insert" ON public.whatsapp_outbox;
CREATE POLICY "whatsapp_outbox_deny_insert"
  ON public.whatsapp_outbox
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "whatsapp_outbox_deny_update" ON public.whatsapp_outbox;
CREATE POLICY "whatsapp_outbox_deny_update"
  ON public.whatsapp_outbox
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "whatsapp_outbox_deny_delete" ON public.whatsapp_outbox;
CREATE POLICY "whatsapp_outbox_deny_delete"
  ON public.whatsapp_outbox
  FOR DELETE
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "whatsapp_outbox_attempts_deny_client" ON public.whatsapp_outbox_attempts;
DROP POLICY IF EXISTS "whatsapp_outbox_attempts_staff_select" ON public.whatsapp_outbox_attempts;
CREATE POLICY "whatsapp_outbox_attempts_staff_select"
  ON public.whatsapp_outbox_attempts
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin() OR public.is_store_staff(store_id));

DROP POLICY IF EXISTS "whatsapp_outbox_attempts_deny_insert" ON public.whatsapp_outbox_attempts;
CREATE POLICY "whatsapp_outbox_attempts_deny_insert"
  ON public.whatsapp_outbox_attempts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "whatsapp_outbox_attempts_deny_update" ON public.whatsapp_outbox_attempts;
CREATE POLICY "whatsapp_outbox_attempts_deny_update"
  ON public.whatsapp_outbox_attempts
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "whatsapp_outbox_attempts_deny_delete" ON public.whatsapp_outbox_attempts;
CREATE POLICY "whatsapp_outbox_attempts_deny_delete"
  ON public.whatsapp_outbox_attempts
  FOR DELETE
  TO anon, authenticated
  USING (false);

GRANT SELECT ON public.whatsapp_outbox TO authenticated;
GRANT SELECT ON public.whatsapp_outbox_attempts TO authenticated;

-- 4. REPLICA IDENTITY FULL e inclusao completa na publicacao supabase_realtime
ALTER TABLE public.chat_threads REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_channel_live_state REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_outbox REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_outbox_attempts REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_history_sync_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_groups_directory REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_scheduled_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_departments REPLICA IDENTITY FULL;
ALTER TABLE public.workspace_members REPLICA IDENTITY FULL;
ALTER TABLE public.store_quick_answers REPLICA IDENTITY FULL;
ALTER TABLE public.store_workflows REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_campaigns REPLICA IDENTITY FULL;

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'chat_threads',
    'chat_messages',
    'whatsapp_channel_live_state',
    'whatsapp_outbox',
    'whatsapp_outbox_attempts',
    'whatsapp_history_sync_jobs',
    'whatsapp_groups_directory',
    'whatsapp_scheduled_messages',
    'chat_departments',
    'workspace_members',
    'store_quick_answers',
    'store_workflows',
    'whatsapp_campaigns'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END;
$$;

-- 5. Indices para delta sync rapido, replay de webhooks e reaper de jobs
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_ext_id
  ON public.chat_messages (thread_id, external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_provider_webhook_events_pending
  ON public.whatsapp_provider_webhook_events (processing_status, created_at)
  WHERE processing_status IN ('received', 'retryable_error');

CREATE INDEX IF NOT EXISTS idx_wa_scheduled_messages_due
  ON public.whatsapp_scheduled_messages (status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_wa_history_sync_jobs_running
  ON public.whatsapp_history_sync_jobs (status, started_at DESC)
  WHERE status = 'running';

-- 6. Stored procedure e pg_cron para orquestracao autonoma de sync/outbox WhatsApp
CREATE OR REPLACE FUNCTION public.dispatch_whatsapp_sync_cron(p_mode text DEFAULT 'sync')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reaped_count integer := 0;
  v_request_id bigint := NULL;
  v_app_url text := NULL;
  v_token text := NULL;
BEGIN
  -- Reaper deterministico em SQL de sync jobs travados em running > 3 minutos
  WITH reaped AS (
    UPDATE public.whatsapp_history_sync_jobs
    SET
      status = 'failed',
      notes = COALESCE(notes || ' | ', '') || 'Execucao expirada apos 3 minutos sem conclusao (auto-reaper).',
      completed_at = now()
    WHERE status = 'running'
      AND started_at < now() - interval '3 minutes'
    RETURNING id
  )
  SELECT count(*)::integer INTO v_reaped_count FROM reaped;

  -- Ler URL e Token do Supabase Vault / app settings (zero hardcoded secrets)
  BEGIN
    SELECT decrypted_secret INTO v_app_url
    FROM vault.decrypted_secrets
    WHERE name IN ('WAESY_SITE_URL', 'VITE_SITE_URL')
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_app_url := NULL;
  END;

  v_app_url := COALESCE(
    NULLIF(btrim(v_app_url), ''),
    NULLIF(btrim(current_setting('app.settings.site_url', true)), ''),
    'https://usewaesy.pages.dev'
  );

  BEGIN
    SELECT decrypted_secret INTO v_token
    FROM vault.decrypted_secrets
    WHERE name IN ('WAESY_CRON_TOKEN', 'WAESY_AI_WORKER_TOKEN', 'WHATSAPP_WORKER_TOKEN')
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_token := NULL;
  END;

  v_token := COALESCE(
    NULLIF(btrim(v_token), ''),
    NULLIF(btrim(current_setting('app.settings.cron_token', true)), '')
  );

  IF v_token IS NOT NULL AND exists(SELECT 1 FROM pg_namespace WHERE nspname = 'net') THEN
    BEGIN
      SELECT net.http_post(
        url := rtrim(v_app_url, '/') || '/api/cron/whatsapp-sync',
        body := jsonb_build_object(
          'mode', COALESCE(NULLIF(btrim(p_mode), ''), 'sync'),
          'source', 'pg_cron_pg_net',
          'reapedJobs', v_reaped_count,
          'triggeredAt', now()
        ),
        params := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_token,
          'X-Waesy-Worker-Token', v_token
        ),
        timeout_milliseconds := 20000
      ) INTO v_request_id;
    EXCEPTION WHEN OTHERS THEN
      v_request_id := NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'reaped_jobs', v_reaped_count,
    'http_dispatched', (v_request_id IS NOT NULL),
    'net_request_id', v_request_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_whatsapp_sync_cron(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_whatsapp_sync_cron(text) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('waesy_whatsapp_realtime_sync_1m');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'waesy_whatsapp_realtime_sync_1m',
      '* * * * *',
      $cron$SELECT public.dispatch_whatsapp_sync_cron('sync');$cron$
    );
  END IF;
END;
$$;
