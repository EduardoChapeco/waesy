-- ============================================================================
-- Waesy Commerce — Migration 20261115010000: Update process_checkout_atomic
-- ============================================================================
-- Retorna o order_number canônico e soberano gerado pela Sequence no PostgreSQL.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_checkout_atomic(
  p_cart_id UUID,
  p_idempotency_key TEXT,
  p_payment_method TEXT,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_document TEXT,
  p_customer_phone TEXT,
  p_shipping_address JSONB,
  p_shipping_method TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart RECORD;
  v_coupon RECORD;
  v_item RECORD;
  v_store_id UUID;
  v_subtotal_cents INTEGER := 0;
  v_discount_cents INTEGER := 0;
  v_shipping_cents INTEGER := 0;
  v_total_cents INTEGER := 0;

  v_order_id UUID;
  v_order_public_token TEXT;
  v_order_number TEXT;
  v_items_snapshot JSONB := '[]'::JSONB;
BEGIN
  -- 1. Limpeza lazy de reservas expiradas
  PERFORM public.release_expired_reservations();

  -- 2. Checagem de Idempotência
  SELECT o.public_token, o.id, o.order_number 
  INTO v_order_public_token, v_order_id, v_order_number
  FROM public.payments p
  JOIN public.orders o ON o.id = p.order_id
  WHERE p.idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_order_public_token IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'orderToken', v_order_public_token,
      'orderId', v_order_id,
      'orderNumber', v_order_number,
      'is_idempotent_replay', true
    );
  END IF;

  -- 3. Bloqueio transacional do Carrinho (Pessimistic Lock)
  SELECT * INTO v_cart
  FROM public.carts
  WHERE id = p_cart_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carrinho não encontrado ou já processado.';
  END IF;

  v_store_id := v_cart.store_id;
  v_shipping_cents := COALESCE(v_cart.shipping_cents, 0);

  -- 4. Construção do snapshot preservando as opções selecionadas (modificadores) e polimorfismo
  FOR v_item IN (
    SELECT
      ci.qty,
      ci.price_snapshot_cents,
      ci.variant_id,
      ci.item_type,
      ci.item_id,
      ci.selected_options,
      pv.sku,
      pv.display_name,
      p.title AS product_title,
      p.preparation_time_days,
      COALESCE(pv.price_override_cents, p.price_cents) AS effective_price_cents,
      COALESCE(pv.cost_cents, p.cost_cents) AS effective_cost_cents,
      COALESCE(pv.weight_kg, p.weight_kg) AS effective_weight_kg,
      COALESCE(pv.width_cm,  p.width_cm)  AS effective_width_cm,
      COALESCE(pv.height_cm, p.height_cm) AS effective_height_cm,
      COALESCE(pv.length_cm, p.length_cm) AS effective_length_cm,
      p.is_physical,
      COALESCE(pv.ean, p.ean) AS effective_ean,
      pv.attributes AS variant_attributes,
      pv.stock_on_hand,
      pm.url AS image_url
    FROM public.cart_items ci
    LEFT JOIN public.product_variants pv ON pv.id = ci.variant_id
    LEFT JOIN public.products p ON p.id = pv.product_id
    LEFT JOIN LATERAL (
      SELECT url FROM public.product_media
      WHERE product_id = p.id AND (variant_id = pv.id OR variant_id IS NULL)
      ORDER BY (variant_id = pv.id) DESC, sort_order ASC
      LIMIT 1
    ) pm ON true
    WHERE ci.cart_id = p_cart_id
    ORDER BY ci.created_at ASC
  ) LOOP
    v_subtotal_cents := v_subtotal_cents + (v_item.price_snapshot_cents * v_item.qty);

    v_items_snapshot := v_items_snapshot || jsonb_build_object(
      'variant_id', v_item.variant_id,
      'item_type', COALESCE(v_item.item_type, 'product'),
      'item_id', v_item.item_id,
      'selected_options', v_item.selected_options,
      'product_title', COALESCE(v_item.product_title, 'Item sem título'),
      'variant_sku', COALESCE(v_item.sku, 'SKU-GENERICO'),
      'display_name', v_item.display_name,
      'variant_attributes', COALESCE(v_item.variant_attributes, '{}'::JSONB),
      'image_url', v_item.image_url,
      'qty', v_item.qty,
      'unit_price_cents', v_item.price_snapshot_cents,
      'total_cents', (v_item.price_snapshot_cents * v_item.qty),
      'preparation_time_days', v_item.preparation_time_days,
      'effective_cost_cents', v_item.effective_cost_cents,
      'effective_weight_kg', v_item.effective_weight_kg,
      'effective_width_cm', v_item.effective_width_cm,
      'effective_height_cm', v_item.effective_height_cm,
      'effective_length_cm', v_item.effective_length_cm,
      'is_physical', COALESCE(v_item.is_physical, true),
      'effective_ean', v_item.effective_ean
    );
  END LOOP;

  -- 5. Aplicação de Cupom
  IF v_cart.coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE id = v_cart.coupon_id AND store_id = v_store_id
    FOR UPDATE;

    IF FOUND AND v_coupon.is_active AND (v_coupon.expires_at IS NULL OR v_coupon.expires_at > now()) THEN
      IF v_coupon.discount_type = 'percentage' THEN
        v_discount_cents := ROUND((v_subtotal_cents * v_coupon.discount_value) / 100);
      ELSIF v_coupon.discount_type = 'fixed' THEN
        v_discount_cents := v_coupon.discount_value;
      END IF;

      IF v_coupon.max_discount_cents IS NOT NULL AND v_discount_cents > v_coupon.max_discount_cents THEN
        v_discount_cents := v_coupon.max_discount_cents;
      END IF;
    ELSE
      v_discount_cents := 0;
    END IF;

    UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = v_coupon.id;
  END IF;

  v_total_cents := v_subtotal_cents + v_shipping_cents - v_discount_cents;
  IF v_total_cents < 0 THEN v_total_cents := 0; END IF;

  -- 6. Criação do Pedido (Status inicial: awaiting_payment)
  INSERT INTO public.orders (
    store_id, customer_id, status, items_snapshot,
    subtotal_cents, shipping_cents, discount_cents, total_cents,
    shipping_method, shipping_address, channel_origin, origin_type,
    customer_snapshot
  ) VALUES (
    v_store_id, v_cart.customer_id, 'awaiting_payment', v_items_snapshot,
    v_subtotal_cents, v_shipping_cents, v_discount_cents, v_total_cents,
    p_shipping_method, p_shipping_address, 'vitrine_online', 'ecommerce',
    jsonb_build_object(
      'name', p_customer_name,
      'email', p_customer_email,
      'document', p_customer_document,
      'phone', p_customer_phone
    )
  ) RETURNING id, public_token, order_number INTO v_order_id, v_order_public_token, v_order_number;

  -- 7. Processamento estrito dos Itens de Pedido e Movimentação de Estoque
  FOR v_item IN (
    SELECT el AS item_json FROM jsonb_array_elements(v_items_snapshot) AS el
  ) LOOP
    INSERT INTO public.order_items (
      order_id, variant_id, item_type, item_id, selected_options,
      product_title, variant_sku,
      variant_attributes, image_url, qty, unit_price_cents, total_cents
    ) VALUES (
      v_order_id,
      NULLIF(v_item.item_json->>'variant_id', '')::UUID,
      COALESCE(v_item.item_json->>'item_type', 'product'),
      NULLIF(v_item.item_json->>'item_id', '')::UUID,
      (v_item.item_json->>'selected_options')::JSONB,
      v_item.item_json->>'product_title',
      v_item.item_json->>'variant_sku',
      (v_item.item_json->>'variant_attributes')::JSONB,
      v_item.item_json->>'image_url',
      (v_item.item_json->>'qty')::INTEGER,
      (v_item.item_json->>'unit_price_cents')::INTEGER,
      (v_item.item_json->>'total_cents')::INTEGER
    );

    IF NULLIF(v_item.item_json->>'variant_id', '') IS NOT NULL THEN
      INSERT INTO public.stock_movements (
        variant_id, store_id, movement_type, qty,
        reference_type, reference_id, note, actor_id
      ) VALUES (
        (v_item.item_json->>'variant_id')::UUID,
        v_store_id,
        'sale',
        -1 * (v_item.item_json->>'qty')::INTEGER,
        'order',
        v_order_id,
        'Pedido ' || v_order_number,
        v_cart.customer_id
      );

      UPDATE public.product_variants
      SET
        stock_on_hand  = GREATEST(0, stock_on_hand  - (v_item.item_json->>'qty')::INTEGER),
        stock_reserved = GREATEST(0, stock_reserved - (v_item.item_json->>'qty')::INTEGER)
      WHERE id = (v_item.item_json->>'variant_id')::UUID;
    END IF;
  END LOOP;

  -- 8. Liberação da reserva do carrinho
  DELETE FROM public.stock_reservations WHERE cart_id = p_cart_id;

  -- 9. Registro de Tentativa de Pagamento (status inicial pending)
  INSERT INTO public.payments (
    order_id, store_id, method, status, amount_cents, idempotency_key
  ) VALUES (
    v_order_id,
    v_store_id,
    p_payment_method::public.payment_method,
    'pending',
    v_total_cents,
    p_idempotency_key
  );

  -- 10. Conclusão do Carrinho
  DELETE FROM public.cart_items WHERE cart_id = p_cart_id;
  UPDATE public.carts SET status = 'completed' WHERE id = p_cart_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'orderToken', v_order_public_token,
    'orderId', v_order_id,
    'orderNumber', v_order_number,
    'is_idempotent_replay', false
  );
END;
$$;
