-- =============================================================================
-- V141: RAZÃO FINANCEIRO AUDITÁVEL & INVOICE LEDGER E2E
-- Faturas consolidadas e telemetria de microtaxas por pedido (R$ 0,99)
-- =============================================================================

-- 1. Tabela de Faturas de Faturamento (billing_invoices)
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  invoice_number varchar(50) NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_cents int NOT NULL DEFAULT 0,
  status varchar(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PAID', 'VOID', 'OVERDUE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_store_id ON public.billing_invoices(store_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON public.billing_invoices(status);

-- 2. Tabela de Itens do Razão Financeiro (billing_line_items)
CREATE TABLE IF NOT EXISTS public.billing_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  origin_event_id varchar(120) NOT NULL,
  description varchar(255) NOT NULL,
  amount_cents int NOT NULL,
  fee_type varchar(40) NOT NULL CHECK (fee_type IN ('SUBSCRIPTION_MONTHLY', 'ORDER_MICROFEE_RANDOM', 'EXTRA_USAGE')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_line_items_store_id ON public.billing_line_items(store_id);
CREATE INDEX IF NOT EXISTS idx_billing_line_items_invoice_id ON public.billing_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_line_items_origin_event ON public.billing_line_items(origin_event_id);
CREATE INDEX IF NOT EXISTS idx_billing_line_items_fee_type ON public.billing_line_items(fee_type);

-- 3. RLS nas Tabelas Financeiras
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_line_items ENABLE ROW LEVEL SECURITY;

-- Lojistas podem visualizar apenas suas próprias faturas e lançamentos
DROP POLICY IF EXISTS "Store staff can view own invoices" ON public.billing_invoices;
CREATE POLICY "Store staff can view own invoices"
  ON public.billing_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = billing_invoices.store_id
        AND wm.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store staff can view own billing line items" ON public.billing_line_items;
CREATE POLICY "Store staff can view own billing line items"
  ON public.billing_line_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = billing_line_items.store_id
        AND wm.profile_id = auth.uid()
    )
  );

-- Admins da Plataforma possuem controle total
DROP POLICY IF EXISTS "Platform admins manage billing invoices" ON public.billing_invoices;
CREATE POLICY "Platform admins manage billing invoices"
  ON public.billing_invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('master', 'platform_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Platform admins manage billing line items" ON public.billing_line_items;
CREATE POLICY "Platform admins manage billing line items"
  ON public.billing_line_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('master', 'platform_admin', 'admin')
    )
  );

-- 4. Função e Trigger para Atualização Atômica do Total da Fatura
CREATE OR REPLACE FUNCTION public.fn_sync_billing_invoice_total()
RETURNS trigger AS $$
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    UPDATE public.billing_invoices
    SET total_cents = (
      SELECT COALESCE(SUM(amount_cents), 0)
      FROM public.billing_line_items
      WHERE invoice_id = NEW.invoice_id
    ),
    updated_at = now()
    WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_billing_invoice_total ON public.billing_line_items;
CREATE TRIGGER trg_sync_billing_invoice_total
AFTER INSERT OR UPDATE OR DELETE ON public.billing_line_items
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_billing_invoice_total();
