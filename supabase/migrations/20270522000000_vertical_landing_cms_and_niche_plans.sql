-- =============================================================================
-- MIGRATION: 20270522000000_vertical_landing_cms_and_niche_plans.sql
-- OBJETIVO:
-- 1. Completar catalogo SSOT public.platform_vertical_subsystems (incl. explorer, omnipage, autocenter, imobiliaria, varejo)
-- 2. Criar tabelas public.platform_landing_pages e public.platform_landing_sections (CMS 100% editavel + upload de midia)
-- 3. Garantir RLS estrito FORCE ROW LEVEL SECURITY (leitura publica publicada, escrita exclusiva Admin Master)
-- =============================================================================

-- ─── 1. SINCRONIZACAO DO CATALOGO CANONICO DE SUBSISTEMAS ─────────────────────

INSERT INTO public.platform_vertical_subsystems (
  id, name, short_name, category, subdomain, canonical_domain, target_path, description, modules_included, is_active, show_in_hub, show_on_landing, is_standalone_app, sort_order
) VALUES
  ('explorer', 'Waesy Explorer (Cidade & Vitrine)', 'Explorar', 'public_app', 'explorer', 'explorer.waesy.com.br', '/explorer', 'Vitrine comunitaria completa com lojas locais, bairros, ofertas, eventos, empregos e servicos.', ARRAY['marketplace', 'directory', 'classifieds', 'events', 'jobs'], true, true, true, true, 25),
  ('omnipage', 'OmniPage (Sites & BioLinks)', 'OmniPage', 'saas_brand', 'omnipage', 'omnipage.waesy.com.br', '/sistemas/omnipage', 'Construtor visual de sites, landing pages de alta conversao, vitrines e biolinks com dominio proprio.', ARRAY['builder', 'biolink', 'pages', 'crm', 'marketing'], true, true, true, true, 165),
  ('autocenter', 'Waesy Oficinas & Autocenters', 'Oficinas Auto', 'saas_brand', 'oficinas', 'oficinas.waesy.com.br', '/sistemas/autocenter', 'Gestao de ordens de servico automotivas por placa, chassi, odometro, checklist de entrada e pecas.', ARRAY['automotive', 'service_orders', 'inventory', 'crm', 'financial'], true, true, true, true, 175),
  ('imobiliaria', 'Waesy Imobiliaria & Locacoes', 'Imobiliaria', 'saas_brand', 'imoveis', 'imoveis.waesy.com.br', '/sistemas/imobiliaria', 'Catalogo de imoveis venda e locacao, vistorias com fotos, contratos digitais e funil de visitas.', ARRAY['real_estate', 'inspections', 'contracts', 'crm', 'financial'], true, true, true, true, 180),
  ('varejo', 'Waesy Varejo & Mercados', 'Varejo', 'saas_brand', 'varejo', 'varejo.waesy.com.br', '/sistemas/varejo', 'PDV, controle de estoque com grade de variacoes e validade, reposicao e entrega regional.', ARRAY['catalog', 'inventory', 'pdv', 'orders', 'financial'], true, true, true, true, 185)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. TABELA DE CONFIGURACAO POR LANDING PAGE VERTICAL / HUB ───────────────

CREATE TABLE IF NOT EXISTS public.platform_landing_pages (
  slug TEXT PRIMARY KEY,
  subsystem_id TEXT REFERENCES public.platform_vertical_subsystems(id) ON DELETE SET NULL,
  brand_vertical_id TEXT,
  niche_id TEXT,
  vertical_sku TEXT,
  display_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  badge_label TEXT,
  hero_title TEXT NOT NULL,
  hero_subtitle TEXT NOT NULL,
  hero_cta_label TEXT NOT NULL DEFAULT 'Comecar Agora',
  hero_cta_secondary_label TEXT NOT NULL DEFAULT 'Entrar no Sistema',
  hero_image_desktop_url TEXT,
  hero_image_mobile_url TEXT,
  hero_video_url TEXT,
  login_split_image_url TEXT,
  logo_url TEXT,
  isolated_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  plans JSONB NOT NULL DEFAULT '[]'::jsonb,
  faq_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.platform_landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_landing_pages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_landing_pages_public_read" ON public.platform_landing_pages;
CREATE POLICY "platform_landing_pages_public_read"
  ON public.platform_landing_pages
  FOR SELECT
  USING (is_published = true OR public.is_platform_admin());

DROP POLICY IF EXISTS "platform_landing_pages_admin_all" ON public.platform_landing_pages;
CREATE POLICY "platform_landing_pages_admin_all"
  ON public.platform_landing_pages
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ─── 3. TABELA DE SECOES MODULARES EDITAVEIS POR LANDING PAGE ─────────────────

CREATE TABLE IF NOT EXISTS public.platform_landing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_slug TEXT NOT NULL REFERENCES public.platform_landing_pages(slug) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (
    section_type IN (
      'feature_split',
      'modules_grid',
      'plans_pricing',
      'media_showcase',
      'video_demo',
      'workflow_steps',
      'faq_accordion',
      'metrics_bar',
      'cta_banner'
    )
  ),
  title TEXT NOT NULL,
  subtitle TEXT,
  badge_tag TEXT,
  body TEXT,
  media_desktop_url TEXT,
  media_mobile_url TEXT,
  video_url TEXT,
  cta_label TEXT,
  cta_href TEXT,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout_variant TEXT NOT NULL DEFAULT 'split_right' CHECK (
    layout_variant IN ('split_right', 'split_left', 'grid_2', 'grid_3', 'bento', 'banner_wide')
  ),
  sort_order INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_landing_sections_slug_sort
  ON public.platform_landing_sections (landing_slug, sort_order);

ALTER TABLE public.platform_landing_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_landing_sections FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_landing_sections_public_read" ON public.platform_landing_sections;
CREATE POLICY "platform_landing_sections_public_read"
  ON public.platform_landing_sections
  FOR SELECT
  USING (
    public.is_platform_admin()
    OR (
      is_active = true
      AND EXISTS (
        SELECT 1
        FROM public.platform_landing_pages p
        WHERE p.slug = landing_slug
          AND p.is_published = true
      )
    )
  );

DROP POLICY IF EXISTS "platform_landing_sections_admin_all" ON public.platform_landing_sections;
CREATE POLICY "platform_landing_sections_admin_all"
  ON public.platform_landing_sections
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ─── 4. REFORCO DE STORAGE RLS PARA UPLOAD DE MIDIA CMS NO ADMIN MASTER ───────

INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-media', 'cms-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "cms_media_master_manage" ON storage.objects;
CREATE POLICY "cms_media_master_manage"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id IN ('cms-media', 'banners')
    AND public.is_platform_admin()
  )
  WITH CHECK (
    bucket_id IN ('cms-media', 'banners')
    AND public.is_platform_admin()
  );

NOTIFY pgrst, 'reload schema';
