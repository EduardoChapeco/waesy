-- ==============================================================================
-- MIGRAÇÃO: AI OPERATING SYSTEM DOMAIN ISOLATION & CANONICAL SCHEMA
-- Separação canônica absoluta entre Mensageria Humana/Comercial e Inteligência de IA
-- ==============================================================================

-- 1. Tabela Dedicada de Threads de IA (ai_threads)
CREATE TABLE IF NOT EXISTS public.ai_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  domain_type TEXT NOT NULL CHECK (domain_type IN ('personal', 'workspace')),
  title TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  working_memory JSONB NOT NULL DEFAULT '{}'::jsonb,
  pinned BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open',
  last_message_snippet TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_threads_domain_check CHECK (
    (domain_type = 'personal' AND workspace_id IS NULL) OR
    (domain_type = 'workspace' AND workspace_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_threads_user ON public.ai_threads(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_threads_workspace ON public.ai_threads(workspace_id, updated_at DESC) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_threads_pinned ON public.ai_threads(user_id, pinned) WHERE pinned = true;

-- 2. Tabela de Mensagens de IA (ai_messages)
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  run_id UUID,
  client_message_id UUID,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL DEFAULT '',
  structured_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  activity_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
  fsm_phase TEXT,
  fsm_state JSONB,
  error_message TEXT,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_thread ON public.ai_messages(thread_id, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_messages_idempotency ON public.ai_messages(thread_id, client_message_id) WHERE client_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_messages_run ON public.ai_messages(run_id) WHERE run_id IS NOT NULL;

-- 3. Tabela de FSM Durável de Tarefas em Segundo Plano (ai_tasks)
CREATE TABLE IF NOT EXISTS public.ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.ai_threads(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
  run_id UUID,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'planning', 'running', 'waiting_user', 'validating', 'completed', 'failed', 'cancelled')),
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  current_step TEXT,
  steps_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_tokens INT DEFAULT 0,
  actual_tokens INT DEFAULT 0,
  cost_wz NUMERIC DEFAULT 0,
  heartbeat_at TIMESTAMPTZ DEFAULT now(),
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_tasks_user_status ON public.ai_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_thread ON public.ai_tasks(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_heartbeat ON public.ai_tasks(status, heartbeat_at) WHERE status IN ('queued', 'running', 'planning');

-- 4. Tabela Canônica de Artefatos de IA (ai_artifacts)
CREATE TABLE IF NOT EXISTS public.ai_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.ai_threads(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.ai_tasks(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.ai_messages(id) ON DELETE SET NULL,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('document', 'spreadsheet', 'presentation', 'landing_page', 'proposal', 'image', 'video', 'omnibuilder', 'code', 'itinerary', 'travel_itinerary', 'chart', 'interactive_table', 'biolink_cluster', 'builder_bridge', 'travel_dossier', 'document_preview', 'website', 'social_post')),
  title TEXT NOT NULL,
  current_version INT NOT NULL DEFAULT 1,
  storage_path TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_artifacts_thread ON public.ai_artifacts(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_artifacts_user ON public.ai_artifacts(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_artifacts_type ON public.ai_artifacts(artifact_type);

-- 5. Versões de Artefatos (ai_artifact_versions)
CREATE TABLE IF NOT EXISTS public.ai_artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES public.ai_artifacts(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  diff_patch JSONB,
  storage_path TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_artifact_versions_unique UNIQUE (artifact_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_ai_artifact_versions_artifact ON public.ai_artifact_versions(artifact_id, version_number DESC);

-- 6. Registry de Habilidades de IA (ai_skills)
CREATE TABLE IF NOT EXISTS public.ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_official BOOLEAN NOT NULL DEFAULT true,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_tier TEXT NOT NULL DEFAULT 'READ' CHECK (risk_tier IN ('READ', 'WRITE', 'EXTERNAL_WRITE', 'FINANCIAL', 'IRREVERSIBLE')),
  input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_skills_enabled ON public.ai_skills(is_enabled, slug);

-- 7. Conectores e Integrações de IA (ai_connectors)
CREATE TABLE IF NOT EXISTS public.ai_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'slack', 'notion', 'github', 'email', 'custom')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'needs_reauth')),
  scopes TEXT[] NOT NULL DEFAULT '{}',
  account_identifier TEXT,
  encrypted_credentials JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_connectors_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_ai_connectors_user ON public.ai_connectors(user_id);

-- 8. Tarefas Agendadas de IA (ai_scheduled_tasks)
CREATE TABLE IF NOT EXISTS public.ai_scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'autonomous_prompt',
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_scheduled_tasks_active ON public.ai_scheduled_tasks(is_active, next_run_at) WHERE is_active = true;

-- ==============================================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY) DENY-BY-DEFAULT
-- ==============================================================================

ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_artifact_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- RLS: ai_threads
CREATE POLICY "ai_threads_owner_access" ON public.ai_threads
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (workspace_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = ai_threads.workspace_id AND wm.profile_id = auth.uid()
    ))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (workspace_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = ai_threads.workspace_id AND wm.profile_id = auth.uid()
    ))
  );

-- RLS: ai_messages
CREATE POLICY "ai_messages_thread_owner_access" ON public.ai_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_threads t
      WHERE t.id = ai_messages.thread_id
      AND (
        t.user_id = auth.uid() OR
        (t.workspace_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.store_id = t.workspace_id AND wm.profile_id = auth.uid()
        ))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_threads t
      WHERE t.id = ai_messages.thread_id
      AND (
        t.user_id = auth.uid() OR
        (t.workspace_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.store_id = t.workspace_id AND wm.profile_id = auth.uid()
        ))
      )
    )
  );

-- RLS: ai_tasks
CREATE POLICY "ai_tasks_owner_access" ON public.ai_tasks
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (workspace_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = ai_tasks.workspace_id AND wm.profile_id = auth.uid()
    ))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (workspace_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = ai_tasks.workspace_id AND wm.profile_id = auth.uid()
    ))
  );

-- RLS: ai_artifacts
CREATE POLICY "ai_artifacts_owner_access" ON public.ai_artifacts
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (workspace_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = ai_artifacts.workspace_id AND wm.profile_id = auth.uid()
    ))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (workspace_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = ai_artifacts.workspace_id AND wm.profile_id = auth.uid()
    ))
  );

-- RLS: ai_artifact_versions
CREATE POLICY "ai_artifact_versions_owner_access" ON public.ai_artifact_versions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_artifacts a
      WHERE a.id = ai_artifact_versions.artifact_id
      AND (
        a.user_id = auth.uid() OR
        (a.workspace_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.store_id = a.workspace_id AND wm.profile_id = auth.uid()
        ))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_artifacts a
      WHERE a.id = ai_artifact_versions.artifact_id
      AND (
        a.user_id = auth.uid() OR
        (a.workspace_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.store_id = a.workspace_id AND wm.profile_id = auth.uid()
        ))
      )
    )
  );

-- RLS: ai_skills
CREATE POLICY "ai_skills_select" ON public.ai_skills
  FOR SELECT
  TO authenticated
  USING (is_official = true OR owner_id = auth.uid());

CREATE POLICY "ai_skills_modify" ON public.ai_skills
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- RLS: ai_connectors
CREATE POLICY "ai_connectors_user_access" ON public.ai_connectors
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: ai_scheduled_tasks
CREATE POLICY "ai_scheduled_tasks_user_access" ON public.ai_scheduled_tasks
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (workspace_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = ai_scheduled_tasks.workspace_id AND wm.profile_id = auth.uid()
    ))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (workspace_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = ai_scheduled_tasks.workspace_id AND wm.profile_id = auth.uid()
    ))
  );

-- ==============================================================================
-- MIGRAÇÃO RETROATIVA DE DADOS & HIGIENIZAÇÃO DE chat_threads
-- ==============================================================================

-- 1. Copiar threads de IA para ai_threads
INSERT INTO public.ai_threads (
  id,
  user_id,
  workspace_id,
  domain_type,
  title,
  metadata,
  working_memory,
  pinned,
  archived,
  status,
  created_at,
  updated_at
)
SELECT
  id,
  customer_id,
  store_id,
  CASE WHEN store_id IS NULL THEN 'personal' ELSE 'workspace' END,
  COALESCE(subject, 'Conversa de IA'),
  COALESCE(metadata, '{}'::jsonb),
  COALESCE(working_memory, '{}'::jsonb),
  COALESCE(is_pinned, false),
  false,
  COALESCE(status, 'open'),
  created_at,
  updated_at
FROM public.chat_threads
WHERE (thread_type IN ('ai_assistant', 'copilot', 'project')
   OR context_type IN ('ai_assistant', 'copilot', 'project')
   OR metadata->>'is_copilot' = 'true'
   OR metadata->>'agent_mode' IS NOT NULL)
  AND customer_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Copiar mensagens dessas threads para ai_messages
INSERT INTO public.ai_messages (
  id,
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
  fsm_state,
  created_at
)
SELECT
  m.id,
  m.thread_id,
  CASE WHEN m.is_staff_reply THEN 'assistant' ELSE 'user' END,
  m.sender_id,
  COALESCE(m.message, ''),
  COALESCE(m.payload, '{}'::jsonb),
  COALESCE(m.attachments, '[]'::jsonb),
  COALESCE(m.status, 'delivered'),
  COALESCE(m.payload->'activitySteps', '[]'::jsonb),
  COALESCE(m.payload->'toolCalls', '[]'::jsonb),
  m.payload->>'fsmPhase',
  m.payload->'fsmState',
  m.created_at
FROM public.chat_messages m
JOIN public.ai_threads t ON t.id = m.thread_id
ON CONFLICT (id) DO NOTHING;

-- 3. Copiar artefatos de chat dessas threads para ai_artifacts
INSERT INTO public.ai_artifacts (
  id,
  user_id,
  workspace_id,
  thread_id,
  message_id,
  artifact_type,
  title,
  current_version,
  data,
  metadata,
  created_at,
  updated_at
)
SELECT
  a.id,
  COALESCE(a.created_by, t.user_id),
  a.store_id,
  a.thread_id,
  a.message_id,
  a.artifact_type,
  a.title,
  COALESCE(a.version, 1),
  COALESCE(a.data, '{}'::jsonb),
  COALESCE(a.metadata, '{}'::jsonb),
  a.created_at,
  a.updated_at
FROM public.chat_artifacts a
JOIN public.ai_threads t ON t.id = a.thread_id
ON CONFLICT (id) DO NOTHING;

-- 4. Excluir as threads migradas de chat_threads (e cascatear mensagens/artefatos)
DELETE FROM public.chat_threads
WHERE id IN (SELECT id FROM public.ai_threads);

-- ==============================================================================
-- ATUALIZAÇÃO DA RPC ATÔMICA DE EXCHANGE (persist_ai_conversation_exchange_atomic)
-- Compatibilidade total: atua em ai_threads/ai_messages/ai_artifacts se existir,
-- ou em chat_threads/chat_messages/chat_artifacts como fallback.
-- ==============================================================================

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
  v_is_ai_thread BOOLEAN := false;
  v_ai_message_id UUID;
  v_ai_created_at TIMESTAMPTZ;
  v_artifact_id UUID;
BEGIN
  IF p_thread_id IS NULL OR p_user_message_id IS NULL OR p_sender_id IS NULL THEN
    RAISE EXCEPTION 'exchange inválido: thread, mensagem do usuário e sender são obrigatórios';
  END IF;

  -- 1. Verifica se a thread pertence ao domínio canônico ai_threads
  SELECT true INTO v_is_ai_thread
  FROM public.ai_threads
  WHERE id = p_thread_id
  FOR UPDATE;

  IF v_is_ai_thread THEN
    -- Inserir artefato em ai_artifacts se fornecido
    IF p_artifact IS NOT NULL AND jsonb_typeof(p_artifact) = 'object' THEN
      INSERT INTO public.ai_artifacts (
        thread_id, workspace_id, user_id, artifact_type, title, current_version, data, metadata
      ) VALUES (
        p_thread_id,
        p_store_id,
        p_sender_id,
        p_artifact->>'type',
        COALESCE(p_artifact->>'title', 'Artefato sem título'),
        COALESCE((p_artifact->>'version')::INTEGER, 1),
        COALESCE(p_artifact->'data', '{}'::JSONB),
        jsonb_build_object(
          'authorName', p_artifact->>'authorName',
          'authorRole', p_artifact->>'authorRole',
          'previewSummary', p_artifact->>'previewSummary'
        )
      )
      RETURNING id INTO v_artifact_id;
    END IF;

    -- Inserir resposta do assistente em ai_messages
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

    -- Vincular message_id ao artefato
    IF v_artifact_id IS NOT NULL THEN
      UPDATE public.ai_artifacts
         SET message_id = v_ai_message_id,
             updated_at = now()
       WHERE id = v_artifact_id;
    END IF;

    -- Atualizar status da mensagem do usuário em ai_messages
    UPDATE public.ai_messages
       SET status = p_user_status,
           failed_at = CASE WHEN p_user_status = 'failed' THEN now() ELSE NULL END
     WHERE id = p_user_message_id
       AND thread_id = p_thread_id;

    -- Atualizar memória de trabalho e carimbo da thread
    UPDATE public.ai_threads
       SET working_memory = COALESCE(p_updated_memory, working_memory),
           last_message_snippet = LEFT(p_ai_message, 120),
           last_message_at = v_ai_created_at,
           updated_at = now()
     WHERE id = p_thread_id;

    RETURN jsonb_build_object(
      'ai_message_id', v_ai_message_id,
      'ai_created_at', v_ai_created_at,
      'artifact_id', v_artifact_id
    );

  ELSE
    -- Fallback: domínios legados de chat_threads
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
      RAISE EXCEPTION 'mensagem do usuário não pertence à thread ou não existe';
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
$$;

REVOKE ALL ON FUNCTION public.persist_ai_conversation_exchange_atomic(UUID, UUID, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.persist_ai_conversation_exchange_atomic(UUID, UUID, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, JSONB, UUID) TO authenticated, service_role;
