-- Migration: 20261129000000_v124_ad_campaigns_settings_and_stock_transfers.sql
-- Description: Adiciona coluna settings em ad_campaigns e RPC atômico de transferência entre armazéns

-- 1. Coluna settings em ad_campaigns para dados estruturados de campanhas
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- 2. RPC Atômica para transferência de estoque entre armazéns (multi-warehouse)
CREATE OR REPLACE FUNCTION transfer_stock_between_locations(
  p_store_id uuid,
  p_variant_id uuid,
  p_source_location_id uuid,
  p_dest_location_id uuid,
  p_qty integer,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id uuid;
  v_source_stock integer := 0;
  v_source_inv_id uuid;
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'A quantidade a ser transferida deve ser maior que zero.';
  END IF;

  IF p_source_location_id = p_dest_location_id THEN
    RAISE EXCEPTION 'Os armazéns de origem e destino não podem ser o mesmo.';
  END IF;

  -- Obter produto associado à variante e validar posse da loja
  SELECT p.id INTO v_product_id
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE pv.id = p_variant_id AND p.store_id = p_store_id;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Variante não encontrada ou não pertence a esta loja.';
  END IF;

  -- Validar armazém de origem
  IF NOT EXISTS (SELECT 1 FROM inventory_locations WHERE id = p_source_location_id AND store_id = p_store_id) THEN
    RAISE EXCEPTION 'Armazém de origem inválido.';
  END IF;

  -- Validar armazém de destino
  IF NOT EXISTS (SELECT 1 FROM inventory_locations WHERE id = p_dest_location_id AND store_id = p_store_id) THEN
    RAISE EXCEPTION 'Armazém de destino inválido.';
  END IF;

  -- Obter saldo na origem (com bloqueio FOR UPDATE)
  SELECT id, stock_qty INTO v_source_inv_id, v_source_stock
  FROM product_location_inventories
  WHERE location_id = p_source_location_id AND variant_id = p_variant_id
  FOR UPDATE;

  IF v_source_stock IS NULL OR v_source_stock < p_qty THEN
    RAISE EXCEPTION 'Saldo insuficiente no armazém de origem. Disponível: %, Solicitado: %', COALESCE(v_source_stock, 0), p_qty;
  END IF;

  -- Deduz da origem
  UPDATE product_location_inventories
  SET stock_qty = stock_qty - p_qty,
      updated_at = now()
  WHERE id = v_source_inv_id;

  -- Incrementa no destino (upsert)
  INSERT INTO product_location_inventories (
    store_id, location_id, product_id, variant_id, stock_qty, updated_at
  ) VALUES (
    p_store_id, p_dest_location_id, v_product_id, p_variant_id, p_qty, now()
  )
  ON CONFLICT (location_id, product_id, variant_id) WHERE variant_id IS NOT NULL
  DO UPDATE SET
    stock_qty = product_location_inventories.stock_qty + EXCLUDED.stock_qty,
    updated_at = now();

  -- Registra movimentação de saída
  INSERT INTO stock_movements (
    store_id, variant_id, movement_type, qty, location_id, note, created_at
  ) VALUES (
    p_store_id, p_variant_id, 'transfer', -p_qty, p_source_location_id, COALESCE(p_note, 'Transferência de saída'), now()
  );

  -- Registra movimentação de entrada
  INSERT INTO stock_movements (
    store_id, variant_id, movement_type, qty, location_id, note, created_at
  ) VALUES (
    p_store_id, p_variant_id, 'transfer', p_qty, p_dest_location_id, COALESCE(p_note, 'Transferência de entrada'), now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'variant_id', p_variant_id,
    'qty', p_qty,
    'source_location_id', p_source_location_id,
    'dest_location_id', p_dest_location_id
  );
END;
$$;
