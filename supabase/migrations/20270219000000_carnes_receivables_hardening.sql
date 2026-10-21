-- ==============================================================================
-- MIGRATION: 20270219000000_carnes_receivables_hardening.sql
-- DIRETIVA BIGTECH: End-to-End Hardening de Carnês, Parcelamentos e Acordos
-- ==============================================================================

-- 1. Campos de Rastreabilidade e Origem Comercial em receivables
ALTER TABLE public.receivables
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_type TEXT DEFAULT 'store_pos',
  ADD COLUMN IF NOT EXISTS renegotiated_from_id UUID REFERENCES public.receivables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Constraint de tipos válidos de origem comercial
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receivables_origin_type_check'
  ) THEN
    ALTER TABLE public.receivables
      ADD CONSTRAINT receivables_origin_type_check
      CHECK (origin_type IN ('order', 'deal_p2p', 'store_pos', 'condicional_conversion', 'renegotiation'));
  END IF;
END $$;

-- 2. Campos de Quitação Antecipada e Conciliação em receivable_installments
ALTER TABLE public.receivable_installments
  ADD COLUMN IF NOT EXISTS paid_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS early_settlement_discount_cents BIGINT DEFAULT 0;

-- 3. Índices de Performance e Integridade Relacional
CREATE INDEX IF NOT EXISTS idx_receivables_order ON public.receivables(order_id);
CREATE INDEX IF NOT EXISTS idx_receivables_renegotiated ON public.receivables(renegotiated_from_id);
CREATE INDEX IF NOT EXISTS idx_receivables_debtor_status ON public.receivables(debtor_id, status);
CREATE INDEX IF NOT EXISTS idx_installments_due_status ON public.receivable_installments(due_date, status);

-- 4. Atualização da Stored Procedure de Conciliação Atômica com Preenchimento de paid_amount_cents
CREATE OR REPLACE FUNCTION public.approve_installment_conciliation(
  p_installment_id UUID,
  p_approved_by UUID,
  p_final_amount_cents BIGINT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'pix',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inst RECORD;
  v_rec RECORD;
  v_all_settled BOOLEAN;
  v_final_cents BIGINT;
  v_pfe_id UUID := NULL;
  v_token TEXT;
BEGIN
  -- 1. Obter a parcela
  SELECT * INTO v_inst FROM public.receivable_installments WHERE id = p_installment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela não encontrada: %', p_installment_id;
  END IF;

  -- 2. Obter o recebível/carnê
  SELECT * INTO v_rec FROM public.receivables WHERE id = v_inst.receivable_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carnê não encontrado para a parcela: %', p_installment_id;
  END IF;

  -- Determinar valor final
  v_final_cents := COALESCE(p_final_amount_cents, v_inst.final_amount_cents, v_inst.original_amount_cents, v_inst.amount_cents);

  -- 3. Atualizar a parcela
  UPDATE public.receivable_installments
  SET 
    status = 'paid',
    paid_at = now(),
    paid_amount_cents = v_final_cents,
    final_amount_cents = v_final_cents,
    payment_method = COALESCE(p_payment_method, payment_method, 'pix'),
    conciliation_status = 'approved',
    conciliation_approved_by = p_approved_by,
    conciliation_approved_at = now(),
    conciliation_notes = COALESCE(p_notes, conciliation_notes),
    updated_at = now()
  WHERE id = p_installment_id;

  -- 4. Verificar se todas as parcelas foram liquidadas
  SELECT bool_and(status IN ('paid', 'waived')) INTO v_all_settled
  FROM public.receivable_installments
  WHERE receivable_id = v_rec.id;

  IF v_all_settled IS TRUE THEN
    UPDATE public.receivables
    SET 
      status = 'settled',
      settled_at = now(),
      updated_at = now()
    WHERE id = v_rec.id;
  END IF;

  -- 5. Espelhamento atômico no Financeiro Pessoal do devedor
  v_token := 'INST-' || v_inst.id::text || '-' || floor(extract(epoch from now()))::text;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.personal_financial_entries 
    WHERE reference_type = 'installment' AND reference_id = v_inst.id::text
  ) THEN
    INSERT INTO public.personal_financial_entries (
      profile_id,
      type,
      amount_cents,
      description,
      entry_date,
      receipt_url,
      payment_method,
      reference_type,
      reference_id,
      is_locked,
      transaction_token,
      notes
    ) VALUES (
      v_rec.debtor_id,
      'expense',
      v_final_cents,
      'Parcela ' || v_inst.installment_number || ' de ' || v_rec.installments_count || ' - ' || v_rec.title,
      CURRENT_DATE,
      v_inst.payment_proof_url,
      lower(COALESCE(p_payment_method, 'pix')),
      'installment',
      v_inst.id::text,
      true,
      v_token,
      'Quitação de carnê aprovada pela loja. Lançamento imutável de telemetria contábil.'
    ) RETURNING id INTO v_pfe_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'installment_id', p_installment_id,
    'status', 'paid',
    'conciliation_status', 'approved',
    'receivable_status', CASE WHEN v_all_settled THEN 'settled' ELSE v_rec.status END,
    'personal_financial_entry_id', v_pfe_id
  );
END;
$$;
