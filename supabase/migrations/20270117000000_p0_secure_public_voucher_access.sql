-- Waesy P0 — public voucher projection through a narrow token-bound RPC.
-- Public consumers receive only operational travel data; internal observations and
-- arbitrary nested passenger fields never cross the boundary.

CREATE OR REPLACE FUNCTION public.get_public_tourism_voucher_by_token(p_public_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
SET row_security = off
AS $$
DECLARE
  v_voucher public.tourism_vouchers%ROWTYPE;
  v_trip public.tourism_trips%ROWTYPE;
  v_store public.stores%ROWTYPE;
  v_passengers JSONB := '[]'::jsonb;
BEGIN
  IF p_public_token IS NULL OR length(p_public_token) < 8 OR length(p_public_token) > 160 THEN
    RETURN NULL;
  END IF;
  SELECT v.* INTO v_voucher
    FROM public.tourism_vouchers AS v
   WHERE v.public_token = p_public_token
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT t.* INTO v_trip FROM public.tourism_trips AS t WHERE t.id = v_voucher.trip_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT s.* INTO v_store FROM public.stores AS s WHERE s.id = v_voucher.store_id;

  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN jsonb_typeof(item.value) = 'string' THEN jsonb_build_object('name', item.value #>> '{}')
      ELSE jsonb_strip_nulls(jsonb_build_object(
        'name', NULLIF(btrim(item.value ->> 'name'), ''),
        'document', NULLIF(btrim(item.value ->> 'document'), ''),
        'seat', NULLIF(btrim(item.value ->> 'seat'), '')
      ))
    END
  ), '[]'::jsonb)
    INTO v_passengers
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_voucher.passengers) = 'array' THEN v_voucher.passengers ELSE '[]'::jsonb END) AS item(value);

  RETURN jsonb_build_object(
    'voucher', jsonb_build_object(
      'id', v_voucher.id,
      'trip_id', v_voucher.trip_id,
      'public_token', v_voucher.public_token,
      'voucher_code', v_voucher.voucher_code,
      'voucher_type', v_voucher.voucher_type,
      'template', v_voucher.template,
      'destination', v_voucher.destination,
      'cover_image_url', v_voucher.cover_image_url,
      'emergency_contacts', CASE WHEN jsonb_typeof(v_voucher.emergency_contacts) = 'array' THEN v_voucher.emergency_contacts ELSE '[]'::jsonb END,
      'passengers', v_passengers,
      'flights', CASE WHEN jsonb_typeof(v_voucher.flights) = 'array' THEN v_voucher.flights ELSE '[]'::jsonb END,
      'hotels', CASE WHEN jsonb_typeof(v_voucher.hotels) = 'array' THEN v_voucher.hotels ELSE '[]'::jsonb END,
      'transfers', CASE WHEN jsonb_typeof(v_voucher.transfers) = 'array' THEN v_voucher.transfers ELSE '[]'::jsonb END,
      'tours', CASE WHEN jsonb_typeof(v_voucher.tours) = 'array' THEN v_voucher.tours ELSE '[]'::jsonb END,
      'insurance', CASE WHEN jsonb_typeof(v_voucher.insurance) = 'object' THEN v_voucher.insurance ELSE '{}'::jsonb END,
      'observations', NULL,
      'pdf_url', v_voucher.pdf_url,
      'created_at', v_voucher.created_at
    ),
    'trip', jsonb_build_object(
      'id', v_trip.id,
      'store_id', v_trip.store_id,
      'trip_number', v_trip.trip_number,
      'title', v_trip.title,
      'destination_city', v_trip.destination_city,
      'travel_start_date', v_trip.travel_start_date,
      'travel_end_date', v_trip.travel_end_date
    ),
    'store', jsonb_build_object(
      'name', COALESCE(v_store.name, ''),
      'logo_url', v_store.logo_url,
      'whatsapp_phone', COALESCE(v_store.settings ->> 'whatsapp_phone', v_store.settings ->> 'phone')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_tourism_voucher_by_token(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_tourism_voucher_by_token(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_tourism_voucher_by_token(TEXT) TO anon, authenticated;
