-- Waesy P0 — staff-only conversion of an accepted travel proposal.
-- Acceptance is public and evidence-bound; conversion is an operational staff action.
-- No payment, reservation confirmation, supplier booking, or voucher is created here.

ALTER TABLE public.tourism_trips
  DROP CONSTRAINT IF EXISTS tourism_trips_status_check;
ALTER TABLE public.tourism_trips
  ADD CONSTRAINT tourism_trips_status_check
  CHECK (status IN ('pending_review', 'confirmed', 'in_progress', 'completed', 'cancelled'));

CREATE OR REPLACE FUNCTION public.convert_accepted_travel_proposal_staff(
  p_proposal_id UUID,
  p_store_id UUID,
  p_actor_profile_id UUID,
  p_idempotency_key TEXT,
  p_lead_passenger JSONB DEFAULT NULL,
  p_additional_passengers JSONB DEFAULT '[]'::jsonb,
  p_payment_details JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
SET row_security = off
AS $$
DECLARE
  v_proposal public.travel_proposals%ROWTYPE;
  v_acceptance public.travel_proposal_acceptances%ROWTYPE;
  v_sale public.travel_sales%ROWTYPE;
  v_manifest JSONB;
  v_passenger JSONB;
  v_passenger_index INTEGER := 0;
  v_snapshot JSONB;
  v_price_text TEXT;
  v_option_name TEXT;
  v_total_cents BIGINT;
  v_name TEXT;
  v_document TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_trip_id UUID;
  v_trip_number TEXT;
  v_contract_result JSONB;
  v_contract_id UUID;
  v_contract_token TEXT;
  v_sale_id UUID;
  v_correlation_id TEXT;
BEGIN
  IF p_proposal_id IS NULL OR p_store_id IS NULL OR p_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Proposta, loja e ator são obrigatórios.' USING ERRCODE = '22023';
  END IF;
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 OR length(p_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Chave de idempotência inválida.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.workspace_members AS wm
     WHERE wm.profile_id = p_actor_profile_id
       AND wm.store_id = p_store_id
       AND wm.role IN ('owner', 'store_owner', 'proprietario', 'admin', 'manager', 'gerente', 'seller', 'finance', 'content', 'support', 'stock')
  ) THEN
    RAISE EXCEPTION 'Ator não possui membership staff ativo nesta loja.' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('travel-staff-convert:' || p_store_id::TEXT || ':' || p_proposal_id::TEXT));

  SELECT tp.* INTO v_proposal
    FROM public.travel_proposals AS tp
   WHERE tp.id = p_proposal_id
     AND tp.store_id = p_store_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta não encontrada nesta loja.' USING ERRCODE = 'P0002';
  END IF;

  SELECT ts.* INTO v_sale
    FROM public.travel_sales AS ts
   WHERE ts.store_id = p_store_id
     AND ts.proposal_id = p_proposal_id
   LIMIT 1;
  IF FOUND THEN
    SELECT c.id, c.verification_code
      INTO v_contract_id, v_contract_token
      FROM public.contracts AS c
     WHERE c.category = 'tourism'
       AND c.metadata ->> 'store_id' = p_store_id::TEXT
       AND c.metadata ->> 'proposal_id' = p_proposal_id::TEXT
       AND c.metadata ->> 'acceptance_id' = v_sale.acceptance_id::TEXT
     ORDER BY c.created_at DESC
     LIMIT 1;
    RETURN jsonb_build_object(
      'success', TRUE,
      'replayed', TRUE,
      'trip_id', v_sale.trip_id,
      'trip_number', NULL,
      'trip_status', 'pending_review',
      'payment_status', v_sale.status,
      'contract_id', v_contract_id,
      'voucher_id', NULL,
      'voucher_token', NULL,
      'contract_public_token', v_contract_token
    );
  END IF;

  IF v_proposal.status <> 'approved'
     OR v_proposal.acceptance_status <> 'accepted'
     OR v_proposal.snapshot_hash IS NULL THEN
    RAISE EXCEPTION 'A proposta precisa ter aceite válido antes da conversão.' USING ERRCODE = '55000';
  END IF;

  v_snapshot := public.travel_proposal_snapshot_payload(v_proposal);
  IF public.travel_proposal_snapshot_hash(v_snapshot) IS DISTINCT FROM v_proposal.snapshot_hash THEN
    RAISE EXCEPTION 'O snapshot da proposta mudou; revise o aceite antes da conversão.' USING ERRCODE = '55000';
  END IF;

  SELECT a.* INTO v_acceptance
    FROM public.travel_proposal_acceptances AS a
   WHERE a.store_id = p_store_id
     AND a.proposal_id = p_proposal_id
     AND a.status = 'accepted'
     AND a.proposal_snapshot_hash = v_proposal.snapshot_hash
   FOR UPDATE;
  IF NOT FOUND OR v_acceptance.acceptance_fingerprint IS NULL THEN
    RAISE EXCEPTION 'Aceite vigente e verificável não encontrado para esta proposta.' USING ERRCODE = '55000';
  END IF;

  v_manifest := v_acceptance.passenger_manifest;
  IF jsonb_typeof(v_manifest) <> 'array' OR jsonb_array_length(v_manifest) < 1 OR jsonb_array_length(v_manifest) > 40 THEN
    RAISE EXCEPTION 'O manifesto persistido no aceite é inválido.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(COALESCE(v_proposal.options, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'As opções persistidas da proposta são inválidas.' USING ERRCODE = '55000';
  END IF;

  IF jsonb_array_length(COALESCE(v_proposal.options, '[]'::jsonb)) > 0 THEN
    IF v_acceptance.selected_option_id IS NULL OR NOT EXISTS (
      SELECT 1
        FROM jsonb_array_elements(v_proposal.options) AS option_row(option)
       WHERE option ->> 'id' = v_acceptance.selected_option_id
    ) THEN
      RAISE EXCEPTION 'A opção aceita não existe mais no snapshot persistido.' USING ERRCODE = '55000';
    END IF;
    SELECT COALESCE(option -> 'pricing' ->> 'total_price_cents', option ->> 'total_price_cents'),
           COALESCE(option ->> 'name', option ->> 'title', option ->> 'id')
      INTO v_price_text, v_option_name
      FROM jsonb_array_elements(v_proposal.options) AS option_row(option)
     WHERE option ->> 'id' = v_acceptance.selected_option_id
     LIMIT 1;
  ELSE
    IF v_acceptance.selected_option_id IS NOT NULL THEN
      RAISE EXCEPTION 'O aceite referencia uma opção ausente no snapshot.' USING ERRCODE = '55000';
    END IF;
    v_price_text := v_proposal.pricing ->> 'total_price_cents';
  END IF;
  v_price_text := COALESCE(v_price_text, v_proposal.pricing ->> 'total_cents', '0');
  IF v_price_text !~ '^[0-9]{1,15}$' THEN
    RAISE EXCEPTION 'O valor da proposta aceita não é válido.' USING ERRCODE = '22023';
  END IF;
  v_total_cents := v_price_text::BIGINT;

  v_passenger := v_manifest -> 0;
  v_name := COALESCE(NULLIF(btrim(v_passenger ->> 'name'), ''), NULLIF(btrim(v_proposal.client_name), ''), 'Passageiro Principal');
  v_document := NULLIF(regexp_replace(COALESCE(v_passenger ->> 'document', ''), '[^0-9]', '', 'g'), '');
  v_email := COALESCE(NULLIF(lower(btrim(v_passenger ->> 'email')), ''), v_proposal.client_email);
  v_phone := COALESCE(NULLIF(btrim(v_passenger ->> 'phone'), ''), v_proposal.client_whatsapp, '');
  v_trip_number := 'VIAGEM-' || to_char(now(), 'YYYY') || '-' || upper(replace(left(extensions.gen_random_uuid()::TEXT, 13), '-', ''));
  v_correlation_id := btrim(p_idempotency_key);

  INSERT INTO public.tourism_trips (
    store_id, created_by_profile_id, source_proposal_id, trip_number, title, destination_city,
    travel_start_date, travel_end_date, adults_count, children_count, currency, total_cents,
    status, client_name, client_whatsapp, client_email, client_document, cover_image_url,
    flights, hotels, transfers, tours, insurance, itinerary, rooms, includes, excludes, notes
  ) VALUES (
    p_store_id, p_actor_profile_id, v_proposal.id, v_trip_number, v_proposal.title,
    COALESCE(NULLIF(v_proposal.destination_city, ''), 'Destino não informado'),
    v_proposal.travel_start_date, v_proposal.travel_end_date, v_proposal.adults_count,
    v_proposal.children_count, COALESCE(v_proposal.pricing ->> 'currency', 'BRL'), v_total_cents,
    'pending_review', v_name, v_phone, v_email, v_document, v_proposal.hero_image_url,
    COALESCE(v_proposal.flights, '[]'::jsonb), COALESCE(v_proposal.hotels, '[]'::jsonb),
    COALESCE(v_proposal.transfers, '[]'::jsonb), COALESCE(v_proposal.tours, '[]'::jsonb),
    '{}'::jsonb, COALESCE(v_proposal.itinerary, '[]'::jsonb), COALESCE(v_proposal.rooms, '[]'::jsonb),
    COALESCE(v_proposal.includes, ARRAY[]::TEXT[]), COALESCE(v_proposal.excludes, ARRAY[]::TEXT[]),
    'Aceite recebido; aguardando revisão operacional. Nenhuma reserva, pagamento ou voucher confirmado.'
  ) RETURNING id INTO v_trip_id;

  FOR v_passenger IN SELECT value FROM jsonb_array_elements(v_manifest) LOOP
    INSERT INTO public.trip_passengers (
      trip_id, store_id, full_name, document, birth_date, email, phone, is_lead_passenger
    ) VALUES (
      v_trip_id, p_store_id,
      COALESCE(NULLIF(btrim(v_passenger ->> 'name'), ''), 'Passageiro não identificado'),
      NULLIF(regexp_replace(COALESCE(v_passenger ->> 'document', ''), '[^0-9]', '', 'g'), ''),
      NULLIF(v_passenger ->> 'birthDate', '')::DATE,
      NULLIF(lower(btrim(v_passenger ->> 'email')), ''),
      NULLIF(btrim(v_passenger ->> 'phone'), ''),
      v_passenger_index = 0
    );
    v_passenger_index := v_passenger_index + 1;
  END LOOP;

  -- The helper revalidates membership, snapshot, acceptance, option and manifest.
  -- It creates the contract in the same transaction; it is changed to draft below
  -- so the public signature surface stays closed until operational review.
  v_contract_result := public.create_staff_travel_contract_from_proposal(
    p_proposal_id, p_store_id, p_actor_profile_id, v_document
  );
  IF COALESCE((v_contract_result ->> 'success')::BOOLEAN, FALSE) IS NOT TRUE
     OR NULLIF(v_contract_result ->> 'contract_id', '') IS NULL THEN
    RAISE EXCEPTION 'Contrato de revisão não foi criado; conversão cancelada.' USING ERRCODE = '55000';
  END IF;
  v_contract_id := (v_contract_result ->> 'contract_id')::UUID;
  v_contract_token := v_contract_result ->> 'public_token';
  UPDATE public.contracts
     SET status = 'draft', updated_at = now()
   WHERE id = v_contract_id
     AND creator_id = p_actor_profile_id
     AND metadata ->> 'store_id' = p_store_id::TEXT
     AND metadata ->> 'proposal_id' = p_proposal_id::TEXT;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato criado fora do tenant esperado; conversão cancelada.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.travel_sales (
    store_id, proposal_id, acceptance_id, budget_id, trip_id, status, currency, total_cents,
    idempotency_key, created_by_profile_id
  ) VALUES (
    p_store_id, p_proposal_id, v_acceptance.id, v_proposal.budget_id, v_trip_id, 'pending',
    COALESCE(v_proposal.pricing ->> 'currency', 'BRL'), v_total_cents, v_correlation_id, p_actor_profile_id
  ) RETURNING id INTO v_sale_id;

  UPDATE public.travel_proposals
     SET canonical_status = 'converted', updated_at = now()
   WHERE id = p_proposal_id AND store_id = p_store_id;

  INSERT INTO public.travel_timeline_events (
    store_id, proposal_id, budget_id, sale_id, trip_id, actor_profile_id, event_type, correlation_id, payload
  ) VALUES (
    p_store_id, p_proposal_id, v_proposal.budget_id, v_sale_id, v_trip_id, p_actor_profile_id,
    'proposal.converted_to_trip', v_correlation_id,
    jsonb_build_object(
      'acceptance_id', v_acceptance.id,
      'contract_id', v_contract_id,
      'selected_option_id', v_acceptance.selected_option_id,
      'option_name', v_option_name,
      'payment_preference', v_acceptance.payment_preference,
      'payment_installments', v_acceptance.payment_installments,
      'payment_status', 'pending',
      'voucher_status', 'not_created'
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'replayed', FALSE,
    'trip_id', v_trip_id,
    'trip_number', v_trip_number,
    'trip_status', 'pending_review',
    'payment_status', 'pending',
    'contract_id', v_contract_id,
    'contract_public_token', v_contract_token,
    'voucher_id', NULL,
    'voucher_token', NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.convert_accepted_travel_proposal_staff(UUID, UUID, UUID, TEXT, JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_accepted_travel_proposal_staff(UUID, UUID, UUID, TEXT, JSONB, JSONB, JSONB) TO service_role;
