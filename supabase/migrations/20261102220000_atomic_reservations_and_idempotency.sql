-- ============================================================================
-- MIGRATION: MOTOR ATÔMICO DE RESERVA DE 15 MINUTOS & IDEMPOTÊNCIA ESTRITA
-- SPEC-006: Anti-Race Condition, Anti-Overselling & Carimbo da Lotérica
-- ============================================================================

BEGIN;

-- 1. TABELA SOBERANA DE RESERVAS UNIVERSAIS (15 MINUTOS)
CREATE TABLE IF NOT EXISTS public.universal_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('product_variant', 'deal', 'booking_service_slot', 'ticket_lot')),
  resource_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'released', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_universal_reservations_lookup 
  ON public.universal_reservations (resource_type, resource_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_universal_reservations_session 
  ON public.universal_reservations (session_id, status);

-- 2. TABELA SOBERANA DE EVENTOS PROCESSADOS (O CARIMBO DA LOTÉRICA)
CREATE TABLE IF NOT EXISTS public.processed_events (
  event_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  result_payload JSONB DEFAULT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT DEFAULT NULL,
  locked_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 minutes'),
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processed_events_scope_status 
  ON public.processed_events (scope, status);

-- 3. HABILITAR ROW LEVEL SECURITY
ALTER TABLE public.universal_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_events ENABLE ROW LEVEL SECURITY;

-- Políticas Deny-by-default: Gerenciamento restrito a funções de servidor / service_role
CREATE POLICY "universal_reservations_service_role" ON public.universal_reservations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "universal_reservations_user_read" ON public.universal_reservations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "processed_events_service_role" ON public.processed_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. RPC ATÔMICA: RESERVAR RECURSO POR 15 MINUTOS (ANTI-RACE CONDITION)
CREATE OR REPLACE FUNCTION public.reserve_resource_15min_atomic(
  p_resource_type TEXT,
  p_resource_id UUID,
  p_qty INTEGER,
  p_session_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_minutes INTEGER DEFAULT 15,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
  v_reservation_id UUID;
  v_stock_on_hand INTEGER;
  v_stock_reserved INTEGER;
  v_active_reserved INTEGER;
  v_available INTEGER;
  v_deal RECORD;
  v_ticket_lot RECORD;
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'Quantidade de reserva inválida (deve ser > 0)';
  END IF;

  v_expires_at := now() + (p_minutes || ' minutes')::INTERVAL;

  -- 4.1. Limpeza lazy de reservas expiradas deste recurso
  UPDATE public.universal_reservations
  SET status = 'expired', updated_at = now()
  WHERE resource_type = p_resource_type
    AND resource_id = p_resource_id
    AND status = 'active'
    AND expires_at < now();

  -- 4.2. Tratamento por tipo de recurso com travamento pessimista (FOR UPDATE)
  IF p_resource_type = 'product_variant' THEN
    -- Bloqueia a linha da variante
    SELECT stock_on_hand, stock_reserved 
    INTO v_stock_on_hand, v_stock_reserved
    FROM public.product_variants
    WHERE id = p_resource_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variante de produto % não encontrada', p_resource_id;
    END IF;

    -- Soma as reservas ativas não expiradas
    SELECT COALESCE(SUM(qty), 0)
    INTO v_active_reserved
    FROM public.universal_reservations
    WHERE resource_type = 'product_variant'
      AND resource_id = p_resource_id
      AND status = 'active'
      AND expires_at >= now()
      AND session_id != p_session_id;

    v_available := v_stock_on_hand - v_active_reserved;

    IF v_available < p_qty THEN
      RAISE EXCEPTION 'Estoque insuficiente ou reservado por outro cliente (disponível: %, solicitado: %)', v_available, p_qty;
    END IF;

    -- Cria o registro de reserva
    INSERT INTO public.universal_reservations (
      resource_type, resource_id, user_id, session_id, qty, status, expires_at, metadata
    ) VALUES (
      p_resource_type, p_resource_id, p_user_id, p_session_id, p_qty, 'active', v_expires_at, p_metadata
    ) RETURNING id INTO v_reservation_id;

    -- Atualiza contador na tabela de variantes
    UPDATE public.product_variants
    SET stock_reserved = stock_reserved + p_qty
    WHERE id = p_resource_id;

  ELSIF p_resource_type = 'deal' THEN
    -- Bloqueia o registro do Deal
    SELECT * INTO v_deal
    FROM public.deals
    WHERE id = p_resource_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Deal/Oferta % não encontrado', p_resource_id;
    END IF;

    IF v_deal.status NOT IN ('negotiating', 'accepted') THEN
      RAISE EXCEPTION 'Deal não está disponível para reserva (status atual: %)', v_deal.status;
    END IF;

    -- Verifica se já existe reserva ativa por outra sessão
    IF EXISTS (
      SELECT 1 FROM public.universal_reservations
      WHERE resource_type = 'deal'
        AND resource_id = p_resource_id
        AND status = 'active'
        AND expires_at >= now()
        AND session_id != p_session_id
    ) THEN
      RAISE EXCEPTION 'Esta oferta/deal já está reservada por outro comprador no momento';
    END IF;

    INSERT INTO public.universal_reservations (
      resource_type, resource_id, user_id, session_id, qty, status, expires_at, metadata
    ) VALUES (
      p_resource_type, p_resource_id, p_user_id, p_session_id, 1, 'active', v_expires_at, p_metadata
    ) RETURNING id INTO v_reservation_id;

  ELSIF p_resource_type = 'ticket_lot' THEN
    SELECT * INTO v_ticket_lot
    FROM public.ticket_lots
    WHERE id = p_resource_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lote de ingressos % não encontrado', p_resource_id;
    END IF;

    IF (v_ticket_lot.capacity - (v_ticket_lot.sold_count + v_ticket_lot.reserved_count)) < p_qty THEN
      RAISE EXCEPTION 'Ingressos esgotados ou reservados para este lote';
    END IF;

    INSERT INTO public.universal_reservations (
      resource_type, resource_id, user_id, session_id, qty, status, expires_at, metadata
    ) VALUES (
      p_resource_type, p_resource_id, p_user_id, p_session_id, p_qty, 'active', v_expires_at, p_metadata
    ) RETURNING id INTO v_reservation_id;

    UPDATE public.ticket_lots
    SET reserved_count = reserved_count + p_qty
    WHERE id = p_resource_id;

  ELSE
    -- Outros recursos genéricos (ex: slots de agendamento)
    IF EXISTS (
      SELECT 1 FROM public.universal_reservations
      WHERE resource_type = p_resource_type
        AND resource_id = p_resource_id
        AND status = 'active'
        AND expires_at >= now()
        AND session_id != p_session_id
    ) THEN
      RAISE EXCEPTION 'Horário ou recurso já reservado por outro cliente';
    END IF;

    INSERT INTO public.universal_reservations (
      resource_type, resource_id, user_id, session_id, qty, status, expires_at, metadata
    ) VALUES (
      p_resource_type, p_resource_id, p_user_id, p_session_id, p_qty, 'active', v_expires_at, p_metadata
    ) RETURNING id INTO v_reservation_id;
  END IF;

  RETURN jsonb_build_object(
    'reservation_id', v_reservation_id,
    'resource_type', p_resource_type,
    'resource_id', p_resource_id,
    'qty', p_qty,
    'status', 'active',
    'expires_at', v_expires_at,
    'expires_in_seconds', (p_minutes * 60)
  );
END;
$$;

-- 5. RPC ATÔMICA: CONSUMIR RESERVA COM SUCESSO (CONFIRMAÇÃO / CARIMBO FINAL)
CREATE OR REPLACE FUNCTION public.consume_reservation_atomic(
  p_reservation_id UUID,
  p_order_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_res public.universal_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_res
  FROM public.universal_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva % não encontrada', p_reservation_id;
  END IF;

  IF v_res.status = 'consumed' THEN
    RETURN jsonb_build_object(
      'status', 'already_consumed',
      'reservation_id', v_res.id,
      'resource_type', v_res.resource_type,
      'resource_id', v_res.resource_id
    );
  END IF;

  IF v_res.status <> 'active' OR v_res.expires_at < now() THEN
    RAISE EXCEPTION 'Reserva expirada ou inválida para consumo (status: %, expirou em: %)', v_res.status, v_res.expires_at;
  END IF;

  -- Transição para consumed
  UPDATE public.universal_reservations
  SET status = 'consumed',
      metadata = metadata || jsonb_build_object('order_id', p_order_id, 'consumed_at', now()),
      updated_at = now()
  WHERE id = p_reservation_id;

  -- Atualiza o estoque real do recurso de forma soberana
  IF v_res.resource_type = 'product_variant' THEN
    UPDATE public.product_variants
    SET
      stock_on_hand  = GREATEST(0, stock_on_hand  - v_res.qty),
      stock_reserved = GREATEST(0, stock_reserved - v_res.qty)
    WHERE id = v_res.resource_id;

  ELSIF v_res.resource_type = 'ticket_lot' THEN
    UPDATE public.ticket_lots
    SET
      reserved_count = GREATEST(0, reserved_count - v_res.qty),
      sold_count     = sold_count + v_res.qty
    WHERE id = v_res.resource_id;

  ELSIF v_res.resource_type = 'deal' THEN
    UPDATE public.deals
    SET status = 'completed', updated_at = now()
    WHERE id = v_res.resource_id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'consumed',
    'reservation_id', v_res.id,
    'resource_type', v_res.resource_type,
    'resource_id', v_res.resource_id,
    'qty', v_res.qty
  );
END;
$$;

-- 6. RPC ATÔMICA: LIBERAR RESERVA (CANCELAMENTO / ABANDONO ANTECIPADO)
CREATE OR REPLACE FUNCTION public.release_reservation_atomic(
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_res public.universal_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_res
  FROM public.universal_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_res.status <> 'active' THEN
    RETURN jsonb_build_object('status', v_res.status, 'reservation_id', v_res.id);
  END IF;

  UPDATE public.universal_reservations
  SET status = 'released', updated_at = now()
  WHERE id = p_reservation_id;

  IF v_res.resource_type = 'product_variant' THEN
    UPDATE public.product_variants
    SET stock_reserved = GREATEST(0, stock_reserved - v_res.qty)
    WHERE id = v_res.resource_id;
  ELSIF v_res.resource_type = 'ticket_lot' THEN
    UPDATE public.ticket_lots
    SET reserved_count = GREATEST(0, reserved_count - v_res.qty)
    WHERE id = v_res.resource_id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'released',
    'reservation_id', v_res.id,
    'resource_type', v_res.resource_type,
    'resource_id', v_res.resource_id
  );
END;
$$;

-- 7. RPC ATÔMICA: CARIMBO DA LOTÉRICA - INÍCIO DO EVENTO IDEMPOTENTE
CREATE OR REPLACE FUNCTION public.idempotent_event_begin(
  p_event_id TEXT,
  p_scope TEXT,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_rec public.processed_events%ROWTYPE;
BEGIN
  IF p_event_id IS NULL OR trim(p_event_id) = '' THEN
    RAISE EXCEPTION 'ID de evento idempotente obrigatório';
  END IF;

  SELECT * INTO v_rec
  FROM public.processed_events
  WHERE event_id = p_event_id
  FOR UPDATE;

  IF FOUND THEN
    -- Se já foi concluído: retorna imediatamente o resultado original ("Carimbou PAGO")
    IF v_rec.status = 'completed' THEN
      RETURN jsonb_build_object(
        'status', 'completed',
        'already_processed', true,
        'result', v_rec.result_payload,
        'processed_at', v_rec.processed_at
      );
    END IF;

    -- Se está em processamento e a trava temporal ainda é válida: impede concorrência
    IF v_rec.status = 'processing' AND v_rec.locked_until > now() THEN
      RETURN jsonb_build_object(
        'status', 'processing',
        'already_processing', true,
        'message', 'Evento já em processamento por outra requisição simultânea'
      );
    END IF;

    -- Se a trava expirou (worker morreu) ou falhou antes: reassume a execução
    UPDATE public.processed_events
    SET status = 'processing',
        locked_until = now() + interval '2 minutes',
        error_message = NULL,
        actor_id = COALESCE(p_actor_id, actor_id)
    WHERE event_id = p_event_id;

    RETURN jsonb_build_object(
      'status', 'acquired',
      'already_processed', false,
      'is_retry', true
    );
  END IF;

  -- Primeira execução: registra o carimbo em status 'processing'
  INSERT INTO public.processed_events (
    event_id, scope, status, actor_id, locked_until
  ) VALUES (
    p_event_id, p_scope, 'processing', p_actor_id, now() + interval '2 minutes'
  );

  RETURN jsonb_build_object(
    'status', 'acquired',
    'already_processed', false,
    'is_retry', false
  );
END;
$$;

-- 8. RPC ATÔMICA: CARIMBO DA LOTÉRICA - CONCLUSÃO DEFINITIVA DO EVENTO
CREATE OR REPLACE FUNCTION public.idempotent_event_complete(
  p_event_id TEXT,
  p_result JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  UPDATE public.processed_events
  SET status = 'completed',
      result_payload = p_result,
      processed_at = now()
  WHERE event_id = p_event_id;

  RETURN jsonb_build_object(
    'status', 'completed',
    'event_id', p_event_id
  );
END;
$$;

-- 9. RPC ATÔMICA: CARIMBO DA LOTÉRICA - FALHA NO PROCESSAMENTO DO EVENTO
CREATE OR REPLACE FUNCTION public.idempotent_event_fail(
  p_event_id TEXT,
  p_error TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  UPDATE public.processed_events
  SET status = 'failed',
      error_message = p_error
  WHERE event_id = p_event_id;

  RETURN jsonb_build_object(
    'status', 'failed',
    'event_id', p_event_id,
    'error', p_error
  );
END;
$$;

COMMIT;
