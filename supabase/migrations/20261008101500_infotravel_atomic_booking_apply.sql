-- Onda 7: aplicação transacional e idempotente de snapshots InfoTravel.
-- O fluxo operacional atual usa tourism_trips; a família trips/agencies permanece
-- fora desta RPC até decisão de migração explícita e não destrutiva.

ALTER TABLE public.tourism_trips
  ADD COLUMN IF NOT EXISTS external_booking_id text,
  ADD COLUMN IF NOT EXISTS source_provider text;

ALTER TABLE public.trip_passengers
  ADD COLUMN IF NOT EXISTS source_provider text,
  ADD COLUMN IF NOT EXISTS source_booking_id text,
  ADD COLUMN IF NOT EXISTS external_passenger_id text;

ALTER TABLE public.trip_confirmation_items
  ADD COLUMN IF NOT EXISTS source_provider text,
  ADD COLUMN IF NOT EXISTS source_booking_id text,
  ADD COLUMN IF NOT EXISTS external_item_id text;

CREATE INDEX IF NOT EXISTS idx_tourism_trips_external_booking
  ON public.tourism_trips(store_id, source_provider, external_booking_id)
  WHERE external_booking_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_passenger_infotravel_external
  ON public.trip_passengers(trip_id, source_provider, source_booking_id, external_passenger_id)
  WHERE source_provider = 'infotravel' AND external_passenger_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_confirmation_infotravel_external
  ON public.trip_confirmation_items(trip_id, source_provider, source_booking_id, external_item_id)
  WHERE source_provider = 'infotravel' AND external_item_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.apply_infotravel_booking(
  p_trip_id uuid,
  p_store_id uuid,
  p_booking_id text,
  p_snapshot jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip public.tourism_trips%ROWTYPE;
  v_item jsonb;
  v_passenger_id text;
  v_item_id text;
  v_locator text;
  v_type text;
  v_provider text := COALESCE(NULLIF(p_snapshot->>'provider', ''), 'InfoTravel');
  v_flights jsonb := COALESCE(p_snapshot->'flights', '[]'::jsonb);
  v_hotels jsonb := COALESCE(p_snapshot->'hotels', '[]'::jsonb);
  v_transfers jsonb := COALESCE(p_snapshot->'transfers', '[]'::jsonb);
  v_tours jsonb := COALESCE(p_snapshot->'tours', p_snapshot->'activities', '[]'::jsonb);
  v_passengers jsonb := COALESCE(p_snapshot->'passengers', '[]'::jsonb);
BEGIN
  IF p_trip_id IS NULL OR p_store_id IS NULL OR NULLIF(trim(p_booking_id), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'InfoTravel booking payload incompleto';
  END IF;

  SELECT * INTO v_trip
  FROM public.tourism_trips
  WHERE id = p_trip_id AND store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Viagem não encontrada para a agência autenticada';
  END IF;

  UPDATE public.tourism_trips
  SET external_booking_id = p_booking_id,
      source_provider = 'infotravel',
      flights = v_flights,
      hotels = v_hotels,
      transfers = v_transfers,
      tours = v_tours,
      reservation_state = 'reserved_pending_issuance',
      destination_city = COALESCE(NULLIF(p_snapshot->>'destination', ''), destination_city),
      travel_start_date = COALESCE(NULLIF(p_snapshot->>'travel_start', '')::date, travel_start_date),
      travel_end_date = COALESCE(NULLIF(p_snapshot->>'travel_end', '')::date, travel_end_date),
      total_cents = CASE WHEN (p_snapshot->>'total_sale') ~ '^[-+]?[0-9]+(\\.[0-9]+)?$'
        THEN round((p_snapshot->>'total_sale')::numeric * 100)::bigint ELSE total_cents END,
      client_name = COALESCE(NULLIF(p_snapshot->>'client_name', ''), client_name),
      client_email = COALESCE(NULLIF(p_snapshot->>'client_email', ''), client_email),
      client_whatsapp = COALESCE(NULLIF(p_snapshot->>'client_phone', ''), client_whatsapp),
      updated_at = now()
  WHERE id = p_trip_id AND store_id = p_store_id;

  -- Somente projeções originadas desta reserva são substituídas. Dados manuais
  -- continuam preservados e a repetição da importação não duplica linhas.
  DELETE FROM public.trip_passengers
  WHERE trip_id = p_trip_id AND store_id = p_store_id
    AND source_provider = 'infotravel' AND source_booking_id = p_booking_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_passengers) LOOP
    v_passenger_id := COALESCE(NULLIF(v_item->>'external_id', ''), NULLIF(v_item->>'id', ''), md5(COALESCE(v_item->>'full_name', v_item->>'name', '') || '|' || COALESCE(v_item->>'document', v_item->>'cpf', '')));
    INSERT INTO public.trip_passengers (
      trip_id, store_id, full_name, document, birth_date, email, phone,
      room_id, seat_number, is_lead_passenger, notes,
      source_provider, source_booking_id, external_passenger_id, updated_at
    ) VALUES (
      p_trip_id, p_store_id,
      COALESCE(NULLIF(v_item->>'full_name', ''), NULLIF(v_item->>'name', ''), 'Passageiro InfoTravel'),
      COALESCE(NULLIF(v_item->>'document', ''), NULLIF(v_item->>'cpf', '')),
      NULLIF(COALESCE(v_item->>'birth_date', v_item->>'birthDate'), '')::date,
      NULLIF(v_item->>'email', ''),
      COALESCE(NULLIF(v_item->>'phone', ''), NULLIF(v_item->>'whatsapp', '')),
      NULLIF(v_item->>'room_id', ''),
      COALESCE(NULLIF(v_item->>'seat_number', ''), NULLIF(v_item->>'seat', '')),
      COALESCE((v_item->>'is_lead_passenger')::boolean, (v_item->>'isLeadPassenger')::boolean, false),
      NULLIF(v_item->>'notes', ''),
      'infotravel', p_booking_id, v_passenger_id, now()
    );
  END LOOP;

  DELETE FROM public.trip_confirmation_items
  WHERE trip_id = p_trip_id AND store_id = p_store_id
    AND source_provider = 'infotravel' AND source_booking_id = p_booking_id;

  FOR v_type, v_item IN
    SELECT 'flight', value FROM jsonb_array_elements(v_flights)
    UNION ALL SELECT 'hotel', value FROM jsonb_array_elements(v_hotels)
    UNION ALL SELECT 'transfer', value FROM jsonb_array_elements(v_transfers)
    UNION ALL SELECT 'tour', value FROM jsonb_array_elements(v_tours)
  LOOP
    v_item_id := COALESCE(NULLIF(v_item->>'external_id', ''), NULLIF(v_item->>'id', ''), md5(v_type || '|' || v_item::text));
    v_locator := COALESCE(NULLIF(v_item->>'locator_code', ''), NULLIF(v_item->>'locator', ''), NULLIF(v_item->>'confirmation_code', ''), NULLIF(v_item->>'pnr', ''), v_item_id);
    INSERT INTO public.trip_confirmation_items (
      trip_id, store_id, item_type, provider_name, locator_code, status,
      service_date, details, source_provider, source_booking_id, external_item_id, updated_at
    ) VALUES (
      p_trip_id, p_store_id, v_type, v_provider, v_locator,
      CASE WHEN lower(COALESCE(v_item->>'status', 'confirmed')) IN ('cancelled', 'pending', 'reaccommodated')
        THEN lower(v_item->>'status') ELSE 'confirmed' END,
      NULLIF(COALESCE(v_item->>'service_date', v_item->>'date', v_item->>'checkin'), '')::date,
      v_item, 'infotravel', p_booking_id, v_item_id, now()
    );
  END LOOP;

  SELECT * INTO v_trip FROM public.tourism_trips WHERE id = p_trip_id AND store_id = p_store_id;
  RETURN jsonb_build_object(
    'trip', to_jsonb(v_trip),
    'booking_id', p_booking_id,
    'passengers_applied', jsonb_array_length(v_passengers),
    'confirmation_items_applied', jsonb_array_length(v_flights) + jsonb_array_length(v_hotels) + jsonb_array_length(v_transfers) + jsonb_array_length(v_tours),
    'source_provider', 'infotravel'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_infotravel_booking(uuid, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_infotravel_booking(uuid, uuid, text, jsonb) TO authenticated;
COMMENT ON FUNCTION public.apply_infotravel_booking(uuid, uuid, text, jsonb) IS
  'Aplica snapshot InfoTravel em tourism_trips e projeções derivadas com lock, tenant check e replay seguro.';
