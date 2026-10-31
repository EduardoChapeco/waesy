-- Waesy: canonical stock atomicity and public signer hardening
BEGIN;

-- The post-cleanup schema has only stock_on_hand. Reservations are owned by
-- the checkout RPC and must not be recreated by the legacy ledger service.
CREATE OR REPLACE FUNCTION public.record_stock_movement_atomic(
  p_variant_id UUID,
  p_store_id UUID,
  p_movement_type TEXT,
  p_qty INTEGER,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
) RETURNS public.stock_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant public.product_variants%ROWTYPE;
  v_delta INTEGER;
  v_ledger_qty INTEGER;
  v_movement public.stock_movements;
BEGIN
  IF p_qty = 0 THEN
    RAISE EXCEPTION 'A quantidade da movimentação deve ser diferente de zero.';
  END IF;

  IF p_movement_type IN ('reserve', 'release') THEN
    RAISE EXCEPTION 'Reservas devem usar exclusivamente o checkout atômico.';
  END IF;

  IF p_reference_type IS NOT NULL AND p_reference_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      hashtext(p_store_id::TEXT || ':' || p_reference_type || ':' || p_reference_id::TEXT || ':' || p_movement_type)
    );
    SELECT * INTO v_movement
    FROM public.stock_movements
    WHERE store_id = p_store_id
      AND reference_type = p_reference_type
      AND reference_id = p_reference_id
      AND movement_type = p_movement_type
    ORDER BY created_at ASC
    LIMIT 1;
    IF FOUND THEN
      RETURN v_movement;
    END IF;
  END IF;

  SELECT pv.* INTO v_variant
  FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = p_variant_id
    AND p.store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variante não encontrada ou não pertence à loja.';
  END IF;

  CASE p_movement_type
    WHEN 'purchase', 'return', 'exchange_in' THEN
      v_delta := abs(p_qty);
      v_ledger_qty := v_delta;
    WHEN 'sale', 'exchange_out', 'damage' THEN
      v_delta := -abs(p_qty);
      v_ledger_qty := v_delta;
    WHEN 'adjustment', 'transfer' THEN
      v_delta := p_qty;
      v_ledger_qty := p_qty;
    ELSE
      RAISE EXCEPTION 'Tipo de movimentação inválido: %', p_movement_type;
  END CASE;

  IF v_variant.stock_on_hand + v_delta < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente para a movimentação.';
  END IF;

  INSERT INTO public.stock_movements (
    variant_id, store_id, movement_type, qty, reference_type,
    reference_id, note, actor_id
  ) VALUES (
    p_variant_id, p_store_id, p_movement_type, v_ledger_qty,
    p_reference_type, p_reference_id, p_note, p_actor_id
  )
  RETURNING * INTO v_movement;

  UPDATE public.product_variants
  SET stock_on_hand = stock_on_hand + v_delta,
      updated_at = now()
  WHERE id = p_variant_id;

  RETURN v_movement;
END;
$$;

REVOKE ALL ON FUNCTION public.record_stock_movement_atomic(UUID, UUID, TEXT, INTEGER, TEXT, UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_stock_movement_atomic(UUID, UUID, TEXT, INTEGER, TEXT, UUID, TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.record_stock_movement_atomic(UUID, UUID, TEXT, INTEGER, TEXT, UUID, TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_stock_movement_atomic(UUID, UUID, TEXT, INTEGER, TEXT, UUID, TEXT, UUID) TO service_role;

-- A store member may edit catalog metadata, but never the physical balance.
REVOKE UPDATE ON public.product_variants FROM PUBLIC;
REVOKE UPDATE ON public.product_variants FROM anon;
REVOKE UPDATE ON public.product_variants FROM authenticated;
GRANT UPDATE (
  product_id, sku, barcode, status, price_override_cents, cost_cents,
  attributes, stock_alert_qty, display_name, ean, height_cm,
  length_cm, requires_payment_for_backorder, backorder_lead_time_days,
  weight_kg, wholesale_price_cents, width_cm, allow_backorder
) ON public.product_variants TO authenticated;

-- Public tokens are consumed by Server Functions. Anonymous clients must not
-- be able to enumerate signer PII or write a signature directly.
DROP POLICY IF EXISTS "travel_contract_signers_public_token" ON public.travel_contract_signers;
DROP POLICY IF EXISTS "travel_contract_signers_public_update" ON public.travel_contract_signers;
ALTER TABLE public.travel_contract_signers FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.travel_contract_signers FROM PUBLIC;
REVOKE ALL ON public.travel_contract_signers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_contract_signers TO authenticated;
GRANT ALL ON public.travel_contract_signers TO service_role;

COMMIT;
