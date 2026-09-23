-- ============================================================================
-- Waesy Platform: Unificação de Entidades de Mineração no Hub Canônico
-- Migration: 20261113000000_unify_mining_canonical_entities.sql
-- Single Source of Truth: Elimina Shadow Tables e Unifica Empresas, Vagas e Eventos
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Unificação de Empresas no Diretório Oficial (public.directory_listings)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.directory_listings
  ADD COLUMN IF NOT EXISTS is_crawled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crawl_score INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'directory',
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS cnae TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS price_level TEXT,
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS scraper_source TEXT,
  ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_dl_crawled ON public.directory_listings(is_crawled);
CREATE INDEX IF NOT EXISTS idx_dl_cnpj ON public.directory_listings(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dl_city ON public.directory_listings(city);
CREATE INDEX IF NOT EXISTS idx_dl_quality ON public.directory_listings(data_quality_score DESC);

-- Se indexed_businesses existir como tabela física, migrar dados e converter para VIEW
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'indexed_businesses' AND table_type = 'BASE TABLE'
  ) THEN
    INSERT INTO public.directory_listings (
      external_id, source, business_name, description, category,
      address, city, state, neighborhood, latitude, longitude,
      contact_phone, website_url, cnpj, rating, reviews_count,
      price_level, working_hours, photos, delivery, scraper_source,
      data_quality_score, last_validated_at, metadata, is_crawled, status
    )
    SELECT
      ib.external_id, ib.source, ib.name, ib.description, ib.category,
      ib.address, ib.city, ib.state, ib.neighborhood, ib.lat, ib.lng,
      ib.phone, ib.website, ib.cnpj, ib.rating, ib.reviews_count,
      ib.price_level, ib.hours, ib.photos, ib.delivery, ib.scraper_source,
      ib.data_quality_score, ib.last_validated_at, ib.metadata, true, 'active'
    FROM public.indexed_businesses ib
    ON CONFLICT DO NOTHING;

    DROP TABLE public.indexed_businesses CASCADE;
  END IF;
END $$;

-- View de Compatibilidade Transparente para o Hub de Mineração
CREATE OR REPLACE VIEW public.indexed_businesses AS
SELECT
  id,
  coalesce(external_id, 'dir-' || id::text) AS external_id,
  coalesce(source, 'directory') AS source,
  coalesce(business_name, 'Empresa') AS name,
  description,
  category,
  address,
  city,
  state,
  neighborhood,
  latitude AS lat,
  longitude AS lng,
  coalesce(contact_phone, contact_whatsapp) AS phone,
  website_url AS website,
  cnpj,
  rating,
  reviews_count,
  price_level,
  working_hours AS hours,
  photos,
  delivery,
  scraper_source,
  coalesce(data_quality_score, 50) AS data_quality_score,
  last_validated_at,
  metadata,
  created_at AS indexed_at,
  created_at
FROM public.directory_listings;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Unificação de Vagas Externas no Mural de Empregos (public.jobs)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS salary_min NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_max NUMERIC,
  ADD COLUMN IF NOT EXISTS remote_type TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT,
  ADD COLUMN IF NOT EXISTS apply_url TEXT,
  ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'indexed_jobs' AND table_type = 'BASE TABLE'
  ) THEN
    INSERT INTO public.jobs (
      external_id, external_source, is_external, title, description,
      salary_min, salary_max, location_city, location_state, remote_type,
      employment_type, apply_url, data_quality_score, metadata, status
    )
    SELECT
      ij.external_id, ij.source, true, ij.title, ij.description,
      ij.salary_min, ij.salary_max, ij.location_city, ij.location_state, ij.remote_type,
      ij.employment_type, ij.apply_url, 70, ij.metadata, 'published'
    FROM public.indexed_jobs ij
    ON CONFLICT DO NOTHING;

    DROP TABLE public.indexed_jobs CASCADE;
  END IF;
END $$;

CREATE OR REPLACE VIEW public.indexed_jobs AS
SELECT
  id,
  coalesce(external_id, 'job-' || id::text) AS external_id,
  coalesce(external_source, 'waesy') AS source,
  title,
  coalesce(company_name, 'Empresa Confidencial') AS company_name,
  company_logo,
  description,
  salary_min,
  salary_max,
  location_city,
  location_state,
  remote_type,
  employment_type,
  coalesce(external_url, apply_url) AS apply_url,
  created_at AS posted_at,
  (status = 'published') AS is_active,
  category,
  metadata,
  created_at AS indexed_at,
  created_at
FROM public.jobs;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Unificação de Eventos no Calendário de Eventos (public.events)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS ticket_url TEXT,
  ADD COLUMN IF NOT EXISTS price_min NUMERIC,
  ADD COLUMN IF NOT EXISTS price_max NUMERIC,
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'indexed_events' AND table_type = 'BASE TABLE'
  ) THEN
    DROP TABLE public.indexed_events CASCADE;
  END IF;
END $$;

CREATE OR REPLACE VIEW public.indexed_events AS
SELECT
  id,
  coalesce(external_id, 'event-' || id::text) AS external_id,
  coalesce(external_source, 'waesy') AS source,
  title AS name,
  description,
  coalesce(venue_name, location) AS venue_name,
  location AS address,
  city,
  state,
  start_date,
  end_date,
  banner_url,
  ticket_url,
  price_min,
  price_max,
  is_free,
  category,
  metadata,
  created_at AS indexed_at,
  created_at
FROM public.events;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. View de Compatibilidade para Produtos Minerados (public.products)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'indexed_products' AND table_type = 'BASE TABLE'
  ) THEN
    DROP TABLE public.indexed_products CASCADE;
  END IF;
END $$;

CREATE OR REPLACE VIEW public.indexed_products AS
SELECT
  id,
  'prod-' || id::text AS external_id,
  'catalog' AS source,
  name,
  description,
  category_id::text AS category,
  coalesce(sale_price_cents, base_price_cents)::numeric / 100.0 AS price,
  base_price_cents::numeric / 100.0 AS original_price,
  0 AS discount_percent,
  main_image_url AS thumbnail,
  '/produto/' || slug AS product_url,
  5.0 AS rating,
  (status = 'active') AS in_stock,
  '{}'::jsonb AS metadata,
  created_at AS indexed_at,
  created_at
FROM public.products;
