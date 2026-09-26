-- Migration: Update process_checkout_transaction_v2 with systemic order_number and delivery calculation
-- Ensures zero hardcoded delivery rates and guarantees orderNumber is always returned

CREATE OR REPLACE FUNCTION public.process_checkout_transaction_v2(
  p_cart_id uuid,
  p_idempotency_key text,
  p_customer_name text,
  p_customer_email text,
  p_customer_document text,
  p_customer_phone text,
  p_shipping_method text,
  p_shipping_address jsonb,
  p_payment_method text,
  p_gift_card_code text DEFAULT NULL::text,
  p_manual_payment_method_id uuid DEFAULT NULL::uuid,
  p_affiliate_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_store_id UUID;
  v_cart RECORD;
  v_coupon RECORD;
  v_item RECORD;

  v_subtotal_cents INTEGER := 0;
  v_discount_cents INTEGER := 0;
  v_shipping_cents INTEGER := 0;
  v_total_cents INTEGER := 0;

  v_order_id UUID;
  v_order_public_token TEXT;
  v_order_number TEXT;
  v_items_snapshot JSONB := '[]'::JSONB;
BEGIN
  -- 0. Acquire Transaction-Level Advisory Lock based on idempotency_key
  PERFORM pg_advisory_xact_lock(hashtext(p_idempotency_key));

  -- 1. Idempotency Check
  SELECT o.public_token, o.id, o.order_number INTO v_order_public_token, v_order_id, v_order_number
  FROM public.payments p
  JOIN public.orders o ON o.id = p.order_id
  WHERE p.idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_order_public_token IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'orderId', v_order_id,
      'orderToken', v_order_public_token,
      'orderNumber', v_order_number,
      'is_idempotent_replay', true
    );
  END IF;

  -- 2. Cart Pessimistic Lock
  SELECT * INTO v_cart
  FROM public.carts
  WHERE id = p_cart_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carrinho não encontrado ou já processado.';
  END IF;

  v_store_id := v_cart.store_id;
  v_shipping_cents := COALESCE(v_cart.shipping_cents, 0);

  -- 3. Snapshot and Stock Strict Validation
  FOR v_item IN (
    SELECT
      ci.qty,
      ci.price_snapshot_cents,
      ci.variant_id,
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
      pv.allow_backorder,
      pm.url AS image_url
    FROM public.cart_items ci
    JOIN public.product_variants pv ON pv.id = ci.variant_id
    JOIN public.products p ON p.id = pv.product_id
    LEFT JOIN LATERAL (
      SELECT url FROM public.product_media
      WHERE product_id = p.id AND (variant_id = pv.id OR variant_id IS NULL)
      ORDER BY (variant_id = pv.id) DESC, sort_order ASC
      LIMIT 1
    ) pm ON true
    WHERE ci.cart_id = p_cart_id
  ) LOOP
    -- [STRICT VALIDATION] Ensure we have physical stock OR allow_backorder is true!
    IF v_item.qty > v_item.stock_on_hand AND NOT COALESCE(v_item.allow_backorder, false) THEN
      RAISE EXCEPTION 'O item (SKU: %) está esgotado ou tem quantidade insuficiente.', v_item.sku;
    END IF;

    v_subtotal_cents := v_subtotal_cents + (v_item.qty * COALESCE(NULLIF(v_item.effective_price_cents, 0), v_item.price_snapshot_cents, 0));

    v_items_snapshot := v_items_snapshot || jsonb_build_object(
      'variant_id',         v_item.variant_id,
      'qty',                v_item.qty,
      'unit_price_cents',   COALESCE(NULLIF(v_item.effective_price_cents, 0), v_item.price_snapshot_cents, 0),
      'total_cents',        (v_item.qty * COALESCE(NULLIF(v_item.effective_price_cents, 0), v_item.price_snapshot_cents, 0)),
      'cost_cents',         v_item.effective_cost_cents,
      'product_title',      v_item.product_title,
      'display_name',       v_item.display_name,
      'variant_sku',        v_item.sku,
      'variant_ean',        v_item.effective_ean,
      'variant_attributes', COALESCE(v_item.variant_attributes, '{}'::jsonb),
      'image_url',          v_item.image_url,
      'weight_kg',          v_item.effective_weight_kg,
      'width_cm',           v_item.effective_width_cm,
      'height_cm',          v_item.effective_height_cm,
      'length_cm',          v_item.effective_length_cm,
      'is_physical',        v_item.is_physical,
      'preparation_days',   v_item.preparation_time_days,
      'is_backorder',       v_item.qty > v_item.stock_on_hand
    );
  END LOOP;

  IF jsonb_array_length(v_items_snapshot) = 0 THEN
    RAISE EXCEPTION 'Carrinho vazio.';
  END IF;

  -- 4. Apply Coupon
  IF v_cart.coupon_code IS NOT NULL THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE store_id = v_store_id AND code = v_cart.coupon_code AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Cupom inválido ou inativo.'; END IF;
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN RAISE EXCEPTION 'Cupom expirado.'; END IF;
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN RAISE EXCEPTION 'Limite de uso do cupom esgotado.'; END IF;
    IF v_coupon.min_purchase_cents IS NOT NULL AND v_subtotal_cents < v_coupon.min_purchase_cents THEN RAISE EXCEPTION 'Subtotal inferior ao mínimo exigido pelo cupom.'; END IF;

    IF v_coupon.discount_type = 'percentage' THEN
      v_discount_cents := floor(v_subtotal_cents * (v_coupon.discount_value / 100.0))::INTEGER;
    ELSIF v_coupon.discount_type = 'fixed_amount' THEN
      v_discount_cents := LEAST(v_subtotal_cents, v_coupon.discount_value::INTEGER);
    ELSIF v_coupon.discount_type = 'free_shipping' THEN
      v_shipping_cents := 0;
      v_discount_cents := 0;
    END IF;

    UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = v_coupon.id;
  END IF;

  -- 4.1 Revalidação e Cálculo Sistêmico Soberano de Taxa de Entrega
  IF p_shipping_method = 'pickup' THEN
    v_shipping_cents := 0;
  ELSIF (v_cart.coupon_code IS NULL OR v_coupon.discount_type <> 'free_shipping') THEN
    IF (v_shipping_cents = 0 OR v_shipping_cents IS NULL) AND v_store_id IS NOT NULL THEN
      DECLARE
        v_fee_res JSONB;
      BEGIN
        v_fee_res := public.calculate_order_delivery_fee(
          v_store_id,
          v_subtotal_cents,
          'delivery',
          COALESCE(p_shipping_address->>'neighborhood', NULL)
        );
        IF v_fee_res IS NOT NULL AND (v_fee_res->>'fee_cents') IS NOT NULL THEN
          v_shipping_cents := (v_fee_res->>'fee_cents')::INT;
        END IF;
      END;
    END IF;
  END IF;

  v_total_cents := v_subtotal_cents + v_shipping_cents - v_discount_cents;
  IF v_total_cents < 0 THEN v_total_cents := 0; END IF;

  -- 5. Create Order
  INSERT INTO public.orders (
    store_id, customer_id, status, items_snapshot,
    subtotal_cents, shipping_cents, discount_cents, total_cents,
    shipping_method, shipping_address,
    customer_snapshot
  ) VALUES (
    v_store_id, v_cart.customer_id, 'awaiting_payment', v_items_snapshot,
    v_subtotal_cents, v_shipping_cents, v_discount_cents, v_total_cents,
    p_shipping_method, p_shipping_address,
    jsonb_build_object(
      'name', p_customer_name,
      'email', p_customer_email,
      'document', p_customer_document,
      'phone', p_customer_phone
    )
  ) RETURNING id, public_token, order_number INTO v_order_id, v_order_public_token, v_order_number;

  -- 6. Strict Item Processing and Stock Deduction
  FOR v_item IN (
    SELECT el AS item_json FROM jsonb_array_elements(v_items_snapshot) AS el
  ) LOOP
    INSERT INTO public.order_items (
      order_id, variant_id, product_title, variant_sku,
      variant_attributes, image_url, qty, unit_price_cents, total_cents
    ) VALUES (
      v_order_id,
      (v_item.item_json->>'variant_id')::UUID,
      v_item.item_json->>'product_title',
      v_item.item_json->>'variant_sku',
      (v_item.item_json->>'variant_attributes')::JSONB,
      v_item.item_json->>'image_url',
      (v_item.item_json->>'qty')::INTEGER,
      (v_item.item_json->>'unit_price_cents')::INTEGER,
      (v_item.item_json->>'total_cents')::INTEGER
    );

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
      'Pedido #' || COALESCE(v_order_number, v_order_public_token),
      v_cart.customer_id
    );

    -- Strict deduction (allows going negative if allow_backorder is true)
    UPDATE public.product_variants
    SET stock_on_hand = stock_on_hand - (v_item.item_json->>'qty')::INTEGER
    WHERE id = (v_item.item_json->>'variant_id')::UUID;
  END LOOP;

  -- 7. Payment Intent
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

  -- 8. Finalize Cart
  DELETE FROM public.cart_items WHERE cart_id = p_cart_id;
  UPDATE public.carts SET status = 'completed' WHERE id = p_cart_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'orderId', v_order_id,
    'orderToken', v_order_public_token,
    'orderNumber', v_order_number,
    'is_idempotent_replay', false
  );
END;
$function$;
