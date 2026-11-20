-- ============================================================================
-- Migration: Phase 2 Wave 6 — External Waesy MCP API Keys & B2B Partner Catalog Syndication
-- Spec: docs/specs/SPEC-20261119-PHASE2-CORE-MULTINICHE-TURIS.md
-- ============================================================================

-- 1. store_mcp_api_keys (Chaves Bearer/API Key escopadas para Clientes MCP Externos: Claude, Cursor, ChatGPT, n8n)
CREATE TABLE IF NOT EXISTS public.store_mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['*']::text[],
  is_platform_admin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_mcp_api_keys_store_active
  ON public.store_mcp_api_keys (store_id, is_active);

ALTER TABLE public.store_mcp_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_mcp_api_keys FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_mcp_api_keys_staff_all" ON public.store_mcp_api_keys;
CREATE POLICY "store_mcp_api_keys_staff_all"
  ON public.store_mcp_api_keys
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

-- 2. b2b_partner_catalog_shares (Sindicação B2B Controlada de Pacotes/Produtos no App Próprio /app/:slug)
CREATE TABLE IF NOT EXISTS public.b2b_partner_catalog_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  reseller_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'tourism_experience', 'classified', 'collection')),
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'revoked')),
  commission_bps INTEGER NOT NULL DEFAULT 0 CHECK (commission_bps BETWEEN 0 AND 10000),
  markup_bps INTEGER NOT NULL DEFAULT 0 CHECK (markup_bps BETWEEN 0 AND 50000),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_b2b_partner_catalog_share UNIQUE (supplier_store_id, reseller_store_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_b2b_partner_shares_reseller
  ON public.b2b_partner_catalog_shares (reseller_store_id, status);

ALTER TABLE public.b2b_partner_catalog_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_partner_catalog_shares FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "b2b_partner_shares_staff_access" ON public.b2b_partner_catalog_shares;
CREATE POLICY "b2b_partner_shares_staff_access"
  ON public.b2b_partner_catalog_shares
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(supplier_store_id) OR public.is_store_staff(reseller_store_id))
  WITH CHECK (public.is_store_staff(supplier_store_id) OR public.is_store_staff(reseller_store_id));

NOTIFY pgrst, 'reload schema';
