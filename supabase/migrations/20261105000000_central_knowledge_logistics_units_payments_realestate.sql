-- Migration: 20261105000000_central_knowledge_logistics_units_payments_realestate.sql
-- Descrição: Banco Centralizado da Waesy para Transportadoras/Logística, Unidades de Medida SEFAZ, Meios de Pagamento NF-e/BACEN, Tipos Imobiliários CRECI e Feriados/Datas Comerciais

-- 1. TRANSPORTADORAS E LOGÍSTICA (ANTT / Correios / Couriers Express)
CREATE TABLE IF NOT EXISTS public.shipping_carriers_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  company_legal_name text NOT NULL,
  category text NOT NULL,
  tracking_url_template text,
  supported_modalities text[] DEFAULT '{}'::text[],
  supports_reverse_logistics boolean NOT NULL DEFAULT true,
  supports_same_day boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_carriers_code ON public.shipping_carriers_catalog(code);
CREATE INDEX IF NOT EXISTS idx_shipping_carriers_category ON public.shipping_carriers_catalog(category);

-- 2. UNIDADES DE MEDIDA PADRÃO OFICIAL (SEFAZ / NF-e / MDIC)
CREATE TABLE IF NOT EXISTS public.units_of_measure_catalog (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  category text NOT NULL,
  sefaz_code text NOT NULL,
  is_fractionable boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_units_measure_category ON public.units_of_measure_catalog(category);
CREATE INDEX IF NOT EXISTS idx_units_measure_sefaz ON public.units_of_measure_catalog(sefaz_code);

-- 3. MEIOS DE PAGAMENTO E BANDEIRAS (SEFAZ / BACEN / PIX)
CREATE TABLE IF NOT EXISTS public.payment_methods_catalog (
  sefaz_code text PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  settlement_days integer NOT NULL DEFAULT 0,
  supports_installments boolean NOT NULL DEFAULT false,
  is_instant boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_code ON public.payment_methods_catalog(code);
CREATE INDEX IF NOT EXISTS idx_payment_methods_category ON public.payment_methods_catalog(category);

-- 4. TIPOS E CLASSIFICAÇÃO DE IMÓVEIS (COFECI / CRECI)
CREATE TABLE IF NOT EXISTS public.real_estate_types_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  category text NOT NULL,
  transaction_modes text[] DEFAULT '{}'::text[],
  typical_features text[] DEFAULT '{}'::text[],
  requires_area_useful boolean NOT NULL DEFAULT true,
  requires_bedrooms boolean NOT NULL DEFAULT false,
  requires_parking_spaces boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_real_estate_types_code ON public.real_estate_types_catalog(code);
CREATE INDEX IF NOT EXISTS idx_real_estate_types_category ON public.real_estate_types_catalog(category);

-- 5. FERIADOS NACIONAIS E DATAS COMERCIAIS CRÍTICAS
CREATE TABLE IF NOT EXISTS public.holidays_calendar_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  date_rule text NOT NULL,
  type text NOT NULL,
  is_official_holiday boolean NOT NULL DEFAULT false,
  commercial_impact text NOT NULL,
  surge_multiplier_suggested numeric(4,2) NOT NULL DEFAULT 1.00,
  target_retail_sectors text[] DEFAULT '{}'::text[],
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holidays_calendar_type ON public.holidays_calendar_catalog(type);
CREATE INDEX IF NOT EXISTS idx_holidays_calendar_impact ON public.holidays_calendar_catalog(commercial_impact);

-- HABILITAR ROW LEVEL SECURITY (Leitura Pública para todas as superfícies da Waesy)
ALTER TABLE public.shipping_carriers_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units_of_measure_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_types_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays_calendar_catalog ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shipping_carriers_read_policy' AND tablename = 'shipping_carriers_catalog') THEN
    CREATE POLICY shipping_carriers_read_policy ON public.shipping_carriers_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'units_of_measure_read_policy' AND tablename = 'units_of_measure_catalog') THEN
    CREATE POLICY units_of_measure_read_policy ON public.units_of_measure_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payment_methods_read_policy' AND tablename = 'payment_methods_catalog') THEN
    CREATE POLICY payment_methods_read_policy ON public.payment_methods_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'real_estate_types_read_policy' AND tablename = 'real_estate_types_catalog') THEN
    CREATE POLICY real_estate_types_read_policy ON public.real_estate_types_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'holidays_calendar_read_policy' AND tablename = 'holidays_calendar_catalog') THEN
    CREATE POLICY holidays_calendar_read_policy ON public.holidays_calendar_catalog FOR SELECT TO PUBLIC USING (true);
  END IF;
END $$;
