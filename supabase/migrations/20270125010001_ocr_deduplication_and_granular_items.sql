-- Migration: 20270125000001_ocr_deduplication_and_granular_items.sql
-- Descrição:
-- 1. Corrige duplicação 2x de transfers e tours em apply_operator_voucher_atomic quando p_trip_id IS NULL ou em múltiplos vouchers, e mescla passageiros sem sobrescrever.
-- 2. Torna apply_travel_ocr_to_draft 100% idempotente, deduplica leads em leads_crm por email/telefone e popula travel_budget_items de forma granular (voos, hotéis, transfers e passeios).

CREATE OR REPLACE FUNCTION public.apply_operator_voucher_atomic(
  p_store_id UUID,
  p_actor_profile_id UUID,
  p_trip_id UUID DEFAULT NULL,
  p_ingestion_id UUID DEFAULT NULL,
  p_parsed_data JSONB DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
SET row_security = off
AS $$
DECLARE
  v_identity_ok BOOLEAN;
  v_trip public.tourism_trips%ROWTYPE;
  v_ingestion public.travel_document_ingestions%ROWTYPE;
  v_operation public.travel_voucher_apply_operations%ROWTYPE;
  v_payload JSONB;
  v_item JSONB;
  v_pax JSONB;
  v_hotel JSONB;
  v_transfer JSONB;
  v_tour JSONB;
  v_merged_flights JSONB;
  v_merged_hotels JSONB;
  v_merged_transfers JSONB;
  v_merged_tours JSONB;
  v_merged_passengers JSONB;
  v_trip_id UUID := p_trip_id;
  v_trip_number TEXT;
  v_voucher_id UUID;
  v_voucher_token TEXT;
  v_voucher_code TEXT;
  v_result JSONB;
  v_operation_key TEXT;
  v_existing_pax_id UUID;
  v_existing_voucher public.tourism_vouchers%ROWTYPE;
  v_existing_item_id UUID;
BEGIN
  IF p_store_id IS NULL OR p_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Agência e operador são obrigatórios.' USING ERRCODE = '22023';
  END IF;
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 OR length(btrim(p_idempotency_key)) > 240 THEN
    RAISE EXCEPTION 'Chave de idempotência inválida.' USING ERRCODE = '22023';
  END IF;
  IF p_ingestion_id IS NULL AND p_parsed_data IS NULL THEN
    RAISE EXCEPTION 'Documento OCR ou dados estruturados são obrigatórios.' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.workspace_members AS wm
     WHERE wm.profile_id = p_actor_profile_id
       AND wm.store_id = p_store_id
       AND wm.role <> 'customer'
  ) INTO v_identity_ok;
  IF NOT v_identity_ok THEN
    RAISE EXCEPTION 'Operador não possui membership staff ativo nesta agência.' USING ERRCODE = '42501';
  END IF;

  v_operation_key := btrim(p_idempotency_key);
  PERFORM pg_advisory_xact_lock(hashtext('travel-voucher-apply:' || p_store_id::TEXT || ':' || v_operation_key));

  SELECT * INTO v_operation
    FROM public.travel_voucher_apply_operations
   WHERE store_id = p_store_id
     AND idempotency_key = v_operation_key
   FOR UPDATE;
  IF FOUND AND v_operation.result IS NOT NULL THEN
    RETURN v_operation.result || jsonb_build_object('replayed', TRUE);
  END IF;
  IF NOT FOUND THEN
    INSERT INTO public.travel_voucher_apply_operations (store_id, idempotency_key, ingestion_id, trip_id)
    VALUES (p_store_id, v_operation_key, p_ingestion_id, p_trip_id)
    RETURNING * INTO v_operation;
  END IF;

  IF p_ingestion_id IS NOT NULL THEN
    SELECT * INTO v_ingestion
      FROM public.travel_document_ingestions
     WHERE id = p_ingestion_id
       AND store_id = p_store_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Documento OCR não encontrado nesta agência.' USING ERRCODE = 'P0002';
    END IF;
    IF v_ingestion.source_kind = 'operator_quote' THEN
      RAISE EXCEPTION 'Cotações devem ser aplicadas como draft, não como voucher.' USING ERRCODE = '55000';
    END IF;
    IF v_ingestion.extraction_status = 'applied' AND v_ingestion.trip_id = p_trip_id THEN
      SELECT tv.id, tv.public_token INTO v_voucher_id, v_voucher_token
        FROM public.tourism_vouchers AS tv
       WHERE tv.trip_id = p_trip_id
         AND tv.store_id = p_store_id
       ORDER BY tv.updated_at DESC
       LIMIT 1;
      v_result := jsonb_build_object(
        'success', TRUE, 'replayed', TRUE, 'trip_id', p_trip_id,
        'trip_number', NULL, 'voucher_id', v_voucher_id,
        'voucher_token', v_voucher_token,
        'voucher_url', CASE WHEN v_voucher_token IS NULL THEN NULL ELSE '/voucher/' || v_voucher_token END
      );
      UPDATE public.travel_voucher_apply_operations
         SET result = v_result, trip_id = p_trip_id, updated_at = now()
       WHERE id = v_operation.id;
      RETURN v_result;
    END IF;
    IF v_ingestion.extraction_status NOT IN ('needs_review', 'approved') THEN
      RAISE EXCEPTION 'O documento precisa estar aguardando revisão antes da aplicação.' USING ERRCODE = '55000';
    END IF;
    v_payload := v_ingestion.extraction;
  ELSE
    v_payload := p_parsed_data;
  END IF;

  IF p_trip_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.travel_document_conflicts AS c
     WHERE c.store_id = p_store_id
       AND c.trip_id = p_trip_id
       AND c.severity = 'critical'
       AND c.status IN ('open', 'suggested')
  ) THEN
    RAISE EXCEPTION 'Aplicação bloqueada: existem conflitos críticos não resolvidos.' USING ERRCODE = '55000';
  END IF;

  IF p_trip_id IS NOT NULL THEN
    SELECT * INTO v_trip
      FROM public.tourism_trips
     WHERE id = p_trip_id
       AND store_id = p_store_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Viagem não encontrada nesta agência.' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    v_trip_number := 'TRIP-' || to_char(now(), 'YYYY') || '-' || upper(replace(left(extensions.gen_random_uuid()::TEXT, 13), '-', ''));
    INSERT INTO public.tourism_trips (
      store_id, created_by_profile_id, trip_number, title, destination_city,
      travel_start_date, travel_end_date, adults_count, children_count, currency,
      total_cents, status, client_name, client_whatsapp, client_document,
      operator_name, operator_contacts, tariff_rules, payment_method,
      installments_count, financial_details, flights, hotels, transfers, tours,
      insurance, itinerary, rooms, includes, excludes, notes
    ) VALUES (
      p_store_id, p_actor_profile_id, v_trip_number,
      COALESCE(NULLIF(v_payload ->> 'trip_title', ''), 'Viagem para ' || COALESCE(NULLIF(v_payload ->> 'destination_city', ''), 'Destino não informado')),
      COALESCE(NULLIF(v_payload ->> 'destination_city', ''), 'Destino não informado'),
      NULLIF(v_payload ->> 'travel_start_date', '')::DATE,
      NULLIF(v_payload ->> 'travel_end_date', '')::DATE,
      GREATEST(COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(v_payload -> 'passengers') = 'array' THEN v_payload -> 'passengers' ELSE '[]'::jsonb END), 0), 1),
      0, COALESCE(NULLIF(v_payload -> 'financial_details' ->> 'currency', ''), 'BRL'),
      GREATEST(COALESCE((v_payload -> 'financial_details' ->> 'total_amount_cents')::BIGINT, 0), 0),
      'confirmed', COALESCE(NULLIF(v_payload ->> 'client_name', ''), 'Passageiro titular'),
      COALESCE(v_payload ->> 'client_whatsapp', ''), NULLIF(v_payload ->> 'client_document', ''),
      NULLIF(v_payload ->> 'operator_name', ''), COALESCE(v_payload -> 'operator_contacts', '{}'::jsonb),
      COALESCE(v_payload -> 'tariff_rules', '{}'::jsonb), NULLIF(v_payload -> 'financial_details' ->> 'payment_method', ''),
      COALESCE((v_payload -> 'financial_details' ->> 'installments_count')::INTEGER, 1),
      COALESCE(v_payload -> 'financial_details', '{}'::jsonb),
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      COALESCE(v_payload -> 'insurance', '{}'::jsonb), '[]'::jsonb, '[]'::jsonb, '{}', '{}',
      NULLIF(v_payload ->> 'observations', '')
    ) RETURNING * INTO v_trip;
    v_trip_id := v_trip.id;
  END IF;

  -- Mesclagem sem duplicação de voos
  v_merged_flights := COALESCE(v_trip.flights, '[]'::jsonb);
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'flights', '[]'::jsonb)) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_merged_flights) AS existing(value)
       WHERE (NULLIF(existing.value ->> 'locator', '') IS NOT NULL AND existing.value ->> 'locator' = v_item ->> 'locator' AND COALESCE(existing.value ->> 'flight_number', '') = COALESCE(v_item ->> 'flight_number', ''))
          OR (NULLIF(existing.value ->> 'flight_number', '') IS NOT NULL AND existing.value ->> 'flight_number' = v_item ->> 'flight_number' AND COALESCE(existing.value ->> 'date', '') = COALESCE(v_item ->> 'date', ''))
    ) THEN
      v_merged_flights := v_merged_flights || jsonb_build_array(v_item);
    END IF;
  END LOOP;

  -- Mesclagem sem duplicação de hotéis
  v_merged_hotels := COALESCE(v_trip.hotels, '[]'::jsonb);
  FOR v_hotel IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'hotels', '[]'::jsonb)) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_merged_hotels) AS existing(value)
       WHERE lower(COALESCE(existing.value ->> 'name', '')) <> ''
         AND lower(existing.value ->> 'name') = lower(COALESCE(v_hotel ->> 'name', ''))
         AND COALESCE(existing.value ->> 'checkin', '') = COALESCE(v_hotel ->> 'checkin', '')
    ) THEN
      v_merged_hotels := v_merged_hotels || jsonb_build_array(v_hotel);
    END IF;
  END LOOP;

  -- Mesclagem sem duplicação de transfers
  v_merged_transfers := COALESCE(v_trip.transfers, '[]'::jsonb);
  FOR v_transfer IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'transfers', '[]'::jsonb)) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_merged_transfers) AS existing(value)
       WHERE (NULLIF(existing.value ->> 'confirmation', '') IS NOT NULL AND existing.value ->> 'confirmation' = v_transfer ->> 'confirmation')
          OR (
            lower(COALESCE(existing.value ->> 'type', '')) = lower(COALESCE(v_transfer ->> 'type', ''))
            AND COALESCE(existing.value ->> 'date', '') = COALESCE(v_transfer ->> 'date', '')
            AND lower(COALESCE(existing.value ->> 'origin', '')) = lower(COALESCE(v_transfer ->> 'origin', ''))
            AND lower(COALESCE(existing.value ->> 'destination', '')) = lower(COALESCE(v_transfer ->> 'destination', ''))
          )
    ) THEN
      v_merged_transfers := v_merged_transfers || jsonb_build_array(v_transfer);
    END IF;
  END LOOP;

  -- Mesclagem sem duplicação de passeios/tours
  v_merged_tours := COALESCE(v_trip.tours, '[]'::jsonb);
  FOR v_tour IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'tours', '[]'::jsonb)) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_merged_tours) AS existing(value)
       WHERE lower(COALESCE(existing.value ->> 'title', '')) <> ''
         AND lower(existing.value ->> 'title') = lower(COALESCE(v_tour ->> 'title', ''))
         AND COALESCE(existing.value ->> 'date', '') = COALESCE(v_tour ->> 'date', '')
    ) THEN
      v_merged_tours := v_merged_tours || jsonb_build_array(v_tour);
    END IF;
  END LOOP;

  UPDATE public.tourism_trips
     SET destination_city = COALESCE(NULLIF(v_trip.destination_city, ''), NULLIF(v_payload ->> 'destination_city', ''), v_trip.destination_city),
         travel_start_date = COALESCE(NULLIF(v_payload ->> 'travel_start_date', '')::DATE, v_trip.travel_start_date),
         travel_end_date = COALESCE(NULLIF(v_payload ->> 'travel_end_date', '')::DATE, v_trip.travel_end_date),
         operator_name = COALESCE(NULLIF(v_payload ->> 'operator_name', ''), v_trip.operator_name),
         operator_contacts = COALESCE(v_payload -> 'operator_contacts', v_trip.operator_contacts, '{}'::jsonb),
         tariff_rules = COALESCE(v_payload -> 'tariff_rules', v_trip.tariff_rules, '{}'::jsonb),
         payment_method = COALESCE(NULLIF(v_payload -> 'financial_details' ->> 'payment_method', ''), v_trip.payment_method),
         installments_count = COALESCE((v_payload -> 'financial_details' ->> 'installments_count')::INTEGER, v_trip.installments_count, 1),
         financial_details = COALESCE(v_payload -> 'financial_details', v_trip.financial_details, '{}'::jsonb),
         total_cents = CASE WHEN v_trip.total_cents > 0 THEN v_trip.total_cents ELSE GREATEST(COALESCE((v_payload -> 'financial_details' ->> 'total_amount_cents')::BIGINT, 0), 0) END,
         flights = v_merged_flights, hotels = v_merged_hotels, transfers = v_merged_transfers, tours = v_merged_tours,
         insurance = COALESCE(v_payload -> 'insurance', v_trip.insurance, '{}'::jsonb),
         notes = COALESCE(NULLIF(v_payload ->> 'observations', ''), v_trip.notes), updated_at = now()
   WHERE id = v_trip_id AND store_id = p_store_id;

  FOR v_pax IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'passengers', '[]'::jsonb)) LOOP
    IF NULLIF(btrim(v_pax ->> 'name'), '') IS NULL THEN CONTINUE; END IF;
    SELECT tp.id INTO v_existing_pax_id
      FROM public.trip_passengers AS tp
     WHERE tp.trip_id = v_trip_id AND tp.store_id = p_store_id
       AND lower(btrim(tp.full_name)) = lower(btrim(v_pax ->> 'name'))
     LIMIT 1;
    IF v_existing_pax_id IS NULL THEN
      INSERT INTO public.trip_passengers (
        trip_id, store_id, full_name, document_type, document, document_expiry,
        nationality, birth_date, seat_number, is_lead_passenger, documents_metadata
      ) VALUES (
        v_trip_id, p_store_id, btrim(v_pax ->> 'name'), COALESCE(NULLIF(v_pax ->> 'document_type', ''), 'rg'),
        NULLIF(v_pax ->> 'document', ''), NULLIF(v_pax ->> 'document_expiry', '')::DATE,
        COALESCE(NULLIF(v_pax ->> 'nationality', ''), 'Brasileira'), NULLIF(v_pax ->> 'birth_date', '')::DATE,
        NULLIF(v_pax ->> 'seat', ''), COALESCE((v_pax ->> 'is_lead')::BOOLEAN, FALSE),
        jsonb_build_object('last_ocr_at', now())
      );
    ELSE
      UPDATE public.trip_passengers
         SET document_type = COALESCE(NULLIF(v_pax ->> 'document_type', ''), document_type),
             document = COALESCE(NULLIF(v_pax ->> 'document', ''), document),
             document_expiry = COALESCE(NULLIF(v_pax ->> 'document_expiry', '')::DATE, document_expiry),
             nationality = COALESCE(NULLIF(v_pax ->> 'nationality', ''), nationality),
             birth_date = COALESCE(NULLIF(v_pax ->> 'birth_date', '')::DATE, birth_date),
             seat_number = COALESCE(NULLIF(v_pax ->> 'seat', ''), seat_number),
             is_lead_passenger = COALESCE((v_pax ->> 'is_lead')::BOOLEAN, is_lead_passenger),
             documents_metadata = COALESCE(documents_metadata, '{}'::jsonb) || jsonb_build_object('last_ocr_at', now()),
             updated_at = now()
       WHERE id = v_existing_pax_id AND trip_id = v_trip_id AND store_id = p_store_id;
    END IF;
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'flights', '[]'::jsonb)) LOOP
    IF NULLIF(v_item ->> 'locator', '') IS NOT NULL THEN
      SELECT tci.id INTO v_existing_item_id FROM public.trip_confirmation_items AS tci
       WHERE tci.trip_id = v_trip_id AND tci.store_id = p_store_id AND tci.item_type = 'flight' AND tci.locator_code = v_item ->> 'locator' LIMIT 1;
      IF v_existing_item_id IS NULL THEN
        INSERT INTO public.trip_confirmation_items (trip_id, store_id, item_type, provider_name, locator_code, status, service_date, notes)
        VALUES (v_trip_id, p_store_id, 'flight', COALESCE(v_item ->> 'airline', v_payload ->> 'operator_name', 'Companhia aérea'), v_item ->> 'locator', 'confirmed', NULLIF(v_item ->> 'date', '')::DATE, NULLIF(v_item ->> 'notes', ''));
      END IF;
    END IF;
  END LOOP;
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'hotels', '[]'::jsonb)) LOOP
    IF NULLIF(v_item ->> 'confirmation', '') IS NOT NULL THEN
      SELECT tci.id INTO v_existing_item_id FROM public.trip_confirmation_items AS tci
       WHERE tci.trip_id = v_trip_id AND tci.store_id = p_store_id AND tci.item_type = 'hotel' AND tci.locator_code = v_item ->> 'confirmation' LIMIT 1;
      IF v_existing_item_id IS NULL THEN
        INSERT INTO public.trip_confirmation_items (trip_id, store_id, item_type, provider_name, locator_code, status, service_date, notes)
        VALUES (v_trip_id, p_store_id, 'hotel', COALESCE(v_item ->> 'name', 'Hotel'), v_item ->> 'confirmation', 'confirmed', NULLIF(v_item ->> 'checkin', '')::DATE, NULLIF(v_item ->> 'notes', ''));
      END IF;
    END IF;
  END LOOP;
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'transfers', '[]'::jsonb)) LOOP
    IF NULLIF(v_item ->> 'confirmation', '') IS NOT NULL THEN
      SELECT tci.id INTO v_existing_item_id FROM public.trip_confirmation_items AS tci
       WHERE tci.trip_id = v_trip_id AND tci.store_id = p_store_id AND tci.item_type = 'transfer' AND tci.locator_code = v_item ->> 'confirmation' LIMIT 1;
      IF v_existing_item_id IS NULL THEN
        INSERT INTO public.trip_confirmation_items (trip_id, store_id, item_type, provider_name, locator_code, status, service_date, notes)
        VALUES (v_trip_id, p_store_id, 'transfer', COALESCE(v_item ->> 'supplier', 'Receptivo local'), v_item ->> 'confirmation', 'confirmed', NULLIF(v_item ->> 'date', '')::DATE, NULLIF(v_item ->> 'notes', ''));
      END IF;
    END IF;
  END LOOP;

  SELECT * INTO v_existing_voucher
    FROM public.tourism_vouchers
   WHERE trip_id = v_trip_id AND store_id = p_store_id
   ORDER BY updated_at DESC
   LIMIT 1
   FOR UPDATE;
  IF FOUND THEN
    v_voucher_id := v_existing_voucher.id;
    v_voucher_token := v_existing_voucher.public_token;
    v_voucher_code := v_existing_voucher.voucher_code;

    -- Mesclagem sem duplicação de passageiros no voucher
    v_merged_passengers := COALESCE(v_existing_voucher.passengers, '[]'::jsonb);
    FOR v_pax IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'passengers', '[]'::jsonb)) LOOP
      IF NULLIF(btrim(v_pax ->> 'name'), '') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_merged_passengers) AS existing(value)
         WHERE lower(btrim(COALESCE(existing.value ->> 'name', ''))) = lower(btrim(v_pax ->> 'name'))
      ) THEN
        v_merged_passengers := v_merged_passengers || jsonb_build_array(v_pax);
      END IF;
    END LOOP;

    UPDATE public.tourism_vouchers
       SET destination = COALESCE(NULLIF(v_payload ->> 'destination_city', ''), destination),
           flights = v_merged_flights, hotels = v_merged_hotels,
           transfers = v_merged_transfers, tours = v_merged_tours,
           insurance = COALESCE(v_payload -> 'insurance', insurance),
           passengers = v_merged_passengers,
           emergency_contacts = COALESCE(v_payload -> 'emergency_contacts', emergency_contacts),
           observations = COALESCE(NULLIF(v_payload ->> 'observations', ''), observations), updated_at = now()
     WHERE id = v_existing_voucher.id;
  ELSE
    v_voucher_token := 'vch_' || encode(extensions.gen_random_bytes(24), 'hex');
    v_voucher_code := 'VOUCH-' || upper(encode(extensions.gen_random_bytes(5), 'hex'));
    INSERT INTO public.tourism_vouchers (
      trip_id, store_id, public_token, voucher_code, voucher_type, template, destination,
      flights, hotels, transfers, tours, insurance, passengers, emergency_contacts, observations
    ) VALUES (
      v_trip_id, p_store_id, v_voucher_token, v_voucher_code, 'general', 'a4-boarding',
      NULLIF(v_payload ->> 'destination_city', ''), v_merged_flights, v_merged_hotels,
      v_merged_transfers, v_merged_tours, COALESCE(v_payload -> 'insurance', '{}'::jsonb),
      COALESCE(v_payload -> 'passengers', '[]'::jsonb), COALESCE(v_payload -> 'emergency_contacts', '[]'::jsonb),
      NULLIF(v_payload ->> 'observations', '')
    ) RETURNING id INTO v_voucher_id;
  END IF;

  IF p_ingestion_id IS NOT NULL THEN
    UPDATE public.travel_document_ingestions
       SET extraction_status = 'applied', review_status = 'approved', trip_id = v_trip_id,
           reviewed_by_profile_id = p_actor_profile_id, reviewed_at = COALESCE(reviewed_at, now()),
           error_message = NULL, updated_at = now()
     WHERE id = p_ingestion_id AND store_id = p_store_id;
  END IF;

  INSERT INTO public.travel_timeline_events (
    store_id, trip_id, event_type, actor_profile_id, correlation_id, payload
  ) VALUES (
    p_store_id, v_trip_id, 'ocr.applied_to_trip', p_actor_profile_id,
    COALESCE(p_ingestion_id::TEXT, v_operation_key),
    jsonb_build_object(
      'ingestion_id', p_ingestion_id, 'voucher_id', v_voucher_id,
      'voucher_code', v_voucher_code, 'idempotency_key', v_operation_key
    )
  );

  v_result := jsonb_build_object(
    'success', TRUE, 'replayed', FALSE, 'trip_id', v_trip_id,
    'trip_number', COALESCE(v_trip_number, v_trip.trip_number),
    'voucher_id', v_voucher_id, 'voucher_token', v_voucher_token,
    'voucher_url', '/voucher/' || v_voucher_token
  );
  UPDATE public.travel_voucher_apply_operations
     SET result = v_result, trip_id = v_trip_id, updated_at = now()
   WHERE id = v_operation.id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_operator_voucher_atomic(UUID, UUID, UUID, UUID, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_operator_voucher_atomic(UUID, UUID, UUID, UUID, JSONB, TEXT) TO authenticated, service_role;

-- 2. Refinamento de apply_travel_ocr_to_draft com deduplicação de Lead CRM e itens granulares em travel_budget_items
CREATE OR REPLACE FUNCTION public.apply_travel_ocr_to_draft(
  p_ingestion_id UUID,
  p_lead_id UUID DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_client_phone TEXT DEFAULT NULL,
  p_client_email TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ingestion public.travel_document_ingestions%ROWTYPE;
  v_extraction JSONB;
  v_lead_id UUID := p_lead_id;
  v_budget_id UUID;
  v_proposal_id UUID;
  v_destination TEXT;
  v_total BIGINT;
  v_currency TEXT;
  v_name TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_proposal_token TEXT;
  v_flight JSONB;
  v_hotel JSONB;
  v_transfer TEXT;
  v_tour TEXT;
BEGIN
  SELECT * INTO v_ingestion FROM public.travel_document_ingestions WHERE id = p_ingestion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento OCR não encontrado.'; END IF;

  -- Idempotência: se já foi aplicado, retorna o draft existente sem duplicar
  IF v_ingestion.extraction_status = 'applied' AND v_ingestion.proposal_id IS NOT NULL THEN
    SELECT tb.id, tp.public_token INTO v_budget_id, v_proposal_token
      FROM public.travel_proposals AS tp
      LEFT JOIN public.travel_budgets AS tb ON tb.id = tp.budget_id
     WHERE tp.id = v_ingestion.proposal_id
     LIMIT 1;
    RETURN jsonb_build_object(
      'success', true,
      'replayed', true,
      'lead_id', v_ingestion.lead_id,
      'budget_id', v_budget_id,
      'proposal_id', v_ingestion.proposal_id,
      'proposal_token', v_proposal_token
    );
  END IF;

  IF v_ingestion.extraction_status NOT IN ('needs_review', 'approved') THEN
    RAISE EXCEPTION 'Documento OCR ainda não está pronto para aplicação.';
  END IF;

  v_extraction := COALESCE(v_ingestion.extraction, '{}'::jsonb);
  v_destination := COALESCE(NULLIF(v_extraction->>'destination', ''), 'Destino a definir');
  v_total := GREATEST(COALESCE((v_extraction->>'gross_price_cents')::BIGINT, 0), 0);
  v_currency := COALESCE(NULLIF(v_extraction->>'currency', ''), 'BRL');
  v_name := NULLIF(trim(COALESCE(p_client_name, '')), '');
  v_email := NULLIF(lower(trim(COALESCE(p_client_email, ''))), '');
  v_phone := NULLIF(trim(COALESCE(p_client_phone, '')), '');

  IF v_lead_id IS NOT NULL THEN
    PERFORM 1 FROM public.leads_crm WHERE id = v_lead_id AND store_id = v_ingestion.store_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lead não pertence à loja do documento.'; END IF;
  ELSIF v_email IS NOT NULL OR v_phone IS NOT NULL THEN
    -- Busca lead existente na mesma loja por e-mail ou telefone para evitar duplicação
    SELECT l.id INTO v_lead_id
      FROM public.leads_crm AS l
     WHERE l.store_id = v_ingestion.store_id
       AND (
         (v_email IS NOT NULL AND lower(l.email) = v_email)
         OR (v_phone IS NOT NULL AND l.phone = v_phone)
       )
     ORDER BY l.created_at DESC
     LIMIT 1;

    IF v_lead_id IS NULL AND v_name IS NOT NULL THEN
      INSERT INTO public.leads_crm (store_id, full_name, email, phone, message, status)
      VALUES (
        v_ingestion.store_id,
        v_name,
        COALESCE(v_email, 'sem-email@waesy.local'),
        v_phone,
        'Lead criado a partir de documento OCR da operadora: ' || COALESCE(v_ingestion.file_name, 'arquivo'),
        'new'
      )
      RETURNING id INTO v_lead_id;
    END IF;
  END IF;

  INSERT INTO public.travel_budgets (
    store_id, lead_id, source_ingestion_id, destination, travel_start_date, travel_end_date,
    adults_count, children_count, currency, subtotal_cents, total_cents, pricing_snapshot,
    source_snapshot_hash, status
  ) VALUES (
    v_ingestion.store_id, v_lead_id, v_ingestion.id, v_destination,
    NULLIF(v_extraction->>'travel_start', '')::DATE,
    NULLIF(v_extraction->>'travel_end', '')::DATE,
    GREATEST(COALESCE((v_extraction->>'adults_count')::INTEGER, 1), 1),
    GREATEST(COALESCE((v_extraction->>'children_count')::INTEGER, 0), 0),
    v_currency, v_total, v_total, v_extraction, v_ingestion.content_sha256, 'needs_review'
  ) RETURNING id INTO v_budget_id;

  -- Item principal do pacote
  INSERT INTO public.travel_budget_items (
    budget_id, store_id, item_type, description, provider_name, quantity,
    unit_price_cents, total_cents, currency, details
  ) VALUES (
    v_budget_id, v_ingestion.store_id, 'package',
    'Cotação importada de ' || COALESCE(v_extraction->>'operator_name', 'operadora'),
    v_extraction->>'operator_name', 1, v_total, v_total, v_currency, v_extraction
  );

  -- Decomposição granular de voos extraídos em travel_budget_items
  FOR v_flight IN SELECT value FROM jsonb_array_elements(COALESCE(v_extraction->'flights', '[]'::jsonb)) LOOP
    INSERT INTO public.travel_budget_items (
      budget_id, store_id, item_type, description, provider_name, quantity,
      unit_price_cents, total_cents, currency, details
    ) VALUES (
      v_budget_id, v_ingestion.store_id, 'flight',
      concat_ws(' ', 'Voo', v_flight->>'airline', v_flight->>'flight_number', COALESCE(v_flight->>'origin_iata', '') || '->' || COALESCE(v_flight->>'destination_iata', '')),
      COALESCE(v_flight->>'airline', v_extraction->>'operator_name'),
      1, 0, 0, v_currency, v_flight
    );
  END LOOP;

  -- Decomposição granular de hotéis extraídos em travel_budget_items
  FOR v_hotel IN SELECT value FROM jsonb_array_elements(COALESCE(v_extraction->'hotels', '[]'::jsonb)) LOOP
    INSERT INTO public.travel_budget_items (
      budget_id, store_id, item_type, description, provider_name, quantity,
      unit_price_cents, total_cents, currency, details
    ) VALUES (
      v_budget_id, v_ingestion.store_id, 'hotel',
      concat_ws(' — ', COALESCE(v_hotel->>'hotel_name', 'Hospedagem'), v_hotel->>'room_category', v_hotel->>'meal_plan'),
      COALESCE(v_hotel->>'hotel_name', v_extraction->>'operator_name'),
      GREATEST(COALESCE((v_hotel->>'nights_count')::INTEGER, 1), 1), 0, 0, v_currency, v_hotel
    );
  END LOOP;

  v_proposal_token := 'prop_' || encode(gen_random_bytes(18), 'hex');
  INSERT INTO public.travel_proposals (
    store_id, lead_id, budget_id, source_ingestion_id, created_by_profile_id, public_token,
    canvas_format, title, destination_city, client_name, client_whatsapp, client_email,
    travel_start_date, travel_end_date, adults_count, children_count, flights, hotels,
    itinerary, pricing, includes, excludes, important_notes, status, canonical_status
  ) VALUES (
    v_ingestion.store_id, v_lead_id, v_budget_id, v_ingestion.id, v_ingestion.created_by_profile_id,
    v_proposal_token, 'a4-portrait',
    'Proposta importada — ' || v_destination, v_destination,
    COALESCE(v_name, 'Cliente a confirmar'), COALESCE(v_phone, ''), v_email,
    NULLIF(v_extraction->>'travel_start', '')::DATE,
    NULLIF(v_extraction->>'travel_end', '')::DATE,
    GREATEST(COALESCE((v_extraction->>'adults_count')::INTEGER, 1), 1),
    GREATEST(COALESCE((v_extraction->>'children_count')::INTEGER, 0), 0),
    COALESCE(v_extraction->'flights', '[]'::jsonb),
    COALESCE(v_extraction->'hotels', '[]'::jsonb),
    jsonb_build_array(jsonb_build_object('transfers', COALESCE(v_extraction->'transfers', '[]'::jsonb), 'tours', COALESCE(v_extraction->'tours', '[]'::jsonb))),
    jsonb_build_object('currency', v_currency, 'total_price_cents', v_total, 'operator_net_cents', COALESCE((v_extraction->>'operator_net_cents')::BIGINT, 0), 'source', 'operator_ocr'),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_extraction->'inclusions', '[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_extraction->'exclusions', '[]'::jsonb))),
    ARRAY[concat_ws(E'\n', 'Documento: ' || COALESCE(v_ingestion.file_name, 'arquivo'), 'Referência: ' || COALESCE(v_extraction->>'quote_reference_number', 'não informada'), COALESCE(v_extraction->>'notes', ''))],
    'draft', 'draft'
  ) RETURNING id INTO v_proposal_id;

  UPDATE public.travel_document_ingestions
  SET lead_id = v_lead_id, proposal_id = v_proposal_id, extraction_status = 'applied', review_status = 'approved',
      reviewed_at = now(), updated_at = now()
  WHERE id = v_ingestion.id;

  INSERT INTO public.travel_timeline_events (
    store_id, lead_id, proposal_id, budget_id, event_type, correlation_id, payload
  ) VALUES (
    v_ingestion.store_id, v_lead_id, v_proposal_id, v_budget_id, 'ocr.applied_to_draft', v_ingestion.id::TEXT,
    jsonb_build_object('ingestion_id', v_ingestion.id, 'source_kind', v_ingestion.source_kind, 'requires_human_review', true)
  );

  RETURN jsonb_build_object('success', true, 'replayed', false, 'lead_id', v_lead_id, 'budget_id', v_budget_id, 'proposal_id', v_proposal_id, 'proposal_token', v_proposal_token);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_travel_ocr_to_draft(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_travel_ocr_to_draft(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
