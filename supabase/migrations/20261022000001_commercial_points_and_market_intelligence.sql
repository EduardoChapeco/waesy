-- ============================================================================
-- Migration: Commercial Points Telemetry, CNPJ Audits & Market Intelligence
-- Timestamp: 20261022000000
-- Standards: BigTech Executive Board, Zero-Trust RLS, Multi-Tenant Compliance
-- ============================================================================

BEGIN;

-- 1. Expandir restrição de categoria de classifieds para acomodar 'business' e 'food'
ALTER TABLE public.classifieds
  DROP CONSTRAINT IF EXISTS classifieds_category_check;

ALTER TABLE public.classifieds
  ADD CONSTRAINT classifieds_category_check
    CHECK (category IN (
      'job',
      'job_offer',
      'sale',
      'trade',
      'service',
      'real_estate',
      'vehicle',
      'event',
      'donation',
      'travel',        -- Pacotes turísticos, roteiros, resorts
      'equipment',     -- Aluguel de equipamentos
      'business',      -- M&A, Venda de Empresas e Pontos Comerciais
      'food'           -- Gastronomia, Pratos e Delivery
    ));

-- 2. Tabela de Registro Físico de Pontos Comerciais (Histórico de Endereço e Tráfego)
CREATE TABLE IF NOT EXISTS public.commercial_point_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_normalized TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  neighborhood TEXT,
  area_sqm NUMERIC(10,2),
  point_type TEXT NOT NULL DEFAULT 'loja_rua',
  current_occupant_name TEXT,
  current_occupant_cnpj TEXT,
  current_occupant_segment TEXT,
  occupancy_status TEXT NOT NULL DEFAULT 'occupied' CHECK (occupancy_status IN ('occupied', 'vacant', 'transitioning')),
  turnover_count INTEGER NOT NULL DEFAULT 0,
  avg_permanence_months NUMERIC(6,1) NOT NULL DEFAULT 0,
  market_attractiveness_score INTEGER NOT NULL DEFAULT 75 CHECK (market_attractiveness_score BETWEEN 0 AND 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_points_city_neigh ON public.commercial_point_records (city, neighborhood);
CREATE INDEX IF NOT EXISTS idx_comm_points_status ON public.commercial_point_records (occupancy_status);

-- 3. Tabela de Histórico de Rotatividade do Ponto Comercial (Turnover Telemetry)
CREATE TABLE IF NOT EXISTS public.commercial_point_turnover (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_point_id UUID NOT NULL REFERENCES public.commercial_point_records(id) ON DELETE CASCADE,
  former_company_name TEXT NOT NULL,
  former_cnpj TEXT,
  segment TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  duration_months INTEGER,
  reason_for_leaving TEXT,
  reported_revenue_monthly_cents BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_turnover_point ON public.commercial_point_turnover (commercial_point_id);

-- 4. Tabela de Auditoria Cadastral & SimLabs (Inteligência de CNPJ para M&A)
CREATE TABLE IF NOT EXISTS public.cnpj_market_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT NOT NULL,
  company_name TEXT NOT NULL,
  trade_name TEXT,
  cnae_principal TEXT,
  cnae_description TEXT,
  opening_date DATE,
  status TEXT NOT NULL DEFAULT 'ativa',
  tax_regime TEXT DEFAULT 'simples_nacional',
  capital_social_cents BIGINT DEFAULT 0,
  legal_risk_score INTEGER NOT NULL DEFAULT 15 CHECK (legal_risk_score BETWEEN 0 AND 100),
  succession_risk_notes TEXT,
  ai_evaluation_summary TEXT,
  audited_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cnpj_audits_cnpj ON public.cnpj_market_audits (cnpj);

-- 5. RLS Policies
ALTER TABLE public.commercial_point_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_point_turnover ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnpj_market_audits ENABLE ROW LEVEL SECURITY;

-- Leitura Pública para Registros e Rotatividade de Pontos Comerciais
DROP POLICY IF EXISTS "comm_points_public_select" ON public.commercial_point_records;
CREATE POLICY "comm_points_public_select" ON public.commercial_point_records
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "comm_turnover_public_select" ON public.commercial_point_turnover;
CREATE POLICY "comm_turnover_public_select" ON public.commercial_point_turnover
  FOR SELECT USING (true);

-- Inserção / Modificação de Pontos por Usuários Autenticados
DROP POLICY IF EXISTS "comm_points_auth_write" ON public.commercial_point_records;
CREATE POLICY "comm_points_auth_write" ON public.commercial_point_records
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Auditorias de CNPJ: Leitura por criador ou admins
DROP POLICY IF EXISTS "cnpj_audits_select" ON public.cnpj_market_audits;
CREATE POLICY "cnpj_audits_select" ON public.cnpj_market_audits
  FOR SELECT USING (
    audited_by_profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'master', 'system_admin')
    )
  );

DROP POLICY IF EXISTS "cnpj_audits_insert" ON public.cnpj_market_audits;
CREATE POLICY "cnpj_audits_insert" ON public.cnpj_market_audits
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;
