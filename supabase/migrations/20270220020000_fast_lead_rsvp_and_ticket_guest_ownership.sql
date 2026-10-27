-- ==============================================================================
-- MIGRATION: 20270220020000_fast_lead_rsvp_and_ticket_guest_ownership.sql
-- Invariantes AGENTS.md B.1 a B.45 | GAP-05 & Microfase 1.5
-- Permite emissão de ingressos nominais rápidos e RSVP sem forçar senha imediata
-- e concede leitura/gestão de ingressos aos produtores civis de eventos.
-- ==============================================================================

-- 1. Permite ingressos nominais emitidos para leads sem conta prévia
ALTER TABLE public.tickets ALTER COLUMN owner_profile_id DROP NOT NULL;

-- 2. Índice para vinculação automática quando o lead posteriormente criar conta
CREATE INDEX IF NOT EXISTS idx_tickets_recipient_email ON public.tickets (recipient_email) WHERE recipient_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_recipient_tax_id ON public.tickets (recipient_tax_id) WHERE recipient_tax_id IS NOT NULL;

-- 3. RLS para Produtores Civis visualizarem e validarem ingressos de seus eventos
DROP POLICY IF EXISTS "tickets_civilian_producer_read" ON public.tickets;
CREATE POLICY "tickets_civilian_producer_read" ON public.tickets
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = tickets.event_id AND e.author_profile_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "tickets_civilian_producer_update" ON public.tickets;
CREATE POLICY "tickets_civilian_producer_update" ON public.tickets
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = tickets.event_id AND e.author_profile_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = tickets.event_id AND e.author_profile_id = (SELECT auth.uid())
  ));
