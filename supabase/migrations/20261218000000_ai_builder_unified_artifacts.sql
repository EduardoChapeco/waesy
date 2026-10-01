-- 20261218000000_ai_builder_unified_artifacts.sql
-- Prompt 25: Builders Nativizados e Dirigidos por IA (site, documento, PDF, apresentação, arte)
-- Adiciona colunas para controle de qualidade por rubrica (score >= 80), vinculação bidirecional
-- entre experience_documents e chat_artifacts, e metadados de arquétipo/nicho.

-- 1. Ampliar experience_documents com score de qualidade e vínculo de artefato de chat
ALTER TABLE public.experience_documents
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quality_rubric JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS chat_artifact_id UUID REFERENCES public.chat_artifacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS artifact_archetype TEXT DEFAULT 'site',
  ADD COLUMN IF NOT EXISTS niche TEXT DEFAULT 'general';

CREATE INDEX IF NOT EXISTS idx_exp_docs_chat_artifact ON public.experience_documents(chat_artifact_id);
CREATE INDEX IF NOT EXISTS idx_exp_docs_archetype ON public.experience_documents(artifact_archetype);
CREATE INDEX IF NOT EXISTS idx_exp_docs_quality ON public.experience_documents(quality_score);

-- 2. Vincular chat_artifacts diretamente ao documento do builder para abertura em 1 clique
ALTER TABLE public.chat_artifacts
  ADD COLUMN IF NOT EXISTS experience_document_id UUID REFERENCES public.experience_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quality_rubric JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_chat_artifacts_exp_doc ON public.chat_artifacts(experience_document_id);

-- 3. Atualizar e reforçar RLS para leitura e escrita multi-tenant de documentos de experiência
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'experience_documents' 
    AND policyname = 'experience_documents_store_team_all'
  ) THEN
    CREATE POLICY experience_documents_store_team_all ON public.experience_documents
      FOR ALL
      TO authenticated
      USING (
        public.is_store_staff(store_id)
      )
      WITH CHECK (
        public.is_store_staff(store_id)
      );
  END IF;
END $$;
