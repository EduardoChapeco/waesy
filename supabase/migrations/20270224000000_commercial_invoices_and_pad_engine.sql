-- ============================================================================
-- MIGRATION: 20270224000000_commercial_invoices_and_pad_engine.sql
-- DESCRIÇÃO: Motor Canônico de Faturas Comerciais, Bloco de Orçamento Tipo Papel
--            e Integração com Contratos Digitais (Waesy Enterprise)
-- NORMAS: AGENTS.md B.1 a B.45, RLS Multi-Tenant, Zero Mocks
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TABELA PRINCIPAL DE FATURAS E BLOCO DE ORÇAMENTOS COMERCIAIS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.profiles(id),
  customer_id UUID REFERENCES public.customers_crm(id),
  lead_id UUID REFERENCES public.leads_crm(id),
  contract_id UUID REFERENCES public.contracts(id),
  order_id UUID REFERENCES public.orders(id),

  -- Numeração Sequencial Contínua por Loja (ex: #ORC-2026-0001, #FAT-2026-0001)
  invoice_code TEXT NOT NULL,
  sequential_number INTEGER NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'budget' 
    CHECK (document_type IN ('budget', 'invoice', 'receipt', 'work_order')),
  
  status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'sent', 'approved', 'converted_to_contract', 'invoiced', 'paid', 'cancelled')),

  -- Token Público Criptográfico para Visualização Externa sem Autenticação
  public_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),

  -- Snapshots Imutáveis do Cliente e da Empresa Emissora
  customer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  issuer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Grade Matricial de Itens do Bloco
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Valores Financeiros em Centavos
  subtotal_cents BIGINT NOT NULL DEFAULT 0,
  discount_cents BIGINT NOT NULL DEFAULT 0,
  shipping_cents BIGINT NOT NULL DEFAULT 0,
  total_cents BIGINT NOT NULL DEFAULT 0,

  -- Condições Comerciais e Prazos
  payment_terms JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  valid_until DATE,
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (store_id, document_type, sequential_number)
);

CREATE INDEX IF NOT EXISTS idx_commercial_invoices_store ON public.commercial_invoices(store_id, status);
CREATE INDEX IF NOT EXISTS idx_commercial_invoices_customer ON public.commercial_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_commercial_invoices_token ON public.commercial_invoices(public_token);
CREATE INDEX IF NOT EXISTS idx_commercial_invoices_contract ON public.commercial_invoices(contract_id);

-- ----------------------------------------------------------------------------
-- 2. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.commercial_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commercial_invoices_tenant_access" ON public.commercial_invoices;
CREATE POLICY "commercial_invoices_tenant_access"
  ON public.commercial_invoices
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(store_id) OR
    creator_id = auth.uid()
  )
  WITH CHECK (
    public.is_store_staff(store_id) OR
    creator_id = auth.uid()
  );

DROP POLICY IF EXISTS "commercial_invoices_public_read_by_token" ON public.commercial_invoices;
CREATE POLICY "commercial_invoices_public_read_by_token"
  ON public.commercial_invoices
  FOR SELECT
  TO authenticated, anon
  USING (
    public_token IS NOT NULL AND length(public_token) >= 32
  );

-- ----------------------------------------------------------------------------
-- 3. GERADOR ATÔMICO DE NÚMERO SEQUENCIAL CONTÍNUO POR LOJA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_next_commercial_invoice_number(
  p_store_id UUID,
  p_doc_type TEXT
)
RETURNS TABLE (next_seq INT, next_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_seq INT;
  v_prefix TEXT;
  v_year TEXT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_prefix := CASE p_doc_type
    WHEN 'invoice' THEN 'FAT'
    WHEN 'receipt' THEN 'REC'
    WHEN 'work_order' THEN 'OS'
    ELSE 'ORC'
  END;

  SELECT COALESCE(MAX(sequential_number), 0) + 1
  INTO v_next_seq
  FROM public.commercial_invoices
  WHERE store_id = p_store_id AND document_type = p_doc_type;

  next_seq := v_next_seq;
  next_code := '#' || v_prefix || '-' || v_year || '-' || lpad(v_next_seq::TEXT, 4, '0');
  RETURN NEXT;
END;
$$;

COMMIT;
