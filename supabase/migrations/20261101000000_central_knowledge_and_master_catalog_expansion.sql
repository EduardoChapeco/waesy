-- ==============================================================================
-- MIGRAÇÃO: EXPANSÃO DO BANCO CENTRAL DE DADOS & INTELIGÊNCIA TRIBUTÁRIA/MUNDIAL
-- Waesy Platform — Produtos, NCM, IBS/CBS (Reforma 2026), Aeroportos e Contratos
-- ==============================================================================

-- 1. EXPANSÃO DE INTELIGÊNCIA FISCAL NO CATÁLOGO MESTRE DE PRODUTOS
ALTER TABLE public.global_master_catalog
  ADD COLUMN IF NOT EXISTS ibs_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cbs_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cfop_default TEXT DEFAULT '5102',
  ADD COLUMN IF NOT EXISTS tax_regime_applicability TEXT DEFAULT 'todos',
  ADD COLUMN IF NOT EXISTS origin_code INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_weight_kg NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS gross_weight_kg NUMERIC(8,3);

COMMENT ON COLUMN public.global_master_catalog.ibs_rate IS 'Alíquota estimada de IBS (Imposto sobre Bens e Serviços - Reforma Tributária)';
COMMENT ON COLUMN public.global_master_catalog.cbs_rate IS 'Alíquota estimada de CBS (Contribuição sobre Bens e Serviços - Reforma Tributária)';
COMMENT ON COLUMN public.global_master_catalog.cfop_default IS 'Código Fiscal de Operações e Prestações sugerido (ex: 5102, 5405)';

-- 2. TABELA CENTRAL DE AEROPORTOS DO MUNDO (IATA / ICAO / MALHA AÉREA)
CREATE TABLE IF NOT EXISTS public.airports_global (
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

CREATE INDEX IF NOT EXISTS idx_airports_iata ON public.airports_global(iata_code);
CREATE INDEX IF NOT EXISTS idx_airports_city ON public.airports_global(city);
CREATE INDEX IF NOT EXISTS idx_airports_country ON public.airports_global(country);
CREATE INDEX IF NOT EXISTS idx_airports_commercial ON public.airports_global(is_commercial);

-- RLS para airports_global
ALTER TABLE public.airports_global ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read airports_global" ON public.airports_global;
CREATE POLICY "Public read airports_global"
  ON public.airports_global
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage airports_global" ON public.airports_global;
CREATE POLICY "Admins manage airports_global"
  ON public.airports_global
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'platform_admin', 'superadmin')
    )
  );

-- 3. TABELA DE LOOKUP E INTELIGÊNCIA FISCAL NCM / CEST / TRIBUTOS
CREATE TABLE IF NOT EXISTS public.global_ncm_tributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncm_code TEXT NOT NULL UNIQUE,
  cest_code TEXT,
  description TEXT NOT NULL,
  category_name TEXT,
  ibs_rate NUMERIC(5,2) DEFAULT 0,
  cbs_rate NUMERIC(5,2) DEFAULT 0,
  icms_standard_rate NUMERIC(5,2) DEFAULT 17.0,
  is_tax_substituted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ncm_tributes_ncm ON public.global_ncm_tributes(ncm_code);
CREATE INDEX IF NOT EXISTS idx_ncm_tributes_cest ON public.global_ncm_tributes(cest_code);

-- RLS para global_ncm_tributes
ALTER TABLE public.global_ncm_tributes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read global_ncm_tributes" ON public.global_ncm_tributes;
CREATE POLICY "Public read global_ncm_tributes"
  ON public.global_ncm_tributes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage global_ncm_tributes" ON public.global_ncm_tributes;
CREATE POLICY "Admins manage global_ncm_tributes"
  ON public.global_ncm_tributes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'platform_admin', 'superadmin')
    )
  );

-- 4. EXPANSÃO DE TEMPLATES DE CONTRATOS COM CLÁUSULAS ESTRUTURADAS E VARIÁVEIS
ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variables_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS jurisdiction TEXT DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS legal_framework TEXT DEFAULT 'Código Civil Brasileiro (Lei 10.406/2002)';

COMMENT ON COLUMN public.contract_templates.clauses IS 'Lista ordenada de cláusulas jurídicas com título, texto parametrizado e obrigatoriedade';
COMMENT ON COLUMN public.contract_templates.variables_schema IS 'Definição de variáveis que devem ser preenchidas dinamicamente (ex: nome, cpf, valor)';
