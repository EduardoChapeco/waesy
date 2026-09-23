-- ============================================================================
-- WAESY B2B GOV HARVESTER: LICITAÇÕES PÚBLICAS, PNCP & FILTROS DE ALERTA
-- Extração Contínua, Dossiê Executivo com IA e Tarifação Transacional por Tokens
-- ============================================================================

-- 1. Tabela Canônica de Licitações Públicas Mineradas
CREATE TABLE IF NOT EXISTS public.mined_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pncp_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  agency_name TEXT NOT NULL,
  agency_cnpj TEXT,
  modality TEXT NOT NULL,
  estimated_amount_cents BIGINT DEFAULT 0,
  publication_date TIMESTAMPTZ,
  closing_date TIMESTAMPTZ,
  city TEXT NOT NULL,
  uf TEXT NOT NULL DEFAULT 'SC',
  portal_url TEXT,
  edital_url TEXT,
  ai_curated_digest JSONB DEFAULT NULL,
  ai_risk_score INTEGER DEFAULT 0,
  unlocked_by_stores UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de Performance para Descoberta de Licitações
CREATE INDEX IF NOT EXISTS idx_mined_tenders_city_uf ON public.mined_tenders(city, uf);
CREATE INDEX IF NOT EXISTS idx_mined_tenders_closing ON public.mined_tenders(closing_date DESC);
CREATE INDEX IF NOT EXISTS idx_mined_tenders_modality ON public.mined_tenders(modality);
CREATE INDEX IF NOT EXISTS idx_mined_tenders_amount ON public.mined_tenders(estimated_amount_cents DESC);

-- 2. Tabela de Filtros de Alerta de Oportunidades por Loja
CREATE TABLE IF NOT EXISTS public.tender_alert_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Alerta Principal',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  cities TEXT[] NOT NULL DEFAULT '{}',
  min_amount_cents BIGINT DEFAULT 0,
  max_amount_cents BIGINT,
  notify_whatsapp BOOLEAN NOT NULL DEFAULT false,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tender_alerts_store ON public.tender_alert_filters(store_id);

-- 3. Habilitar RLS Rígido
ALTER TABLE public.mined_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_alert_filters ENABLE ROW LEVEL SECURITY;

-- Políticas para Licitações: Leitura Pública, Escrita Restrita ao Backend / Admin
DROP POLICY IF EXISTS "mined_tenders_read_all" ON public.mined_tenders;
CREATE POLICY "mined_tenders_read_all" ON public.mined_tenders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "mined_tenders_admin_write" ON public.mined_tenders;
CREATE POLICY "mined_tenders_admin_write" ON public.mined_tenders
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('platform_admin', 'master', 'admin'))
  );

-- Políticas para Filtros de Alerta: Isolamento Multi-Tenant por Loja
DROP POLICY IF EXISTS "tender_alert_filters_store_own" ON public.tender_alert_filters;
CREATE POLICY "tender_alert_filters_store_own" ON public.tender_alert_filters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = tender_alert_filters.store_id
      AND wm.profile_id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('platform_admin', 'master', 'admin'))
  );
