-- ==============================================================================
-- MIGRATION: 20260927000000_carne_digital_installments_system.sql
-- DIRETIVA BIGTECH: MÃ³dulo de CarnÃª Digital & GestÃ£o Completa de Parcelas
-- Tabelas: receivables, receivable_installments, receivable_adjustment_log
-- Stored Procedures: approve_installment_conciliation, create_receivable_with_installments,
-- recalculate_installment_interest
-- ==============================================================================

-- 1. AmpliaÃ§Ã£o do ENUM/Check em personal_financial_entries para suportar 'installment'
ALTER TABLE public.personal_financial_entries 
  DROP CONSTRAINT IF EXISTS personal_financial_entries_reference_type_check;

ALTER TABLE public.personal_financial_entries 
  ADD CONSTRAINT personal_financial_entries_reference_type_check 
  CHECK (reference_type IN ('manual', 'order', 'mobility', 'tourism', 'booking', 'refund', 'cashback', 'fee', 'installment'));


-- 2. EvoluÃ§Ã£o da Tabela receivables (CabeÃ§alho do CarnÃª / Financiamento)
ALTER TABLE public.receivables
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS interest_rate_monthly NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS fine_percent NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS grace_days INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_receivables_store ON public.receivables(store_id);
CREATE INDEX IF NOT EXISTS idx_receivables_contract ON public.receivables(contract_id);


-- 3. EvoluÃ§Ã£o da Tabela receivable_installments (Parcelas do CarnÃª)
ALTER TABLE public.receivable_installments
  ADD COLUMN IF NOT EXISTS original_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS interest_accrued_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fine_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS conciliation_status TEXT DEFAULT 'none' CHECK (conciliation_status IN ('none', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS conciliation_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS conciliation_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conciliation_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conciliation_notes TEXT,
  ADD COLUMN IF NOT EXISTS late_days INT DEFAULT 0;

-- Backfill de compatibilidade para parcelas antigas
UPDATE public.receivable_installments 
SET 
  original_amount_cents = COALESCE(original_amount_cents, amount_cents),
  final_amount_cents = COALESCE(final_amount_cents, amount_cents)
WHERE original_amount_cents IS NULL OR final_amount_cents IS NULL;

CREATE INDEX IF NOT EXISTS idx_installments_conciliation ON public.receivable_installments(conciliation_status);
CREATE INDEX IF NOT EXISTS idx_installments_rec_status ON public.receivable_installments(receivable_id, status);


-- 4. Tabela de Auditoria ImutÃ¡vel de RenegociaÃ§Ãµes & Ajustes de Parcelas
CREATE TABLE IF NOT EXISTS public.receivable_adjustment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID REFERENCES public.receivables(id) ON DELETE CASCADE NOT NULL,
  installment_id UUID REFERENCES public.receivable_installments(id) ON DELETE CASCADE NOT NULL,
  adjusted_by UUID REFERENCES public.profiles(id) NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('waive_interest', 'discount', 'penalty', 'manual_override', 'rejected_reopen')),
  previous_amount_cents BIGINT NOT NULL,
  new_amount_cents BIGINT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adjustment_log_inst ON public.receivable_adjustment_log(installment_id);
CREATE INDEX IF NOT EXISTS idx_adjustment_log_rec ON public.receivable_adjustment_log(receivable_id);


-- 5. HabilitaÃ§Ã£o de RLS e PolÃ­ticas de SeguranÃ§a
ALTER TABLE public.receivable_adjustment_log ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas para receivables
DROP POLICY IF EXISTS "receivables_participants_policy" ON public.receivables;
DROP POLICY IF EXISTS "receivables_participants_and_store_policy" ON public.receivables;
DROP POLICY IF EXISTS "receivables_participants_and_store_policy" ON public.receivables;
CREATE POLICY "receivables_participants_and_store_policy" ON public.receivables
  FOR ALL USING (
    creditor_id = auth.uid() OR 
    debtor_id = auth.uid() OR
    (store_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.store_id = receivables.store_id AND wm.profile_id = auth.uid()
    ))
  );

-- PolÃ­ticas para receivable_installments
DROP POLICY IF EXISTS "installments_participants_policy" ON public.receivable_installments;
DROP POLICY IF EXISTS "installments_participants_and_store_policy" ON public.receivable_installments;
DROP POLICY IF EXISTS "installments_participants_and_store_policy" ON public.receivable_installments;
CREATE POLICY "installments_participants_and_store_policy" ON public.receivable_installments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.receivables r
      WHERE r.id = receivable_installments.receivable_id
      AND (
        r.creditor_id = auth.uid() OR 
        r.debtor_id = auth.uid() OR
        (r.store_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm 
          WHERE wm.store_id = r.store_id AND wm.profile_id = auth.uid()
        ))
      )
    )
  );

-- PolÃ­ticas para receivable_adjustment_log
DROP POLICY IF EXISTS "adjustment_log_read_policy" ON public.receivable_adjustment_log;
DROP POLICY IF EXISTS "adjustment_log_read_policy" ON public.receivable_adjustment_log;
CREATE POLICY "adjustment_log_read_policy" ON public.receivable_adjustment_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.receivables r
      WHERE r.id = receivable_adjustment_log.receivable_id
      AND (
        r.creditor_id = auth.uid() OR 
        r.debtor_id = auth.uid() OR
        (r.store_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm 
          WHERE wm.store_id = r.store_id AND wm.profile_id = auth.uid()
        ))
      )
    )
  );

DROP POLICY IF EXISTS "adjustment_log_insert_policy" ON public.receivable_adjustment_log;
DROP POLICY IF EXISTS "adjustment_log_insert_policy" ON public.receivable_adjustment_log;
CREATE POLICY "adjustment_log_insert_policy" ON public.receivable_adjustment_log
  FOR INSERT WITH CHECK (
    adjusted_by = auth.uid()
  );


-- 6. Stored Procedure: approve_installment_conciliation (TransaÃ§Ã£o AtÃ´mica com Espelhamento)
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
    RAISE EXCEPTION 'Parcela nÃ£o encontrada: %', p_installment_id;
  END IF;

  -- 2. Obter o recebÃ­vel/carnÃª
  SELECT * INTO v_rec FROM public.receivables WHERE id = v_inst.receivable_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CarnÃª nÃ£o encontrado para a parcela: %', p_installment_id;
  END IF;

  -- Determinar valor final
  v_final_cents := COALESCE(p_final_amount_cents, v_inst.final_amount_cents, v_inst.original_amount_cents, v_inst.amount_cents);

  -- 3. Atualizar a parcela
  UPDATE public.receivable_installments
  SET 
    status = 'paid',
    paid_at = now(),
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
    SET status = 'settled', updated_at = now()
    WHERE id = v_rec.id;
  END IF;

  -- 5. Espelhamento atÃ´mico no Financeiro Pessoal do devedor
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
      'QuitaÃ§Ã£o de carnÃª aprovada pela loja. LanÃ§amento imutÃ¡vel de telemetria contÃ¡bil.'
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


-- 7. Stored Procedure: create_receivable_with_installments (EmissÃ£o AtÃ´mica de CarnÃª)
CREATE OR REPLACE FUNCTION public.create_receivable_with_installments(
  p_creditor_id UUID,
  p_debtor_id UUID,
  p_store_id UUID,
  p_contract_id UUID,
  p_deal_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_total_cents BIGINT,
  p_installments_count INT,
  p_first_due_date TIMESTAMPTZ,
  p_interest_rate_monthly NUMERIC DEFAULT 0.00,
  p_fine_percent NUMERIC DEFAULT 0.00,
  p_grace_days INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec_id UUID;
  v_base_cents BIGINT;
  v_remainder_cents BIGINT;
  v_installment_amount BIGINT;
  v_due_date TIMESTAMPTZ;
  i INT;
BEGIN
  IF p_installments_count <= 0 THEN
    RAISE EXCEPTION 'Quantidade de parcelas deve ser maior que zero.';
  END IF;
  IF p_total_cents <= 0 THEN
    RAISE EXCEPTION 'Valor total deve ser maior que zero.';
  END IF;

  -- 1. Criar o cabeÃ§alho do carnÃª
  INSERT INTO public.receivables (
    creditor_id,
    debtor_id,
    store_id,
    contract_id,
    deal_id,
    title,
    description,
    total_cents,
    installments_count,
    interest_rate_monthly,
    fine_percent,
    grace_days,
    status
  ) VALUES (
    p_creditor_id,
    p_debtor_id,
    p_store_id,
    p_contract_id,
    p_deal_id,
    p_title,
    p_description,
    p_total_cents,
    p_installments_count,
    COALESCE(p_interest_rate_monthly, 0.00),
    COALESCE(p_fine_percent, 0.00),
    COALESCE(p_grace_days, 0),
    'active'
  ) RETURNING id INTO v_rec_id;

  -- 2. Calcular parcelas com centavos arredondados
  v_base_cents := p_total_cents / p_installments_count;
  v_remainder_cents := p_total_cents - (v_base_cents * p_installments_count);

  -- 3. Gerar as parcelas
  FOR i IN 1..p_installments_count LOOP
    IF i = 1 THEN
      v_installment_amount := v_base_cents + v_remainder_cents;
    ELSE
      v_installment_amount := v_base_cents;
    END IF;

    v_due_date := p_first_due_date + ((i - 1) * INTERVAL '1 month');

    INSERT INTO public.receivable_installments (
      receivable_id,
      installment_number,
      amount_cents,
      original_amount_cents,
      final_amount_cents,
      due_date,
      status,
      conciliation_status
    ) VALUES (
      v_rec_id,
      i,
      v_installment_amount,
      v_installment_amount,
      v_installment_amount,
      v_due_date,
      'pending',
      'none'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'receivable_id', v_rec_id,
    'installments_count', p_installments_count,
    'total_cents', p_total_cents
  );
END;
$$;


-- 8. Stored Procedure: recalculate_installment_interest (CÃ¡lculo de Atraso e Juros)
CREATE OR REPLACE FUNCTION public.recalculate_installment_interest(p_installment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inst RECORD;
  v_rec RECORD;
  v_grace_days INT;
  v_due_effective DATE;
  v_late_days INT := 0;
  v_fine_cents BIGINT := 0;
  v_interest_cents BIGINT := 0;
  v_final_cents BIGINT;
BEGIN
  SELECT * INTO v_inst FROM public.receivable_installments WHERE id = p_installment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela nÃ£o encontrada: %', p_installment_id;
  END IF;

  IF v_inst.status IN ('paid', 'waived') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_settled');
  END IF;

  SELECT * INTO v_rec FROM public.receivables WHERE id = v_inst.receivable_id;
  v_grace_days := COALESCE(v_rec.grace_days, 0);
  v_due_effective := (v_inst.due_date::date + v_grace_days);

  IF CURRENT_DATE > v_due_effective THEN
    v_late_days := (CURRENT_DATE - v_inst.due_date::date);
    
    -- Multa fixa percentual
    IF COALESCE(v_rec.fine_percent, 0) > 0 THEN
      v_fine_cents := ROUND((COALESCE(v_inst.original_amount_cents, v_inst.amount_cents) * v_rec.fine_percent) / 100.0);
    END IF;

    -- Juros prÃ³-rata dia mensal
    IF COALESCE(v_rec.interest_rate_monthly, 0) > 0 THEN
      v_interest_cents := ROUND((COALESCE(v_inst.original_amount_cents, v_inst.amount_cents) * (v_rec.interest_rate_monthly / 30.0 / 100.0) * v_late_days));
    END IF;

    v_final_cents := COALESCE(v_inst.original_amount_cents, v_inst.amount_cents) + v_fine_cents + v_interest_cents - COALESCE(v_inst.discount_cents, 0);

    UPDATE public.receivable_installments
    SET 
      status = 'late',
      late_days = v_late_days,
      fine_cents = v_fine_cents,
      interest_accrued_cents = v_interest_cents,
      final_amount_cents = GREATEST(v_final_cents, 0),
      updated_at = now()
    WHERE id = p_installment_id;
  ELSE
    v_final_cents := COALESCE(v_inst.original_amount_cents, v_inst.amount_cents) - COALESCE(v_inst.discount_cents, 0);
    UPDATE public.receivable_installments
    SET 
      status = 'pending',
      late_days = 0,
      fine_cents = 0,
      interest_accrued_cents = 0,
      final_amount_cents = GREATEST(v_final_cents, 0),
      updated_at = now()
    WHERE id = p_installment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'installment_id', p_installment_id,
    'late_days', v_late_days,
    'fine_cents', v_fine_cents,
    'interest_accrued_cents', v_interest_cents,
    'final_amount_cents', v_final_cents
  );
END;
$$;

