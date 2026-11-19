-- =============================================================================
-- Migration: 20270525000000_branded_app_catalog_and_pwa_sync.sql
-- Unificação Canônica: App Padronizado da Empresa (/app/:slug), Catálogo Digital,
-- Seções Configuráveis por Fonte/Layout, Cache Versionado PWA & Supabase Realtime.
-- =============================================================================

BEGIN;

-- 1. Expandir public.store_pwa_configs como SSOT do App Padronizado e PWA da Empresa
ALTER TABLE public.store_pwa_configs
  ADD COLUMN IF NOT EXISTS template_id TEXT NOT NULL DEFAULT 'standard_catalog',
  ADD COLUMN IF NOT EXISTS is_app_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS maskable_icon_512_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_square_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS entry_animation TEXT NOT NULL DEFAULT 'pulse',
  ADD COLUMN IF NOT EXISTS navigation_tabs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS niche_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cache_version INT NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_pwa_configs_template_id_check'
  ) THEN
    ALTER TABLE public.store_pwa_configs
      ADD CONSTRAINT store_pwa_configs_template_id_check
      CHECK (template_id IN (
        'standard_catalog',
        'tourism_cvc',
        'delivery_ifood',
        'events_sympla',
        'services_agenda',
        'ecommerce_retail'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_pwa_configs_entry_animation_check'
  ) THEN
    ALTER TABLE public.store_pwa_configs
      ADD CONSTRAINT store_pwa_configs_entry_animation_check
      CHECK (entry_animation IN ('none', 'pulse', 'bounce', 'fade', 'slide_up'));
  END IF;
END $$;

-- 2. Expandir public.store_page_sections para layouts, fontes, abas e formulários
ALTER TABLE public.store_page_sections
  ADD COLUMN IF NOT EXISTS layout_mode TEXT NOT NULL DEFAULT 'carousel',
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS tab_id TEXT NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS city_filter TEXT,
  ADD COLUMN IF NOT EXISTS items_limit INT NOT NULL DEFAULT 12;

-- Substituir CHECK antigo de section_type por conjunto completo (retrocompatível)
ALTER TABLE public.store_page_sections
  DROP CONSTRAINT IF EXISTS store_page_sections_section_type_check;

ALTER TABLE public.store_page_sections
  ADD CONSTRAINT store_page_sections_section_type_check
  CHECK (
    section_type IN (
      'banner_carousel',
      'highlight_cards',
      'featured_services',
      'custom_text_block',
      'infinite_feed',
      'contact_hours',
      'coupons_grid',
      'product_rail',
      'category_items',
      'collection_items',
      'promotional_flyers',
      'lead_form',
      'survey_form',
      'travel_api_quoter',
      'corporate_travel_cta',
      'tourism_cvc_dock',
      'events_rail',
      'delivery_menu',
      'brand_story',
      'hotpages'
    )
  );

ALTER TABLE public.store_page_sections
  DROP CONSTRAINT IF EXISTS store_page_sections_layout_mode_check;

ALTER TABLE public.store_page_sections
  ADD CONSTRAINT store_page_sections_layout_mode_check
  CHECK (layout_mode IN ('carousel', 'grid', 'list', 'bento', 'infinite'));

ALTER TABLE public.store_page_sections
  DROP CONSTRAINT IF EXISTS store_page_sections_source_type_check;

ALTER TABLE public.store_page_sections
  ADD CONSTRAINT store_page_sections_source_type_check
  CHECK (source_type IN (
    'all',
    'category',
    'collection',
    'featured',
    'offers',
    'tourism',
    'events',
    'services',
    'classifieds',
    'form',
    'custom',
    'api_quoter',
    'corporate_cta'
  ));

-- Garantir bucket público de ativos da loja (logos proporcionais 192/512/maskable e capa do app)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-assets',
  'store-assets',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif']::text[];

CREATE INDEX IF NOT EXISTS idx_store_page_sections_tab_order
  ON public.store_page_sections (store_id, tab_id, section_order);

-- 3. Trigger para incrementar cache_version automaticamente quando seções ou config PWA mudam
CREATE OR REPLACE FUNCTION public.bump_store_pwa_cache_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  v_store_id := COALESCE(NEW.store_id, OLD.store_id);
  IF v_store_id IS NOT NULL THEN
    UPDATE public.store_pwa_configs
    SET cache_version = COALESCE(cache_version, 1) + 1,
        updated_at = now()
    WHERE store_id = v_store_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_pwa_cache_on_sections ON public.store_page_sections;
CREATE TRIGGER trg_bump_pwa_cache_on_sections
  AFTER INSERT OR UPDATE OR DELETE ON public.store_page_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_store_pwa_cache_version();

-- 4. Replica Identity FULL e publicação no Supabase Realtime para sincronização ao vivo
ALTER TABLE IF EXISTS public.store_pwa_configs REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.store_page_sections REPLICA IDENTITY FULL;

DO $$
DECLARE
  v_tbl TEXT;
  v_tables TEXT[] := ARRAY[
    'store_pwa_configs',
    'store_page_sections',
    'stores',
    'products',
    'categories',
    'banners',
    'lead_forms',
    'tourism_experiences',
    'events',
    'ticket_lots',
    'booking_services',
    'booking_resources',
    'classifieds',
    'brand_dna_profiles',
    'brand_kits'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH v_tbl IN ARRAY v_tables LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = v_tbl
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = v_tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_tbl);
      END IF;
    END LOOP;
  END IF;
END $$;

-- 5. Garantir leitura pública segura de store_pwa_configs quando app está ativo ou publicado
DROP POLICY IF EXISTS public_read_pwa_config ON public.store_pwa_configs;
CREATE POLICY public_read_pwa_config ON public.store_pwa_configs
  FOR SELECT
  USING (is_published = true OR is_app_enabled = true OR public.is_store_staff(store_id));

COMMIT;
