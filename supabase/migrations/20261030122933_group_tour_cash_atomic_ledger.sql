-- Caixa de excursões: escrita server-side, ledger imutável e estorno auditável.

ALTER TABLE public.group_tour_cash_ledger
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS central_cash_register_entry_id UUID REFERENCES public.cash_register_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversal_of_id UUID REFERENCES public.group_tour_cash_ledger(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

ALTER TABLE public.group_tour_cash_ledger ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS group_tour_cash_ledger_idempotency_key_idx
  ON public.group_tour_cash_ledger (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS group_tour_cash_ledger_reversal_idx
  ON public.group_tour_cash_ledger (reversal_of_id)
  WHERE reversal_of_id IS NOT NULL;

DROP POLICY IF EXISTS "Workspace members manage tour cash ledger" ON public.group_tour_cash_ledger;
DROP POLICY IF EXISTS "group_tour_cash_ledger_staff_read" ON public.group_tour_cash_ledger;
CREATE POLICY "group_tour_cash_ledger_staff_read"
  ON public.group_tour_cash_ledger
  FOR SELECT
  TO authenticated
  USING (
    is_store_staff(store_id)
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'master', 'superadmin', 'platform_admin')
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.group_tour_cash_ledger FROM anon, authenticated;
REVOKE ALL ON public.group_tour_cash_ledger FROM anon;
GRANT SELECT ON public.group_tour_cash_ledger TO authenticated;

CREATE OR REPLACE FUNCTION public.record_group_tour_cash_entry(
  p_store_id UUID,
  p_tour_id UUID,
  p_entry_type TEXT,
  p_category TEXT,
  p_description TEXT,
  p_amount_cents BIGINT,
  p_payment_method TEXT,
  p_receipt_url TEXT,
  p_occurred_at TIMESTAMPTZ,
  p_sync_with_central_cash BOOLEAN,
  p_idempotency_key TEXT,
  p_actor_id UUID,
  p_actor_role TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_tour public.tourism_experiences%ROWTYPE;
  v_cash public.group_tour_cash_ledger%ROWTYPE;
  v_ledger public.financial_immutable_ledger%ROWTYPE;
  v_register public.cash_registers%ROWTYPE;
  v_register_entry public.cash_register_entries%ROWTYPE;
  v_existing public.financial_immutable_ledger%ROWTYPE;
  v_transaction_type TEXT;
  v_effective_actor_role TEXT;
  v_idempotency_key TEXT := trim(p_idempotency_key);
BEGIN
  IF p_store_id IS NULL OR p_tour_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Contexto de loja, excursão e operador é obrigatório.';
  END IF;
  IF p_entry_type NOT IN ('inflow', 'outflow') THEN
    RAISE EXCEPTION 'Tipo de lançamento inválido.';
  END IF;
  IF p_payment_method NOT IN ('cash', 'pix', 'corporate_card', 'other') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida.';
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 OR p_amount_cents > 2147483647 THEN
    RAISE EXCEPTION 'Valor do lançamento inválido.';
  END IF;
  IF v_idempotency_key IS NULL OR length(v_idempotency_key) < 16 THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.';
  END IF;
  IF p_description IS NULL OR length(trim(p_description)) < 2 THEN
    RAISE EXCEPTION 'Descrição do lançamento é obrigatória.';
  END IF;

  SELECT role::TEXT INTO v_effective_actor_role
  FROM public.profiles
  WHERE id = p_actor_id;
  IF v_effective_actor_role IS NULL THEN
    RAISE EXCEPTION 'Operador não possui perfil válido.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.store_id = p_store_id
      AND wm.profile_id = p_actor_id
      AND wm.role IN ('owner', 'admin', 'manager', 'finance')
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_actor_id
      AND p.role IN ('admin', 'master', 'superadmin', 'platform_admin')
  ) THEN
    RAISE EXCEPTION 'Operador sem permissão financeira para esta loja.';
  END IF;

  SELECT * INTO v_tour
  FROM public.tourism_experiences
  WHERE id = p_tour_id
    AND store_id = p_store_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Excursão não pertence à loja informada.';
  END IF;

  SELECT * INTO v_existing
  FROM public.financial_immutable_ledger
  WHERE idempotency_key = 'group-tour-cash:' || p_store_id::TEXT || ':' || v_idempotency_key
  FOR UPDATE;
  IF FOUND THEN
    SELECT * INTO v_cash
    FROM public.group_tour_cash_ledger
    WHERE id = NULLIF(v_existing.metadata ->> 'cash_entry_id', '')::UUID;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Idempotência inconsistente: ledger sem lançamento de caixa correspondente.';
    END IF;
    RETURN jsonb_build_object('success', true, 'replayed', true, 'entry', to_jsonb(v_cash), 'ledger_id', v_existing.id);
  END IF;

  v_transaction_type := CASE WHEN p_entry_type = 'inflow' THEN 'group_tour_cash_inflow' ELSE 'group_tour_cash_outflow' END;

  IF p_sync_with_central_cash THEN
    SELECT * INTO v_register
    FROM public.cash_registers
    WHERE store_id = p_store_id AND status = 'open'
    ORDER BY opened_at DESC
    LIMIT 1
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Não existe caixa central aberto para conciliação.';
    END IF;
  END IF;

  INSERT INTO public.group_tour_cash_ledger (
    tour_id, store_id, entry_type, category, description, amount_cents,
    payment_method, receipt_url, registered_by_profile_id, occurred_at, idempotency_key
  ) VALUES (
    p_tour_id, p_store_id, p_entry_type, trim(p_category), trim(p_description), p_amount_cents::INTEGER,
    p_payment_method, NULLIF(trim(p_receipt_url), ''), p_actor_id, COALESCE(p_occurred_at, now()), v_idempotency_key
  ) RETURNING * INTO v_cash;

  IF p_sync_with_central_cash THEN
    INSERT INTO public.cash_register_entries (
      cash_register_id, amount_cents, entry_type, payment_method, notes, created_by
    ) VALUES (
      v_register.id, p_amount_cents::INTEGER,
      CASE WHEN p_entry_type = 'inflow' THEN 'in' ELSE 'out' END,
      p_payment_method,
      '[Conciliação Excursão] ' || trim(p_description) || ' · Ref: #' || left(p_tour_id::TEXT, 8),
      p_actor_id
    ) RETURNING * INTO v_register_entry;

    UPDATE public.group_tour_cash_ledger
    SET central_cash_register_entry_id = v_register_entry.id
    WHERE id = v_cash.id;
    v_cash.central_cash_register_entry_id := v_register_entry.id;
  END IF;

  SELECT * INTO v_ledger
  FROM public.record_immutable_ledger_entry(
    v_transaction_type,
    p_amount_cents,
    0,
    NULL,
    NULL,
    p_store_id,
    NULL,
    'group_tour_cash_ledger',
    v_cash.id::TEXT,
    jsonb_build_object(
      'cash_entry_id', v_cash.id,
      'tour_id', p_tour_id,
      'category', trim(p_category),
      'payment_method', p_payment_method,
      'sync_with_central_cash', p_sync_with_central_cash,
      'central_cash_register_entry_id', CASE WHEN p_sync_with_central_cash THEN v_register_entry.id ELSE NULL END
    ),
     p_actor_id,
     v_effective_actor_role,
    NULL,
    NULL,
    NULL,
    NULL,
    'group-tour-cash:' || p_store_id::TEXT || ':' || v_idempotency_key
  );

  INSERT INTO public.forensic_audit_events (
    actor_id, actor_role, target_entity_type, target_entity_id, action, payload_snapshot, checksum_sha256
  ) VALUES (
     p_actor_id, v_effective_actor_role, 'group_tour_cash_ledger', v_cash.id::TEXT,
    'GROUP_TOUR_CASH_' || upper(p_entry_type),
    jsonb_build_object('tour_id', p_tour_id, 'amount_cents', p_amount_cents, 'ledger_id', v_ledger.id, 'idempotency_key', v_idempotency_key),
    v_ledger.entry_hash
  );

  RETURN jsonb_build_object('success', true, 'replayed', false, 'entry', to_jsonb(v_cash), 'ledger_id', v_ledger.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_group_tour_cash_entry(
  p_store_id UUID,
  p_entry_id UUID,
  p_reason TEXT,
  p_idempotency_key TEXT,
  p_actor_id UUID,
  p_actor_role TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_original public.group_tour_cash_ledger%ROWTYPE;
  v_reversal public.group_tour_cash_ledger%ROWTYPE;
  v_ledger public.financial_immutable_ledger%ROWTYPE;
  v_original_register_entry public.cash_register_entries%ROWTYPE;
  v_register public.cash_registers%ROWTYPE;
  v_reversal_register_entry public.cash_register_entries%ROWTYPE;
  v_effective_actor_role TEXT;
  v_idempotency_key TEXT := trim(p_idempotency_key);
BEGIN
  IF p_store_id IS NULL OR p_entry_id IS NULL OR p_actor_id IS NULL OR length(v_idempotency_key) < 16 THEN
    RAISE EXCEPTION 'Dados de estorno inválidos.';
  END IF;
  SELECT role::TEXT INTO v_effective_actor_role
  FROM public.profiles
  WHERE id = p_actor_id;
  IF v_effective_actor_role IS NULL THEN
    RAISE EXCEPTION 'Operador não possui perfil válido.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE store_id = p_store_id AND profile_id = p_actor_id AND role IN ('owner', 'admin', 'manager', 'finance')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_actor_id AND role IN ('admin', 'master', 'superadmin', 'platform_admin')
  ) THEN
    RAISE EXCEPTION 'Operador sem permissão financeira para esta loja.';
  END IF;

  SELECT * INTO v_original
  FROM public.group_tour_cash_ledger
  WHERE id = p_entry_id AND store_id = p_store_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lançamento não encontrado.'; END IF;

  IF v_original.reversal_of_id IS NOT NULL THEN
    RAISE EXCEPTION 'Um estorno não pode ser estornado novamente.';
  END IF;

  IF v_original.reversed_at IS NOT NULL THEN
    SELECT * INTO v_reversal FROM public.group_tour_cash_ledger WHERE reversal_of_id = v_original.id;
    RETURN jsonb_build_object('success', true, 'replayed', true, 'entry', to_jsonb(v_reversal));
  END IF;

  INSERT INTO public.group_tour_cash_ledger (
    tour_id, store_id, entry_type, category, description, amount_cents, payment_method,
    registered_by_profile_id, occurred_at, idempotency_key, reversal_of_id, reversal_reason
  ) VALUES (
    v_original.tour_id, v_original.store_id,
    CASE WHEN v_original.entry_type = 'inflow' THEN 'outflow' ELSE 'inflow' END,
    'reversal', 'Estorno: ' || v_original.description, v_original.amount_cents, v_original.payment_method,
    p_actor_id, now(), v_idempotency_key, v_original.id, NULLIF(trim(p_reason), '')
  ) RETURNING * INTO v_reversal;

  IF v_original.central_cash_register_entry_id IS NOT NULL THEN
    SELECT * INTO v_original_register_entry
    FROM public.cash_register_entries
    WHERE id = v_original.central_cash_register_entry_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lançamento correspondente no caixa central não foi encontrado.';
    END IF;
    IF v_original_register_entry.entry_type NOT IN ('in', 'out') THEN
      RAISE EXCEPTION 'Lançamento central incompatível com estorno de caixa de excursão.';
    END IF;

    SELECT * INTO v_register
    FROM public.cash_registers
    WHERE store_id = p_store_id AND status = 'open'
    ORDER BY opened_at DESC
    LIMIT 1
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Não existe caixa central aberto para registrar o estorno.';
    END IF;

    INSERT INTO public.cash_register_entries (
      cash_register_id, amount_cents, entry_type, payment_method, notes, created_by
    ) VALUES (
      v_register.id,
      v_original_register_entry.amount_cents,
      CASE v_original_register_entry.entry_type WHEN 'in' THEN 'out' ELSE 'in' END,
      v_original_register_entry.payment_method,
      '[Estorno Excursão] ' || trim(p_reason) || ' · Ref: #' || left(v_original.id::TEXT, 8),
      p_actor_id
    ) RETURNING * INTO v_reversal_register_entry;

    UPDATE public.group_tour_cash_ledger
    SET central_cash_register_entry_id = v_reversal_register_entry.id
    WHERE id = v_reversal.id;
    v_reversal.central_cash_register_entry_id := v_reversal_register_entry.id;
  END IF;

  SELECT * INTO v_ledger
  FROM public.record_immutable_ledger_entry(
    CASE WHEN v_original.entry_type = 'inflow' THEN 'group_tour_cash_reversal_outflow' ELSE 'group_tour_cash_reversal_inflow' END,
    v_original.amount_cents,
    0, NULL, NULL, p_store_id, NULL, 'group_tour_cash_ledger', v_reversal.id::TEXT,
    jsonb_build_object('reversal_of_id', v_original.id, 'reason', NULLIF(trim(p_reason), '')),
     p_actor_id, v_effective_actor_role, NULL, NULL, NULL, NULL,
    'group-tour-cash-reversal:' || p_store_id::TEXT || ':' || v_idempotency_key
  );

  UPDATE public.group_tour_cash_ledger
  SET reversed_at = now(), reversal_reason = NULLIF(trim(p_reason), '')
  WHERE id = v_original.id;

  INSERT INTO public.forensic_audit_events (
    actor_id, actor_role, target_entity_type, target_entity_id, action, payload_snapshot, checksum_sha256
  ) VALUES (
     p_actor_id, v_effective_actor_role, 'group_tour_cash_ledger', v_original.id::TEXT, 'GROUP_TOUR_CASH_REVERSAL',
    jsonb_build_object('reversal_id', v_reversal.id, 'ledger_id', v_ledger.id, 'reason', NULLIF(trim(p_reason), '')),
    v_ledger.entry_hash
  );

  RETURN jsonb_build_object('success', true, 'replayed', false, 'entry', to_jsonb(v_reversal), 'ledger_id', v_ledger.id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_group_tour_cash_entry(UUID, UUID, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_group_tour_cash_entry(UUID, UUID, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_group_tour_cash_entry(UUID, UUID, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_group_tour_cash_entry(UUID, UUID, TEXT, TEXT, UUID, TEXT) TO service_role;
