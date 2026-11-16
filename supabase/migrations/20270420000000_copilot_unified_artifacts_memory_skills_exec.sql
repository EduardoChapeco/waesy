-- Migration: 20270420000000_copilot_unified_artifacts_memory_skills_exec.sql
-- Unifica contratos de artefatos do Copilot, RLS de ai_skills/ai_memory_layers,
-- colunas de telemetria real de execucao, bucket copilot-uploads e RPC atomica.

BEGIN;

-- 1. Expandir ai_artifacts com metadados de bridge e todos os tipos canonicos
ALTER TABLE public.ai_artifacts
  ADD COLUMN IF NOT EXISTS builder_document_id uuid REFERENCES public.workspace_builder_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS experience_document_id uuid REFERENCES public.experience_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS render_mode text,
  ADD COLUMN IF NOT EXISTS export_urls jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ai_artifacts
  DROP CONSTRAINT IF EXISTS ai_artifacts_artifact_type_check;

ALTER TABLE public.ai_artifacts
  ADD CONSTRAINT ai_artifacts_artifact_type_check CHECK (
    artifact_type = ANY (ARRAY[
      'document'::text,
      'spreadsheet'::text,
      'presentation'::text,
      'landing_page'::text,
      'proposal'::text,
      'image'::text,
      'video'::text,
      'omnibuilder'::text,
      'code'::text,
      'itinerary'::text,
      'travel_itinerary'::text,
      'chart'::text,
      'interactive_table'::text,
      'biolink_cluster'::text,
      'builder_bridge'::text,
      'travel_dossier'::text,
      'document_preview'::text,
      'website'::text,
      'social_post'::text,
      'creative_post'::text,
      'dashboard'::text,
      'map_view'::text,
      'carousel'::text,
      'motion_video'::text,
      'simlab_report'::text,
      'business_plan'::text,
      'web_app'::text,
      'schedule_plan'::text
    ])
  );

CREATE INDEX IF NOT EXISTS idx_ai_artifacts_thread_created
  ON public.ai_artifacts (thread_id, created_at DESC)
  WHERE thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_artifacts_builder_document_id
  ON public.ai_artifacts (builder_document_id)
  WHERE builder_document_id IS NOT NULL;

-- Alinhar fallback legado de chat_artifacts e copilot_chat_artifacts para evitar violacoes 23514
ALTER TABLE public.chat_artifacts
  DROP CONSTRAINT IF EXISTS chat_artifacts_artifact_type_check;

ALTER TABLE public.chat_artifacts
  ADD CONSTRAINT chat_artifacts_artifact_type_check CHECK (
    artifact_type = ANY (ARRAY[
      'document'::text,
      'spreadsheet'::text,
      'presentation'::text,
      'landing_page'::text,
      'proposal'::text,
      'image'::text,
      'video'::text,
      'omnibuilder'::text,
      'code'::text,
      'itinerary'::text,
      'travel_itinerary'::text,
      'chart'::text,
      'interactive_table'::text,
      'biolink_cluster'::text,
      'builder_bridge'::text,
      'travel_dossier'::text,
      'document_preview'::text,
      'website'::text,
      'social_post'::text,
      'creative_post'::text,
      'dashboard'::text,
      'map_view'::text,
      'carousel'::text,
      'motion_video'::text,
      'simlab_report'::text,
      'business_plan'::text,
      'web_app'::text,
      'schedule_plan'::text
    ])
  );

ALTER TABLE public.copilot_chat_artifacts
  DROP CONSTRAINT IF EXISTS copilot_chat_artifacts_artifact_type_check;

ALTER TABLE public.copilot_chat_artifacts
  ADD CONSTRAINT copilot_chat_artifacts_artifact_type_check CHECK (
    artifact_type = ANY (ARRAY[
      'chart'::text,
      'interactive_table'::text,
      'biolink_cluster'::text,
      'builder_bridge'::text,
      'travel_dossier'::text,
      'document_preview'::text,
      'document'::text,
      'spreadsheet'::text,
      'presentation'::text,
      'landing_page'::text,
      'proposal'::text,
      'image'::text,
      'video'::text,
      'omnibuilder'::text,
      'code'::text,
      'itinerary'::text,
      'travel_itinerary'::text,
      'website'::text,
      'social_post'::text,
      'creative_post'::text,
      'dashboard'::text,
      'map_view'::text,
      'carousel'::text,
      'motion_video'::text,
      'simlab_report'::text,
      'business_plan'::text,
      'web_app'::text,
      'schedule_plan'::text
    ])
  );

-- 2. Estender ai_skills para suportar skills customizadas por workspace/usuario e gating real de ferramentas
ALTER TABLE public.ai_skills
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS allowed_tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS system_instructions text,
  ADD COLUMN IF NOT EXISTS model_preference text;

CREATE INDEX IF NOT EXISTS idx_ai_skills_store_id
  ON public.ai_skills (store_id)
  WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_skills_owner_id
  ON public.ai_skills (owner_id)
  WHERE owner_id IS NOT NULL;

DROP POLICY IF EXISTS "Qualquer usuário autenticado visualiza skills ativas" ON public.ai_skills;
DROP POLICY IF EXISTS ai_skills_select ON public.ai_skills;
DROP POLICY IF EXISTS ai_skills_modify ON public.ai_skills;
DROP POLICY IF EXISTS ai_skills_select_scoped ON public.ai_skills;
DROP POLICY IF EXISTS ai_skills_insert_scoped ON public.ai_skills;
DROP POLICY IF EXISTS ai_skills_update_scoped ON public.ai_skills;
DROP POLICY IF EXISTS ai_skills_delete_scoped ON public.ai_skills;

CREATE POLICY ai_skills_select_scoped
  ON public.ai_skills
  FOR SELECT
  TO authenticated
  USING (
    ((is_system = true OR is_official = true) AND is_active = true)
    OR owner_id = (SELECT auth.uid())
    OR (store_id IS NOT NULL AND public.is_store_staff(store_id))
    OR public.is_platform_admin()
  );

CREATE POLICY ai_skills_insert_scoped
  ON public.ai_skills
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (NOT is_system)
    AND (
      owner_id = (SELECT auth.uid())
      OR (store_id IS NOT NULL AND public.is_store_staff(store_id))
      OR public.is_platform_admin()
    )
  );

CREATE POLICY ai_skills_update_scoped
  ON public.ai_skills
  FOR UPDATE
  TO authenticated
  USING (
    (NOT is_system)
    AND (
      owner_id = (SELECT auth.uid())
      OR (store_id IS NOT NULL AND public.is_store_staff(store_id))
      OR public.is_platform_admin()
    )
  )
  WITH CHECK (
    (NOT is_system)
    AND (
      owner_id = (SELECT auth.uid())
      OR (store_id IS NOT NULL AND public.is_store_staff(store_id))
      OR public.is_platform_admin()
    )
  );

CREATE POLICY ai_skills_delete_scoped
  ON public.ai_skills
  FOR DELETE
  TO authenticated
  USING (
    (NOT is_system)
    AND (
      owner_id = (SELECT auth.uid())
      OR (store_id IS NOT NULL AND public.is_store_staff(store_id))
      OR public.is_platform_admin()
    )
  );

-- 3. Liberar acesso multi-tenant de staff para camadas de memoria da empresa (brand/niche/product)
DROP POLICY IF EXISTS ai_memory_store_staff ON public.ai_memory_layers;

CREATE POLICY ai_memory_store_staff
  ON public.ai_memory_layers
  FOR ALL
  TO authenticated
  USING (
    owner_store_id IS NOT NULL
    AND public.is_store_staff(owner_store_id)
  )
  WITH CHECK (
    owner_store_id IS NOT NULL
    AND public.is_store_staff(owner_store_id)
  );

CREATE INDEX IF NOT EXISTS idx_ai_memory_layers_store
  ON public.ai_memory_layers (owner_store_id, layer_type, updated_at DESC)
  WHERE owner_store_id IS NOT NULL;

-- 4. Estender copilot_execution_steps com telemetria real de browser e tool logs
ALTER TABLE public.copilot_execution_steps
  ADD COLUMN IF NOT EXISTS tool_logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS screenshot_url text,
  ADD COLUMN IF NOT EXISTS browser_url text,
  ADD COLUMN IF NOT EXISTS driver text;

-- 5. Garantir bucket copilot-uploads e politicas de storage seguras
INSERT INTO storage.buckets (id, name, public)
VALUES ('copilot-uploads', 'copilot-uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS copilot_uploads_public_read ON storage.objects;
DROP POLICY IF EXISTS copilot_uploads_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS copilot_uploads_authenticated_update ON storage.objects;
DROP POLICY IF EXISTS copilot_uploads_authenticated_delete ON storage.objects;

CREATE POLICY copilot_uploads_public_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'copilot-uploads');

CREATE POLICY copilot_uploads_authenticated_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'copilot-uploads'
    AND (
      owner = (SELECT auth.uid())
      OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
      OR (storage.foldername(name))[2] = (SELECT auth.uid()::text)
      OR EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.profile_id = (SELECT auth.uid())
          AND (
            wm.store_id::text = (storage.foldername(name))[1]
            OR wm.store_id::text = (storage.foldername(name))[2]
          )
      )
      OR public.is_platform_admin()
    )
  );

CREATE POLICY copilot_uploads_authenticated_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'copilot-uploads'
    AND (
      owner = (SELECT auth.uid())
      OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
      OR (storage.foldername(name))[2] = (SELECT auth.uid()::text)
      OR EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.profile_id = (SELECT auth.uid())
          AND (
            wm.store_id::text = (storage.foldername(name))[1]
            OR wm.store_id::text = (storage.foldername(name))[2]
          )
      )
      OR public.is_platform_admin()
    )
  )
  WITH CHECK (bucket_id = 'copilot-uploads');

CREATE POLICY copilot_uploads_authenticated_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'copilot-uploads'
    AND (
      owner = (SELECT auth.uid())
      OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
      OR (storage.foldername(name))[2] = (SELECT auth.uid()::text)
      OR EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.profile_id = (SELECT auth.uid())
          AND (
            wm.store_id::text = (storage.foldername(name))[1]
            OR wm.store_id::text = (storage.foldername(name))[2]
          )
      )
      OR public.is_platform_admin()
    )
  );

-- 6. Atualizar RPC atomica persist_ai_conversation_exchange_atomic preservando assinatura e normalizando artifact_type
CREATE OR REPLACE FUNCTION public.persist_ai_conversation_exchange_atomic(
  p_thread_id uuid,
  p_user_message_id uuid,
  p_sender_id uuid,
  p_user_status text,
  p_ai_message text,
  p_ai_message_type text,
  p_ai_payload jsonb,
  p_ai_status text,
  p_updated_memory jsonb,
  p_artifact jsonb DEFAULT NULL::jsonb,
  p_store_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_is_ai_thread BOOLEAN := false;
  v_ai_message_id UUID;
  v_ai_created_at TIMESTAMPTZ;
  v_artifact_id UUID;
  v_artifact_type TEXT;
  v_builder_doc_id UUID;
  v_exp_doc_id UUID;
BEGIN
  IF p_thread_id IS NULL OR p_user_message_id IS NULL OR p_sender_id IS NULL THEN
    RAISE EXCEPTION 'exchange invalido: thread, mensagem do usuario e sender sao obrigatorios';
  END IF;

  IF p_artifact IS NOT NULL AND jsonb_typeof(p_artifact) = 'object' THEN
    v_artifact_type := COALESCE(NULLIF(LOWER(TRIM(p_artifact->>'type')), ''), 'document');
    v_artifact_type := CASE v_artifact_type
      WHEN 'travel' THEN 'travel_itinerary'
      WHEN 'table' THEN 'interactive_table'
      WHEN 'biolink' THEN 'biolink_cluster'
      WHEN 'presentation_deck' THEN 'presentation'
      ELSE v_artifact_type
    END;

    IF (p_artifact->>'builderDocumentId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_builder_doc_id := (p_artifact->>'builderDocumentId')::UUID;
    END IF;

    IF (p_artifact->>'experienceDocumentId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_exp_doc_id := (p_artifact->>'experienceDocumentId')::UUID;
    END IF;
  END IF;

  SELECT true INTO v_is_ai_thread
  FROM public.ai_threads
  WHERE id = p_thread_id
  FOR UPDATE;

  IF v_is_ai_thread THEN
    IF p_artifact IS NOT NULL AND jsonb_typeof(p_artifact) = 'object' THEN
      INSERT INTO public.ai_artifacts (
        thread_id,
        workspace_id,
        user_id,
        artifact_type,
        title,
        current_version,
        data,
        metadata,
        builder_document_id,
        experience_document_id,
        render_mode,
        export_urls
      ) VALUES (
        p_thread_id,
        p_store_id,
        p_sender_id,
        v_artifact_type,
        COALESCE(NULLIF(p_artifact->>'title', ''), 'Artefato sem titulo'),
        COALESCE((p_artifact->>'version')::INTEGER, 1),
        COALESCE(p_artifact->'data', '{}'::JSONB),
        jsonb_strip_nulls(
          jsonb_build_object(
            'authorName', p_artifact->>'authorName',
            'authorRole', p_artifact->>'authorRole',
            'previewSummary', p_artifact->>'previewSummary'
          )
        ),
        v_builder_doc_id,
        v_exp_doc_id,
        p_artifact->>'renderMode',
        COALESCE(p_artifact->'exportUrls', '{}'::JSONB)
      )
      RETURNING id INTO v_artifact_id;
    END IF;

    INSERT INTO public.ai_messages (
      thread_id,
      role,
      sender_id,
      content,
      structured_payload,
      attachments,
      status,
      activity_steps,
      tool_calls,
      fsm_phase,
      fsm_state
    ) VALUES (
      p_thread_id,
      'assistant',
      p_sender_id,
      COALESCE(p_ai_message, ''),
      CASE
        WHEN v_artifact_id IS NULL THEN COALESCE(p_ai_payload, '{}'::JSONB)
        ELSE jsonb_set(COALESCE(p_ai_payload, '{}'::JSONB), '{artifact,id}', to_jsonb(v_artifact_id::TEXT), true)
      END,
      '[]'::JSONB,
      p_ai_status,
      COALESCE(p_ai_payload->'activitySteps', '[]'::JSONB),
      COALESCE(p_ai_payload->'toolCalls', '[]'::JSONB),
      p_ai_payload->>'fsmPhase',
      p_ai_payload->'fsmState'
    )
    RETURNING id, created_at INTO v_ai_message_id, v_ai_created_at;

    IF v_artifact_id IS NOT NULL THEN
      UPDATE public.ai_artifacts
         SET message_id = v_ai_message_id,
             updated_at = now()
       WHERE id = v_artifact_id;
    END IF;

    UPDATE public.ai_messages
       SET status = p_user_status,
           failed_at = CASE WHEN p_user_status = 'failed' THEN now() ELSE NULL END
     WHERE id = p_user_message_id
       AND thread_id = p_thread_id;

    UPDATE public.ai_threads
       SET working_memory = COALESCE(p_updated_memory, working_memory),
           last_message_snippet = LEFT(COALESCE(p_ai_message, ''), 120),
           last_message_at = v_ai_created_at,
           updated_at = now()
     WHERE id = p_thread_id;

    RETURN jsonb_build_object(
      'ai_message_id', v_ai_message_id,
      'ai_created_at', v_ai_created_at,
      'artifact_id', v_artifact_id
    );

  ELSE
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
        v_artifact_type,
        p_artifact->>'title',
        COALESCE((p_artifact->>'version')::INTEGER, 1),
        COALESCE(p_artifact->'data', '{}'::JSONB),
        jsonb_strip_nulls(
          jsonb_build_object(
            'authorName', p_artifact->>'authorName',
            'authorRole', p_artifact->>'authorRole'
          )
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
       WHERE id = v_artifact_id;
    END IF;

    UPDATE public.chat_messages
       SET status = p_user_status,
           failed_at = CASE WHEN p_user_status = 'failed' THEN now() ELSE NULL END
     WHERE id = p_user_message_id
       AND thread_id = p_thread_id
       AND sender_id = p_sender_id
       AND is_staff_reply = false;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'mensagem do usuario nao pertence a thread ou nao existe';
    END IF;

    UPDATE public.chat_threads
       SET working_memory = COALESCE(p_updated_memory, working_memory),
           updated_at = now()
     WHERE id = p_thread_id;

    RETURN jsonb_build_object(
      'ai_message_id', v_ai_message_id,
      'ai_created_at', v_ai_created_at,
      'artifact_id', v_artifact_id
    );
  END IF;
END;
$function$;

COMMIT;
