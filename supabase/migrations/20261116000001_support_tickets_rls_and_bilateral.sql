-- ==============================================================================
-- MIGRATION: 20261116000000_support_tickets_rls_and_bilateral.sql
-- DESCRIÃ‡ÃƒO: Habilita inserÃ§Ã£o e gestÃ£o bilateral de chamados de suporte ao cliente
--            (support_tickets e ticket_messages) com RLS deny-by-default seguro.
-- ==============================================================================

-- 1. PolÃ­ticas RLS para support_tickets
DROP POLICY IF EXISTS "Customers can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can create support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can update own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Store members can view store support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Store members can update store support tickets" ON public.support_tickets;

-- Clientes podem visualizar seus prÃ³prios chamados
CREATE POLICY "Customers can view own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = customer_id);

-- Clientes podem abrir chamados de suporte
CREATE POLICY "Customers can create support tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Clientes podem atualizar status do prÃ³prio chamado (ex: encerrar)
CREATE POLICY "Customers can update own tickets"
ON public.support_tickets
FOR UPDATE
USING (auth.uid() = customer_id);

-- Membros de loja podem visualizar chamados de sua loja
CREATE POLICY "Store members can view store support tickets"
ON public.support_tickets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.store_id = support_tickets.store_id
      AND wm.user_id = auth.uid()
  )
);

-- Membros de loja podem atualizar chamados de sua loja
CREATE POLICY "Store members can update store support tickets"
ON public.support_tickets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.store_id = support_tickets.store_id
      AND wm.user_id = auth.uid()
  )
);

-- 2. PolÃ­ticas RLS para ticket_messages
DROP POLICY IF EXISTS "Customers can view ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Customers can insert ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Store members can view ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Store members can insert ticket messages" ON public.ticket_messages;

-- Clientes podem ler mensagens de seus chamados (exceto notas internas)
CREATE POLICY "Customers can view ticket messages"
ON public.ticket_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND t.customer_id = auth.uid()
  )
  AND (is_internal_note = false)
);

-- Clientes podem responder seus prÃ³prios chamados
CREATE POLICY "Customers can insert ticket messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND t.customer_id = auth.uid()
  )
);

-- Membros de loja podem visualizar todas as mensagens dos chamados da sua loja
CREATE POLICY "Store members can view ticket messages"
ON public.ticket_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    JOIN public.workspace_members wm ON wm.store_id = t.store_id
    WHERE t.id = ticket_messages.ticket_id
      AND wm.user_id = auth.uid()
  )
);

-- Membros de loja podem enviar mensagens e notas internas
CREATE POLICY "Store members can insert ticket messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    JOIN public.workspace_members wm ON wm.store_id = t.store_id
    WHERE t.id = ticket_messages.ticket_id
      AND wm.user_id = auth.uid()
  )
);

