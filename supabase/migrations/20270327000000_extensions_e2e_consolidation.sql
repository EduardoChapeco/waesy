-- ============================================================================
-- MIGRATION: 20270327000000_extensions_e2e_consolidation.sql
-- DESCRIÇÃO: Consolidação End-to-End das Extensões Waesy (Infotravel Sync,
--            WhatsApp Ingest & Radar de Oportunidades CRM)
-- ============================================================================

BEGIN;

-- 1. Concessão idempotente de 'infotravel_sync' para Excelência Tour SMO
INSERT INTO public.workspace_feature_grants (store_id, feature_key, enabled)
SELECT id, 'infotravel_sync', true
FROM public.stores
WHERE slug ILIKE 'excelencia-tour%'
   OR slug ILIKE 'excelencia%smo%'
   OR slug = 'excelencia-tour-sao-miguel-do-oeste'
   OR name ILIKE '%excelência tour%'
   OR name ILIKE '%excelencia tour%'
ON CONFLICT (store_id, feature_key) DO UPDATE SET enabled = true;

-- 2. Permitir que travel_opportunities vincule tanto travel_client_demands quanto leads_crm
ALTER TABLE public.travel_opportunities
  ALTER COLUMN demand_id DROP NOT NULL;

ALTER TABLE public.travel_opportunities
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE CASCADE;

ALTER TABLE public.travel_opportunities
  DROP CONSTRAINT IF EXISTS chk_travel_opportunities_target;

ALTER TABLE public.travel_opportunities
  ADD CONSTRAINT chk_travel_opportunities_target
  CHECK (demand_id IS NOT NULL OR lead_id IS NOT NULL);

-- Substitui constraint única antiga por índices únicos parciais por origem (demand_id vs lead_id)
ALTER TABLE public.travel_opportunities
  DROP CONSTRAINT IF EXISTS uq_travel_opportunity_demand_capture;

CREATE UNIQUE INDEX IF NOT EXISTS uq_travel_opportunity_demand_capture
  ON public.travel_opportunities (demand_id, capture_id)
  WHERE demand_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_travel_opportunity_lead_capture
  ON public.travel_opportunities (lead_id, capture_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_travel_opportunities_lead
  ON public.travel_opportunities (lead_id)
  WHERE lead_id IS NOT NULL;

COMMIT;
