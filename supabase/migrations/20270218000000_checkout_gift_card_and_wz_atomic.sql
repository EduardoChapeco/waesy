-- ============================================================================
-- WAESY PLATFORM MIGRATION: 20270218000000_checkout_gift_card_and_wz_atomic.sql
-- ABATIMENTO ATÔMICO DE VALE-PRESENTE E SALDO $WZ NO CHECKOUT CANÔNICO
-- ============================================================================

BEGIN;

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

  -- Gift Card & $WZ tracking
  v_gift_card RECORD;
  v_gift_card_deduction_cents INTEGER := 0;
  v_gift_card_deduction_wz BIGINT := 0;
  v_secret_hash TEXT;

  v_order_id UUID;
  v_order_public_token TEXT;
  v_order_number TEXT;
  v_items_snapshot JSONB := '[]'::JSONB;
  v_initial_order_status TEXT := 'awaiting_payment';
  v_payment_status TEXT := 'pending';
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

  -- 4.2 Abatimento Canônico de Vale-Presente ($WZ Gifting)
  IF p_gift_card_code IS NOT NULL AND TRIM(p_gift_card_code) <> '' THEN
    v_secret_hash := encode(digest(TRIM(p_gift_card_code), 'sha256'), 'hex');

    SELECT * INTO v_gift_card
    FROM public.gift_cards
    WHERE (redemption_code_hash = v_secret_hash OR code = UPPER(TRIM(p_gift_card_code)))
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vale-presente inválido ou não localizado.';
    END IF;

    IF v_gift_card.status NOT IN ('active', 'opened', 'delivered') THEN
      RAISE EXCEPTION 'Este vale-presente já foi resgatado ou está inativo.';
    END IF;

    IF v_gift_card.expires_at IS NOT NULL AND v_gift_card.expires_at < now() THEN
      RAISE EXCEPTION 'Este vale-presente está expirado.';
    END IF;

    -- Invariante de Escopo: Vale emitido por empresa é restrito à empresa
    IF v_gift_card.issuer_type = 'MERCHANT' AND v_gift_card.store_id IS NOT NULL AND v_gift_card.store_id <> v_store_id THEN
      RAISE EXCEPTION 'Este vale-presente é exclusivo de outro estabelecimento parceiro.';
    END IF;

    -- Calcular saldo disponível no vale (BRL e WZ)
    DECLARE
      v_card_available_cents INTEGER;
    BEGIN
      v_card_available_cents := COALESCE(v_gift_card.balance_cents, v_gift_card.current_balance_cents, 0);
      IF v_card_available_cents <= 0 AND COALESCE(v_gift_card.wz_remaining, 0) > 0 THEN
        v_card_available_cents := round((v_gift_card.wz_remaining::numeric * 700.0) / 100000.0)::INTEGER;
      END IF;

      v_gift_card_deduction_cents := LEAST(v_card_available_cents, v_total_cents);
      IF v_gift_card_deduction_cents > 0 THEN
        v_gift_card_deduction_wz := ceil((v_gift_card_deduction_cents::numeric * 100000.0) / 700.0)::BIGINT;
        IF v_gift_card_deduction_wz > COALESCE(v_gift_card.wz_remaining, 0) THEN
          v_gift_card_deduction_wz := COALESCE(v_gift_card.wz_remaining, 0);
        END IF;

        -- Abater valor do total a pagar
        v_total_cents := v_total_cents - v_gift_card_deduction_cents;
        v_discount_cents := v_discount_cents + v_gift_card_deduction_cents;

        -- Atualizar saldo restante do vale
        UPDATE public.gift_cards
        SET
          wz_remaining = GREATEST(0, wz_remaining - v_gift_card_deduction_wz),
          balance_cents = GREATEST(0, balance_cents - v_gift_card_deduction_cents),
          current_balance_cents = GREATEST(0, current_balance_cents - v_gift_card_deduction_cents),
          status = CASE
            WHEN (balance_cents - v_gift_card_deduction_cents <= 0) AND (wz_remaining - v_gift_card_deduction_wz <= 0) THEN 'redeemed'
            ELSE status
          END,
          updated_at = now()
        WHERE id = v_gift_card.id;
      END IF;
    END;
  END IF;

  -- Se o total a pagar foi totalmente liquidado (100% vale ou desconto)
  IF v_total_cents = 0 THEN
    v_initial_order_status := 'confirmed';
    v_payment_status := 'paid';
  END IF;

  -- 5. Create Order
  INSERT INTO public.orders (
    store_id, customer_id, status, items_snapshot,
    subtotal_cents, shipping_cents, discount_cents, total_cents,
    shipping_method, shipping_address,
    customer_snapshot
  ) VALUES (
    v_store_id, v_cart.customer_id, v_initial_order_status, v_items_snapshot,
    v_subtotal_cents, v_shipping_cents, v_discount_cents, v_total_cents,
    p_shipping_method, p_shipping_address,
    jsonb_build_object(
      'name', p_customer_name,
      'email', p_customer_email,
      'document', p_customer_document,
      'phone', p_customer_phone,
      'gift_card_applied', CASE WHEN v_gift_card_deduction_cents > 0 THEN jsonb_build_object(
        'code_display', v_gift_card.code_display,
        'deduction_cents', v_gift_card_deduction_cents,
        'deduction_wz', v_gift_card_deduction_wz
      ) ELSE NULL END
    )
  ) RETURNING id, public_token, order_number INTO v_order_id, v_order_public_token, v_order_number;

  -- 5.1 Gravar evento de resgate do vale se aplicado
  IF v_gift_card_deduction_cents > 0 AND v_gift_card.id IS NOT NULL THEN
    INSERT INTO public.gift_card_events (
      gift_card_id,
      event_type,
      order_id,
      actor_id,
      payload
    ) VALUES (
      v_gift_card.id,
      'REDEEMED',
      v_order_id,
      v_cart.customer_id,
      jsonb_build_object(
        'deducted_cents', v_gift_card_deduction_cents,
        'deducted_wz', v_gift_card_deduction_wz,
        'order_number', v_order_number,
        'order_token', v_order_public_token
      )
    );
  END IF;

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
    v_payment_status,
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
    'is_idempotent_replay', false,
    'gift_card_deduction_cents', v_gift_card_deduction_cents,
    'final_total_cents', v_total_cents
  );
END;
$function$;

COMMIT;
