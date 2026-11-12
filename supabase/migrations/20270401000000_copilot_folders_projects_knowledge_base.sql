-- Migração: Hierarquia Pastas -> Projetos -> Conversas e Base de Conhecimento RAG por Projeto
-- Data: 2026-11-12
-- Relacionada à Spec: docs/specs/SPEC-20261112-COPILOT-WORKBENCH-MANUS-PARITY-PROJECT-HIERARCHY.md

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 1. Pastas organizacionais do Copilot
CREATE TABLE IF NOT EXISTS public.copilot_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'folder',
  color TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_folders_user ON public.copilot_folders(user_id, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_folders_store ON public.copilot_folders(store_id) WHERE store_id IS NOT NULL;

-- 2. Projetos dedicados do Copilot com instruções próprias
CREATE TABLE IF NOT EXISTS public.copilot_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.copilot_folders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  system_instructions TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_projects_user ON public.copilot_projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_projects_folder ON public.copilot_projects(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_copilot_projects_store ON public.copilot_projects(store_id) WHERE store_id IS NOT NULL;

-- 3. Arquivos da Base de Conhecimento do Projeto
CREATE TABLE IF NOT EXISTS public.copilot_project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.copilot_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT NOT NULL DEFAULT 'text/plain',
  file_size BIGINT NOT NULL DEFAULT 0,
  extracted_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'indexing', 'ready', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_project_files_project ON public.copilot_project_files(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_project_files_user ON public.copilot_project_files(user_id);

-- 4. Chunks e Vetores Semânticos do Projeto (embedding opcional para compatibilidade lexical + vetorial)
CREATE TABLE IF NOT EXISTS public.copilot_project_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.copilot_project_files(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.copilot_projects(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL DEFAULT 0,
  content_chunk TEXT NOT NULL,
  embedding extensions.vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_project_embeddings_project ON public.copilot_project_embeddings(project_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_copilot_project_embeddings_file ON public.copilot_project_embeddings(file_id);

-- 5. Vincular conversas (ai_threads e legado chat_threads) a Pastas e Projetos
ALTER TABLE public.ai_threads
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.copilot_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.copilot_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_threads_folder ON public.ai_threads(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_threads_project ON public.ai_threads(project_id) WHERE project_id IS NOT NULL;

ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.copilot_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.copilot_projects(id) ON DELETE SET NULL;

-- 6. RLS Estrito (Tenant + Dono)
ALTER TABLE public.copilot_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_folders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_project_files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_project_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_project_embeddings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_folders_owner_tenant_access" ON public.copilot_folders;
CREATE POLICY "copilot_folders_owner_tenant_access" ON public.copilot_folders
FOR ALL TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.store_id = copilot_folders.store_id AND wm.profile_id = (SELECT auth.uid())
  ))
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.store_id = copilot_folders.store_id AND wm.profile_id = (SELECT auth.uid())
  ))
);

DROP POLICY IF EXISTS "copilot_projects_owner_tenant_access" ON public.copilot_projects;
CREATE POLICY "copilot_projects_owner_tenant_access" ON public.copilot_projects
FOR ALL TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.store_id = copilot_projects.store_id AND wm.profile_id = (SELECT auth.uid())
  ))
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.store_id = copilot_projects.store_id AND wm.profile_id = (SELECT auth.uid())
  ))
);

DROP POLICY IF EXISTS "copilot_project_files_access" ON public.copilot_project_files;
CREATE POLICY "copilot_project_files_access" ON public.copilot_project_files
FOR ALL TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.copilot_projects p
    WHERE p.id = copilot_project_files.project_id
      AND (
        p.user_id = (SELECT auth.uid())
        OR (p.store_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.store_id = p.store_id AND wm.profile_id = (SELECT auth.uid())
        ))
      )
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.copilot_projects p
    WHERE p.id = copilot_project_files.project_id
      AND (
        p.user_id = (SELECT auth.uid())
        OR (p.store_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.store_id = p.store_id AND wm.profile_id = (SELECT auth.uid())
        ))
      )
  )
);

DROP POLICY IF EXISTS "copilot_project_embeddings_access" ON public.copilot_project_embeddings;
CREATE POLICY "copilot_project_embeddings_access" ON public.copilot_project_embeddings
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.copilot_projects p
    WHERE p.id = copilot_project_embeddings.project_id
      AND (
        p.user_id = (SELECT auth.uid())
        OR (p.store_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.store_id = p.store_id AND wm.profile_id = (SELECT auth.uid())
        ))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.copilot_projects p
    WHERE p.id = copilot_project_embeddings.project_id
      AND (
        p.user_id = (SELECT auth.uid())
        OR (p.store_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.store_id = p.store_id AND wm.profile_id = (SELECT auth.uid())
        ))
      )
  )
);

-- 7. RPC de busca vetorial isolada por projeto (SECURITY INVOKER preserva RLS)
CREATE OR REPLACE FUNCTION public.match_copilot_project_embeddings(
  p_project_id UUID,
  query_embedding extensions.vector(1536),
  match_threshold FLOAT DEFAULT 0.25,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  file_id UUID,
  project_id UUID,
  chunk_index INT,
  content_chunk TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.file_id,
    e.project_id,
    e.chunk_index,
    e.content_chunk,
    (1 - (e.embedding <=> query_embedding))::float AS similarity
  FROM public.copilot_project_embeddings e
  WHERE e.project_id = p_project_id
    AND e.embedding IS NOT NULL
    AND (1 - (e.embedding <=> query_embedding)) >= match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 15);
END;
$$;
