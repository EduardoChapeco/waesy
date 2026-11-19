-- =============================================================================
-- MIGRATION: 20270523000000_proposal_media_transfers_and_web_pages.sql
-- OBJETIVO:
--   1. Criar tabela dedicada public.proposal_web_pages (Páginas Web Editoriais
--      vinculadas às propostas de viagem, com blocos ordenados, vídeos e galerias).
--   2. Aplicar RLS estrito (FORCE ROW LEVEL SECURITY + is_store_staff(store_id)).
--   3. Garantir colunas auxiliares e índices em public.travel_proposals + bucket cms-media.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.proposal_web_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.travel_proposals(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  slug TEXT,
  headline TEXT,
  subheadline TEXT,
  theme_preset TEXT NOT NULL DEFAULT 'editorial',
  accent_color TEXT,
  hero_layout TEXT NOT NULL DEFAULT 'split',
  hero_media JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  show_option_tabs BOOLEAN NOT NULL DEFAULT false,
  cta_label TEXT NOT NULL DEFAULT 'Aprovar Proposta',
  is_published BOOLEAN NOT NULL DEFAULT true,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT proposal_web_pages_proposal_id_unique UNIQUE (proposal_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_web_pages_store_id
  ON public.proposal_web_pages (store_id)
  WHERE store_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_web_pages_store_slug
  ON public.proposal_web_pages (store_id, slug)
  WHERE slug IS NOT NULL AND store_id IS NOT NULL;

ALTER TABLE public.proposal_web_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_web_pages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposal_web_pages_staff_select" ON public.proposal_web_pages;
DROP POLICY IF EXISTS "proposal_web_pages_staff_insert" ON public.proposal_web_pages;
DROP POLICY IF EXISTS "proposal_web_pages_staff_update" ON public.proposal_web_pages;
DROP POLICY IF EXISTS "proposal_web_pages_staff_delete" ON public.proposal_web_pages;

CREATE POLICY "proposal_web_pages_staff_select"
  ON public.proposal_web_pages
  FOR SELECT
  TO authenticated
  USING (public.is_store_staff(store_id));

CREATE POLICY "proposal_web_pages_staff_insert"
  ON public.proposal_web_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_store_staff(store_id));

CREATE POLICY "proposal_web_pages_staff_update"
  ON public.proposal_web_pages
  FOR UPDATE
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

CREATE POLICY "proposal_web_pages_staff_delete"
  ON public.proposal_web_pages
  FOR DELETE
  TO authenticated
  USING (public.is_store_staff(store_id));

-- Garantir bucket cms-media ativo com suporte a imagens e vídeos até 100 MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cms-media', 'cms-media', true, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = NULL;
