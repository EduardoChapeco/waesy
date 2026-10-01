-- ============================================================================
-- Migration: 20261221000000_unified_listings_canonical_engine.sql
-- Motor Canônico Unificado de Anúncios e Vitrine (Bloco B / F07 a F14)
-- ============================================================================

-- 1. Índices de Otimização e Expiração Rápida (F08 / F11)
CREATE INDEX IF NOT EXISTS idx_classifieds_status_expires_at 
  ON public.classifieds (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_classifieds_niche_price 
  ON public.classifieds (category, price_cents);

CREATE INDEX IF NOT EXISTS idx_products_status_store 
  ON public.products (status, store_id);

-- 2. View Canônica Unificada de Listagens (Classificados + Workspace)
-- Une ambas as fontes em um único contrato relacional sem duplicidade
CREATE OR REPLACE VIEW public.unified_listings_view AS
SELECT 
  c.id,
  'classified'::text AS origin,
  COALESCE(c.attributes->>'item_type', 'product') AS item_type,
  COALESCE(c.category, 'geral') AS niche_id,
  COALESCE(c.attributes->>'category_id', c.category) AS category_id,
  c.author_profile_id AS author_id,
  NULL::uuid AS organization_id,
  c.store_id,
  c.title,
  c.id::text AS slug,
  c.content AS description,
  c.price_cents,
  COALESCE(c.attributes->>'selling_unit', 'un') AS selling_unit,
  c.images,
  c.status,
  c.expires_at,
  c.created_at,
  c.updated_at,
  c.attributes
FROM public.classifieds c

UNION ALL

SELECT 
  p.id,
  'workspace'::text AS origin,
  COALESCE(p.metadata->>'item_type', 'product') AS item_type,
  COALESCE(p.metadata->>'niche_id', 'varejo') AS niche_id,
  COALESCE(p.category_id::text, 'geral') AS category_id,
  COALESCE(p.metadata->>'author_id', '00000000-0000-0000-0000-000000000000')::uuid AS author_id,
  s.organization_id,
  p.store_id,
  p.title,
  p.slug,
  p.description,
  p.price_cents,
  'un'::text AS selling_unit,
  ARRAY[]::text[] AS images,
  p.status,
  NULL::timestamptz AS expires_at,
  p.created_at,
  p.updated_at,
  COALESCE(p.metadata, '{}'::jsonb) AS attributes
FROM public.products p
LEFT JOIN public.stores s ON s.id = p.store_id;

-- 3. Função RPC de Expiração Automática para Classificados (F08)
CREATE OR REPLACE FUNCTION public.rpc_auto_expire_classifieds()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE public.classifieds
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.rpc_auto_expire_classifieds() IS 'Rotina atômica de expiração de classificados vencidos (F08)';
