-- ============================================================================
-- Migration: Harmonização Classificados <-> Workspace Pro
-- Suporte a conversão nativa de anúncios para o catálogo da loja sem perda de dados
-- ============================================================================

ALTER TABLE public.classifieds
  ADD COLUMN IF NOT EXISTS workspace_entity_id UUID,
  ADD COLUMN IF NOT EXISTS workspace_entity_type TEXT CHECK (workspace_entity_type IN ('product', 'booking_service', 'group_tour', 'job', 'property')),
  ADD COLUMN IF NOT EXISTS is_store_official BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_payment_with_store BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_classifieds_workspace_entity ON public.classifieds (workspace_entity_id, workspace_entity_type);
