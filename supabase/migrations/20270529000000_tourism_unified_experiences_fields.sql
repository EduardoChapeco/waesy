-- ==============================================================================
-- MIGRACAO: COLUNAS ESTRUTURADAS UNIFICADAS PARA EXCURSÕES & EXPERIÊNCIAS (T0)
-- Alinha `tourism_experiences` ao contrato canônico (`hotels`, `transfers`,
-- `tours`, `itinerary`, `media`, `boarding_points`, `pricing_tiers`, `extra_options`,
-- `web_page_config`), eliminando dependência exclusiva de JSON string em `description`.
-- ==============================================================================

ALTER TABLE public.tourism_experiences
  ADD COLUMN IF NOT EXISTS hotels JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS transfers JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tours JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS itinerary JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS boarding_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing_tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS extra_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS web_page_config JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_conditions TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vehicle_layout_name TEXT DEFAULT NULL;

COMMENT ON COLUMN public.tourism_experiences.hotels IS 'Lista estruturada multi-hospedagem com mídia/vídeo individual';
COMMENT ON COLUMN public.tourism_experiences.transfers IS 'Traslados nomeados, tipo, veículo e precificação';
COMMENT ON COLUMN public.tourism_experiences.tours IS 'Passeios/atrações estruturados com datas e mídia';
COMMENT ON COLUMN public.tourism_experiences.itinerary IS 'Roteiro cronológico dia a dia com galeria/vídeo';
COMMENT ON COLUMN public.tourism_experiences.media IS 'Galeria principal (imagens + vídeos) com proporção/crop';
COMMENT ON COLUMN public.tourism_experiences.web_page_config IS 'Blocos e tema editáveis para renderização no ProposalWebShowcase';

-- Backfill idempotente e defensivo a partir de blobs JSON legados em `description`
DO $$
DECLARE
  v_rec RECORD;
  v_meta JSONB;
BEGIN
  FOR v_rec IN
    SELECT id, description, cover_image_url, image_url
    FROM public.tourism_experiences
    WHERE description IS NOT NULL
      AND left(trim(description), 1) = '{'
      AND (
        hotels = '[]'::jsonb
        OR itinerary = '[]'::jsonb
        OR boarding_points = '[]'::jsonb
        OR pricing_tiers = '[]'::jsonb
        OR extra_options = '[]'::jsonb
      )
  LOOP
    BEGIN
      v_meta := v_rec.description::jsonb;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;

    UPDATE public.tourism_experiences
    SET
      boarding_points = CASE
        WHEN jsonb_array_length(boarding_points) = 0 AND jsonb_typeof(v_meta->'boarding_points') = 'array'
          THEN v_meta->'boarding_points'
        ELSE boarding_points
      END,
      pricing_tiers = CASE
        WHEN jsonb_array_length(pricing_tiers) = 0 AND jsonb_typeof(v_meta->'pricing_tiers') = 'array'
          THEN v_meta->'pricing_tiers'
        ELSE pricing_tiers
      END,
      extra_options = CASE
        WHEN jsonb_array_length(extra_options) = 0 AND jsonb_typeof(v_meta->'extra_options') = 'array'
          THEN v_meta->'extra_options'
        ELSE extra_options
      END,
      itinerary = CASE
        WHEN jsonb_array_length(itinerary) = 0 AND jsonb_typeof(v_meta->'itinerary') = 'array'
          THEN v_meta->'itinerary'
        ELSE itinerary
      END,
      hotels = CASE
        WHEN jsonb_array_length(hotels) = 0 AND jsonb_typeof(v_meta->'hotel_details') = 'object' AND COALESCE(v_meta->'hotel_details'->>'name', '') <> ''
          THEN jsonb_build_array(
            jsonb_build_object(
              'id', 'migrated-hotel-1',
              'hotel_name', v_meta->'hotel_details'->>'name',
              'stars', COALESCE((v_meta->'hotel_details'->>'stars')::int, 3),
              'checkin_date', NULLIF(v_meta->'hotel_details'->>'checkIn', ''),
              'checkout_date', NULLIF(v_meta->'hotel_details'->>'checkOut', ''),
              'amenities', COALESCE(v_meta->'hotel_details'->'amenities', '[]'::jsonb),
              'images', COALESCE(v_meta->'hotel_details'->'gallery', '[]'::jsonb)
            )
          )
        ELSE hotels
      END,
      payment_conditions = COALESCE(payment_conditions, NULLIF(v_meta->>'payment_conditions', '')),
      vehicle_layout_name = COALESCE(vehicle_layout_name, NULLIF(v_meta->>'vehicle_layout_name', '')),
      cover_image_url = COALESCE(cover_image_url, NULLIF(v_meta->>'cover_image_url', ''), image_url)
    WHERE id = v_rec.id;
  END LOOP;
END;
$$;
