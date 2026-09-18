-- Migration: 20261102000000_central_knowledge_vehicles_services_and_cities.sql
-- Descrição: Banco Centralizado da Waesy para Veículos (FIPE), Serviços Regulamentados (LC 116/03) e Cidades/Municípios do Brasil (IBGE)

-- 1. CATÁLOGO CENTRALIZADO DE VEÍCULOS & FIPE
CREATE TABLE IF NOT EXISTS public.vehicles_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text UNIQUE NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  category text NOT NULL, -- Hatch, Sedan, SUV, Picape, Comercial, Motocicleta, etc.
  fuel_types text[] DEFAULT '{}'::text[],
  transmission_options text[] DEFAULT '{}'::text[],
  engine_options text[] DEFAULT '{}'::text[],
  year_range text NOT NULL,
  average_market_value_cents bigint NOT NULL,
  fipe_code_prefix text,
  doors integer DEFAULT 4,
  popular_features text[] DEFAULT '{}'::text[],
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_brand_model ON public.vehicles_catalog(brand, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_category ON public.vehicles_catalog(category);

-- 2. CATÁLOGO NACIONAL DE SERVIÇOS & TRIBUTOS (LC 116/03 & NBS)
CREATE TABLE IF NOT EXISTS public.services_master_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id text UNIQUE NOT NULL,
  code_lc116 text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  cnae_principal text NOT NULL,
  nbs_code text,
  iss_suggested_rate numeric(5,2) NOT NULL DEFAULT 2.00,
  ibs_rate numeric(5,2) NOT NULL DEFAULT 15.50,
  cbs_rate numeric(5,2) NOT NULL DEFAULT 8.80,
  requires_technical_manager boolean NOT NULL DEFAULT false,
  regulatory_body text,
  keywords text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_lc116 ON public.services_master_catalog(code_lc116);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services_master_catalog(category);

-- 3. BANCO CENTRALIZADO DE CIDADES & MUNICÍPIOS DO BRASIL (IBGE)
CREATE TABLE IF NOT EXISTS public.cities_global (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ibge_code text UNIQUE NOT NULL,
  name text NOT NULL,
  state text NOT NULL,
  region text NOT NULL,
  ddd text NOT NULL,
  nearest_airport_iata text,
  latitude double precision,
  longitude double precision,
  is_tourism_hub boolean NOT NULL DEFAULT false,
  is_state_capital boolean NOT NULL DEFAULT false,
  country text NOT NULL DEFAULT 'Brasil',
  country_code text NOT NULL DEFAULT 'BR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cities_state_name ON public.cities_global(state, name);
CREATE INDEX IF NOT EXISTS idx_cities_airport ON public.cities_global(nearest_airport_iata);

-- HABILITAR RLS (Deny-by-default com Leitura Pública)
ALTER TABLE public.vehicles_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services_master_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities_global ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vehicles_read_policy' AND tablename = 'vehicles_catalog') THEN
    CREATE POLICY vehicles_read_policy ON public.vehicles_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'services_read_policy' AND tablename = 'services_master_catalog') THEN
    CREATE POLICY services_read_policy ON public.services_master_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cities_read_policy' AND tablename = 'cities_global') THEN
    CREATE POLICY cities_read_policy ON public.cities_global FOR SELECT TO PUBLIC USING (true);
  END IF;
END $$;
