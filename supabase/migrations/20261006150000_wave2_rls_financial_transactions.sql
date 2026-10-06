-- ============================================================================
-- Onda 2: RLS deny-by-default e transações financeiras turísticas
-- ============================================================================

-- 1. Remover acesso direto público aos agregados sensíveis.
DROP POLICY IF EXISTS "Public travel proposal read by token" ON public.travel_proposals;
DROP POLICY IF EXISTS "Public travel contract read by token" ON public.travel_contracts;
DROP POLICY IF EXISTS "Public travel contract update signature by token" ON public.travel_contracts;
DROP POLICY IF EXISTS "Public read voucher by token" ON public.tourism_vouchers;

-- 2. Reconciliar políticas de staff com USING e WITH CHECK explícitos.
DROP POLICY IF EXISTS "Agency manage own travel proposals" ON public.travel_proposals;
DROP POLICY IF EXISTS "travel_proposals_staff_select" ON public.travel_proposals;
DROP POLICY IF EXISTS "travel_proposals_staff_insert" ON public.travel_proposals;
DROP POLICY IF EXISTS "travel_proposals_staff_update" ON public.travel_proposals;
DROP POLICY IF EXISTS "travel_proposals_staff_delete" ON public.travel_proposals;
CREATE POLICY "travel_proposals_staff_select"
  ON public.travel_proposals FOR SELECT TO authenticated
  USING (is_store_staff(store_id));
CREATE POLICY "travel_proposals_staff_insert"
  ON public.travel_proposals FOR INSERT TO authenticated
  WITH CHECK (is_store_staff(store_id));
CREATE POLICY "travel_proposals_staff_update"
  ON public.travel_proposals FOR UPDATE TO authenticated
  USING (is_store_staff(store_id))
  WITH CHECK (is_store_staff(store_id));
CREATE POLICY "travel_proposals_staff_delete"
  ON public.travel_proposals FOR DELETE TO authenticated
  USING (is_store_staff(store_id));

DROP POLICY IF EXISTS "Agency manage own travel contracts" ON public.travel_contracts;
DROP POLICY IF EXISTS "travel_contracts_staff_select" ON public.travel_contracts;
DROP POLICY IF EXISTS "travel_contracts_staff_insert" ON public.travel_contracts;
DROP POLICY IF EXISTS "travel_contracts_staff_update" ON public.travel_contracts;
DROP POLICY IF EXISTS "travel_contracts_staff_delete" ON public.travel_contracts;
CREATE POLICY "travel_contracts_staff_select"
  ON public.travel_contracts FOR SELECT TO authenticated
  USING (is_store_staff(store_id));
CREATE POLICY "travel_contracts_staff_insert"
  ON public.travel_contracts FOR INSERT TO authenticated
  WITH CHECK (is_store_staff(store_id));
CREATE POLICY "travel_contracts_staff_update"
  ON public.travel_contracts FOR UPDATE TO authenticated
  USING (is_store_staff(store_id))
  WITH CHECK (is_store_staff(store_id));
CREATE POLICY "travel_contracts_staff_delete"
  ON public.travel_contracts FOR DELETE TO authenticated
  USING (is_store_staff(store_id));

DROP POLICY IF EXISTS "Workspace members manage store tourism trips" ON public.tourism_trips;
DROP POLICY IF EXISTS "tourism_trips_staff_select" ON public.tourism_trips;
DROP POLICY IF EXISTS "tourism_trips_staff_insert" ON public.tourism_trips;
DROP POLICY IF EXISTS "tourism_trips_staff_update" ON public.tourism_trips;
DROP POLICY IF EXISTS "tourism_trips_staff_delete" ON public.tourism_trips;
CREATE POLICY "tourism_trips_staff_select"
  ON public.tourism_trips FOR SELECT TO authenticated
  USING (is_store_staff(store_id));
CREATE POLICY "tourism_trips_staff_insert"
  ON public.tourism_trips FOR INSERT TO authenticated
  WITH CHECK (is_store_staff(store_id));
CREATE POLICY "tourism_trips_staff_update"
  ON public.tourism_trips FOR UPDATE TO authenticated
  USING (is_store_staff(store_id))
  WITH CHECK (is_store_staff(store_id));
CREATE POLICY "tourism_trips_staff_delete"
  ON public.tourism_trips FOR DELETE TO authenticated
  USING (is_store_staff(store_id));

DROP POLICY IF EXISTS "Workspace members manage trip passengers" ON public.trip_passengers;
DROP POLICY IF EXISTS "trip_passengers_staff_select" ON public.trip_passengers;
DROP POLICY IF EXISTS "trip_passengers_staff_insert" ON public.trip_passengers;
DROP POLICY IF EXISTS "trip_passengers_staff_update" ON public.trip_passengers;
DROP POLICY IF EXISTS "trip_passengers_staff_delete" ON public.trip_passengers;
CREATE POLICY "trip_passengers_staff_select"
  ON public.trip_passengers FOR SELECT TO authenticated
  USING (is_store_staff(store_id));
CREATE POLICY "trip_passengers_staff_insert"
  ON public.trip_passengers FOR INSERT TO authenticated
  WITH CHECK (is_store_staff(store_id));
CREATE POLICY "trip_passengers_staff_update"
  ON public.trip_passengers FOR UPDATE TO authenticated
  USING (is_store_staff(store_id))
  WITH CHECK (is_store_staff(store_id));
CREATE POLICY "trip_passengers_staff_delete"
  ON public.trip_passengers FOR DELETE TO authenticated
  USING (is_store_staff(store_id));

DROP POLICY IF EXISTS "Workspace members manage trip confirmation items" ON public.trip_confirmation_items;
DROP POLICY IF EXISTS "trip_confirmation_items_staff_select" ON public.trip_confirmation_items;
DROP POLICY IF EXISTS "trip_confirmation_items_staff_insert" ON public.trip_confirmation_items;
DROP POLICY IF EXISTS "trip_confirmation_items_staff_update" ON public.trip_confirmation_items;
DROP POLICY IF EXISTS "trip_confirmation_items_staff_delete" ON public.trip_confirmation_items;
CREATE POLICY "trip_confirmation_items_staff_select"
  ON public.trip_confirmation_items FOR SELECT TO authenticated
  USING (is_store_staff(store_id));
CREATE POLICY "trip_confirmation_items_staff_insert"
  ON public.trip_confirmation_items FOR INSERT TO authenticated
  WITH CHECK (is_store_staff(store_id));
CREATE POLICY "trip_confirmation_items_staff_update"
  ON public.trip_confirmation_items FOR UPDATE TO authenticated
  USING (is_store_staff(store_id))
  WITH CHECK (is_store_staff(store_id));
CREATE POLICY "trip_confirmation_items_staff_delete"
  ON public.trip_confirmation_items FOR DELETE TO authenticated
  USING (is_store_staff(store_id));

DROP POLICY IF EXISTS "Workspace members manage tourism vouchers" ON public.tourism_vouchers;
DROP POLICY IF EXISTS "tourism_vouchers_staff_select" ON public.tourism_vouchers;
DROP POLICY IF EXISTS "tourism_vouchers_staff_insert" ON public.tourism_vouchers;
DROP POLICY IF EXISTS "tourism_vouchers_staff_update" ON public.tourism_vouchers;
DROP POLICY IF EXISTS "tourism_vouchers_staff_delete" ON public.tourism_vouchers;
CREATE POLICY "tourism_vouchers_staff_select"
  ON public.tourism_vouchers FOR SELECT TO authenticated
  USING (is_store_staff(store_id));
CREATE POLICY "tourism_vouchers_staff_insert"
  ON public.tourism_vouchers FOR INSERT TO authenticated
  WITH CHECK (is_store_staff(store_id));
CREATE POLICY "tourism_vouchers_staff_update"
  ON public.tourism_vouchers FOR UPDATE TO authenticated
  USING (is_store_staff(store_id))
  WITH CHECK (is_store_staff(store_id));
CREATE POLICY "tourism_vouchers_staff_delete"
  ON public.tourism_vouchers FOR DELETE TO authenticated
  USING (is_store_staff(store_id));

-- 3. Garantir RLS nos agregados canônicos da cadeia comercial.
ALTER TABLE public.travel_proposal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_timeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_proposal_acceptances_staff_all" ON public.travel_proposal_acceptances;
CREATE POLICY "travel_proposal_acceptances_staff_all"
  ON public.travel_proposal_acceptances FOR ALL TO authenticated
  USING (is_store_staff(store_id))
  WITH CHECK (is_store_staff(store_id));

DROP POLICY IF EXISTS "travel_sales_staff_all" ON public.travel_sales;
CREATE POLICY "travel_sales_staff_all"
  ON public.travel_sales FOR ALL TO authenticated
  USING (is_store_staff(store_id))
  WITH CHECK (is_store_staff(store_id));

DROP POLICY IF EXISTS "travel_timeline_events_staff_all" ON public.travel_timeline_events;
CREATE POLICY "travel_timeline_events_staff_all"
  ON public.travel_timeline_events FOR ALL TO authenticated
  USING (is_store_staff(store_id))
  WITH CHECK (is_store_staff(store_id));

-- 4. Agregado financeiro de pagamentos turísticos.
CREATE TABLE IF NOT EXISTS public.travel_sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.travel_sales(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'card', 'boleto', 'cash', 'transfer', 'other')),
  external_reference TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  idempotency_key TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_travel_sale_payments_sale
  ON public.travel_sale_payments(store_id, sale_id, created_at DESC);

ALTER TABLE public.travel_sale_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "travel_sale_payments_staff_all" ON public.travel_sale_payments;
CREATE POLICY "travel_sale_payments_staff_all"
  ON public.travel_sale_payments FOR ALL TO authenticated
  USING (is_store_staff(store_id))
  WITH CHECK (is_store_staff(store_id));

-- 5. Serializar o hash-chain global e tornar replay idempotente.
CREATE OR REPLACE FUNCTION public.record_immutable_ledger_entry(
    p_transaction_type text,
    p_amount_cents bigint DEFAULT 0,
    p_token_amount bigint DEFAULT 0,
    p_sender_id uuid DEFAULT NULL,
    p_receiver_id uuid DEFAULT NULL,
    p_store_id uuid DEFAULT NULL,
    p_organization_id uuid DEFAULT NULL,
    p_reference_entity_type text DEFAULT NULL,
    p_reference_entity_id text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_actor_id uuid DEFAULT NULL,
    p_actor_role text DEFAULT 'authenticated_user',
    p_ip_address text DEFAULT NULL,
    p_user_agent text DEFAULT NULL,
    p_geo_country text DEFAULT NULL,
    p_geo_city text DEFAULT NULL,
    p_idempotency_key text DEFAULT NULL
)
RETURNS public.financial_immutable_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_last_hash text;
    v_new_hash text;
    v_entry public.financial_immutable_ledger;
    v_previous public.financial_immutable_ledger;
    v_payload_string text;
    v_now timestamptz := now();
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('financial-ledger-global'));

    IF p_idempotency_key IS NOT NULL THEN
      SELECT * INTO v_previous
      FROM public.financial_immutable_ledger
      WHERE idempotency_key = p_idempotency_key;
      IF FOUND THEN RETURN v_previous; END IF;
    END IF;

    SELECT entry_hash INTO v_last_hash
    FROM public.financial_immutable_ledger
    ORDER BY sequence_number DESC
    LIMIT 1;

    IF v_last_hash IS NULL THEN
        v_last_hash := repeat('0', 64);
    END IF;

    v_payload_string := v_last_hash || '|' ||
                        p_transaction_type || '|' ||
                        COALESCE(p_amount_cents::text, '0') || '|' ||
                        COALESCE(p_token_amount::text, '0') || '|' ||
                        COALESCE(p_sender_id::text, '') || '|' ||
                        COALESCE(p_receiver_id::text, '') || '|' ||
                        COALESCE(p_store_id::text, '') || '|' ||
                        COALESCE(p_reference_entity_id::text, '') || '|' ||
                        COALESCE(p_idempotency_key, '') || '|' ||
                        v_now::text;

    v_new_hash := encode(digest(v_payload_string, 'sha256'), 'hex');

    INSERT INTO public.financial_immutable_ledger (
        prev_hash, entry_hash, transaction_type, amount_cents, token_amount,
        sender_id, receiver_id, store_id, organization_id, reference_entity_type,
        reference_entity_id, metadata, actor_id, actor_role, ip_address, user_agent,
        geo_country, geo_city, idempotency_key, created_at
    ) VALUES (
        v_last_hash, v_new_hash, p_transaction_type, COALESCE(p_amount_cents, 0),
        COALESCE(p_token_amount, 0), p_sender_id, p_receiver_id, p_store_id,
        p_organization_id, p_reference_entity_type, p_reference_entity_id,
        COALESCE(p_metadata, '{}'::jsonb), p_actor_id, COALESCE(p_actor_role, 'authenticated_user'),
        p_ip_address, p_user_agent, p_geo_country, p_geo_city, p_idempotency_key, v_now
    ) RETURNING * INTO v_entry;

    RETURN v_entry;
END;
$$;

-- 6. RPC única: pagamento + ledger + timeline.
CREATE OR REPLACE FUNCTION public.record_travel_sale_payment(
  p_sale_id UUID,
  p_amount_cents BIGINT,
  p_payment_method TEXT,
  p_idempotency_key TEXT,
  p_external_reference TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_sale public.travel_sales%ROWTYPE;
  v_payment public.travel_sale_payments%ROWTYPE;
  v_ledger public.financial_immutable_ledger%ROWTYPE;
  v_actor UUID := auth.uid();
BEGIN
  IF p_amount_cents <= 0 THEN RAISE EXCEPTION 'Valor de pagamento inválido.'; END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 8 THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.';
  END IF;

  SELECT * INTO v_sale
  FROM public.travel_sales
  WHERE id = p_sale_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda turística não encontrada.'; END IF;

  SELECT * INTO v_payment
  FROM public.travel_sale_payments
  WHERE store_id = v_sale.store_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'replayed', true, 'payment_id', v_payment.id, 'sale_id', v_sale.id);
  END IF;

  INSERT INTO public.travel_sale_payments (
    store_id, sale_id, amount_cents, payment_method, external_reference,
    status, idempotency_key, metadata, created_by_profile_id
  ) VALUES (
    v_sale.store_id, v_sale.id, p_amount_cents, p_payment_method, p_external_reference,
    'confirmed', p_idempotency_key, COALESCE(p_metadata, '{}'::jsonb), v_actor
  ) RETURNING * INTO v_payment;

  SELECT * INTO v_ledger
  FROM public.record_immutable_ledger_entry(
    'travel_sale_payment', p_amount_cents, 0, NULL, NULL, v_sale.store_id, NULL,
    'travel_sale', v_sale.id::text,
    jsonb_build_object('payment_id', v_payment.id, 'payment_method', p_payment_method),
    v_actor, 'finance', NULL, NULL, NULL, NULL,
    'travel-sale-payment:' || v_sale.store_id::text || ':' || p_idempotency_key
  );

  INSERT INTO public.travel_timeline_events (
    store_id, proposal_id, sale_id, trip_id, event_type, actor_profile_id,
    correlation_id, payload
  ) VALUES (
    v_sale.store_id, v_sale.proposal_id, v_sale.id, v_sale.trip_id,
    'travel_sale.payment_confirmed', v_actor, p_idempotency_key,
    jsonb_build_object('payment_id', v_payment.id, 'amount_cents', p_amount_cents, 'ledger_id', v_ledger.id)
  );

  RETURN jsonb_build_object(
    'success', true, 'replayed', false, 'payment_id', v_payment.id,
    'ledger_id', v_ledger.id, 'sale_id', v_sale.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_travel_sale_payment(UUID, BIGINT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_travel_sale_payment(UUID, BIGINT, TEXT, TEXT, TEXT, JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_travel_sale_payment(UUID, BIGINT, TEXT, TEXT, TEXT, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.record_immutable_ledger_entry(TEXT, BIGINT, BIGINT, UUID, UUID, UUID, UUID, TEXT, TEXT, JSONB, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_immutable_ledger_entry(TEXT, BIGINT, BIGINT, UUID, UUID, UUID, UUID, TEXT, TEXT, JSONB, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
