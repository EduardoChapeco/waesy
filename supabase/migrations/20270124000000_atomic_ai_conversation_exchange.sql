-- Waesy W4/W5 — persistência atômica do exchange do Copilot.
-- A execução externa da IA ocorre antes desta função; todas as escritas do resultado
-- são confirmadas juntas ou revertidas juntas.

CREATE OR REPLACE FUNCTION public.persist_ai_conversation_exchange_atomic(
  p_thread_id UUID,
  p_user_message_id UUID,
  p_sender_id UUID,
  p_user_status TEXT,
  p_ai_message TEXT,
  p_ai_message_type TEXT,
  p_ai_payload JSONB,
  p_ai_status TEXT,
  p_updated_memory JSONB,
  p_artifact JSONB DEFAULT NULL,
  p_store_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ai_message_id UUID;
  v_ai_created_at TIMESTAMPTZ;
  v_artifact_id UUID;
  v_artifact_message_id UUID;
BEGIN
  IF p_thread_id IS NULL OR p_user_message_id IS NULL OR p_sender_id IS NULL THEN
    RAISE EXCEPTION 'exchange inválido: thread, mensagem do usuário e sender são obrigatórios';
  END IF;

  -- Serializa finalizações concorrentes da mesma thread.
  PERFORM 1 FROM public.chat_threads WHERE id = p_thread_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'thread inexistente';
  END IF;

  IF p_artifact IS NOT NULL AND jsonb_typeof(p_artifact) = 'object' THEN
    INSERT INTO public.chat_artifacts (
      thread_id, store_id, created_by, artifact_type, title, version, data, metadata
    ) VALUES (
      p_thread_id,
      p_store_id,
      p_sender_id,
      p_artifact->>'type',
      p_artifact->>'title',
      COALESCE((p_artifact->>'version')::INTEGER, 1),
      COALESCE(p_artifact->'data', '{}'::JSONB),
      jsonb_build_object(
        'authorName', p_artifact->>'authorName',
        'authorRole', p_artifact->>'authorRole'
      )
    )
    RETURNING id INTO v_artifact_id;
  END IF;

  INSERT INTO public.chat_messages (
    thread_id, sender_id, is_staff_reply, message, message_type, attachments, payload, status
  ) VALUES (
    p_thread_id,
    p_sender_id,
    true,
    p_ai_message,
    p_ai_message_type,
    '[]'::JSONB,
    CASE
      WHEN v_artifact_id IS NULL THEN COALESCE(p_ai_payload, '{}'::JSONB)
      ELSE jsonb_set(COALESCE(p_ai_payload, '{}'::JSONB), '{artifact,id}', to_jsonb(v_artifact_id::TEXT), true)
    END,
    p_ai_status
  )
  RETURNING id, created_at INTO v_ai_message_id, v_ai_created_at;

  IF v_artifact_id IS NOT NULL THEN
    UPDATE public.chat_artifacts
       SET message_id = v_ai_message_id,
           updated_at = now()
     WHERE id = v_artifact_id
    RETURNING id INTO v_artifact_message_id;
  END IF;

  UPDATE public.chat_messages
     SET status = p_user_status,
         failed_at = CASE WHEN p_user_status = 'failed' THEN now() ELSE NULL END,
         error_message = CASE WHEN p_user_status = 'failed' THEN NULL ELSE NULL END
   WHERE id = p_user_message_id
     AND thread_id = p_thread_id
     AND sender_id = p_sender_id
     AND is_staff_reply = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mensagem do usuário não pertence à thread ou não existe';
  END IF;

  UPDATE public.chat_threads
     SET working_memory = COALESCE(p_updated_memory, working_memory),
         updated_at = now()
   WHERE id = p_thread_id;

  RETURN jsonb_build_object(
    'ai_message_id', v_ai_message_id,
    'ai_created_at', v_ai_created_at,
    'artifact_id', v_artifact_message_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.persist_ai_conversation_exchange_atomic(UUID, UUID, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, JSONB, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_ai_conversation_exchange_atomic(UUID, UUID, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, JSONB, UUID)
  TO service_role;

COMMENT ON FUNCTION public.persist_ai_conversation_exchange_atomic(UUID, UUID, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, JSONB, UUID)
  IS 'Finaliza exchange do Copilot em uma transação: artefato, resposta, status do usuário e memória da thread.';
