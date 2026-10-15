-- 20270127000000_copilot_autonomous_memory_and_builders.sql
-- Ecossistema Autônomo Copilot 3.0 & Realtime Omni-Builder
-- Habilita pgvector, tabelas de memória vetorial, fatos episódicos do usuário,
-- documentos unificados de produtividade e artefatos de chat generativo.

-- 1. Habilitar pgvector para recuperação semântica
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- View de compatibilidade com ai_conversations se apontada para chat_threads
CREATE OR REPLACE VIEW public.ai_conversations AS
  SELECT 
    id,
    customer_id,
    store_id,
    subject AS title,
    thread_type,
    status,
    created_at,
    updated_at
  FROM public.chat_threads;

-- 2. Memória Semântica de Conversas (RAG Vetorial de Longo Prazo)
CREATE TABLE IF NOT EXISTS public.copilot_semantic_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_chunk TEXT NOT NULL,
    embedding extensions.vector(1536) NOT NULL,
    entity_references JSONB DEFAULT '{}'::jsonb,
    importance_score NUMERIC(3,2) DEFAULT 0.50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copilot_semantic_memory_session
ON public.copilot_semantic_memory(session_id);

CREATE INDEX IF NOT EXISTS idx_copilot_semantic_memory_profile
ON public.copilot_semantic_memory(profile_id);

CREATE INDEX IF NOT EXISTS idx_copilot_semantic_memory_vector 
ON public.copilot_semantic_memory 
USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- 3. Grafo de Fatos e Preferências do Usuário (Memória Viva)
CREATE TABLE IF NOT EXISTS public.user_memory_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('business', 'personal', 'travel', 'career', 'preference')),
    fact_key TEXT NOT NULL,
    fact_value TEXT NOT NULL,
    confidence NUMERIC(3,2) DEFAULT 1.00,
    source_conversation_id UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, fact_key)
);

CREATE INDEX IF NOT EXISTS idx_user_memory_facts_profile
ON public.user_memory_facts(profile_id);

CREATE INDEX IF NOT EXISTS idx_user_memory_facts_category
ON public.user_memory_facts(category);

-- 4. Documentos Unificados dos 5 Builders (Real-Time Document Engine)
CREATE TABLE IF NOT EXISTS public.workspace_builder_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    author_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('document', 'spreadsheet', 'presentation', 'website', 'social_post', 'travel_itinerary')),
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    current_version INT DEFAULT 1,
    content_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    compiled_html TEXT,
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    public_token TEXT UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_builder_docs_store
ON public.workspace_builder_documents(store_id);

CREATE INDEX IF NOT EXISTS idx_workspace_builder_docs_author
ON public.workspace_builder_documents(author_profile_id);

CREATE INDEX IF NOT EXISTS idx_workspace_builder_docs_slug
ON public.workspace_builder_documents(slug);

CREATE INDEX IF NOT EXISTS idx_workspace_builder_docs_token
ON public.workspace_builder_documents(public_token) WHERE public_token IS NOT NULL;

-- 5. Artefatos de Generative UI Gerados no Chat
CREATE TABLE IF NOT EXISTS public.copilot_chat_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL CHECK (artifact_type IN ('chart', 'interactive_table', 'biolink_cluster', 'builder_bridge', 'travel_dossier', 'document_preview')),
    title TEXT NOT NULL,
    payload JSONB NOT NULL,
    action_schema JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copilot_chat_artifacts_session
ON public.copilot_chat_artifacts(session_id);

CREATE INDEX IF NOT EXISTS idx_copilot_chat_artifacts_message
ON public.copilot_chat_artifacts(message_id);

-- ============================================================
-- Políticas de Segurança RLS (Zero-Trust Deny-By-Default)
-- ============================================================

ALTER TABLE public.copilot_semantic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_builder_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_chat_artifacts ENABLE ROW LEVEL SECURITY;

-- 1. copilot_semantic_memory
CREATE POLICY "copilot_semantic_memory_owner_select"
ON public.copilot_semantic_memory FOR SELECT
USING (
  auth.uid() = profile_id 
  OR EXISTS (
    SELECT 1 FROM public.chat_threads t 
    WHERE t.id = session_id AND (t.customer_id = auth.uid() OR t.recipient_profile_id = auth.uid())
  )
);

CREATE POLICY "copilot_semantic_memory_owner_insert"
ON public.copilot_semantic_memory FOR INSERT
WITH CHECK (
  auth.uid() = profile_id 
  OR EXISTS (
    SELECT 1 FROM public.chat_threads t 
    WHERE t.id = session_id AND (t.customer_id = auth.uid() OR t.recipient_profile_id = auth.uid())
  )
);

CREATE POLICY "copilot_semantic_memory_owner_modify"
ON public.copilot_semantic_memory FOR ALL
USING (auth.uid() = profile_id);

-- 2. user_memory_facts
CREATE POLICY "user_memory_facts_owner_select"
ON public.user_memory_facts FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "user_memory_facts_owner_all"
ON public.user_memory_facts FOR ALL
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- 3. workspace_builder_documents
CREATE POLICY "workspace_builder_documents_public_read"
ON public.workspace_builder_documents FOR SELECT
USING (is_public = TRUE);

CREATE POLICY "workspace_builder_documents_author_select"
ON public.workspace_builder_documents FOR SELECT
USING (
  auth.uid() = author_profile_id
  OR (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = workspace_builder_documents.store_id
      AND sm.profile_id = auth.uid()
      AND sm.role IN ('owner', 'admin', 'manager', 'editor')
  ))
);

CREATE POLICY "workspace_builder_documents_author_insert"
ON public.workspace_builder_documents FOR INSERT
WITH CHECK (
  auth.uid() = author_profile_id
  OR (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = workspace_builder_documents.store_id
      AND sm.profile_id = auth.uid()
      AND sm.role IN ('owner', 'admin', 'manager', 'editor')
  ))
);

CREATE POLICY "workspace_builder_documents_author_modify"
ON public.workspace_builder_documents FOR ALL
USING (
  auth.uid() = author_profile_id
  OR (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = workspace_builder_documents.store_id
      AND sm.profile_id = auth.uid()
      AND sm.role IN ('owner', 'admin', 'manager', 'editor')
  ))
);

-- 4. copilot_chat_artifacts
CREATE POLICY "copilot_chat_artifacts_participant_select"
ON public.copilot_chat_artifacts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id = session_id
      AND (
        t.customer_id = auth.uid()
        OR t.recipient_profile_id = auth.uid()
        OR (t.store_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.store_members sm
          WHERE sm.store_id = t.store_id AND sm.profile_id = auth.uid()
        ))
      )
  )
);

CREATE POLICY "copilot_chat_artifacts_participant_all"
ON public.copilot_chat_artifacts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id = session_id
      AND (
        t.customer_id = auth.uid()
        OR t.recipient_profile_id = auth.uid()
        OR (t.store_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.store_members sm
          WHERE sm.store_id = t.store_id AND sm.profile_id = auth.uid()
        ))
      )
  )
);

-- ============================================================
-- 6. Função RPC de Busca Vetorial Semântica por Cosseno
-- ============================================================

CREATE OR REPLACE FUNCTION public.match_copilot_semantic_memory(
  query_embedding extensions.vector(1536),
  match_threshold float DEFAULT 0.25,
  match_count int DEFAULT 5,
  filter_profile_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  profile_id uuid,
  content_chunk text,
  entity_references jsonb,
  importance_score numeric(3,2),
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.session_id,
    m.profile_id,
    m.content_chunk,
    m.entity_references,
    m.importance_score,
    m.created_at,
    (1 - (m.embedding <=> query_embedding))::float AS similarity
  FROM public.copilot_semantic_memory m
  WHERE (filter_profile_id IS NULL OR m.profile_id = filter_profile_id)
    AND (1 - (m.embedding <=> query_embedding)) >= match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

