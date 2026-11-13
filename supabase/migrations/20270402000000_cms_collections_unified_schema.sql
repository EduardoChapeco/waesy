-- =============================================================================
-- Migration: 20270402000000_cms_collections_unified_schema.sql
-- Spec: docs/specs/SPEC-20261113-OMNI-EDITOR-CMS-WIX-PARITY.md
-- Purpose:
--   1. Cria as tabelas relacionais multi-tenant de CMS Dinâmico:
--      `cms_collections`, `cms_collection_fields` e `cms_collection_items`.
--   2. Habilita RLS rigoroso por tenant (`store_id` dono/staff) e leitura
--      pública apenas para coleções públicas e itens publicados no prazo ativo.
--   3. Garante índices compostos para renderização ultrarrápida nas vitrines
--      e no Omni Builder.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.cms_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'table',
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cms_collections_store_slug_unique UNIQUE (store_id, slug),
  CONSTRAINT cms_collections_slug_format CHECK (slug ~ '^[a-z0-9_-]+$')
);

CREATE INDEX IF NOT EXISTS idx_cms_collections_store
  ON public.cms_collections(store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cms_collection_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.cms_collections(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text', 'richtext', 'number', 'currency', 'image', 'url', 'boolean', 'select', 'date')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cms_collection_fields_collection_key_unique UNIQUE (collection_id, key),
  CONSTRAINT cms_collection_fields_key_format CHECK (key ~ '^[a-z0-9_]+$')
);

CREATE INDEX IF NOT EXISTS idx_cms_collection_fields_collection
  ON public.cms_collection_fields(collection_id, sort_order ASC);

CREATE TABLE IF NOT EXISTS public.cms_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.cms_collections(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  slug TEXT,
  title TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived')),
  city_filter TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_collection_items_collection_status
  ON public.cms_collection_items(collection_id, status, sort_order ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cms_collection_items_store
  ON public.cms_collection_items(store_id, status);

-- ── RLS Multi-Tenant e Público Seguro ──
ALTER TABLE public.cms_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_collections FORCE ROW LEVEL SECURITY;

ALTER TABLE public.cms_collection_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_collection_fields FORCE ROW LEVEL SECURITY;

ALTER TABLE public.cms_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_collection_items FORCE ROW LEVEL SECURITY;

-- Leitura pública apenas de coleções marcadas como públicas e seus campos/itens publicados
DROP POLICY IF EXISTS cms_collections_public_read ON public.cms_collections;
CREATE POLICY cms_collections_public_read
  ON public.cms_collections
  FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS cms_collection_fields_public_read ON public.cms_collection_fields;
CREATE POLICY cms_collection_fields_public_read
  ON public.cms_collection_fields
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cms_collections c
      WHERE c.id = collection_id
        AND c.is_public = true
    )
  );

DROP POLICY IF EXISTS cms_collection_items_public_read ON public.cms_collection_items;
CREATE POLICY cms_collection_items_public_read
  ON public.cms_collection_items
  FOR SELECT
  USING (
    status = 'published'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
    AND EXISTS (
      SELECT 1 FROM public.cms_collections c
      WHERE c.id = collection_id
        AND c.is_public = true
    )
  );

-- CRUD restrito a dono da loja, membro ativo do workspace ou administrador da plataforma
DROP POLICY IF EXISTS cms_collections_tenant_manage ON public.cms_collections;
CREATE POLICY cms_collections_tenant_manage
  ON public.cms_collections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('platform_admin', 'master', 'super_admin', 'superadmin')
    )
    OR public.is_store_staff(store_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('platform_admin', 'master', 'super_admin', 'superadmin')
    )
    OR public.is_store_staff(store_id)
  );

DROP POLICY IF EXISTS cms_collection_fields_tenant_manage ON public.cms_collection_fields;
CREATE POLICY cms_collection_fields_tenant_manage
  ON public.cms_collection_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('platform_admin', 'master', 'super_admin', 'superadmin')
    )
    OR public.is_store_staff(store_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('platform_admin', 'master', 'super_admin', 'superadmin')
    )
    OR public.is_store_staff(store_id)
  );

DROP POLICY IF EXISTS cms_collection_items_tenant_manage ON public.cms_collection_items;
CREATE POLICY cms_collection_items_tenant_manage
  ON public.cms_collection_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('platform_admin', 'master', 'super_admin', 'superadmin')
    )
    OR public.is_store_staff(store_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('platform_admin', 'master', 'super_admin', 'superadmin')
    )
    OR public.is_store_staff(store_id)
  );

COMMIT;
