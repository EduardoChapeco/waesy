-- ==============================================================================
-- MIGRAÇÃO: SHELL DE CONVERSA AI-FIRST, ARTEFATOS E THREADS DE PROJETO
-- Suporte a conversas de projeto, memória de trabalho, fixação e artefatos versionados
-- ==============================================================================

-- 1. Atualizar restrição de thread_type em chat_threads para suportar project e ai_assistant
DO $$
BEGIN
  -- Remover constraint antiga se existir
  ALTER TABLE public.chat_threads DROP CONSTRAINT IF EXISTS chat_threads_thread_type_check;
  
  -- Adicionar nova constraint expandida
  ALTER TABLE public.chat_threads 
    ADD CONSTRAINT chat_threads_thread_type_check 
    CHECK (thread_type IN ('store', 'direct_p2p', 'support', 'project', 'ai_assistant'));
END $$;

-- 2. Adicionar colunas de projeto, memória de trabalho e fixação em chat_threads
ALTER TABLE public.chat_threads 
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS working_memory JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_threads_is_pinned ON public.chat_threads(customer_id, is_pinned);

-- 3. Criar tabela de artefatos versionados gerados e manipulados no chat
CREATE TABLE IF NOT EXISTS public.chat_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('document', 'spreadsheet', 'presentation', 'landing_page', 'proposal', 'image')),
  title TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_artifacts_thread ON public.chat_artifacts(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_artifacts_store ON public.chat_artifacts(store_id);
CREATE INDEX IF NOT EXISTS idx_chat_artifacts_type ON public.chat_artifacts(artifact_type);

-- 4. Habilitar RLS em chat_artifacts (Deny-by-Default)
ALTER TABLE public.chat_artifacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_artifacts' AND policyname = 'chat_artifacts_select'
  ) THEN
    CREATE POLICY chat_artifacts_select ON public.chat_artifacts
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() = created_by OR
        EXISTS (
          SELECT 1 FROM public.chat_threads t 
          WHERE t.id = chat_artifacts.thread_id 
          AND (t.customer_id = auth.uid() OR t.recipient_profile_id = auth.uid())
        ) OR
        (store_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm 
          WHERE wm.store_id = chat_artifacts.store_id 
          AND wm.profile_id = auth.uid()
        ))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_artifacts' AND policyname = 'chat_artifacts_modify'
  ) THEN
    CREATE POLICY chat_artifacts_modify ON public.chat_artifacts
      FOR ALL
      TO authenticated
      USING (
        auth.uid() = created_by OR
        (store_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm 
          WHERE wm.store_id = chat_artifacts.store_id 
          AND wm.profile_id = auth.uid()
        ))
      )
      WITH CHECK (
        auth.uid() = created_by OR
        (store_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm 
          WHERE wm.store_id = chat_artifacts.store_id 
          AND wm.profile_id = auth.uid()
        ))
      );
  END IF;
END $$;
