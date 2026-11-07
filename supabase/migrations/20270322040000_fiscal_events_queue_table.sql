-- ========================================================================================
-- MIGRATION: CRIAÇÃO CANÔNICA DA FILA DE EVENTOS E PENDÊNCIAS FISCAIS (FISCAL_EVENTS_QUEUE)
-- ========================================================================================

CREATE TABLE IF NOT EXISTS public.fiscal_events_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    event_type text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de performance e consulta por loja/status
CREATE INDEX IF NOT EXISTS idx_fiscal_events_queue_store_status ON public.fiscal_events_queue (store_id, status);
CREATE INDEX IF NOT EXISTS idx_fiscal_events_queue_order_id ON public.fiscal_events_queue (order_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_events_queue_created_at ON public.fiscal_events_queue (created_at DESC);

-- Habilitar RLS
ALTER TABLE public.fiscal_events_queue ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Store members can view fiscal events" ON public.fiscal_events_queue;
CREATE POLICY "Store members can view fiscal events"
    ON public.fiscal_events_queue
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = fiscal_events_queue.store_id
              AND wm.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('platform_admin', 'master_admin')
        )
    );

DROP POLICY IF EXISTS "Store members and system can insert fiscal events" ON public.fiscal_events_queue;
CREATE POLICY "Store members and system can insert fiscal events"
    ON public.fiscal_events_queue
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = fiscal_events_queue.store_id
              AND wm.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('platform_admin', 'master_admin')
        )
    );

DROP POLICY IF EXISTS "Store members can update fiscal events" ON public.fiscal_events_queue;
CREATE POLICY "Store members can update fiscal events"
    ON public.fiscal_events_queue
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = fiscal_events_queue.store_id
              AND wm.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('platform_admin', 'master_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = fiscal_events_queue.store_id
              AND wm.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('platform_admin', 'master_admin')
        )
    );
