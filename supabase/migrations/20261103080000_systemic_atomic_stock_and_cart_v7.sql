-- ============================================================================
-- Waesy Commerce — Migration 20261103080000: Systemic Atomic Stock, Cart v7,
-- Pass Deduction & Webhook Idempotency Integration
-- ============================================================================

BEGIN;

  -- 1. Schema Cache Compatibility for experience_documents
  -- Garante que requisições ou caches que ainda consultem a coluna 'name' nunca falhem.
  ALTER TABLE public.experience_documents
    ADD COLUMN IF NOT EXISTS name TEXT;

  -- Sincroniza retroativamente name com title
  UPDATE public.experience_documents
  SET name = title
  WHERE name IS NULL OR name = '';

  -- Trigger para sincronização bidirecional automática de title e name
  CREATE OR REPLACE FUNCTION public.sync_experience_document_name_title()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.title IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN
      NEW.name := NEW.title;
    ELSIF NEW.name IS NOT NULL AND (NEW.title IS NULL OR NEW.title = '') THEN
      NEW.title := NEW.name;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_sync_experience_document_name_title ON public.experience_documents;
  CREATE TRIGGER trg_sync_experience_document_name_title
    BEFORE INSERT OR UPDATE ON public.experience_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_experience_document_name_title();

  -- 2. Dedução Atômica de Crédito de Passe de Serviço (Zero Check-Then-Act)
  CREATE OR REPLACE FUNCTION public.consume_pass_credit_atomic(
    p_pass_id UUID,
    p_customer_id UUID,
    p_store_id UUID,
    p_service_id UUID
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_updated public.customer_service_passes%ROWTYPE;
  BEGIN
    -- Executa atualização atômica estrita protegida por predicado remaining_credits >= 1
    UPDATE public.customer_service_passes
    SET 
      remaining_credits = remaining_credits - 1,
      status = CASE WHEN remaining_credits - 1 <= 0 THEN 'exhausted' ELSE 'active' END,
      updated_at = now()
    WHERE id = p_pass_id
      AND customer_id = p_customer_id
      AND store_id = p_store_id
      AND service_id = p_service_id
      AND remaining_credits >= 1
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Créditos insuficientes ou passe não pertence ao cliente/serviço informado.'
      );
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'pass_id', v_updated.id,
      'remaining_credits', v_updated.remaining_credits,
      'status', v_updated.status
    );
  END;
  $$;

  -- 3. Transição Atômica de Aceite de Negociação e Reserva de Classificado
  CREATE OR REPLACE FUNCTION public.accept_deal_proposal_atomic(
    p_deal_id UUID,
    p_sender_id UUID,
    p_message TEXT DEFAULT NULL,
    p_counter_price_cents BIGINT DEFAULT NULL
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_deal public.deals%ROWTYPE;
    v_classified public.classifieds%ROWTYPE;
  BEGIN
    -- 1. Bloqueia e recupera a negociação
    SELECT * INTO v_deal
    FROM public.deals
    WHERE id = p_deal_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Negociação não encontrada.');
    END IF;

    -- 2. Se a negociação tiver anúncio classificado vinculado, trava e valida status
    IF v_deal.classified_id IS NOT NULL THEN
      SELECT * INTO v_classified
      FROM public.classifieds
      WHERE id = v_deal.classified_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Anúncio classificado vinculado não encontrado.');
      END IF;

      IF v_classified.status != 'active' AND v_classified.status != 'reserved' THEN
        RETURN jsonb_build_object(
          'success', false,
          'message', 'Este anúncio não está mais disponível para negociação (status: ' || v_classified.status || ').'
        );
      END IF;

      -- Atualiza classificado para reservado
      UPDATE public.classifieds
      SET status = 'reserved', updated_at = now()
      WHERE id = v_deal.classified_id;
    END IF;

    -- 3. Atualiza o status da negociação
    UPDATE public.deals
    SET 
      status = 'accepted',
      updated_at = now()
    WHERE id = p_deal_id;

    -- 4. Registra evento de histórico
    INSERT INTO public.deal_events (deal_id, sender_id, event_type, payload)
    VALUES (
      p_deal_id,
      p_sender_id,
      'accept',
      jsonb_build_object('message', p_message, 'counter_price', p_counter_price_cents)
    );

    RETURN jsonb_build_object(
      'success', true,
      'deal_id', p_deal_id,
      'classified_id', v_deal.classified_id,
      'status', 'accepted'
    );
  END;
  $$;

  -- 4. Adição ao Carrinho Atômica v7 (com Bloqueio Pessimista e Reserva de 15 Minutos)
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
  AS $$
  DECLARE
    v_variant public.product_variants%ROWTYPE;
    v_product public.products%ROWTYPE;
    v_active_reservations INTEGER := 0;
    v_existing_cart_qty INTEGER := 0;
    v_net_available INTEGER := 0;
    v_existing_item_id UUID;
    v_item_id UUID;
    v_price_cents BIGINT;
    v_reservation_res jsonb;
  BEGIN
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

    -- 4. Calcula quantidade já existente neste mesmo carrinho
    SELECT COALESCE(SUM(qty), 0), (array_agg(id))[1] INTO v_existing_cart_qty, v_existing_item_id
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

    -- 6. Define preço unitário
    v_price_cents := COALESCE(v_variant.price_override_cents, v_product.price_cents, 0);

    -- 7. Insere ou incrementa cart_items
    IF v_existing_item_id IS NOT NULL THEN
      UPDATE public.cart_items
      SET 
        qty = qty + p_qty,
        options = p_options,
        notes = COALESCE(p_notes, notes),
        updated_at = now()
      WHERE id = v_existing_item_id
      RETURNING id INTO v_item_id;
    ELSE
      INSERT INTO public.cart_items (
        cart_id,
        variant_id,
        product_id,
        qty,
        unit_price_cents,
        options,
        notes
      ) VALUES (
        p_cart_id,
        p_variant_id,
        v_variant.product_id,
        p_qty,
        v_price_cents,
        p_options,
        p_notes
      )
      RETURNING id INTO v_item_id;
    END IF;

    -- 8. Cria / Renova Reserva Universal de 15 Minutos vinculada à sessão/usuário
    IF p_session_id IS NOT NULL OR p_user_id IS NOT NULL THEN
      SELECT public.reserve_resource_15min_atomic(
        'product_variant',
        p_variant_id,
        p_qty,
        p_user_id,
        p_session_id,
        jsonb_build_object('cart_id', p_cart_id, 'cart_item_id', v_item_id)
      ) INTO v_reservation_res;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'cart_item_id', v_item_id,
      'qty', v_existing_cart_qty + p_qty,
      'reservation', v_reservation_res
    );
  END;
  $$;

COMMIT;
