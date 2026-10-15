-- Migration: 20270128000000_home_cms_and_bento_grid.sql
-- Description: Homepage Nativa 3.0, CMS Omni-Builder, Bento Grid e Trava Anti-Jank de Mídia

-- 1. Tabela Mestre de Seções da Home
CREATE TABLE IF NOT EXISTS public.home_page_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key TEXT UNIQUE NOT NULL, -- 'hero_banners', 'quick_categories_ifood', 'hotpages_grid', 'marketplace_categories', 'social_posts_vitrine'
    title TEXT,
    subtitle TEXT,
    show_title BOOLEAN DEFAULT FALSE,
    show_subtitle BOOLEAN DEFAULT FALSE,
    layout_variant TEXT NOT NULL DEFAULT 'carousel' CHECK (layout_variant IN ('carousel', 'bento_grid', 'horizontal_scroll', 'grid_2d', 'native_dock')),
    aspect_ratio TEXT NOT NULL DEFAULT 'ifood' CHECK (aspect_ratio IN ('ifood', '16:9', '4:3', '1:1', 'auto')),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Itens/Cards de Cada Seção (Mídias, Links e Botões)
CREATE TABLE IF NOT EXISTS public.home_section_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.home_page_sections(id) ON DELETE CASCADE,
    title TEXT,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    target_url TEXT NOT NULL DEFAULT '/',
    show_text BOOLEAN DEFAULT FALSE,
    grid_span_x INT DEFAULT 1 CHECK (grid_span_x BETWEEN 1 AND 6),
    grid_span_y INT DEFAULT 1 CHECK (grid_span_y BETWEEN 1 AND 4),
    badge_text TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_home_sections_active_sort ON public.home_page_sections(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_home_section_items_lookup ON public.home_section_items(section_id, is_active, sort_order);

-- Habilitação de RLS
ALTER TABLE public.home_page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_section_items ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública Irrestrita (Vitrine Pública)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'home_page_sections' AND policyname = 'home_page_sections_public_read'
  ) THEN
    CREATE POLICY home_page_sections_public_read ON public.home_page_sections
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'home_section_items' AND policyname = 'home_section_items_public_read'
  ) THEN
    CREATE POLICY home_section_items_public_read ON public.home_section_items
      FOR SELECT USING (true);
  END IF;
END $$;

-- Políticas Administrativas (Master / Service Role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'home_page_sections' AND policyname = 'home_page_sections_admin_all'
  ) THEN
    CREATE POLICY home_page_sections_admin_all ON public.home_page_sections
      FOR ALL USING (
        auth.jwt() ->> 'role' IN ('service_role', 'platform_admin', 'master', 'admin_master')
        OR (auth.jwt() -> 'user_metadata' ->> 'is_admin_master')::boolean = true
        OR (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'home_section_items' AND policyname = 'home_section_items_admin_all'
  ) THEN
    CREATE POLICY home_section_items_admin_all ON public.home_section_items
      FOR ALL USING (
        auth.jwt() ->> 'role' IN ('service_role', 'platform_admin', 'master', 'admin_master')
        OR (auth.jwt() -> 'user_metadata' ->> 'is_admin_master')::boolean = true
        OR (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
      );
  END IF;
END $$;

-- 3. Inserção das Seções Canônicas Padrão
INSERT INTO public.home_page_sections (section_key, title, layout_variant, aspect_ratio, show_title, sort_order)
VALUES 
  ('hero_banners', 'Destaques Principais', 'carousel', 'ifood', FALSE, 1),
  ('quick_categories_ifood', 'Categorias Rápidas', 'horizontal_scroll', '1:1', FALSE, 2),
  ('hotpages_grid', 'Hotpages em Destaque', 'bento_grid', '16:9', FALSE, 3),
  ('marketplace_categories', 'Classificados e Negócios', 'grid_2d', '1:1', FALSE, 4),
  ('social_posts_vitrine', 'Feed da Cidade', 'carousel', '4:3', TRUE, 5)
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  layout_variant = EXCLUDED.layout_variant,
  aspect_ratio = EXCLUDED.aspect_ratio,
  show_title = EXCLUDED.show_title,
  sort_order = EXCLUDED.sort_order;

-- 4. Buckets de Armazenamento para Banners e Mídias
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  (
    'home-banners',
    'home-banners',
    true,
    15728640, -- 15 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
  ), 
  (
    'home-categories',
    'home-categories',
    true,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml']::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de Storage para Leitura Pública e Upload Autenticado
DO $$
BEGIN
  -- Leitura pública irrestrita
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'home_storage_public_read'
  ) THEN
    CREATE POLICY home_storage_public_read ON storage.objects
      FOR SELECT USING (bucket_id IN ('home-banners', 'home-categories'));
  END IF;

  -- Upload para usuários autenticados / administradores
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'home_storage_authenticated_insert'
  ) THEN
    CREATE POLICY home_storage_authenticated_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id IN ('home-banners', 'home-categories'));
  END IF;

  -- Atualização de mídia existente
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'home_storage_authenticated_update'
  ) THEN
    CREATE POLICY home_storage_authenticated_update ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id IN ('home-banners', 'home-categories'));
  END IF;

  -- Remoção de mídia existente
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'home_storage_authenticated_delete'
  ) THEN
    CREATE POLICY home_storage_authenticated_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id IN ('home-banners', 'home-categories'));
  END IF;
END $$;

