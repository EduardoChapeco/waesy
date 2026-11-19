-- ============================================================================
-- Migration: Chat Incremental Persistence, Sync Cursors & Preview Integrity
-- Spec: docs/specs/SPEC-20261116-CHAT-PERSISTENCE-INCREMENTAL-SYNC.md
-- ============================================================================

-- 1. Colunas explicitas de cursor incremental em chat_threads
ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS history_bootstrap_done BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_cursor_at TIMESTAMPTZ;

-- 2. Trigger nao-invasivo em chat_threads: nao altera updated_at em updates apenas de metadado de sync ou reparo de preview historico
CREATE OR REPLACE FUNCTION public.set_chat_threads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     OR (NEW.last_message_at IS DISTINCT FROM OLD.last_message_at AND (OLD.last_message_at IS NULL OR NEW.last_message_at > OLD.last_message_at))
     OR NEW.assigned_to_profile_id IS DISTINCT FROM OLD.assigned_to_profile_id
     OR NEW.department IS DISTINCT FROM OLD.department
     OR NEW.tags IS DISTINCT FROM OLD.tags
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
     OR NEW.lead_id IS DISTINCT FROM OLD.lead_id
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.guest_name IS DISTINCT FROM OLD.guest_name
     OR NEW.group_subject IS DISTINCT FROM OLD.group_subject THEN
    NEW.updated_at := now();
  ELSE
    NEW.updated_at := COALESCE(OLD.updated_at, NEW.updated_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_threads_updated_at ON public.chat_threads;
CREATE TRIGGER chat_threads_updated_at
  BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_chat_threads_updated_at();

-- 3. Backfill idempotente para threads que ja possuem mensagens persistidas (preserva updated_at)
WITH latest_per_thread AS (
  SELECT DISTINCT ON (m.thread_id)
    m.thread_id,
    m.message,
    m.message_type,
    m.created_at
  FROM public.chat_messages m
  WHERE COALESCE(m.message_type, 'text') NOT IN ('internal_note', 'system_event')
    AND COALESCE((m.payload->>'is_internal')::boolean, false) = false
    AND COALESCE((m.payload->>'is_whisper')::boolean, false) = false
  ORDER BY m.thread_id, m.created_at DESC
)
UPDATE public.chat_threads ct
SET
  history_bootstrap_done = true,
  sync_cursor_at = COALESCE(ct.sync_cursor_at, l.created_at, ct.last_message_at),
  last_message_at = COALESCE(ct.last_message_at, l.created_at),
  last_message_text = CASE
    WHEN ct.last_message_text IS NULL OR btrim(ct.last_message_text) = '' THEN
      CASE
        WHEN l.message LIKE 'waesy-msg:%' THEN
          CASE l.message_type
            WHEN 'image' THEN '[Imagem]'
            WHEN 'video' THEN '[Vídeo]'
            WHEN 'audio' THEN '[Áudio]'
            WHEN 'document' THEN '[Documento]'
            WHEN 'sticker' THEN '[Figurinha]'
            ELSE '[Mensagem]'
          END
        ELSE left(l.message, 280)
      END
    ELSE ct.last_message_text
  END,
  metadata = COALESCE(ct.metadata, '{}'::jsonb) || jsonb_build_object(
    'history_bootstrap_done', true,
    'sync_cursor_ms', FLOOR(EXTRACT(EPOCH FROM COALESCE(ct.sync_cursor_at, l.created_at, ct.last_message_at)) * 1000)::bigint
  )
FROM latest_per_thread l
WHERE ct.id = l.thread_id
  AND (
    ct.history_bootstrap_done = false
    OR ct.sync_cursor_at IS NULL
    OR ct.last_message_text IS NULL
    OR btrim(ct.last_message_text) = ''
  );

-- 4. Indices parciais e compostos para consulta rapida de preview e ordenacao
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_public_latest
  ON public.chat_messages (thread_id, created_at DESC)
  WHERE COALESCE(message_type, 'text') NOT IN ('internal_note', 'system_event');

CREATE INDEX IF NOT EXISTS idx_chat_threads_store_last_msg
  ON public.chat_threads (store_id, last_message_at DESC NULLS LAST);

-- 5. RPC para obter a ultima mensagem publica + contagem real de cada thread sem truncamento global .limit(400)
CREATE OR REPLACE FUNCTION public.get_threads_latest_public_messages(p_thread_ids uuid[])
RETURNS TABLE (
  thread_id uuid,
  message text,
  message_type text,
  created_at timestamptz,
  is_staff_reply boolean,
  total_messages bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH counts AS (
    SELECT m.thread_id, COUNT(*)::bigint AS total_messages
    FROM public.chat_messages m
    WHERE m.thread_id = ANY(p_thread_ids)
    GROUP BY m.thread_id
  ),
  latest AS (
    SELECT DISTINCT ON (m.thread_id)
      m.thread_id,
      m.message,
      m.message_type,
      m.created_at,
      m.is_staff_reply
    FROM public.chat_messages m
    WHERE m.thread_id = ANY(p_thread_ids)
      AND COALESCE(m.message_type, 'text') NOT IN ('internal_note', 'system_event')
      AND COALESCE((m.payload->>'is_internal')::boolean, false) = false
      AND COALESCE((m.payload->>'is_whisper')::boolean, false) = false
    ORDER BY m.thread_id, m.created_at DESC
  )
  SELECT
    c.thread_id,
    l.message,
    l.message_type,
    l.created_at,
    COALESCE(l.is_staff_reply, false) AS is_staff_reply,
    c.total_messages
  FROM counts c
  LEFT JOIN latest l ON l.thread_id = c.thread_id;
$$;

REVOKE ALL ON FUNCTION public.get_threads_latest_public_messages(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_threads_latest_public_messages(uuid[]) TO service_role;
