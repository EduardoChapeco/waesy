-- Migration: 20261103000000_financial_institutions_and_countries.sql
-- Descrição: Banco Centralizado da Waesy para Instituições Financeiras (BACEN/COMPE/ISPB) e Países/Moedas/DDI (ISO 3166-1/4217)

-- 1. INSTITUIÇÕES FINANCEIRAS DO BRASIL (BACEN / COMPE / ISPB)
CREATE TABLE IF NOT EXISTS public.financial_institutions_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compe_code text UNIQUE NOT NULL, -- 001, 104, 237, etc.
  ispb_code text NOT NULL,        -- 8 dígitos
  short_name text NOT NULL,
  legal_name text NOT NULL,
  institution_type text NOT NULL, -- banco_comercial, banco_multiplo, cooperativa, instituicao_pagamento
  supports_pix boolean NOT NULL DEFAULT true,
  supports_ted boolean NOT NULL DEFAULT true,
  is_popular boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_compe ON public.financial_institutions_catalog(compe_code);
CREATE INDEX IF NOT EXISTS idx_financial_name ON public.financial_institutions_catalog(short_name);

-- 2. PAÍSES, MOEDAS & DDI TELEFÔNICO (ISO 3166-1 & ISO 4217)
CREATE TABLE IF NOT EXISTS public.countries_currencies_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_alpha2 text UNIQUE NOT NULL, -- BR, US, AR
  iso_alpha3 text NOT NULL,        -- BRA, USA, ARG
  numeric_code text NOT NULL,
  name_pt text NOT NULL,
  name_en text NOT NULL,
  currency_code text NOT NULL,     -- BRL, USD, EUR
  currency_symbol text NOT NULL,   -- R$, $, €
  currency_name text NOT NULL,
  phone_ddi text NOT NULL,         -- +55, +1, +54
  continent text NOT NULL,
  capital text NOT NULL,
  timezones text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_countries_alpha2 ON public.countries_currencies_catalog(iso_alpha2);
CREATE INDEX IF NOT EXISTS idx_countries_currency ON public.countries_currencies_catalog(currency_code);

-- HABILITAR RLS
ALTER TABLE public.financial_institutions_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries_currencies_catalog ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'financial_read_policy' AND tablename = 'financial_institutions_catalog') THEN
    CREATE POLICY financial_read_policy ON public.financial_institutions_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'countries_read_policy' AND tablename = 'countries_currencies_catalog') THEN
    CREATE POLICY countries_read_policy ON public.countries_currencies_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
END $$;
