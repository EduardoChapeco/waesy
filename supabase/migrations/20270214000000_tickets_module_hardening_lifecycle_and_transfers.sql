-- ============================================================================
-- Migration: Tickets Module Hardening, Lifecycle, Transfers & Audit Ledger
-- Padrão Criptográfico WCTS-1, Transferências, Cancelamentos e Histórico
-- ============================================================================

-- 1. Estender public.tickets com campos de ciclo de vida e transferência
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transferred_from_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Índices de alta performance para busca e auditoria
CREATE INDEX IF NOT EXISTS idx_tickets_owner_profile ON public.tickets(owner_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_recipient_email ON public.tickets(recipient_email) WHERE recipient_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_recipient_tax_id ON public.tickets(recipient_tax_id) WHERE recipient_tax_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_event_status ON public.tickets(event_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_lot ON public.tickets(lot_id);

-- 3. Tabela de Logs de Auditoria do Ciclo de Vida do Ingresso (Audit Ledger Imutável)
CREATE TABLE IF NOT EXISTS public.ticket_lifecycle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('issued', 'viewed', 'transferred', 'checked_in', 'cancelled', 'refunded', 'revoked')),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_status TEXT,
  new_status TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_logs_ticket ON public.ticket_lifecycle_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_logs_event ON public.ticket_lifecycle_logs(event_id);

-- 4. RLS para ticket_lifecycle_logs (Deny-by-default)
ALTER TABLE public.ticket_lifecycle_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_logs_owner_select" ON public.ticket_lifecycle_logs;
CREATE POLICY "ticket_logs_owner_select" ON public.ticket_lifecycle_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_lifecycle_logs.ticket_id AND t.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ticket_logs_staff_select" ON public.ticket_lifecycle_logs;
CREATE POLICY "ticket_logs_staff_select" ON public.ticket_lifecycle_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_lifecycle_logs.event_id AND public.is_store_staff(e.store_id)
    )
  );

-- 5. RPC para decremento atômico de ingressos vendidos (em caso de cancelamento/estorno)
CREATE OR REPLACE FUNCTION public.decrement_ticket_sold(p_lot_id UUID, p_qty INT DEFAULT 1)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ticket_lots
  SET sold_count = GREATEST(0, sold_count - GREATEST(1, p_qty)),
      updated_at = now()
  WHERE id = p_lot_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_ticket_sold(UUID, INT) TO authenticated, service_role;
