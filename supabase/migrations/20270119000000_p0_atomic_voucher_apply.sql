-- Waesy P0 R6 — atomic operator voucher/document application.
-- This migration is intentionally after 20270117000000. It does not touch the
-- parallel 20270118000000 catalog work observed on another branch.
-- No provider booking, payment capture, Pix generation, or external reservation
-- is performed here.
-- Any exception aborts the function transaction; there is intentionally no
-- partial-success exception handler around the multi-table writes below.

CREATE TABLE IF NOT EXISTS public.travel_voucher_apply_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  ingestion_id UUID REFERENCES public.travel_document_ingestions(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_travel_voucher_apply_operations_ingestion
  ON public.travel_voucher_apply_operations(store_id, ingestion_id);

ALTER TABLE public.travel_voucher_apply_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.travel_voucher_apply_operations FROM PUBLIC, anon, authenticated;

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
  v_merged_flights JSONB;
  v_merged_hotels JSONB;
  v_merged_transfers JSONB;
  v_merged_tours JSONB;
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
      COALESCE(v_payload -> 'flights', '[]'::jsonb), COALESCE(v_payload -> 'hotels', '[]'::jsonb),
      COALESCE(v_payload -> 'transfers', '[]'::jsonb), COALESCE(v_payload -> 'tours', '[]'::jsonb),
      COALESCE(v_payload -> 'insurance', '{}'::jsonb), '[]'::jsonb, '[]'::jsonb, '{}', '{}',
      NULLIF(v_payload ->> 'observations', '')
    ) RETURNING * INTO v_trip;
    v_trip_id := v_trip.id;
  END IF;

  v_merged_flights := COALESCE(v_trip.flights, '[]'::jsonb);
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'flights', '[]'::jsonb)) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_merged_flights) AS existing(value)
       WHERE (NULLIF(existing.value ->> 'locator', '') IS NOT NULL AND existing.value ->> 'locator' = v_item ->> 'locator')
          OR (NULLIF(existing.value ->> 'flight_number', '') IS NOT NULL AND existing.value ->> 'flight_number' = v_item ->> 'flight_number')
    ) THEN
      v_merged_flights := v_merged_flights || jsonb_build_array(v_item);
    END IF;
  END LOOP;
  v_merged_hotels := COALESCE(v_trip.hotels, '[]'::jsonb);
  FOR v_hotel IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'hotels', '[]'::jsonb)) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_merged_hotels) AS existing(value)
       WHERE lower(COALESCE(existing.value ->> 'name', '')) <> ''
         AND lower(existing.value ->> 'name') = lower(COALESCE(v_hotel ->> 'name', ''))
    ) THEN
      v_merged_hotels := v_merged_hotels || jsonb_build_array(v_hotel);
    END IF;
  END LOOP;
  v_merged_transfers := COALESCE(v_trip.transfers, '[]'::jsonb) || COALESCE(v_payload -> 'transfers', '[]'::jsonb);
  v_merged_tours := COALESCE(v_trip.tours, '[]'::jsonb) || COALESCE(v_payload -> 'tours', '[]'::jsonb);

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
    UPDATE public.tourism_vouchers
       SET destination = COALESCE(NULLIF(v_payload ->> 'destination_city', ''), destination),
           flights = v_merged_flights, hotels = v_merged_hotels,
           transfers = v_merged_transfers, tours = v_merged_tours,
           insurance = COALESCE(v_payload -> 'insurance', insurance),
           passengers = COALESCE(v_payload -> 'passengers', passengers),
           emergency_contacts = COALESCE(v_payload -> 'emergency_contacts', emergency_contacts),
           observations = NULLIF(v_payload ->> 'observations', ''), updated_at = now()
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
    'voucher-apply:' || v_operation_key,
    jsonb_build_object('ingestion_id', p_ingestion_id, 'voucher_id', v_voucher_id, 'source_kind', COALESCE(v_ingestion.source_kind, 'direct_operator_import'))
  );

  v_result := jsonb_build_object(
    'success', TRUE, 'replayed', FALSE, 'trip_id', v_trip_id,
    'trip_number', v_trip.trip_number, 'voucher_id', v_voucher_id,
    'voucher_token', v_voucher_token, 'voucher_url', '/voucher/' || v_voucher_token
  );
  UPDATE public.travel_voucher_apply_operations
     SET result = v_result, trip_id = v_trip_id, updated_at = now()
   WHERE id = v_operation.id;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_operator_voucher_atomic(UUID, UUID, UUID, UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_operator_voucher_atomic(UUID, UUID, UUID, UUID, JSONB, TEXT) TO service_role;
