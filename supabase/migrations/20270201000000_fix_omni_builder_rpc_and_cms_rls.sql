-- =============================================================================
-- Migration: 20270201000000_fix_omni_builder_rpc_and_cms_rls.sql
-- Purpose:
--   1. Corrige RPC `persist_omni_document_snapshot` removendo referência à coluna
--      extinta `profiles.store_id` e validando vínculo real via `workspace_members`,
--      `stores.owner_id` ou `is_platform_admin()`, além de gravar `published_version_id`
--      e `published_at` apenas na publicação.
--   2. Atualiza constraint de `navigation_menus.handle` para permitir underscores
--      (`bottom_nav`, `header_nav`, `explore_menu`, `chat_menu`).
--   3. Remove políticas RLS excessivamente permissivas (`SELECT USING (true)`) em
--      tabelas de CMS/Builder e reforça escrita com `platform_admin` e staff autorizado.
-- =============================================================================

BEGIN;

-- 0. Garantir colunas explícitas de versão publicada e timestamp em experience_documents + loja raiz da plataforma
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS is_platform_root BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE id = '00000000-0000-0000-0000-000000000001'
     OR slug IN ('waesy-org', 'waesy-institucional', 'waesy')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (id, name, slug)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Waesy Organization', 'waesy-org')
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_org_id;
  END IF;

  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_org_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.stores
      WHERE is_platform_root = true
         OR id = '00000000-0000-0000-0000-000000000002'
         OR slug IN ('waesy-platform-root', 'waesy-matriz', 'waesy')
    ) THEN
      UPDATE public.stores
      SET is_platform_root = true, is_active = true
      WHERE id = (
        SELECT id FROM public.stores
        WHERE is_platform_root = true
           OR id = '00000000-0000-0000-0000-000000000002'
           OR slug IN ('waesy-platform-root', 'waesy-matriz', 'waesy')
        ORDER BY is_platform_root DESC, created_at ASC
        LIMIT 1
      );
    ELSE
      INSERT INTO public.stores (id, organization_id, name, slug, is_platform_root, is_active, settings)
      VALUES (
        '00000000-0000-0000-0000-000000000002',
        v_org_id,
        'Waesy Matriz',
        'waesy-matriz',
        true,
        true,
        '{"is_platform_root": true, "show_name": true, "show_logo": true}'::jsonb
      )
      ON CONFLICT (id) DO UPDATE SET
        is_platform_root = true,
        is_active = true;
    END IF;
  END IF;
END $$;

ALTER TABLE public.experience_documents
  ADD COLUMN IF NOT EXISTS published_version_id UUID REFERENCES public.experience_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_exp_docs_published_version
  ON public.experience_documents(published_version_id);

-- 1. Relaxar check constraint de handle em navigation_menus para suportar handles canônicos com underscore
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'navigation_menus_handle_check'
      AND conrelid = 'public.navigation_menus'::regclass
  ) THEN
    ALTER TABLE public.navigation_menus DROP CONSTRAINT navigation_menus_handle_check;
  END IF;

  ALTER TABLE public.navigation_menus
    ADD CONSTRAINT navigation_menus_handle_check
    CHECK (handle ~ '^[a-z0-9_-]+$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- 2. Corrigir RPC transacional persist_omni_document_snapshot
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
  v_is_platform_admin BOOLEAN := FALSE;
  v_has_store_access BOOLEAN := FALSE;
  v_is_platform_root_store BOOLEAN := FALSE;
BEGIN
  IF p_document_id IS NULL OR p_store_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'contexto do snapshot incompleto';
  END IF;
  IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'snapshot Omni inválido';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = p_actor_id
      AND pr.role IN ('master', 'platform_admin', 'superadmin', 'super_admin')
  ) INTO v_is_platform_admin;

  SELECT COALESCE(s.is_platform_root, FALSE)
    INTO v_is_platform_root_store
    FROM public.stores s
   WHERE s.id = p_store_id;

  IF v_is_platform_root_store AND NOT v_is_platform_admin THEN
    RAISE EXCEPTION 'apenas administradores Master podem alterar documentos da loja raiz';
  END IF;

  IF NOT v_is_platform_admin THEN
    SELECT (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.profile_id = p_actor_id
          AND wm.store_id = p_store_id
          AND wm.role IN ('owner', 'admin', 'proprietario', 'manager', 'gerente', 'content')
      )
      OR EXISTS (
        SELECT 1 FROM public.stores st
        WHERE st.id = p_store_id
          AND st.owner_id = p_actor_id
      )
    ) INTO v_has_store_access;

    IF NOT v_has_store_access THEN
      RAISE EXCEPTION 'ator sem acesso editorial à loja do documento';
    END IF;
  END IF;

  SELECT * INTO v_doc
    FROM public.experience_documents
   WHERE id = p_document_id
     AND store_id = p_store_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'documento não encontrado ou fora da loja informada';
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
    v_settings := jsonb_set(
      v_settings,
      '{omni_page}',
      jsonb_set(p_snapshot, '{published_at}', to_jsonb(now()), true),
      true
    );
  END IF;

  UPDATE public.experience_documents
     SET settings = v_settings,
         title = COALESCE(NULLIF(p_snapshot->>'title', ''), title),
         published_version_id = CASE WHEN p_publish THEN v_new_version.id ELSE published_version_id END,
         published_at = CASE WHEN p_publish THEN now() ELSE published_at END,
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

-- 3. Sanear políticas RLS permissivas e incluir platform_admin nas tabelas de CMS
ALTER TABLE IF EXISTS public.marketplace_surfaces
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE IF EXISTS public.marketplace_sections
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_archive_at TIMESTAMPTZ;

DO $$
BEGIN
  -- Remover SELECT USING (true) que anulavam filtros de publicação/ativo
  DROP POLICY IF EXISTS pages_select_public ON public.pages;
  DROP POLICY IF EXISTS page_sections_select_public ON public.page_sections;
  DROP POLICY IF EXISTS marketplace_surfaces_select_public ON public.marketplace_surfaces;
  DROP POLICY IF EXISTS marketplace_sections_select_public ON public.marketplace_sections;

  -- Garantir leitura pública apenas de superfícies e seções ativas
  IF to_regclass('public.marketplace_surfaces') IS NOT NULL THEN
    DROP POLICY IF EXISTS marketplace_surfaces_active_public_read ON public.marketplace_surfaces;
    CREATE POLICY marketplace_surfaces_active_public_read
      ON public.marketplace_surfaces
      FOR SELECT
      USING (is_active = true);
  END IF;

  IF to_regclass('public.marketplace_sections') IS NOT NULL THEN
    DROP POLICY IF EXISTS marketplace_sections_active_public_read ON public.marketplace_sections;
    CREATE POLICY marketplace_sections_active_public_read
      ON public.marketplace_sections
      FOR SELECT
      USING (
        is_active = true
        AND (starts_at IS NULL OR starts_at <= now())
        AND (ends_at IS NULL OR ends_at >= now())
        AND (auto_archive_at IS NULL OR auto_archive_at > now())
      );
  END IF;

  -- Incluir platform_admin nas políticas de escrita de home_page_sections e home_section_items
  IF to_regclass('public.home_page_sections') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin write home_page_sections" ON public.home_page_sections;
    CREATE POLICY "Admin write home_page_sections"
      ON public.home_page_sections
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (SELECT auth.uid())
            AND p.role IN ('platform_admin', 'master', 'super_admin', 'superadmin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (SELECT auth.uid())
            AND p.role IN ('platform_admin', 'master', 'super_admin', 'superadmin')
        )
      );
  END IF;

  IF to_regclass('public.home_section_items') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin write home_section_items" ON public.home_section_items;
    CREATE POLICY "Admin write home_section_items"
      ON public.home_section_items
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (SELECT auth.uid())
            AND p.role IN ('platform_admin', 'master', 'super_admin', 'superadmin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (SELECT auth.uid())
            AND p.role IN ('platform_admin', 'master', 'super_admin', 'superadmin')
        )
      );
  END IF;
END $$;

COMMIT;
