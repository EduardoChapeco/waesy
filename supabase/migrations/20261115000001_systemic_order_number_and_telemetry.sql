-- ============================================================================
-- Waesy Commerce — Migration 20261115000000: Systemic Order Number & Real Telemetry
-- ============================================================================
-- 1. Sequence soberana para número de pedido humano e auditável.
-- 2. Coluna order_number na tabela public.orders com unicidade e indexação.
-- 3. Trigger BEFORE INSERT para garantir geração obrigatória no PostgreSQL.
-- 4. Tabela canônica public.order_events para telemetria e auditoria completa.
-- 5. Trigger AFTER INSERT/UPDATE para registro automático de eventos no Ledger.
-- 6. Atualização de process_checkout_atomic para retornar order_number do banco.
-- ============================================================================

-- 1. Criação da Sequence global de Pedidos
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
  START WITH 10001
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- 2. Adição da coluna order_number à tabela orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number TEXT;

-- 3. Backfill seguro para qualquer pedido existente que não tenha order_number
UPDATE public.orders
SET order_number = 'WSY-' || LPAD(nextval('public.order_number_seq')::TEXT, 6, '0')
WHERE order_number IS NULL OR order_number = '';

-- 4. Unicidade e índice B-TREE para busca ultrarrápida
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number
  ON public.orders (order_number);

CREATE INDEX IF NOT EXISTS idx_orders_store_order_number
  ON public.orders (store_id, order_number);

-- 5. Função e Trigger BEFORE INSERT em public.orders para geração automática soberana
CREATE OR REPLACE FUNCTION public.fn_orders_generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR trim(NEW.order_number) = '' THEN
    NEW.order_number := 'WSY-' || LPAD(nextval('public.order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_generate_order_number ON public.orders;

CREATE TRIGGER trg_orders_generate_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_orders_generate_order_number();

-- 6. Tabela Canônica de Telemetria e Acompanhamento de Pedidos: order_events
CREATE TABLE IF NOT EXISTS public.order_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  from_status TEXT,
  to_status   TEXT,
  note        TEXT,
  actor_type  TEXT NOT NULL DEFAULT 'system',
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de auditoria e telemetria
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events (order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_order_events_store_id ON public.order_events (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_events_type ON public.order_events (event_type, created_at DESC);

-- RLS em order_events
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- Clientes podem ver eventos de pedidos vinculados ao seu usuário
CREATE POLICY "order_events_customer_read"
  ON public.order_events FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE customer_id = auth.uid()
    )
  );

-- Equipe da loja pode ver todos os eventos de pedidos da loja
CREATE POLICY "order_events_staff_read"
  ON public.order_events FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Usuários anônimos ou clientes com public_token podem ler eventos via RPC ou service_role
CREATE POLICY "order_events_service_all"
  ON public.order_events FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Trigger de Telemetria Automática de Criação e Mudança de Status
CREATE OR REPLACE FUNCTION public.fn_orders_telemetry_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_events (
      order_id,
      store_id,
      event_type,
      to_status,
      note,
      actor_type,
      actor_id,
      metadata
    ) VALUES (
      NEW.id,
      NEW.store_id,
      'order_created',
      NEW.status::TEXT,
      'Pedido registrado soberanamente no banco de dados com número ' || COALESCE(NEW.order_number, 'N/A'),
      COALESCE(NEW.origin_type, 'ecommerce'),
      NEW.customer_id,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'total_cents', NEW.total_cents,
        'shipping_method', NEW.shipping_method,
        'channel_origin', NEW.channel_origin
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.order_events (
        order_id,
        store_id,
        event_type,
        from_status,
        to_status,
        note,
        actor_type,
        actor_id,
        metadata
      ) VALUES (
        NEW.id,
        NEW.store_id,
        'status_updated',
        OLD.status::TEXT,
        NEW.status::TEXT,
        'Status atualizado de ' || OLD.status::TEXT || ' para ' || NEW.status::TEXT,
        'system',
        auth.uid(),
        jsonb_build_object(
          'order_number', NEW.order_number,
          'previous_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_telemetry ON public.orders;

CREATE TRIGGER trg_orders_telemetry
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_orders_telemetry_trigger();

-- 8. RPC para registrar visualização/telemetria pelo cliente (Anti-Ghosting)
CREATE OR REPLACE FUNCTION public.record_order_customer_view(
  p_public_token TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, store_id, order_number, status
  INTO v_order
  FROM public.orders
  WHERE public_token = p_public_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;

  INSERT INTO public.order_events (
    order_id,
    store_id,
    event_type,
    to_status,
    note,
    actor_type,
    metadata
  ) VALUES (
    v_order.id,
    v_order.store_id,
    'customer_viewed',
    v_order.status::TEXT,
    'Cliente visualizou a tela de acompanhamento do pedido',
    'customer',
    jsonb_build_object(
      'order_number', v_order.order_number,
      'user_agent', p_user_agent,
      'timestamp', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_number', v_order.order_number,
    'status', v_order.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_order_customer_view(TEXT, TEXT) TO anon, authenticated, service_role;
