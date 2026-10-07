-- W8.2/W8.3 — snapshots Omni versionados e publicação atômica.
-- A RPC é chamada somente pelo BFF server-side com service_role.
BEGIN;

ALTER TABLE public.experience_versions
  ADD COLUMN IF NOT EXISTS document_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_exp_versions_doc_status_created
  ON public.experience_versions(document_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.persist_omni_document_snapshot(
  p_document_id UUID,
  p_store_id UUID,
  p_actor_id UUID,
  p_snapshot JSONB,
  p_publish BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_doc public.experience_documents%ROWTYPE;
  v_latest_draft public.experience_versions%ROWTYPE;
  v_previous_published public.experience_versions%ROWTYPE;
  v_new_version public.experience_versions%ROWTYPE;
  v_next_number INTEGER;
  v_settings JSONB;
BEGIN
  IF p_document_id IS NULL OR p_store_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'contexto do snapshot incompleto';
  END IF;
  IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'snapshot Omni inválido';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = p_actor_id
      AND (pr.store_id = p_store_id OR pr.role IN ('master','platform_admin','superadmin'))
      AND pr.role IN ('owner','admin','manager','content','master','platform_admin','superadmin')
  ) THEN
    RAISE EXCEPTION 'ator sem acesso à loja do documento';
  END IF;

  SELECT * INTO v_doc
    FROM public.experience_documents
   WHERE id = p_document_id
     AND store_id = p_store_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'documento não encontrado ou fora da loja';
  END IF;

  SELECT * INTO v_latest_draft
    FROM public.experience_versions
   WHERE document_id = p_document_id
     AND status = 'draft'
   ORDER BY version_number DESC, created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT p_publish AND v_latest_draft.id IS NOT NULL
     AND v_latest_draft.document_snapshot = p_snapshot THEN
    RETURN jsonb_build_object(
      'status', 'ok',
      'idempotent', true,
      'version_id', v_latest_draft.id,
      'version_number', v_latest_draft.version_number,
      'version_status', v_latest_draft.status
    );
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_number
    FROM public.experience_versions
   WHERE document_id = p_document_id;

  IF p_publish THEN
    SELECT * INTO v_previous_published
      FROM public.experience_versions
     WHERE document_id = p_document_id
       AND status = 'published'
     ORDER BY version_number DESC, created_at DESC
     LIMIT 1
     FOR UPDATE;

    UPDATE public.experience_versions
       SET status = 'archived'
     WHERE document_id = p_document_id
       AND status = 'published';
  END IF;

  INSERT INTO public.experience_versions (
    document_id, version_number, status, created_by, document_snapshot, commit_message
  ) VALUES (
    p_document_id,
    v_next_number,
    CASE WHEN p_publish THEN 'published' ELSE 'draft' END,
    p_actor_id,
    p_snapshot,
    CASE WHEN p_publish THEN 'Omni publish' ELSE 'Omni save' END
  )
  RETURNING * INTO v_new_version;

  v_settings := COALESCE(v_doc.settings, '{}'::jsonb);
  v_settings := jsonb_set(v_settings, '{omni_page_draft}', p_snapshot, true);
  IF p_publish THEN
    v_settings := jsonb_set(
      v_settings,
      '{omni_page_published}',
      jsonb_set(p_snapshot, '{published_at}', to_jsonb(now()), true),
      true
    );
  END IF;

  UPDATE public.experience_documents
     SET settings = v_settings,
         title = COALESCE(NULLIF(p_snapshot->>'title', ''), title),
         is_active = CASE WHEN p_publish THEN true ELSE is_active END,
         updated_at = now()
   WHERE id = p_document_id
     AND store_id = p_store_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'idempotent', false,
    'version_id', v_new_version.id,
    'version_number', v_new_version.version_number,
    'version_status', v_new_version.status,
    'previous_published_version_id', v_previous_published.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.persist_omni_document_snapshot(UUID, UUID, UUID, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.persist_omni_document_snapshot(UUID, UUID, UUID, JSONB, BOOLEAN) TO service_role;

COMMIT;
