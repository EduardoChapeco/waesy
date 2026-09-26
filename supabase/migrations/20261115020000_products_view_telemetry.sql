-- ============================================================================
-- Waesy Commerce — Migration 20261115020000: Products View Telemetry & Order Events API
-- ============================================================================
-- Adiciona views_count na tabela products e função RPC atômica para telemetria real.
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_views_count ON public.products (store_id, views_count DESC);

CREATE OR REPLACE FUNCTION public.increment_product_view(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_views INTEGER;
BEGIN
  UPDATE public.products
  SET views_count = views_count + 1
  WHERE id = p_product_id
  RETURNING views_count INTO v_new_views;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Produto não encontrado');
  END IF;

  RETURN jsonb_build_object('success', true, 'views_count', v_new_views);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_view(UUID) TO anon, authenticated, service_role;
