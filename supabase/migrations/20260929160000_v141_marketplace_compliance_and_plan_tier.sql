-- =============================================================================
-- V141: DUAL-ENGINE ARCHITECTURE & MARKETPLACE COMPLIANCE
-- Segregação Estrita: Classificados Livres vs. Marketplace Oficial Verificado
-- =============================================================================

-- 1. Enum e Coluna de Plan Tier nas Lojas (Stores)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stores' AND column_name = 'plan_tier'
  ) THEN
    ALTER TABLE public.stores 
    ADD COLUMN plan_tier text NOT NULL DEFAULT 'FREE_MVP' 
    CHECK (plan_tier IN ('FREE_MVP', 'WAESY_MAX'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stores_plan_tier ON public.stores(plan_tier);

-- 2. Tabela de Conformidade do Marketplace Oficial (marketplace_compliance)
CREATE TABLE IF NOT EXISTS public.marketplace_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  cnpj varchar(18) NOT NULL UNIQUE,
  legal_name varchar(255) NOT NULL,
  trade_name varchar(255),
  verified_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_support_channel jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'SUSPENDED')),
  rejection_reason text,
  verified_at timestamptz,
  expires_at timestamptz,
  audited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_marketplace_compliance_store UNIQUE (store_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_compliance_status ON public.marketplace_compliance(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_compliance_cnpj ON public.marketplace_compliance(cnpj);
CREATE INDEX IF NOT EXISTS idx_marketplace_compliance_store_id ON public.marketplace_compliance(store_id);

-- 3. RLS na Tabela marketplace_compliance
ALTER TABLE public.marketplace_compliance ENABLE ROW LEVEL SECURITY;

-- Leitura pública de selos de conformidade APROVADOS (Zero Trust)
DROP POLICY IF EXISTS "Public can view approved marketplace compliance" ON public.marketplace_compliance;
CREATE POLICY "Public can view approved marketplace compliance"
  ON public.marketplace_compliance
  FOR SELECT
  USING (status = 'APPROVED');

-- Lojistas podem consultar sua própria conformidade
DROP POLICY IF EXISTS "Store staff can view their store compliance" ON public.marketplace_compliance;
CREATE POLICY "Store staff can view their store compliance"
  ON public.marketplace_compliance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = marketplace_compliance.store_id
        AND wm.profile_id = auth.uid()
    )
  );

-- Admins da Plataforma possuem controle total
DROP POLICY IF EXISTS "Platform admins manage marketplace compliance" ON public.marketplace_compliance;
CREATE POLICY "Platform admins manage marketplace compliance"
  ON public.marketplace_compliance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('master', 'platform_admin', 'admin')
    )
  );

-- 4. View Canônica: Lojas Verificadas do Marketplace Oficial
CREATE OR REPLACE VIEW public.v_verified_marketplace_stores AS
SELECT 
  s.id AS store_id,
  s.name AS store_name,
  s.slug AS store_slug,
  s.city,
  s.state,
  s.logo_url,
  s.banner_url,
  s.plan_tier,
  mc.cnpj,
  mc.legal_name,
  mc.trade_name,
  mc.verified_address,
  mc.verified_support_channel,
  mc.verified_at,
  mc.status AS compliance_status
FROM public.stores s
INNER JOIN public.marketplace_compliance mc 
  ON s.id = mc.store_id 
  AND mc.status = 'APPROVED';

COMMENT ON TABLE public.marketplace_compliance IS 'Auditoria rigorosa de conformidade de lojas oficiais no Marketplace (CNPJ ativo, fiscal e SAC)';
COMMENT ON VIEW public.v_verified_marketplace_stores IS 'Lojas aprovadas e homologadas para venda direta com selo oficial de verificação';
