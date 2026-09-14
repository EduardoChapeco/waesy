-- Migration: 20261022000000_brazilian_pricing_and_schema_hardening.sql
-- Objetivo: Blindagem de integridade de valores monetários (centavos inteiros não-negativos),
-- limites estritos de parcelamento (1x a 24x no Brasil) e índices parciais de alta performance.

-- 1. Fortalecimento da tabela classifieds
ALTER TABLE public.classifieds
  DROP CONSTRAINT IF EXISTS chk_classifieds_price_non_negative,
  ADD CONSTRAINT chk_classifieds_price_non_negative CHECK (price_cents IS NULL OR price_cents >= 0);

ALTER TABLE public.classifieds
  DROP CONSTRAINT IF EXISTS chk_classifieds_cleaning_fee_non_negative,
  ADD CONSTRAINT chk_classifieds_cleaning_fee_non_negative CHECK (cleaning_fee_cents IS NULL OR cleaning_fee_cents >= 0);

ALTER TABLE public.classifieds
  DROP CONSTRAINT IF EXISTS chk_classifieds_setup_fee_non_negative,
  ADD CONSTRAINT chk_classifieds_setup_fee_non_negative CHECK (setup_fee_cents IS NULL OR setup_fee_cents >= 0);

ALTER TABLE public.classifieds
  DROP CONSTRAINT IF EXISTS chk_classifieds_max_installments,
  ADD CONSTRAINT chk_classifieds_max_installments CHECK (max_installments IS NULL OR (max_installments >= 1 AND max_installments <= 24));

-- 2. Fortalecimento da tabela ad_properties
ALTER TABLE public.ad_properties
  DROP CONSTRAINT IF EXISTS chk_ad_properties_iptu_non_negative,
  ADD CONSTRAINT chk_ad_properties_iptu_non_negative CHECK (iptu_cents IS NULL OR iptu_cents >= 0);

ALTER TABLE public.ad_properties
  DROP CONSTRAINT IF EXISTS chk_ad_properties_condo_non_negative,
  ADD CONSTRAINT chk_ad_properties_condo_non_negative CHECK (condo_fee_cents IS NULL OR condo_fee_cents >= 0);

-- 3. Fortalecimento da tabela ad_vehicles
ALTER TABLE public.ad_vehicles
  DROP CONSTRAINT IF EXISTS chk_ad_vehicles_mileage_non_negative,
  ADD CONSTRAINT chk_ad_vehicles_mileage_non_negative CHECK (mileage IS NULL OR mileage >= 0);

-- 4. Índices de Performance para Exploração e Vitrines
CREATE INDEX IF NOT EXISTS idx_classifieds_price 
  ON public.classifieds (price_cents) 
  WHERE (status = 'active');

CREATE INDEX IF NOT EXISTS idx_classifieds_location 
  ON public.classifieds (location_name) 
  WHERE (status = 'active');

CREATE INDEX IF NOT EXISTS idx_products_store_price 
  ON public.products (store_id, price_cents) 
  WHERE (status = 'published');
