-- ============================================================================
-- Migration: Isolamento Estrutural DM vs Grupo WhatsApp & Data-Healing
-- Spec: docs/specs/SPEC-20261116-MASTER-WAESY-E2E-STABILIZATION-MULTITOUCH-REFACTOR.md
-- ============================================================================

-- 1. Garantir colunas auxiliares usadas pelo runtime sem erro de schema parcial
ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS group_subject text,
  ADD COLUMN IF NOT EXISTS primary_phone_e164 text;

-- 2. Normalizar thread_type de threads manifestamente de grupo/canal
UPDATE public.chat_threads
SET
  thread_type = CASE
    WHEN COALESCE(entity_id, '') LIKE '%@newsletter%'
      OR COALESCE(metadata->>'whatsapp_jid', '') LIKE '%@newsletter%'
      OR COALESCE((metadata->>'is_channel')::boolean, false) = true
      THEN 'channel'
    ELSE 'group'
  END,
  primary_phone_e164 = NULL
WHERE (
  COALESCE(entity_id, '') LIKE '%@g.us%'
  OR COALESCE(metadata->>'whatsapp_jid', '') LIKE '%@g.us%'
  OR COALESCE((metadata->>'is_group')::boolean, false) = true
  OR COALESCE(entity_id, '') ~ '^120363[0-9]{10,}$'
  OR COALESCE(entity_id, '') LIKE '%@newsletter%'
  OR COALESCE((metadata->>'is_channel')::boolean, false) = true
)
AND COALESCE(thread_type, 'store') NOT IN ('group', 'channel', 'ai_assistant', 'copilot', 'project');

-- 3. Higienizar nome de grupo quando metadata.group_subject / group_subject existir mas guest_name tiver ficado vazio/telefone
UPDATE public.chat_threads
SET guest_name = COALESCE(NULLIF(btrim(group_subject), ''), NULLIF(btrim(metadata->>'group_subject'), ''))
WHERE thread_type = 'group'
  AND COALESCE(NULLIF(btrim(group_subject), ''), NULLIF(btrim(metadata->>'group_subject'), '')) IS NOT NULL
  AND (
    guest_name IS NULL
    OR btrim(guest_name) = ''
    OR guest_name = 'Grupo WhatsApp'
    OR guest_name ~ '^\+?[0-9\s\-]{8,}$'
  );

-- 4. One-shot idempotente: desanexar mensagens de grupo (@g.us / is_group=true) gravadas indevidamente em threads DM
DO $$
DECLARE
  v_rec RECORD;
  v_group_thread_id uuid;
  v_clean_digits text;
  v_reassigned_count integer := 0;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT
      ct.store_id,
      ct.channel_instance_id,
      COALESCE(
        NULLIF(btrim(m.payload->>'group_jid'), ''),
        NULLIF(btrim(m.payload->>'whatsapp_jid'), '')
      ) AS group_jid,
      NULLIF(btrim(m.payload->>'group_subject'), '') AS msg_group_subject
    FROM public.chat_messages m
    JOIN public.chat_threads ct ON ct.id = m.thread_id
    WHERE COALESCE(ct.thread_type, 'store') NOT IN ('group', 'channel', 'ai_assistant', 'copilot')
      AND (
        COALESCE((m.payload->>'is_group')::boolean, false) = true
        OR COALESCE(m.payload->>'whatsapp_jid', '') LIKE '%@g.us%'
        OR COALESCE(m.payload->>'group_jid', '') LIKE '%@g.us%'
      )
      AND COALESCE(
        NULLIF(btrim(m.payload->>'group_jid'), ''),
        NULLIF(btrim(m.payload->>'whatsapp_jid'), '')
      ) LIKE '%@g.us%'
  LOOP
    SELECT id INTO v_group_thread_id
    FROM public.chat_threads
    WHERE store_id = v_rec.store_id
      AND thread_type = 'group'
      AND (
        entity_id = v_rec.group_jid
        OR lower(COALESCE(metadata->>'whatsapp_jid', '')) = lower(v_rec.group_jid)
      )
    ORDER BY last_message_at DESC NULLS LAST, created_at ASC
    LIMIT 1;

    IF v_group_thread_id IS NULL THEN
      v_clean_digits := regexp_replace(split_part(v_rec.group_jid, '@', 1), '\D', '', 'g');
      INSERT INTO public.chat_threads (
        store_id,
        channel_instance_id,
        guest_name,
        guest_email,
        group_subject,
        primary_phone_e164,
        status,
        subject,
        context_type,
        thread_type,
        entity_id,
        department,
        priority,
        metadata,
        last_message_at
      )
      VALUES (
        v_rec.store_id,
        v_rec.channel_instance_id,
        COALESCE(v_rec.msg_group_subject, 'Grupo WhatsApp'),
        COALESCE(NULLIF(v_clean_digits, ''), 'grupo') || '@grupo.whatsapp.waesy',
        v_rec.msg_group_subject,
        NULL,
        'open',
        'Grupo: ' || COALESCE(v_rec.msg_group_subject, 'Grupo WhatsApp'),
        'whatsapp',
        'group',
        v_rec.group_jid,
        'geral',
        'normal',
        jsonb_build_object(
          'is_group', true,
          'whatsapp_jid', v_rec.group_jid,
          'remote_jid', v_rec.group_jid,
          'group_subject', v_rec.msg_group_subject,
          'healed_from_dm_leak', true
        ),
        now()
      )
      RETURNING id INTO v_group_thread_id;
    END IF;

    -- Idempotente e não destrutivo: não move mensagens cujo external_message_id já exista
    -- na thread de grupo (uq_chat_messages_whatsapp_external_id) nem duplicatas dentro do lote.
    UPDATE public.chat_messages m
    SET thread_id = v_group_thread_id
    WHERE m.id IN (
      SELECT DISTINCT ON (COALESCE(cm.external_message_id, cm.id::text)) cm.id
      FROM public.chat_messages cm
      JOIN public.chat_threads ct ON ct.id = cm.thread_id
      WHERE ct.store_id = v_rec.store_id
        AND COALESCE(ct.thread_type, 'store') NOT IN ('group', 'channel', 'ai_assistant', 'copilot')
        AND (
          COALESCE(cm.payload->>'group_jid', '') = v_rec.group_jid
          OR COALESCE(cm.payload->>'whatsapp_jid', '') = v_rec.group_jid
        )
        AND (
          cm.external_message_id IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM public.chat_messages x
            WHERE x.thread_id = v_group_thread_id
              AND x.external_message_id = cm.external_message_id
          )
        )
      ORDER BY COALESCE(cm.external_message_id, cm.id::text), cm.created_at ASC
    );

    GET DIAGNOSTICS v_reassigned_count = ROW_COUNT;

    IF v_reassigned_count > 0 THEN
      UPDATE public.chat_threads tgt
      SET
        last_message_text = COALESCE(
          (
            SELECT left(cm.message, 280)
            FROM public.chat_messages cm
            WHERE cm.thread_id = v_group_thread_id
              AND COALESCE(cm.message_type, 'text') NOT IN ('internal_note', 'system_event')
            ORDER BY cm.created_at DESC
            LIMIT 1
          ),
          tgt.last_message_text
        ),
        last_message_at = COALESCE(
          (
            SELECT cm.created_at
            FROM public.chat_messages cm
            WHERE cm.thread_id = v_group_thread_id
              AND COALESCE(cm.message_type, 'text') NOT IN ('internal_note', 'system_event')
            ORDER BY cm.created_at DESC
            LIMIT 1
          ),
          tgt.last_message_at
        )
      WHERE tgt.id = v_group_thread_id;
    END IF;
  END LOOP;
END $$;

-- 5. Indices para isolamento DM/Grupo e leitura rapida multi-touch
CREATE INDEX IF NOT EXISTS idx_chat_threads_store_type_entity
  ON public.chat_threads (store_id, thread_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_ad_touchpoints_store_phone_created
  ON public.ad_attribution_touchpoints (store_id, phone_digits, created_at DESC)
  WHERE phone_digits IS NOT NULL;
