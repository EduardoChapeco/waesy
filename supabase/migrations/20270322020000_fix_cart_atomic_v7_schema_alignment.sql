-- ============================================================================
-- Migration: 20270322020000_fix_cart_atomic_v7_schema_alignment.sql
-- Description: Aligns add_to_cart_atomic_v7, process_checkout_transaction_v2,
-- and finalize_order_and_dispatch_motolink_atomic with the exact live schema
-- of cart_items, orders, and order_items.
-- Fixes column mismatches (selected_options, price_snapshot_cents, item_id),
-- fixes positional argument inversion in reserve_resource_15min_atomic,
-- preserves selected_options in order_items, and cleans up fulfilled reservations.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Upgrade add_to_cart_atomic_v7
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_to_cart_atomic_v7(
  p_cart_id UUID,
  p_variant_id UUID,
  p_qty INTEGER,
  p_options JSONB DEFAULT '{}'::jsonb,
  p_notes TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
DECLARE
  v_variant public.product_variants%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_active_reservations INTEGER := 0;
  v_existing_cart_qty INTEGER := 0;
  v_net_available INTEGER := 0;
  v_existing_item_id UUID;
  v_item_id UUID;
  v_price_cents INTEGER;
  v_options_price INTEGER := 0;
  v_modifiers_price INTEGER := 0;
  v_reservation_res jsonb := NULL;
  v_target_options jsonb := COALESCE(p_options, '{}'::jsonb);
BEGIN
  IF p_qty <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Quantidade deve ser superior a zero.');
  END IF;

  -- 1. Trava a linha da variante para exclusão mútua concorrente
  SELECT * INTO v_variant
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Variante não encontrada.');
  END IF;

  IF v_variant.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta opção de produto está indisponível ou inativa.');
  END IF;

  -- 2. Recupera produto pai
  SELECT * INTO v_product
  FROM public.products
  WHERE id = v_variant.product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Produto pai não encontrado.');
  END IF;

  -- 3. Calcula reservas ativas no sistema para outras sessões (expiração > now)
  SELECT COALESCE(SUM(qty), 0) INTO v_active_reservations
  FROM public.universal_reservations
  WHERE resource_type = 'product_variant'
    AND resource_id = p_variant_id
    AND status = 'active'
    AND expires_at >= now()
    AND (p_session_id IS NULL OR session_id != p_session_id);

  -- 4. Calcula quantidade já existente deste produto no mesmo carrinho
  SELECT COALESCE(SUM(qty), 0) INTO v_existing_cart_qty
  FROM public.cart_items
  WHERE cart_id = p_cart_id
    AND variant_id = p_variant_id;

  -- 5. Validação de estoque líquido
  v_net_available := v_variant.stock_on_hand - v_active_reservations;

  IF (v_existing_cart_qty + p_qty) > v_net_available AND NOT COALESCE(v_variant.allow_backorder, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Estoque insuficiente considerando reservas ativas. Disponível: ' || GREATEST(0, v_net_available) || ' unidade(s).'
    );
  END IF;

  -- 6. Define preço unitário base
  v_price_cents := COALESCE(v_variant.price_override_cents, v_product.price_cents, 0);

  -- 7. Calcula adicionais de opções e modificadores (se informados)
  IF v_target_options IS NOT NULL AND v_target_options != '{}'::jsonb THEN
    BEGIN
      SELECT COALESCE(SUM(ov.price_modifier_cents), 0) INTO v_options_price
      FROM jsonb_each(v_target_options) AS opt(group_id, val)
      CROSS JOIN LATERAL (
        SELECT jsonb_array_elements_text(
          CASE jsonb_typeof(val) 
            WHEN 'array' THEN val 
            ELSE jsonb_build_array(val) 
          END
        ) AS v_id
      ) AS extracted
      JOIN public.option_values ov ON ov.id = extracted.v_id::uuid
      WHERE ov.is_active = true;
    EXCEPTION WHEN OTHERS THEN
      v_options_price := 0;
    END;

    BEGIN
      SELECT COALESCE(SUM(pm.price_delta_cents), 0) INTO v_modifiers_price
      FROM jsonb_each(v_target_options) AS opt(group_id, val)
      CROSS JOIN LATERAL (
        SELECT jsonb_array_elements_text(
          CASE jsonb_typeof(val) 
            WHEN 'array' THEN val 
            ELSE jsonb_build_array(val) 
          END
        ) AS v_id
      ) AS extracted
      JOIN public.product_modifiers pm ON pm.id = extracted.v_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_modifiers_price := 0;
    END;

    v_price_cents := v_price_cents + COALESCE(v_options_price, 0) + COALESCE(v_modifiers_price, 0);
  END IF;

  -- 8. Procura item com as MESMAS opções no carrinho (respeita cart_items_cart_variant_options_idx)
  SELECT id INTO v_existing_item_id
  FROM public.cart_items
  WHERE cart_id = p_cart_id
    AND variant_id = p_variant_id
    AND COALESCE(selected_options, '{}'::jsonb) = v_target_options
  LIMIT 1;

  IF v_existing_item_id IS NOT NULL THEN
    UPDATE public.cart_items
    SET 
      qty = qty + p_qty,
      price_snapshot_cents = v_price_cents,
      updated_at = now()
    WHERE id = v_existing_item_id
    RETURNING id INTO v_item_id;
  ELSE
    INSERT INTO public.cart_items (
      cart_id,
      variant_id,
      qty,
      price_snapshot_cents,
      item_type,
      item_id,
      selected_options,
      created_at,
      updated_at
    ) VALUES (
      p_cart_id,
      p_variant_id,
      p_qty,
      v_price_cents,
      'product',
      v_variant.product_id,
      v_target_options,
      now(),
      now()
    )
    RETURNING id INTO v_item_id;
  END IF;

  -- 9. Cria / Renova Reserva Universal de 15 Minutos vinculada à sessão/usuário
  IF p_session_id IS NOT NULL OR p_user_id IS NOT NULL THEN
    BEGIN
      SELECT public.reserve_resource_15min_atomic(
        p_resource_type => 'product_variant',
        p_resource_id => p_variant_id,
        p_qty => p_qty,
        p_session_id => COALESCE(p_session_id, 'cart_' || p_cart_id::text),
        p_user_id => p_user_id,
        p_minutes => 15,
        p_metadata => jsonb_build_object('cart_id', p_cart_id, 'cart_item_id', v_item_id)
      ) INTO v_reservation_res;
    EXCEPTION WHEN OTHERS THEN
      v_reservation_res := jsonb_build_object('notice', SQLERRM);
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'cart_item_id', v_item_id,
    'qty', v_existing_cart_qty + p_qty,
    'reservation', v_reservation_res
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_to_cart_atomic_v7 FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_to_cart_atomic_v7 TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 2. Upgrade process_checkout_transaction_v2:
--    - Drops legacy 9-arg overload to eliminate ambiguity with 12-arg default version
--    - Retém selected_options em v_items_snapshot e order_items
--    - Preenche item_id em order_items
--    - Fulfills reservas universais correspondentes para liberar estoque limpo
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.process_checkout_transaction_v2(uuid, text, text, text, text, text, text, jsonb, text);

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
SET search_path TO 'public', 'pg_temp'
AS $$
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
  -- 0. Trava de nível de transação via Advisory Lock baseada na chave de idempotência
  PERFORM pg_advisory_xact_lock(hashtext(p_idempotency_key));

  -- 1. Checagem de Idempotência
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

  -- 2. Trava Pessimista do Carrinho
  SELECT * INTO v_cart
  FROM public.carts
  WHERE id = p_cart_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carrinho não encontrado ou já processado.';
  END IF;

  v_store_id := v_cart.store_id;
  v_shipping_cents := COALESCE(v_cart.shipping_cents, 0);

  -- 3. Snapshot e Validação Estrita de Estoque
  FOR v_item IN (
    SELECT
      ci.qty,
      ci.price_snapshot_cents,
      ci.variant_id,
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

    -- Preço efetivo respeita o snapshot verificado no carrinho (que inclui modificadores)
    DECLARE
      v_item_unit_price INTEGER := COALESCE(v_item.price_snapshot_cents, v_item.effective_price_cents, 0);
    BEGIN
      v_subtotal_cents := v_subtotal_cents + (v_item.qty * v_item_unit_price);

      v_items_snapshot := v_items_snapshot || jsonb_build_object(
        'variant_id',         v_item.variant_id,
        'qty',                v_item.qty,
        'unit_price_cents',   v_item_unit_price,
        'total_cents',        (v_item.qty * v_item_unit_price),
        'cost_cents',         v_item.effective_cost_cents,
        'product_title',      v_item.product_title,
        'display_name',       v_item.display_name,
        'variant_sku',        v_item.sku,
        'variant_ean',        v_item.effective_ean,
        'variant_attributes', COALESCE(v_item.variant_attributes, '{}'::jsonb),
        'selected_options',   COALESCE(v_item.selected_options, '{}'::jsonb),
        'image_url',          v_item.image_url,
        'weight_kg',          v_item.effective_weight_kg,
        'width_cm',           v_item.effective_width_cm,
        'height_cm',          v_item.effective_height_cm,
        'length_cm',          v_item.effective_length_cm,
        'is_physical',        v_item.is_physical,
        'preparation_days',   v_item.preparation_time_days,
        'is_backorder',       v_item.qty > v_item.stock_on_hand
      );
    END;
  END LOOP;

  IF jsonb_array_length(v_items_snapshot) = 0 THEN
    RAISE EXCEPTION 'Carrinho vazio.';
  END IF;

  -- 4. Aplicação de Cupom de Desconto
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

    IF v_gift_card.issuer_type = 'MERCHANT' AND v_gift_card.store_id IS NOT NULL AND v_gift_card.store_id <> v_store_id THEN
      RAISE EXCEPTION 'Este vale-presente é exclusivo de outro estabelecimento parceiro.';
    END IF;

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

        v_total_cents := v_total_cents - v_gift_card_deduction_cents;
        v_discount_cents := v_discount_cents + v_gift_card_deduction_cents;

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

  IF v_total_cents = 0 THEN
    v_initial_order_status := 'confirmed';
    v_payment_status := 'paid';
  END IF;

  -- 5. Cria Pedido Soberano
  INSERT INTO public.orders (
    store_id, customer_id, status, items_snapshot,
    subtotal_cents, shipping_cents, discount_cents, total_cents,
    shipping_method, shipping_address,
    customer_snapshot
  ) VALUES (
    v_store_id, v_cart.customer_id, v_initial_order_status::public.order_status, v_items_snapshot,
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

  -- 5.1 Grava evento de resgate do vale
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

  -- 6. Processamento Estrito dos Itens de Pedido e Movimentação de Estoque
  FOR v_item IN (
    SELECT el AS item_json FROM jsonb_array_elements(v_items_snapshot) AS el
  ) LOOP
    INSERT INTO public.order_items (
      order_id,
      item_id,
      variant_id,
      product_title,
      variant_sku,
      variant_attributes,
      selected_options,
      image_url,
      qty,
      unit_price_cents,
      total_cents,
      item_type
    ) VALUES (
      v_order_id,
      (v_item.item_json->>'variant_id')::UUID,
      (v_item.item_json->>'variant_id')::UUID,
      v_item.item_json->>'product_title',
      v_item.item_json->>'variant_sku',
      COALESCE((v_item.item_json->'variant_attributes')::JSONB, '{}'::jsonb),
      COALESCE((v_item.item_json->'selected_options')::JSONB, '{}'::jsonb),
      v_item.item_json->>'image_url',
      (v_item.item_json->>'qty')::INTEGER,
      (v_item.item_json->>'unit_price_cents')::INTEGER,
      (v_item.item_json->>'total_cents')::INTEGER,
      'product'
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

    -- Converte reservas ativas correspondentes para fulfilled
    UPDATE public.universal_reservations
    SET status = 'fulfilled', updated_at = now()
    WHERE resource_type = 'product_variant'
      AND resource_id = (v_item.item_json->>'variant_id')::UUID
      AND status = 'active'
      AND (
        session_id = v_cart.session_token
        OR user_id = v_cart.customer_id
        OR metadata->>'cart_id' = p_cart_id::text
      );
  END LOOP;

  -- 7. Registro de Tentativa de Pagamento
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

  -- 8. Conclusão do Carrinho
  DELETE FROM public.cart_items WHERE cart_id = p_cart_id;
  UPDATE public.carts SET status = 'completed', updated_at = now() WHERE id = p_cart_id;

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
$$;

REVOKE ALL ON FUNCTION public.process_checkout_transaction_v2(uuid, text, text, text, text, text, text, jsonb, text, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_checkout_transaction_v2(uuid, text, text, text, text, text, text, jsonb, text, text, uuid, uuid) TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 3. Upgrade finalize_order_and_dispatch_motolink_atomic:
--    - Suporta p_cpf_on_receipt e p_receiver_info como JSONB
--    - Zero conflito de tipos com columns de orders
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.finalize_order_and_dispatch_motolink_atomic(uuid, text, text, text, text, text, jsonb, text, uuid);

CREATE OR REPLACE FUNCTION public.finalize_order_and_dispatch_motolink_atomic(
  p_order_id uuid,
  p_channel_origin text DEFAULT 'vitrine_online'::text,
  p_notes text DEFAULT NULL::text,
  p_cpf_on_receipt jsonb DEFAULT NULL::jsonb,
  p_substitution_policy text DEFAULT NULL::text,
  p_receiver_info jsonb DEFAULT NULL::jsonb,
  p_niche_metadata jsonb DEFAULT '{}'::jsonb,
  p_client_ip text DEFAULT NULL::text,
  p_actor_profile_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_order record;
  v_store record;
  v_pin_code text;
  v_distance_km numeric(8,2) := 3.50;
  v_payout_cents integer := 800;
  v_dispatch_id uuid;
  v_lat1 double precision;
  v_lng1 double precision;
  v_lat2 double precision;
  v_lng2 double precision;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PEDIDO_NAO_ENCONTRADO: Pedido % inexistente.', p_order_id;
  END IF;

  SELECT * INTO v_store
  FROM public.stores
  WHERE id = v_order.store_id;

  -- Gera PIN de entrega de 4 dígitos determinístico se ainda não existir
  v_pin_code := COALESCE(
    (v_order.custom_fields->>'delivery_pin_code'),
    lpad((floor(random() * 9000) + 1000)::int::text, 4, '0')
  );

  -- Atualiza Pedido atomicamente com telemetria e metadados
  UPDATE public.orders
  SET channel_origin = COALESCE(p_channel_origin, channel_origin, 'vitrine_online'),
      notes = COALESCE(p_notes, notes),
      cpf_on_receipt = CASE WHEN p_cpf_on_receipt IS NOT NULL THEN p_cpf_on_receipt ELSE cpf_on_receipt END,
      substitution_policy = COALESCE(p_substitution_policy, substitution_policy),
      receiver_info = CASE WHEN p_receiver_info IS NOT NULL THEN p_receiver_info ELSE receiver_info END,
      checkout_niche_metadata = COALESCE(checkout_niche_metadata, '{}'::jsonb) || COALESCE(p_niche_metadata, '{}'::jsonb),
      custom_fields = COALESCE(custom_fields, '{}'::jsonb) || jsonb_build_object(
        'delivery_pin_code', v_pin_code,
        'motolink_ready', (v_order.shipping_method <> 'pickup')
      ),
      created_by_ip = COALESCE(p_client_ip, created_by_ip),
      context_profile_id = COALESCE(p_actor_profile_id, context_profile_id),
      updated_at = now()
  WHERE id = p_order_id;

  -- Se for entrega física (não retirada), calcula rota Waesy Go MotoLink no servidor
  IF v_order.shipping_method IS DISTINCT FROM 'pickup' THEN
    v_lat1 := COALESCE((v_store.settings->>'lat')::double precision, -27.0963);
    v_lng1 := COALESCE((v_store.settings->>'lng')::double precision, -52.6183);
    v_lat2 := COALESCE((v_order.shipping_address->>'lat')::double precision, (v_order.shipping_address->>'latitude')::double precision, v_lat1 + 0.018);
    v_lng2 := COALESCE((v_order.shipping_address->>'lng')::double precision, (v_order.shipping_address->>'longitude')::double precision, v_lng1 + 0.018);

    -- Fórmula Haversine Server-Side (km)
    v_distance_km := GREATEST(
      1.20,
      ROUND((
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(v_lat1)) * cos(radians(v_lat2)) *
            cos(radians(v_lng2) - radians(v_lng1)) +
            sin(radians(v_lat1)) * sin(radians(v_lat2))
          ))
        ) * 1.28
      )::numeric, 2)
    );

    -- Tarifa justa server-authoritative: Base R$ 6,50 + R$ 1,50/km
    v_payout_cents := GREATEST(650, ROUND(650 + (v_distance_km * 150))::integer);
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'order_id', p_order_id,
    'delivery_pin_code', v_pin_code,
    'motolink_route', jsonb_build_object(
      'is_delivery', (v_order.shipping_method IS DISTINCT FROM 'pickup'),
      'distance_km', v_distance_km,
      'driver_payout_cents', v_payout_cents,
      'origin_store', v_store.name
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_order_and_dispatch_motolink_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_order_and_dispatch_motolink_atomic TO authenticated, service_role;

COMMIT;
