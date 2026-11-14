-- =============================================================================
-- Migration: 20270330000000_whatsapp_realtime_rls_and_replica_identity.sql
-- Purpose:
--   1. Garantir REPLICA IDENTITY FULL em chat_threads, chat_messages e
--      whatsapp_channel_instances para entrega completa de eventos UPDATE/INSERT
--      no Supabase Realtime (WebSocket).
--   2. Garantir inclusão idempotente na publication supabase_realtime.
--   3. Expandir RLS de leitura (chat_threads_wave2_select e chat_messages_wave2_select)
--      para incluir platform_admin / master e membros ativos do workspace,
--      evitando descarte silencioso de pacotes Realtime no navegador.
--   4. Higienizar registros legados de chat_threads onde guest_name ou
--      primary_phone_e164 armazenaram LIDs numéricos puros (>= 14 dígitos).
-- =============================================================================

BEGIN;

-- 1. Replica Identity Full para filtros Realtime e payloads de UPDATE completos
ALTER TABLE IF EXISTS public.chat_threads REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.whatsapp_channel_instances REPLICA IDENTITY FULL;

-- 2. Inclusão idempotente na publication supabase_realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_threads'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_channel_instances'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_channel_instances;
    END IF;
  END IF;
END $$;

-- 3. Políticas RLS de SELECT compatíveis com Supabase Realtime para Staff, Owner e Platform Admin
DROP POLICY IF EXISTS "chat_threads_wave2_select" ON public.chat_threads;
CREATE POLICY "chat_threads_wave2_select"
  ON public.chat_threads
  FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('platform_admin', 'master')
    )
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = chat_threads.store_id
        AND s.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = chat_threads.store_id
        AND wm.profile_id = auth.uid()
        AND (
          COALESCE(chat_threads.is_confidential, false) = false
          OR wm.role IN ('owner', 'admin', 'manager')
          OR chat_threads.assigned_to = auth.uid()
          OR chat_threads.assigned_to_profile_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "chat_messages_wave2_select" ON public.chat_messages;
CREATE POLICY "chat_messages_wave2_select"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('platform_admin', 'master')
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_threads ct
      WHERE ct.id = chat_messages.thread_id
        AND (
          ct.customer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.stores s
            WHERE s.id = ct.store_id
              AND s.owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = ct.store_id
              AND wm.profile_id = auth.uid()
              AND (
                COALESCE(ct.is_confidential, false) = false
                OR wm.role IN ('owner', 'admin', 'manager')
                OR ct.assigned_to = auth.uid()
                OR ct.assigned_to_profile_id = auth.uid()
              )
          )
        )
    )
  );

-- 4. Higienização retroativa de LIDs numéricos puros (>= 14 dígitos) em chat_threads
UPDATE public.chat_threads
SET
  guest_name = COALESCE(
    NULLIF(TRIM(metadata->>'push_name'), ''),
    'Contato WhatsApp #' || RIGHT(REGEXP_REPLACE(COALESCE(entity_id, guest_name, ''), '\D', '', 'g'), 4)
  ),
  primary_phone_e164 = CASE
    WHEN REGEXP_REPLACE(COALESCE(primary_phone_e164, ''), '\D', '', 'g') ~ '^\d{14,}$' THEN NULL
    ELSE primary_phone_e164
  END,
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('is_lid', true)
WHERE
  context_type = 'whatsapp'
  AND COALESCE(thread_type, 'store') <> 'group'
  AND REGEXP_REPLACE(COALESCE(guest_name, ''), '\D', '', 'g') ~ '^\d{14,}$'
  AND TRIM(COALESCE(guest_name, '')) ~ '^\+?\d{14,}(@.*)?$';

COMMIT;
