-- Document Artifacts: camada canônica de arquivos, extração e vínculos
-- Regra: o arquivo original nunca é substituído; extrações são rastreáveis e revisáveis.
BEGIN;

CREATE TABLE IF NOT EXISTS public.document_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  bucket_id text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes bigint,
  sha256 text,
  source_kind text NOT NULL DEFAULT 'upload'
    CHECK (source_kind IN ('upload','onboarding','crawler','financial','catalog','brand','chat','system')),
  extraction_status text NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending','queued','processing','completed','needs_review','failed','not_applicable')),
  extraction_engine text,
  extraction_version text,
  extracted_text text,
  structured_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code text,
  error_message text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, bucket_id, storage_path)
);

CREATE TABLE IF NOT EXISTS public.document_artifact_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES public.document_artifacts(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  relation text NOT NULL DEFAULT 'attachment',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artifact_id, entity_type, entity_id, relation)
);

CREATE INDEX IF NOT EXISTS idx_document_artifacts_store_status
  ON public.document_artifacts(store_id, extraction_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_artifacts_sha256
  ON public.document_artifacts(store_id, sha256) WHERE sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_links_entity
  ON public.document_artifact_links(store_id, entity_type, entity_id);

ALTER TABLE public.document_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_artifact_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store staff manages document artifacts" ON public.document_artifacts;
CREATE POLICY "store staff manages document artifacts"
  ON public.document_artifacts FOR ALL TO authenticated
  USING (
    is_store_staff(store_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin','platform_admin'))
  )
  WITH CHECK (
    is_store_staff(store_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin','platform_admin'))
  );

DROP POLICY IF EXISTS "store staff manages document artifact links" ON public.document_artifact_links;
CREATE POLICY "store staff manages document artifact links"
  ON public.document_artifact_links FOR ALL TO authenticated
  USING (
    is_store_staff(store_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin','platform_admin'))
  )
  WITH CHECK (
    is_store_staff(store_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin','platform_admin'))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_artifacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_artifact_links TO authenticated;
GRANT ALL ON public.document_artifacts TO service_role;
GRANT ALL ON public.document_artifact_links TO service_role;

CREATE OR REPLACE FUNCTION public.touch_document_artifact()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS document_artifacts_touch ON public.document_artifacts;
CREATE TRIGGER document_artifacts_touch
  BEFORE UPDATE ON public.document_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_document_artifact();

COMMENT ON TABLE public.document_artifacts IS
  'Arquivo original e seus resultados de extração. Nunca usar URL pública como fonte de verdade; bucket/path são canônicos.';
COMMENT ON TABLE public.document_artifact_links IS
  'Vínculos polimórficos auditáveis entre um artefato e uma entidade real da plataforma.';

COMMIT;
