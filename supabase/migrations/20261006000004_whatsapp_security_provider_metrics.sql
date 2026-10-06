-- WhatsApp: criptografia de mensagens, isolamento estrito, webhooks de providers e métricas.
-- Esta migration é aditiva e compatível com chat_threads legada/P2P.

CREATE TABLE IF NOT EXISTS public.chat_conversation_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL UNIQUE REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  key_version INTEGER NOT NULL DEFAULT 1 CHECK (key_version > 0),
  wrapped_key TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_chat_conversation_keys_store ON public.chat_conversation_keys(store_id);

ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS channel_instance_id UUID REFERENCES public.whatsapp_channel_instances(id) ON DELETE SET NULL;
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS conversation_key_id UUID REFERENCES public.chat_conversation_keys(id) ON DELETE SET NULL;
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS last_customer_message_at TIMESTAMPTZ;
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_chat_threads_channel_instance ON public.chat_threads(channel_instance_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_threads_store_assignee ON public.chat_threads(store_id, assigned_to_profile_id, status);

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS encryption_version INTEGER;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMPTZ;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS external_message_id TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_messages_external_message ON public.chat_messages(external_message_id) WHERE external_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_staff_created ON public.chat_messages(sender_profile_id, created_at DESC) WHERE is_staff_reply = true;

CREATE TABLE IF NOT EXISTS public.whatsapp_provider_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('evolution_api', 'wasender_api')),
  instance_id UUID NOT NULL REFERENCES public.whatsapp_channel_instances(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_message_id TEXT,
  payload_hash TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received','processed','ignored','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, instance_id, event_key)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_provider_events_store ON public.whatsapp_provider_webhook_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_provider_events_processing ON public.whatsapp_provider_webhook_events(processing_status, created_at);

CREATE TABLE IF NOT EXISTS public.chat_access_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_access_audit_store ON public.chat_access_audit_events(store_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_outbox') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_outbox;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_threads') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
    END IF;
  END IF;
END $$;

-- RLS estrito: supervisor gerencia a loja; atendente vê apenas o que lhe foi atribuído,
-- ou explicitamente não atribuído para permitir a fila de triagem. Conversas P2P continuam
-- dependentes de participant access, mas nunca atravessam a loja.
ALTER TABLE public.chat_conversation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversation_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_provider_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_provider_webhook_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.chat_access_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_access_audit_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_threads_staff_all ON public.chat_threads;
DROP POLICY IF EXISTS "chat_threads_staff_all" ON public.chat_threads;
DROP POLICY IF EXISTS chat_messages_staff_all ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_staff_all" ON public.chat_messages;
DROP POLICY IF EXISTS p2p_participant_access ON public.chat_threads;

CREATE POLICY chat_threads_strict_staff_select ON public.chat_threads FOR SELECT TO authenticated USING (
  store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.store_id = chat_threads.store_id AND wm.profile_id = auth.uid()
      AND (wm.role IN ('owner','admin','manager','platform_admin','master')
        OR chat_threads.assigned_to_profile_id = auth.uid()
        OR chat_threads.assigned_to_profile_id IS NULL)
  )
);
CREATE POLICY chat_threads_strict_staff_modify ON public.chat_threads FOR UPDATE TO authenticated USING (
  store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = chat_threads.store_id AND wm.profile_id = auth.uid()
      AND wm.role IN ('owner','admin','manager','platform_admin','master')
  )
) WITH CHECK (store_id IS NOT NULL);
CREATE POLICY chat_threads_strict_staff_insert ON public.chat_threads FOR INSERT TO authenticated WITH CHECK (
  store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = chat_threads.store_id AND wm.profile_id = auth.uid()
  )
);
CREATE POLICY chat_threads_strict_customer ON public.chat_threads FOR SELECT TO authenticated USING (customer_id = auth.uid());

CREATE POLICY chat_messages_strict_staff_select ON public.chat_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chat_threads t JOIN public.workspace_members wm ON wm.store_id = t.store_id
    WHERE t.id = chat_messages.thread_id AND wm.profile_id = auth.uid()
      AND (wm.role IN ('owner','admin','manager','platform_admin','master') OR t.assigned_to_profile_id = auth.uid() OR t.assigned_to_profile_id IS NULL))
);
CREATE POLICY chat_messages_strict_staff_insert ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.chat_threads t JOIN public.workspace_members wm ON wm.store_id = t.store_id
    WHERE t.id = chat_messages.thread_id AND wm.profile_id = auth.uid()
      AND (wm.role IN ('owner','admin','manager','platform_admin','master') OR t.assigned_to_profile_id = auth.uid() OR t.assigned_to_profile_id IS NULL))
  AND (sender_id = auth.uid() OR sender_id IS NULL)
);
CREATE POLICY chat_messages_strict_staff_update ON public.chat_messages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chat_threads t JOIN public.workspace_members wm ON wm.store_id = t.store_id
    WHERE t.id = chat_messages.thread_id AND wm.profile_id = auth.uid() AND wm.role IN ('owner','admin','manager','platform_admin','master'))
);
CREATE POLICY chat_messages_strict_customer ON public.chat_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = chat_messages.thread_id AND t.customer_id = auth.uid())
);

CREATE POLICY chat_conversation_keys_staff_deny ON public.chat_conversation_keys FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY provider_events_staff_select ON public.whatsapp_provider_webhook_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = whatsapp_provider_webhook_events.store_id AND wm.profile_id = auth.uid() AND wm.role IN ('owner','admin','manager','platform_admin','master'))
);
CREATE POLICY provider_events_deny_insert ON public.whatsapp_provider_webhook_events FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY provider_events_deny_update ON public.whatsapp_provider_webhook_events FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY provider_events_deny_delete ON public.whatsapp_provider_webhook_events FOR DELETE TO anon, authenticated USING (false);
CREATE POLICY chat_access_audit_staff_select ON public.chat_access_audit_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = chat_access_audit_events.store_id AND wm.profile_id = auth.uid() AND wm.role IN ('owner','admin','manager','platform_admin','master'))
);
CREATE POLICY chat_access_audit_deny_write ON public.chat_access_audit_events FOR INSERT, UPDATE, DELETE TO anon, authenticated USING (false) WITH CHECK (false);

-- Métricas reais, sempre limitadas ao store_id autenticado; service_role pode consultar um store explícito.
CREATE OR REPLACE FUNCTION public.get_whatsapp_operations_metrics(p_store_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_store UUID := p_store_id; v_result JSONB;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    SELECT wm.store_id INTO v_store FROM public.workspace_members wm WHERE wm.profile_id = auth.uid() AND (p_store_id IS NULL OR wm.store_id = p_store_id) LIMIT 1;
    IF v_store IS NULL THEN RAISE EXCEPTION 'store access denied'; END IF;
  END IF;
  SELECT jsonb_build_object(
    'store_id', v_store,
    'queue', jsonb_build_object(
      'pending', (SELECT count(*) FROM whatsapp_outbox WHERE store_id = v_store AND status = 'pending'),
      'processing', (SELECT count(*) FROM whatsapp_outbox WHERE store_id = v_store AND status = 'processing'),
      'failed', (SELECT count(*) FROM whatsapp_outbox WHERE store_id = v_store AND status = 'failed'),
      'dead_letter', (SELECT count(*) FROM whatsapp_outbox WHERE store_id = v_store AND status = 'dead_letter'),
      'accepted_24h', (SELECT count(*) FROM whatsapp_outbox WHERE store_id = v_store AND status IN ('accepted','sent') AND updated_at >= now() - interval '24 hours')
    ),
    'conversations', jsonb_build_object(
      'open', (SELECT count(*) FROM chat_threads WHERE store_id = v_store AND status = 'open'),
      'unassigned', (SELECT count(*) FROM chat_threads WHERE store_id = v_store AND status = 'open' AND assigned_to_profile_id IS NULL),
      'first_response_avg_seconds', COALESCE((SELECT avg(EXTRACT(epoch FROM (first_response_at - created_at))) FROM chat_threads WHERE store_id = v_store AND first_response_at IS NOT NULL AND created_at >= now() - interval '24 hours'), 0)
    ),
    'agents', COALESCE((SELECT jsonb_agg(x) FROM (SELECT assigned_to_profile_id AS profile_id, count(*) FILTER (WHERE status = 'open') AS open_threads, count(*) AS total_threads, avg(EXTRACT(epoch FROM (first_response_at - created_at))) FILTER (WHERE first_response_at IS NOT NULL) AS avg_first_response_seconds FROM chat_threads WHERE store_id = v_store AND assigned_to_profile_id IS NOT NULL GROUP BY assigned_to_profile_id ORDER BY open_threads DESC) x), '[]'::jsonb),
    'providers', COALESCE((SELECT jsonb_agg(y) FROM (SELECT provider, count(*) AS attempts, count(*) FILTER (WHERE outcome = 'accepted') AS accepted, count(*) FILTER (WHERE outcome IN ('retryable_failure','permanent_failure','dead_letter')) AS failures, avg(duration_ms) AS avg_duration_ms FROM whatsapp_outbox_attempts WHERE store_id = v_store AND created_at >= now() - interval '24 hours' GROUP BY provider) y), '[]'::jsonb),
    'generated_at', now()
  ) INTO v_result;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.get_whatsapp_operations_metrics(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_operations_metrics(UUID) TO authenticated, service_role;

COMMENT ON TABLE public.chat_conversation_keys IS 'Envelope keys cifradas; a chave mestra nunca é armazenada no banco.';
COMMENT ON FUNCTION public.get_whatsapp_operations_metrics(UUID) IS 'Métricas operacionais reais e tenant-scoped de filas, conversas, atendentes e providers.';
