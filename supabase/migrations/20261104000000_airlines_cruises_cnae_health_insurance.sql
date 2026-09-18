-- Migration: 20261104000000_airlines_cruises_cnae_health_insurance.sql
-- Descrição: Banco Centralizado da Waesy para Companhias Aéreas, Cruzeiros, Tabela CNAE e Operadoras de Saúde ANS

-- 1. COMPANHIAS AÉREAS GLOBAIS (IATA / ICAO)
CREATE TABLE IF NOT EXISTS public.airlines_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iata_code text UNIQUE NOT NULL, -- LA, G3, AD, AA, etc.
  icao_code text NOT NULL,        -- TAM, GLO, AZU, etc.
  name text NOT NULL,
  country text NOT NULL,
  country_code text NOT NULL,
  alliance text NOT NULL,         -- Star Alliance, SkyTeam, Oneworld, Independente
  is_brazilian_domestic boolean NOT NULL DEFAULT false,
  website text,
  frequent_flyer_program text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_airlines_iata ON public.airlines_catalog(iata_code);
CREATE INDEX IF NOT EXISTS idx_airlines_name ON public.airlines_catalog(name);

-- 2. COMPANHIAS MARÍTIMAS & CRUZEIROS
CREATE TABLE IF NOT EXISTS public.cruises_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cruise_id text UNIQUE NOT NULL, -- msc-cruises, costa-cruises, etc.
  name text NOT NULL,
  headquarters text NOT NULL,
  fleet_size integer NOT NULL DEFAULT 10,
  featured_ships_brazil text[] DEFAULT '{}'::text[],
  departure_ports_brazil text[] DEFAULT '{}'::text[],
  website text,
  style text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cruises_name ON public.cruises_catalog(name);

-- 3. TABELA NACIONAL DE CNAE (IBGE / RECEITA FEDERAL)
CREATE TABLE IF NOT EXISTS public.cnae_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,      -- "4711-3/02"
  raw_code text UNIQUE NOT NULL,  -- "4711302"
  description text NOT NULL,
  sector text NOT NULL,
  simples_nacional_anexo text NOT NULL,
  fator_r_applies boolean NOT NULL DEFAULT false,
  keywords text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cnae_code ON public.cnae_catalog(code);
CREATE INDEX IF NOT EXISTS idx_cnae_sector ON public.cnae_catalog(sector);

-- 4. OPERADORAS DE SAÚDE & CONVÊNIOS MÉDICOS (ANS)
CREATE TABLE IF NOT EXISTS public.health_insurance_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ans_code text UNIQUE NOT NULL,  -- 000574, 326305, etc.
  trade_name text NOT NULL,       -- Bradesco Saúde, Amil, Unimed
  corporate_name text NOT NULL,
  modality text NOT NULL,
  coverage_type text NOT NULL,
  accepts_tiss_electronic boolean NOT NULL DEFAULT true,
  website text,
  is_popular boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_ans ON public.health_insurance_catalog(ans_code);
CREATE INDEX IF NOT EXISTS idx_health_trade_name ON public.health_insurance_catalog(trade_name);

-- HABILITAR RLS (Leitura Pública para todos os módulos e ferramentas da Waesy)
ALTER TABLE public.airlines_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cruises_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnae_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_insurance_catalog ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'airlines_read_policy' AND tablename = 'airlines_catalog') THEN
    CREATE POLICY airlines_read_policy ON public.airlines_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cruises_read_policy' AND tablename = 'cruises_catalog') THEN
    CREATE POLICY cruises_read_policy ON public.cruises_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cnae_read_policy' AND tablename = 'cnae_catalog') THEN
    CREATE POLICY cnae_read_policy ON public.cnae_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'health_read_policy' AND tablename = 'health_insurance_catalog') THEN
    CREATE POLICY health_read_policy ON public.health_insurance_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
END $$;
