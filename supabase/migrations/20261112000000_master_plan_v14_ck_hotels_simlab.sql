-- ==============================================================================
-- MIGRATION: 20261112000000_master_plan_v14_ck_hotels_simlab.sql
-- DESCRIÇÃO: Master Plan V14 — Hotéis & Resorts, Central Knowledge (CK) e SimLab
-- GRUPOS 4, 5 e 6 com RLS Deny-by-Default, Multi-Tenant e Índices de Alta Performance
-- ==============================================================================

-- ── 1. GRUPO 4: HOTÉIS & RESORTS ──

-- [REQ-36] Coordenadas Geográficas (location_lat, location_lng) e [REQ-37] Parcelamento (max_installments)
ALTER TABLE public.hotels_bank
  ADD COLUMN IF NOT EXISTS location_lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS location_lng NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS max_installments INTEGER NOT NULL DEFAULT 12 CHECK (max_installments >= 1 AND max_installments <= 24);

COMMENT ON COLUMN public.hotels_bank.location_lat IS 'Latitude real para mapa e widget meteorológico';
COMMENT ON COLUMN public.hotels_bank.location_lng IS 'Longitude real para mapa e widget meteorológico';
COMMENT ON COLUMN public.hotels_bank.max_installments IS 'Número máximo de parcelas configurado pelo anunciante (1-24x)';

-- [REQ-32] Tabela hotel_media (mídias categorizadas)
CREATE TABLE IF NOT EXISTS public.hotel_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels_bank(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('facade', 'rooms', 'pool', 'leisure', 'gastronomy', 'spa', 'general')),
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'virtual_tour')),
  url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_hotel_media_hotel_id ON public.hotel_media(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_media_category ON public.hotel_media(category);

ALTER TABLE public.hotel_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotel_media_public_read" ON public.hotel_media;
CREATE POLICY "hotel_media_public_read" ON public.hotel_media
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "hotel_media_admin_write" ON public.hotel_media;
CREATE POLICY "hotel_media_admin_write" ON public.hotel_media
  FOR ALL USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.hotels_bank hb
      WHERE hb.id = hotel_media.hotel_id AND (
        hb.created_by_profile_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.store_members sm
          WHERE sm.store_id = hb.store_id AND sm.profile_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'platform_admin', 'superadmin'))
      )
    )
  );

-- [REQ-33] Tabela hotel_amenities (comodidades estruturadas)
CREATE TABLE IF NOT EXISTS public.hotel_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels_bank(id) ON DELETE CASCADE,
  amenity_key TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_highlight BOOLEAN NOT NULL DEFAULT false,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(hotel_id, amenity_key)
);

CREATE INDEX IF NOT EXISTS idx_hotel_amenities_hotel_id ON public.hotel_amenities(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_amenities_key ON public.hotel_amenities(amenity_key);

ALTER TABLE public.hotel_amenities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotel_amenities_public_read" ON public.hotel_amenities;
CREATE POLICY "hotel_amenities_public_read" ON public.hotel_amenities
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "hotel_amenities_admin_write" ON public.hotel_amenities;
CREATE POLICY "hotel_amenities_admin_write" ON public.hotel_amenities
  FOR ALL USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.hotels_bank hb
      WHERE hb.id = hotel_amenities.hotel_id AND (
        hb.created_by_profile_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.store_members sm
          WHERE sm.store_id = hb.store_id AND sm.profile_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'platform_admin', 'superadmin'))
      )
    )
  );

-- [REQ-34] Relacionamento hotel_id em propostas e viagens
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels_bank(id) ON DELETE SET NULL;

ALTER TABLE public.travel_proposals
  ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels_bank(id) ON DELETE SET NULL;

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels_bank(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_hotel_id ON public.proposals(hotel_id);
CREATE INDEX IF NOT EXISTS idx_travel_proposals_hotel_id ON public.travel_proposals(hotel_id);
CREATE INDEX IF NOT EXISTS idx_trips_hotel_id ON public.trips(hotel_id);

-- ── 2. GRUPO 5: BANCO CENTRAL DE CONHECIMENTO (CK) ──

-- [REQ-38] Tabela ck_vehicles_fipe (Tabela FIPE canônica)
CREATE TABLE IF NOT EXISTS public.ck_vehicles_fipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fipe_code TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  model_year TEXT NOT NULL,
  fuel TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'car',
  reference_price_cents BIGINT NOT NULL,
  reference_month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(fipe_code, model_year, fuel, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_ck_vehicles_fipe_code ON public.ck_vehicles_fipe(fipe_code);
CREATE INDEX IF NOT EXISTS idx_ck_vehicles_brand_model ON public.ck_vehicles_fipe(brand, model);

ALTER TABLE public.ck_vehicles_fipe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ck_vehicles_fipe_public_read" ON public.ck_vehicles_fipe;
CREATE POLICY "ck_vehicles_fipe_public_read" ON public.ck_vehicles_fipe FOR SELECT USING (true);

-- [REQ-39] Tabela ck_ncm (Nomenclatura Comum do Mercosul & Reforma Tributária 2026)
CREATE TABLE IF NOT EXISTS public.ck_ncm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncm_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  national_rate_percent NUMERIC(5,2) DEFAULT 0,
  imported_rate_percent NUMERIC(5,2) DEFAULT 0,
  state_rate_percent NUMERIC(5,2) DEFAULT 0,
  municipal_rate_percent NUMERIC(5,2) DEFAULT 0,
  ibs_projected_percent NUMERIC(5,2) DEFAULT 15.50,
  cbs_projected_percent NUMERIC(5,2) DEFAULT 8.80,
  is_cest_required BOOLEAN DEFAULT false,
  valid_from DATE DEFAULT '2026-01-01',
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ck_ncm_code ON public.ck_ncm(ncm_code);
CREATE INDEX IF NOT EXISTS idx_ck_ncm_desc ON public.ck_ncm USING gin(to_tsvector('portuguese', description));

ALTER TABLE public.ck_ncm ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ck_ncm_public_read" ON public.ck_ncm;
CREATE POLICY "ck_ncm_public_read" ON public.ck_ncm FOR SELECT USING (true);

-- [REQ-40] Expansão / Tabela ck_financial_institutions
CREATE TABLE IF NOT EXISTS public.ck_financial_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compe_code TEXT NOT NULL UNIQUE,
  ispb_code TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  supported_pix_channels TEXT[] DEFAULT ARRAY['chave_aleatoria', 'cpf_cnpj', 'email', 'telefone', 'qr_code_estatico', 'qr_code_dinamico']::TEXT[],
  supported_card_brands TEXT[] DEFAULT ARRAY['visa', 'mastercard', 'elo', 'hipercard', 'amex']::TEXT[],
  institution_type TEXT NOT NULL DEFAULT 'banco_multiplo',
  supports_instant_pix BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ck_financial_compe ON public.ck_financial_institutions(compe_code);
CREATE INDEX IF NOT EXISTS idx_ck_financial_short ON public.ck_financial_institutions(short_name);

ALTER TABLE public.ck_financial_institutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ck_financial_public_read" ON public.ck_financial_institutions;
CREATE POLICY "ck_financial_public_read" ON public.ck_financial_institutions FOR SELECT USING (true);

-- [REQ-41] Tabela ck_airports
CREATE TABLE IF NOT EXISTS public.ck_airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iata_code TEXT NOT NULL UNIQUE,
  icao_code TEXT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state_province TEXT,
  country TEXT NOT NULL DEFAULT 'Brasil',
  country_code TEXT NOT NULL DEFAULT 'BR',
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  is_commercial BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ck_airports_iata ON public.ck_airports(iata_code);
CREATE INDEX IF NOT EXISTS idx_ck_airports_city ON public.ck_airports(city);

ALTER TABLE public.ck_airports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ck_airports_public_read" ON public.ck_airports;
CREATE POLICY "ck_airports_public_read" ON public.ck_airports FOR SELECT USING (true);

-- [REQ-42] Tabela ck_brands (Catálogo Central de Marcas)
CREATE TABLE IF NOT EXISTS public.ck_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  niche TEXT NOT NULL,
  country_of_origin TEXT DEFAULT 'Brasil',
  logo_url TEXT,
  website TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ck_brands_niche ON public.ck_brands(niche);
CREATE INDEX IF NOT EXISTS idx_ck_brands_slug ON public.ck_brands(slug);

ALTER TABLE public.ck_brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ck_brands_public_read" ON public.ck_brands;
CREATE POLICY "ck_brands_public_read" ON public.ck_brands FOR SELECT USING (true);

-- [REQ-43] Tabela ck_product_variations (Matriz de Variações Canônicas)
CREATE TABLE IF NOT EXISTS public.ck_product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_name TEXT NOT NULL,
  dimension_label TEXT NOT NULL,
  niche TEXT NOT NULL,
  standard_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ck_variations_dim ON public.ck_product_variations(dimension_name);
CREATE INDEX IF NOT EXISTS idx_ck_variations_niche ON public.ck_product_variations(niche);

ALTER TABLE public.ck_product_variations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ck_product_variations_public_read" ON public.ck_product_variations;
CREATE POLICY "ck_product_variations_public_read" ON public.ck_product_variations FOR SELECT USING (true);

-- [REQ-44] Tabela ck_generic_products (Catálogo de Produtos Genéricos com GTIN/EAN)
CREATE TABLE IF NOT EXISTS public.ck_generic_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gtin_ean TEXT UNIQUE,
  name TEXT NOT NULL,
  brand_id UUID REFERENCES public.ck_brands(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  niche TEXT NOT NULL,
  ncm_code TEXT,
  default_image_url TEXT,
  images TEXT[] DEFAULT '{}'::TEXT[],
  gross_weight_grams INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ck_generic_gtin ON public.ck_generic_products(gtin_ean);
CREATE INDEX IF NOT EXISTS idx_ck_generic_niche ON public.ck_generic_products(niche);

ALTER TABLE public.ck_generic_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ck_generic_products_public_read" ON public.ck_generic_products;
CREATE POLICY "ck_generic_products_public_read" ON public.ck_generic_products FOR SELECT USING (true);

-- [REQ-45] Tabela ck_cnae_services (Catálogo CNAE de Serviços & Tributação)
CREATE TABLE IF NOT EXISTS public.ck_cnae_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnae_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  annex_simples TEXT,
  aliquota_iss_min NUMERIC(4,2) DEFAULT 2.00,
  aliquota_iss_max NUMERIC(4,2) DEFAULT 5.00,
  fator_r_applicable BOOLEAN DEFAULT false,
  regulated_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ck_cnae_code ON public.ck_cnae_services(cnae_code);
ALTER TABLE public.ck_cnae_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ck_cnae_services_public_read" ON public.ck_cnae_services;
CREATE POLICY "ck_cnae_services_public_read" ON public.ck_cnae_services FOR SELECT USING (true);

-- ── 3. GRUPO 6: SIMLAB & PERSONAS DEMOGRÁFICAS ──

-- [REQ-46] Tabela synthetic_populations (Demografia IBGE Estratificada)
CREATE TABLE IF NOT EXISTS public.synthetic_populations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ibge_city_code TEXT NOT NULL,
  city_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  microregion TEXT,
  age_group TEXT NOT NULL,
  economic_class TEXT NOT NULL,
  education_level TEXT NOT NULL,
  gender TEXT NOT NULL,
  population_count INTEGER NOT NULL DEFAULT 0,
  sample_weight NUMERIC(8,4) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_synthetic_city ON public.synthetic_populations(ibge_city_code);
CREATE INDEX IF NOT EXISTS idx_synthetic_class ON public.synthetic_populations(economic_class);

ALTER TABLE public.synthetic_populations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "synthetic_populations_public_read" ON public.synthetic_populations;
CREATE POLICY "synthetic_populations_public_read" ON public.synthetic_populations FOR SELECT USING (true);

-- [REQ-47] Tabela persona_consumption_profiles (Padrões de Consumo & Ticket Médio)
CREATE TABLE IF NOT EXISTS public.persona_consumption_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype_name TEXT NOT NULL,
  economic_class TEXT NOT NULL,
  niche TEXT NOT NULL,
  estimated_monthly_spend_cents BIGINT NOT NULL DEFAULT 0,
  estimated_ticket_cents BIGINT NOT NULL DEFAULT 0,
  purchase_frequency_per_month NUMERIC(4,1) NOT NULL DEFAULT 1.0,
  preferred_payment_method TEXT NOT NULL DEFAULT 'pix',
  price_sensitivity TEXT NOT NULL DEFAULT 'media',
  brand_affinity_keywords TEXT[] DEFAULT '{}'::TEXT[],
  decision_triggers TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_persona_niche_class ON public.persona_consumption_profiles(niche, economic_class);

ALTER TABLE public.persona_consumption_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "persona_consumption_public_read" ON public.persona_consumption_profiles;
CREATE POLICY "persona_consumption_public_read" ON public.persona_consumption_profiles FOR SELECT USING (true);

-- [REQ-48] Tabela persona_focus_group_simulations (Simulação SDR & Focus Group)
CREATE TABLE IF NOT EXISTS public.persona_focus_group_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  target_niche TEXT NOT NULL,
  target_audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  product_pitch TEXT NOT NULL,
  simulated_objections JSONB NOT NULL DEFAULT '[]'::jsonb,
  simulated_acceptance_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  key_insights TEXT[] DEFAULT '{}'::TEXT[],
  calibrated_sdr_script TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_persona_simulations_store ON public.persona_focus_group_simulations(store_id);

ALTER TABLE public.persona_focus_group_simulations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "persona_simulations_store_read" ON public.persona_focus_group_simulations;
CREATE POLICY "persona_simulations_store_read" ON public.persona_focus_group_simulations
  FOR SELECT USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = persona_focus_group_simulations.store_id AND sm.profile_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'platform_admin', 'superadmin'))
  );
