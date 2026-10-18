-- ============================================================================
-- MIGRATION: 20270126000001_profiles_cortex360_geomarketing_and_waesygo_multileg.sql
-- PURPOSE:
--   1. Pilar 1: In-Page Profile separation (Affiliate vs Brand/Creator, Own Brands vs Partner Stores, Courier Tariffs & Helpers).
--   2. Pilar 2: Cortex 360 Geomarketing, OSM Competitor Matrix, TAM/SAM/SOM & Pre-Business Viability Studies.
--   3. Pilar 3: Waesy Go Multi-Leg Carona Graph (BlaBlaCar style), Intercity Bus Schedules/Tickets (Reunidas/Planalto),
--      Women-Only Safety Filter, Incidents/Lost Items, and Admin Master 3D Vehicle Sprites.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. PILAR 1: PERFIS IN-PAGE (AFILIADO VS MARCA & CONDUTOR WAESY GO)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.creator_profiles
  ADD COLUMN IF NOT EXISTS profile_kind TEXT NOT NULL DEFAULT 'brand' CHECK (profile_kind IN ('brand', 'affiliate', 'creator', 'artist')),
  ADD COLUMN IF NOT EXISTS own_brand_store_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE IF EXISTS public.affiliate_partners
  ADD COLUMN IF NOT EXISTS showcase_title TEXT,
  ADD COLUMN IF NOT EXISTS showcase_bio TEXT,
  ADD COLUMN IF NOT EXISTS partner_store_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS own_brand_store_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS showcase_order TEXT[] NOT NULL DEFAULT ARRAY['banner', 'own_brands', 'stores', 'products', 'events'];

ALTER TABLE IF EXISTS public.courier_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS helper_fee_cents INTEGER NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS max_helpers_count INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS min_km_rate_filter_cents INTEGER NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS work_radius_km NUMERIC(6,2) NOT NULL DEFAULT 25.0;

-- ----------------------------------------------------------------------------
-- 2. PILAR 2: GEOMARKETING, CORTEX 360 & ESTUDOS DE VIABILIDADE COMERCIAL
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.commercial_point_records
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS catchment_population INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS competitor_density_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tam_monthly_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sam_monthly_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS som_monthly_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dynamic_price_multiplier NUMERIC(6,4) DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS isochrone_geojson JSONB DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.market_competitors
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS cnae TEXT,
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS directory_listing_id UUID,
  ADD COLUMN IF NOT EXISTS avg_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS feature_matrix JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.market_viability_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  niche_slug TEXT NOT NULL,
  idea_description TEXT NOT NULL,
  target_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'SC',
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  radius_km NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  base_ticket_cents INTEGER NOT NULL DEFAULT 5000,
  estimated_rent_cents INTEGER NOT NULL DEFAULT 350000,
  viability_score INTEGER NOT NULL DEFAULT 0,
  verdict TEXT NOT NULL DEFAULT 'GO' CHECK (verdict IN ('GO', 'PIVOT', 'NO_GO')),
  tam_monthly_cents BIGINT NOT NULL DEFAULT 0,
  sam_monthly_cents BIGINT NOT NULL DEFAULT 0,
  som_monthly_cents BIGINT NOT NULL DEFAULT 0,
  cortex_dynamic_price_cents INTEGER NOT NULL DEFAULT 0,
  market_sentiment_alpha NUMERIC(6,4) NOT NULL DEFAULT 0,
  local_scarcity_beta NUMERIC(6,4) NOT NULL DEFAULT 0,
  competitor_pressure_gamma NUMERIC(6,4) NOT NULL DEFAULT 0,
  discovered_competitors JSONB NOT NULL DEFAULT '[]'::jsonb,
  comperator_matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
  swot_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  bmc_canvas JSONB NOT NULL DEFAULT '{}'::jsonb,
  simlab_synthesis JSONB NOT NULL DEFAULT '{}'::jsonb,
  isochrone_geojson JSONB NOT NULL DEFAULT '{}'::jsonb,
  executive_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.market_viability_studies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own viability studies" ON public.market_viability_studies;
CREATE POLICY "Users can view own viability studies"
  ON public.market_viability_studies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR store_id IN (
    SELECT store_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own viability studies" ON public.market_viability_studies;
CREATE POLICY "Users can insert own viability studies"
  ON public.market_viability_studies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own viability studies" ON public.market_viability_studies;
CREATE POLICY "Users can update own viability studies"
  ON public.market_viability_studies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. PILAR 3: WAESY GO, CARONAS MULTI-TRECHO (BLABLACAR), ÔNIBUS E SPRITES 3D
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.mobility_requests
  ADD COLUMN IF NOT EXISTS women_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_disclaimer_accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chat_messages JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3.1 Grafo de Caronas Multi-Trecho (BlaBlaCar Style)
CREATE TABLE IF NOT EXISTS public.carona_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  driver_avatar_url TEXT,
  driver_rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL DEFAULT 'SC',
  destination_city TEXT NOT NULL,
  destination_state TEXT NOT NULL DEFAULT 'SC',
  departure_at TIMESTAMPTZ NOT NULL,
  total_seats INTEGER NOT NULL DEFAULT 4 CHECK (total_seats BETWEEN 1 AND 8),
  full_route_price_cents INTEGER NOT NULL CHECK (full_route_price_cents >= 0),
  women_only BOOLEAN NOT NULL DEFAULT false,
  allow_price_negotiation BOOLEAN NOT NULL DEFAULT true,
  vehicle_model TEXT NOT NULL,
  vehicle_color TEXT,
  vehicle_plate TEXT,
  vehicle_photo_url TEXT,
  luggage_size TEXT NOT NULL DEFAULT 'medium' CHECK (luggage_size IN ('small', 'medium', 'large')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'in_progress', 'completed', 'cancelled')),
  waypoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.carona_waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.carona_rides(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  city_name TEXT NOT NULL,
  state_code TEXT NOT NULL DEFAULT 'SC',
  meeting_point TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  estimated_arrival_at TIMESTAMPTZ,
  cumulative_price_cents INTEGER NOT NULL DEFAULT 0,
  UNIQUE (ride_id, stop_order)
);

CREATE TABLE IF NOT EXISTS public.carona_segment_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.carona_rides(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passenger_name TEXT NOT NULL,
  passenger_avatar_url TEXT,
  from_stop_order INTEGER NOT NULL,
  to_stop_order INTEGER NOT NULL,
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  seats_booked INTEGER NOT NULL DEFAULT 1 CHECK (seats_booked >= 1),
  original_price_cents INTEGER NOT NULL,
  proposed_price_cents INTEGER,
  agreed_price_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending_negotiation', 'confirmed', 'boarded', 'completed', 'cancelled')),
  boarding_pin TEXT NOT NULL DEFAULT '1000',
  chat_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  passenger_rating INTEGER CHECK (passenger_rating BETWEEN 1 AND 5),
  driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (to_stop_order > from_stop_order)
);

ALTER TABLE public.carona_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carona_waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carona_segment_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published caronas" ON public.carona_rides;
CREATE POLICY "Public can view published caronas" ON public.carona_rides FOR SELECT USING (true);

DROP POLICY IF EXISTS "Drivers manage own caronas" ON public.carona_rides;
CREATE POLICY "Drivers manage own caronas" ON public.carona_rides FOR ALL TO authenticated USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Public can view carona waypoints" ON public.carona_waypoints;
CREATE POLICY "Public can view carona waypoints" ON public.carona_waypoints FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated manage waypoints" ON public.carona_waypoints;
CREATE POLICY "Authenticated manage waypoints" ON public.carona_waypoints FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Participants view segment bookings" ON public.carona_segment_bookings;
CREATE POLICY "Participants view segment bookings" ON public.carona_segment_bookings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Passengers create segment bookings" ON public.carona_segment_bookings;
CREATE POLICY "Passengers create segment bookings" ON public.carona_segment_bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = passenger_id);

DROP POLICY IF EXISTS "Participants update segment bookings" ON public.carona_segment_bookings;
CREATE POLICY "Participants update segment bookings" ON public.carona_segment_bookings FOR UPDATE TO authenticated USING (
  auth.uid() = passenger_id OR auth.uid() IN (SELECT driver_id FROM public.carona_rides WHERE id = ride_id)
);

-- 3.2 Passagens Rodoviárias Intermunicipais (Reunidas, Planalto, Unesul, Ouro e Prata)
CREATE TABLE IF NOT EXISTS public.bus_routes_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_name TEXT NOT NULL,
  operator_slug TEXT NOT NULL,
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL DEFAULT 'SC',
  destination_city TEXT NOT NULL,
  destination_state TEXT NOT NULL DEFAULT 'SC',
  departure_time TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 240,
  service_class TEXT NOT NULL DEFAULT 'Executivo' CHECK (service_class IN ('Convencional', 'Executivo', 'Semi-Leito', 'Leito Total')),
  price_cents INTEGER NOT NULL,
  total_seats INTEGER NOT NULL DEFAULT 42,
  intermediate_stops JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bus_ticket_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.bus_routes_schedules(id) ON DELETE RESTRICT,
  passenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passenger_name TEXT NOT NULL,
  passenger_document TEXT NOT NULL,
  travel_date DATE NOT NULL,
  seat_number INTEGER NOT NULL CHECK (seat_number BETWEEN 1 AND 60),
  boarding_city TEXT NOT NULL,
  alighting_city TEXT NOT NULL,
  price_paid_cents INTEGER NOT NULL,
  qr_code_payload TEXT NOT NULL,
  ticket_signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'boarded', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, travel_date, seat_number)
);

ALTER TABLE public.bus_routes_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_ticket_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view bus schedules" ON public.bus_routes_schedules;
CREATE POLICY "Public view bus schedules" ON public.bus_routes_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Passengers view own bus tickets" ON public.bus_ticket_bookings;
CREATE POLICY "Passengers view own bus tickets" ON public.bus_ticket_bookings FOR SELECT TO authenticated USING (auth.uid() = passenger_id);

DROP POLICY IF EXISTS "Passengers book bus tickets" ON public.bus_ticket_bookings;
CREATE POLICY "Passengers book bus tickets" ON public.bus_ticket_bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = passenger_id);

-- 3.3 Central de Ajuda, Achados e Perdidos & Relato de Avarias/Incidentes P2P
CREATE TABLE IF NOT EXISTS public.mobility_incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobility_request_id UUID REFERENCES public.mobility_requests(id) ON DELETE SET NULL,
  carona_ride_id UUID REFERENCES public.carona_rides(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('lost_item', 'property_damage', 'safety_concern', 'route_dispute', 'helper_issue')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_mediation', 'resolved', 'closed')),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mobility_incident_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own incident reports" ON public.mobility_incident_reports;
CREATE POLICY "Users manage own incident reports" ON public.mobility_incident_reports FOR ALL TO authenticated USING (auth.uid() = reporter_id) WITH CHECK (auth.uid() = reporter_id);

-- 3.4 Sprites 3D de Veículos no Admin Master
CREATE TABLE IF NOT EXISTS public.mobility_vehicle_sprites (
  service_type TEXT PRIMARY KEY CHECK (service_type IN ('ride_car', 'ride_moto', 'freight_van', 'moving_truck', 'delivery_express', 'carona', 'bus')),
  display_label TEXT NOT NULL,
  sprite_3d_url TEXT NOT NULL,
  map_marker_url TEXT NOT NULL,
  scale_factor NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mobility_vehicle_sprites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view vehicle sprites" ON public.mobility_vehicle_sprites;
CREATE POLICY "Public view vehicle sprites" ON public.mobility_vehicle_sprites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated update vehicle sprites" ON public.mobility_vehicle_sprites;
CREATE POLICY "Authenticated update vehicle sprites" ON public.mobility_vehicle_sprites FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default 3D vehicle sprites & regional bus routes (Reunidas / Planalto / Unesul)
INSERT INTO public.mobility_vehicle_sprites (service_type, display_label, sprite_3d_url, map_marker_url, scale_factor)
VALUES
  ('ride_car', 'Carro Waesy Go 3D', '/icons/vehicles/car-3d.svg', '/icons/vehicles/car-top.svg', 1.00),
  ('ride_moto', 'MotoLink 3D', '/icons/vehicles/moto-3d.svg', '/icons/vehicles/moto-top.svg', 0.95),
  ('delivery_express', 'Entrega Expressa 3D', '/icons/vehicles/moto-box-3d.svg', '/icons/vehicles/moto-top.svg', 0.95),
  ('freight_van', 'Utilitário / Van 3D', '/icons/vehicles/van-3d.svg', '/icons/vehicles/van-top.svg', 1.10),
  ('moving_truck', 'Caminhão de Mudança 3D', '/icons/vehicles/truck-3d.svg', '/icons/vehicles/truck-top.svg', 1.25),
  ('carona', 'Carona Intermunicipal 3D', '/icons/vehicles/carpool-3d.svg', '/icons/vehicles/car-top.svg', 1.00),
  ('bus', 'Ônibus Rodoviário 3D', '/icons/vehicles/bus-3d.svg', '/icons/vehicles/bus-top.svg', 1.30)
ON CONFLICT (service_type) DO NOTHING;

INSERT INTO public.bus_routes_schedules (operator_name, operator_slug, origin_city, origin_state, destination_city, destination_state, departure_time, arrival_time, duration_minutes, service_class, price_cents, total_seats, intermediate_stops)
SELECT * FROM (VALUES
  ('Reunidas', 'reunidas', 'São Miguel do Oeste', 'SC', 'Chapecó', 'SC', '07:00', '09:30', 150, 'Executivo', 6490, 42, '[{"city":"Maravilha","time":"08:05","price_cents":2990},{"city":"Pinhalzinho","time":"08:35","price_cents":4290}]'::jsonb),
  ('Reunidas', 'reunidas', 'Chapecó', 'SC', 'Florianópolis', 'SC', '08:00', '17:30', 570, 'Semi-Leito', 21990, 42, '[{"city":"Concórdia","time":"09:40","price_cents":4800},{"city":"Joaçaba","time":"11:10","price_cents":8500},{"city":"Lages","time":"14:15","price_cents":14900},{"city":"São José","time":"17:10","price_cents":20900}]'::jsonb),
  ('Planalto', 'planalto', 'Chapecó', 'SC', 'Porto Alegre', 'RS', '21:30', '05:00', 450, 'Leito Total', 18990, 36, '[{"city":"Iraí","time":"22:50","price_cents":4500},{"city":"Carazinho","time":"00:45","price_cents":9800},{"city":"Lajeado","time":"03:15","price_cents":15500}]'::jsonb),
  ('Unesul', 'unesul', 'São Miguel do Oeste', 'SC', 'Florianópolis', 'SC', '19:00', '06:30', 690, 'Semi-Leito', 25990, 42, '[{"city":"Maravilha","time":"20:05","price_cents":3200},{"city":"Chapecó","time":"21:40","price_cents":6500},{"city":"Concórdia","time":"23:15","price_cents":10900},{"city":"Lages","time":"02:45","price_cents":18500},{"city":"São José","time":"06:05","price_cents":24900}]'::jsonb)
) AS v(operator_name, operator_slug, origin_city, origin_state, destination_city, destination_state, departure_time, arrival_time, duration_minutes, service_class, price_cents, total_seats, intermediate_stops)
WHERE NOT EXISTS (SELECT 1 FROM public.bus_routes_schedules LIMIT 1);

COMMIT;
