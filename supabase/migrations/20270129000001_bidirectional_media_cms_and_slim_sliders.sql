-- Migration: 20270129000001_bidirectional_media_cms_and_slim_sliders.sql
-- Description: Suporte a Sliders Finos, Mídias Bidirecionais Desktop/Mobile, Novos Grids de Ação e Proporção do Feed

-- 1. Expansão de home_page_sections
ALTER TABLE public.home_page_sections 
    DROP CONSTRAINT IF EXISTS home_page_sections_layout_variant_check;

ALTER TABLE public.home_page_sections 
    ADD CONSTRAINT home_page_sections_layout_variant_check 
    CHECK (layout_variant IN ('carousel', 'bento_grid', 'horizontal_scroll', 'grid_2d', 'native_dock', 'cards_action_grid', 'slim_slider', 'custom_buttons'));

ALTER TABLE public.home_page_sections 
    DROP CONSTRAINT IF EXISTS home_page_sections_aspect_ratio_check;

ALTER TABLE public.home_page_sections 
    ADD CONSTRAINT home_page_sections_aspect_ratio_check 
    CHECK (aspect_ratio IN ('slim_desktop', 'ifood', '16:9', '4:3', '1:1', '4:5', '9:16', 'auto'));

ALTER TABLE public.home_page_sections
    ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS auto_archive_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS city_filter TEXT;

-- 2. Expansão de home_section_items com Campos Bidirecionais e Estilos de Botão
ALTER TABLE public.home_section_items
    ADD COLUMN IF NOT EXISTS image_mobile_url TEXT,
    ADD COLUMN IF NOT EXISTS image_desktop_url TEXT,
    ADD COLUMN IF NOT EXISTS bg_color TEXT,
    ADD COLUMN IF NOT EXISTS text_color TEXT,
    ADD COLUMN IF NOT EXISTS icon_name TEXT,
    ADD COLUMN IF NOT EXISTS button_shape TEXT DEFAULT 'squircle',
    ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- 3. Expansão de banners com Mídia Específica para Mobile e Desktop
ALTER TABLE public.banners
    ADD COLUMN IF NOT EXISTS media_mobile_url TEXT,
    ADD COLUMN IF NOT EXISTS media_desktop_url TEXT,
    ADD COLUMN IF NOT EXISTS aspect_ratio_mode TEXT DEFAULT 'slim_desktop';

-- 4. Expansão de mural_posts / community_posts para Aspect Ratio e Formatos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mural_posts') THEN
    ALTER TABLE public.mural_posts ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT 'auto';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_posts') THEN
    ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT 'auto';
  END IF;
END $$;
