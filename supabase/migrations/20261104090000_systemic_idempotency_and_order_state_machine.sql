-- ============================================================================
-- Waesy Commerce — Migration 20261104090000: Universal Idempotency Engine,
-- Order State Machine ("Carimbou PAGO"), Atomic Cash Drawer & Booking Hardening
-- ============================================================================

BEGIN;

  -- 1. Universal Processed Events / Idempotency Ledger ("O Carimbo da Lotérica")
  -- Garante que nenhum evento, transação ou liberação financeira seja executado mais de 1 vez.
  CREATE TABLE IF NOT EXISTS public.processed_events (
    event_id TEXT PRIMARY KEY,
    scope TEXT NOT NULL, -- 'order_payment', 'order_status', 'payout_settlement', 'deal_acceptance', 'cash_entry', 'slot_booking', 'webhook'
    entity_id TEXT,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    payload_hash TEXT NOT NULL,
    response_body JSONB DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
  );

  -- Garante que todas as colunas necessárias existam mesmo se a tabela já tiver sido criada previamente
  ALTER TABLE public.processed_events ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'generic';
  ALTER TABLE public.processed_events ADD COLUMN IF NOT EXISTS entity_id TEXT;
  ALTER TABLE public.processed_events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'processing';
  ALTER TABLE public.processed_events ADD COLUMN IF NOT EXISTS payload_hash TEXT NOT NULL DEFAULT '';
  ALTER TABLE public.processed_events ADD COLUMN IF NOT EXISTS response_body JSONB DEFAULT NULL;
  ALTER TABLE public.processed_events ADD COLUMN IF NOT EXISTS error_message TEXT DEFAULT NULL;
  ALTER TABLE public.processed_events ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;
  ALTER TABLE public.processed_events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days');

  CREATE INDEX IF NOT EXISTS idx_processed_events_scope_entity ON public.processed_events(scope, entity_id);
  CREATE INDEX IF NOT EXISTS idx_processed_events_expires_at ON public.processed_events(expires_at);

  -- 1.1 Iniciar Evento Idempotente com Advisory Lock
  CREATE OR REPLACE FUNCTION public.begin_idempotent_event(
    p_event_id TEXT,
    p_scope TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_payload_hash TEXT DEFAULT '',
    p_timeout_seconds INTEGER DEFAULT 30
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_existing public.processed_events%ROWTYPE;
  BEGIN
    -- Trava transacional no namespace do evento
    PERFORM pg_advisory_xact_lock(hashtext('idempotency:' || p_scope || ':' || p_event_id));

    SELECT * INTO v_existing
    FROM public.processed_events
    WHERE event_id = p_event_id;

    IF FOUND THEN
      -- Se já concluído ("Carimbou PAGO"), retorna o resultado original imutável
      IF v_existing.status = 'completed' THEN
        RETURN jsonb_build_object(
          'success', true,
          'already_completed', true,
          'response_body', v_existing.response_body,
          'completed_at', v_existing.completed_at
        );
      END IF;

      -- Se estiver em processamento há menos de p_timeout_seconds, conflito em voo
      IF v_existing.status = 'processing' AND v_existing.created_at > (now() - (p_timeout_seconds || ' seconds')::interval) THEN
        RETURN jsonb_build_object(
          'success', false,
          'in_flight', true,
          'message', 'Operação já está sendo processada em paralelo por outra requisição.'
        );
      END IF;

      -- Se expirou o timeout de processamento (processo abortou), reinicia para tentar novamente
      UPDATE public.processed_events
      SET status = 'processing',
          created_at = now(),
          payload_hash = p_payload_hash,
          error_message = NULL
      WHERE event_id = p_event_id;

      RETURN jsonb_build_object('success', true, 'resumed', true);
    END IF;

    -- Novo evento: registra status 'processing'
    INSERT INTO public.processed_events (
      event_id,
      scope,
      entity_id,
      status,
      payload_hash
    ) VALUES (
      p_event_id,
      p_scope,
      p_entity_id,
      'processing',
      p_payload_hash
    );

    RETURN jsonb_build_object('success', true, 'is_new', true);
  END;
  $$;

  -- 1.2 Concluir Evento Idempotente com Payload de Resposta
  CREATE OR REPLACE FUNCTION public.complete_idempotent_event(
    p_event_id TEXT,
    p_response_body JSONB DEFAULT '{}'::jsonb
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    UPDATE public.processed_events
    SET status = 'completed',
        completed_at = now(),
        response_body = p_response_body,
        error_message = NULL
    WHERE event_id = p_event_id;

    RETURN jsonb_build_object('success', true, 'event_id', p_event_id);
  END;
  $$;

  -- 1.3 Falhar Evento Idempotente
  CREATE OR REPLACE FUNCTION public.fail_idempotent_event(
    p_event_id TEXT,
    p_error_message TEXT DEFAULT 'Erro desconhecido'
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    UPDATE public.processed_events
    SET status = 'failed',
        error_message = p_error_message
    WHERE event_id = p_event_id;

    RETURN jsonb_build_object('success', true, 'event_id', p_event_id);
  END;
  $$;

  -- 2. Transição Atômica de Status de Pedido ("Carimbou PAGO, não paga de novo")
  CREATE OR REPLACE FUNCTION public.transition_order_status_atomic(
    p_order_id UUID,
    p_store_id UUID,
    p_new_status TEXT,
    p_reason TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_order public.orders%ROWTYPE;
    v_old_status TEXT;
  BEGIN
    -- 1. Trava a linha do pedido contra concorrência
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
      AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Pedido não encontrado ou acesso negado.');
    END IF;

    v_old_status := v_order.status;

    -- 2. Idempotência estrita: se já estiver no status solicitado, confirma sem re-processar
    IF v_old_status = p_new_status THEN
      RETURN jsonb_build_object(
        'success', true,
        'is_idempotent_replay', true,
        'status', v_old_status,
        'message', 'O pedido já se encontra no status ' || v_old_status || '.'
      );
    END IF;

    -- 3. Invariantes de Máquina de Estado
    -- Pedidos cancelados ou reembolsados não podem transicionar para estados ativos
    IF v_old_status IN ('cancelled', 'refunded') THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Transição inválida: o pedido já está finalizado como ' || v_old_status || '.'
      );
    END IF;

    -- Transição para 'paid'
    IF p_new_status = 'paid' THEN
      IF v_old_status NOT IN ('pending', 'awaiting_payment', 'draft') THEN
        RETURN jsonb_build_object(
          'success', false,
          'message', 'Transição para pago inválida a partir do status ' || v_old_status || '.'
        );
      END IF;

      UPDATE public.orders
      SET status = 'paid',
          paid_at = COALESCE(paid_at, now()),
          updated_at = now()
      WHERE id = p_order_id;

    -- Transição para 'processing' (em preparo / separação)
    ELSIF p_new_status = 'processing' THEN
      UPDATE public.orders
      SET status = 'processing',
          prep_started_at = COALESCE(prep_started_at, now()),
          updated_at = now()
      WHERE id = p_order_id;

    -- Transição para 'shipped' (em rota / despachado)
    ELSIF p_new_status = 'shipped' THEN
      UPDATE public.orders
      SET status = 'shipped',
          shipped_at = COALESCE(shipped_at, now()),
          updated_at = now()
      WHERE id = p_order_id;

    -- Transição para 'delivered' (concluído / entregue)
    ELSIF p_new_status = 'delivered' THEN
      UPDATE public.orders
      SET status = 'delivered',
          delivered_at = COALESCE(delivered_at, now()),
          updated_at = now()
      WHERE id = p_order_id;

    -- Transição para 'cancelled'
    ELSIF p_new_status = 'cancelled' THEN
      -- Se a procedure cancel_order existir, delega para reversão de estoque
      UPDATE public.orders
      SET status = 'cancelled',
          cancelled_at = COALESCE(cancelled_at, now()),
          cancellation_reason = COALESCE(p_reason, 'Cancelado pelo operador.'),
          updated_at = now()
      WHERE id = p_order_id;

      -- Libera reservas ativas de estoque vinculadas ao pedido
      UPDATE public.universal_reservations
      SET status = 'released', updated_at = now()
      WHERE metadata->>'order_id' = p_order_id::text
        AND status = 'active';

    ELSE
      -- Demais status genéricos
      UPDATE public.orders
      SET status = p_new_status,
          updated_at = now()
      WHERE id = p_order_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'order_id', p_order_id,
      'previous_status', v_old_status,
      'new_status', p_new_status
    );
  END;
  $$;

  -- 3. Transação Atômica de Caixa & Sangria (Zero Saldo Negativo em Gaveta)
  CREATE OR REPLACE FUNCTION public.record_cash_entry_atomic(
    p_register_id UUID,
    p_store_id UUID,
    p_amount_cents BIGINT,
    p_entry_type TEXT,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_channel_source TEXT DEFAULT 'storefront',
    p_external_reference_id TEXT DEFAULT NULL
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_register public.cash_registers%ROWTYPE;
    v_current_cash_balance BIGINT := 0;
    v_new_entry_id UUID;
  BEGIN
    -- 1. Trava a linha do caixa aberto
    SELECT * INTO v_register
    FROM public.cash_registers
    WHERE id = p_register_id
      AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Caixa não encontrado ou acesso negado.');
    END IF;

    IF v_register.status != 'open' THEN
      RETURN jsonb_build_object('success', false, 'message', 'O caixa não está aberto (status atual: ' || v_register.status || ').');
    END IF;

    -- 2. Proteção Anti-Race Condition em Sangrias (amount_cents negativo com método 'cash')
    IF p_amount_cents < 0 AND p_entry_type = 'cash' THEN
      SELECT (COALESCE(SUM(amount_cents), 0) + v_register.initial_balance_cents)
      INTO v_current_cash_balance
      FROM public.cash_register_entries
      WHERE cash_register_id = p_register_id
        AND entry_type = 'cash';

      IF (v_current_cash_balance + p_amount_cents) < 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'INSUFFICIENT_CASH_DRAWER',
          'message', 'Sangria indisponível: o saldo atual em gaveta (R$ ' || (v_current_cash_balance::numeric / 100.0) || ') é insuficiente para a retirada solicitada.',
          'current_balance_cents', v_current_cash_balance
        );
      END IF;
    END IF;

    -- 3. Insere o lançamento de caixa atomicamente
    INSERT INTO public.cash_register_entries (
      cash_register_id,
      amount_cents,
      entry_type,
      notes,
      created_by,
      channel_source,
      external_reference_id
    ) VALUES (
      p_register_id,
      p_amount_cents,
      p_entry_type,
      p_notes,
      p_created_by,
      p_channel_source,
      p_external_reference_id
    )
    RETURNING id INTO v_new_entry_id;

    RETURN jsonb_build_object(
      'success', true,
      'entry_id', v_new_entry_id,
      'amount_cents', p_amount_cents,
      'entry_type', p_entry_type
    );
  END;
  $$;

  -- 4. Liquidação Atômica de Repasse / Payout (Proteção contra Múltiplos Pagamentos)
  CREATE OR REPLACE FUNCTION public.settle_order_payout_atomic(
    p_order_id UUID,
    p_store_id UUID,
    p_idempotency_key TEXT DEFAULT NULL
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_order public.orders%ROWTYPE;
    v_breakdown JSONB;
    v_settlement_status TEXT;
  BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
      AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Pedido não encontrado.');
    END IF;

    v_breakdown := COALESCE(v_order.cost_breakdown, '{}'::jsonb);
    v_settlement_status := v_breakdown->>'settlement_status';

    -- Se já liquidado, retorna idempotência
    IF v_settlement_status = 'settled' THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_settled', true,
        'settled_at', v_breakdown->>'settled_at',
        'message', 'Este repasse já foi liquidado anteriormente.'
      );
    END IF;

    -- Atualiza status de liquidação
    v_breakdown := jsonb_set(v_breakdown, '{settlement_status}', '"settled"'::jsonb);
    v_breakdown := jsonb_set(v_breakdown, '{settled_at}', to_jsonb(now()));

    UPDATE public.orders
    SET cost_breakdown = v_breakdown,
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'success', true,
      'is_new_settlement', true,
      'order_id', p_order_id,
      'settled_at', now()
    );
  END;
  $$;

  -- 5. Hardening de hold_resource_slot (Anti-Double Booking com Advisory Lock)
  CREATE OR REPLACE FUNCTION public.hold_resource_slot(
    p_resource_id uuid,
    p_resource_type text,
    p_start_at timestamptz,
    p_end_at timestamptz,
    p_order_id uuid DEFAULT NULL
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_conflict_count integer;
    v_new_id uuid;
  BEGIN
    -- Serializa operações concorrentes sobre o mesmo recurso
    PERFORM pg_advisory_xact_lock(hashtext('booking_resource:' || p_resource_id::text));

    -- Limpa holds expirados (> 15 minutos sem confirmação)
    DELETE FROM public.resource_availabilities
    WHERE resource_id = p_resource_id
      AND status = 'held_for_checkout'
      AND created_at < (now() - interval '15 minutes');

    -- Verifica sobreposição apenas com holds válidos ou reservas confirmadas
    SELECT count(*) INTO v_conflict_count
    FROM public.resource_availabilities
    WHERE resource_id = p_resource_id
      AND status IN ('held_for_checkout', 'confirmed')
      AND booking_range && tstzrange(p_start_at, p_end_at);

    IF v_conflict_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'CONFLICT_DOUBLE_BOOKING',
        'message', 'Este horário ou data já se encontra reservado por outro cliente.'
      );
    END IF;

    INSERT INTO public.resource_availabilities (
      resource_id,
      resource_type,
      booking_range,
      order_id,
      status
    ) VALUES (
      p_resource_id,
      p_resource_type,
      tstzrange(p_start_at, p_end_at),
      p_order_id,
      'confirmed'
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
      'success', true,
      'availability_id', v_new_id
    );
  END;
  $$;

COMMIT;
