-- =============================================================================
-- Migration: 20270606000000_branded_app_omni_chat_reviews_and_domains.sql
-- Branded App E2E: Custom Domains, Omni-Builder Embeds, Verified Store Reviews,
-- Contextual Signup & Full Network/GPS Attribution Telemetry
-- =============================================================================

BEGIN;

-- 1. Índices case-insensitive em domínios próprios (stores & store_pwa_configs)
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain_lower
  ON public.stores (lower(trim(custom_domain)))
  WHERE custom_domain IS NOT NULL AND trim(custom_domain) <> '';

CREATE INDEX IF NOT EXISTS idx_pwa_configs_custom_domain_lower
  ON public.store_pwa_configs (lower(trim(custom_domain)))
  WHERE custom_domain IS NOT NULL AND trim(custom_domain) <> '';

-- 2. Expansão canônica de public.store_pwa_configs
ALTER TABLE public.store_pwa_configs
  ADD COLUMN IF NOT EXISTS omni_page_id UUID REFERENCES public.experience_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allow_customer_self_signup BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_domain_status TEXT NOT NULL DEFAULT 'pending_dns',
  ADD COLUMN IF NOT EXISTS city_targeting_enabled BOOLEAN NOT NULL DEFAULT false;

-- 3. Expansão de public.store_page_sections para Blocos & Páginas do Omni-Builder + Vagas + Avaliações
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
      'hotpages',
      'omni_block',
      'omni_document',
      'custom_domain_cta',
      'jobs_board',
      'reviews_showcase'
    )
  );

ALTER TABLE public.store_page_sections
  DROP CONSTRAINT IF EXISTS store_page_sections_source_type_check;

ALTER TABLE public.store_page_sections
  ADD CONSTRAINT store_page_sections_source_type_check
  CHECK (
    source_type IN (
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
      'corporate_cta',
      'omni',
      'jobs',
      'reviews'
    )
  );

-- 4. Avaliações Verificadas da Loja no App Oficial (/app/:slug)
ALTER TABLE public.reviews
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trip_id UUID,
  ADD COLUMN IF NOT EXISTS source_channel TEXT NOT NULL DEFAULT 'marketplace';

CREATE INDEX IF NOT EXISTS idx_reviews_store_status_created
  ON public.reviews (store_id, status, created_at DESC);

-- 5. Captura Real de Rede (IP + GeoIP + GPS Consensual) em Touchpoints de Atribuição
ALTER TABLE public.ad_attribution_touchpoints
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS geo_city TEXT,
  ADD COLUMN IF NOT EXISTS geo_state TEXT,
  ADD COLUMN IF NOT EXISTS geo_country TEXT,
  ADD COLUMN IF NOT EXISTS gps_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gps_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gps_source TEXT;

CREATE INDEX IF NOT EXISTS idx_ad_attr_store_geo_city
  ON public.ad_attribution_touchpoints (store_id, geo_city)
  WHERE geo_city IS NOT NULL;

-- 6. Suporte a Clientes via Magic Token Escopado no Chat & Chamados (Zero E-mails Sintéticos)
ALTER TABLE public.chat_threads
  DROP CONSTRAINT IF EXISTS customer_or_guest;

ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

ALTER TABLE public.chat_threads
  ADD CONSTRAINT customer_or_guest
  CHECK (
    customer_id IS NOT NULL
    OR guest_email IS NOT NULL
    OR guest_name IS NOT NULL
    OR guest_phone IS NOT NULL
  );

ALTER TABLE public.store_support_tickets
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE public.store_support_tickets
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

COMMIT;
