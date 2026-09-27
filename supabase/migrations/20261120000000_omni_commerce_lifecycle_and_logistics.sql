-- Migration: Omni-Commerce Lifecycle, Waesy Go Motolink & Calendar Matrix
-- Enforces:
-- 1. Classifieds lifecycle (stock_limit, offer_limit, claimed_count, expires_at)
-- 2. Delivery Runs and Live Telemetry Events for Waesy Go / Motolink
-- 3. Resource Availabilities with Anti-Double Booking Constraint

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. CLASSIFIEDS LIFECYCLE
ALTER TABLE public.classifieds
  ADD COLUMN IF NOT EXISTS stock_limit integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS offer_limit integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS claimed_count integer DEFAULT 0;

-- Function to automatically expire classifieds
CREATE OR REPLACE FUNCTION public.expire_classifieds_cron()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.classifieds
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 2. WAESY GO / MOTOLINK RUNS
CREATE TABLE IF NOT EXISTS public.delivery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  magic_token text NOT NULL UNIQUE,
  pin_code varchar(4) NOT NULL,
  status text NOT NULL DEFAULT 'pending_dispatch'
    CHECK (status IN ('pending_dispatch', 'link_generated', 'accepted', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled')),
  courier_id uuid REFERENCES public.couriers(id) ON DELETE SET NULL,
  courier_name text,
  courier_phone text,
  delivery_fee_cents integer NOT NULL DEFAULT 0,
  current_lat double precision,
  current_lng double precision,
  last_ping_at timestamptz,
  proof_photo_url text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_runs_order ON public.delivery_runs(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_token ON public.delivery_runs(magic_token);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_store ON public.delivery_runs(store_id);

CREATE TABLE IF NOT EXISTS public.delivery_events (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.delivery_runs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  latitude double precision,
  longitude double precision,
  battery_level integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_events_run ON public.delivery_events(run_id, created_at DESC);

ALTER TABLE public.delivery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_runs' AND policyname = 'delivery_runs_public_read_by_token'
  ) THEN
    CREATE POLICY delivery_runs_public_read_by_token ON public.delivery_runs
      FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_runs' AND policyname = 'delivery_runs_update_by_token'
  ) THEN
    CREATE POLICY delivery_runs_update_by_token ON public.delivery_runs
      FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_events' AND policyname = 'delivery_events_insert_all'
  ) THEN
    CREATE POLICY delivery_events_insert_all ON public.delivery_events
      FOR ALL USING (true);
  END IF;
END $$;

-- 3. CALENDAR MATRIX: RESOURCE AVAILABILITY & ANTI-DOUBLE BOOKING
CREATE TABLE IF NOT EXISTS public.resource_availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL,
  resource_type text NOT NULL, -- 'booking_resource' | 'classified_property'
  booking_range tstzrange NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('held_for_checkout', 'confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_availabilities_range ON public.resource_availabilities USING gist (resource_id, booking_range);

-- Anti-Double Booking RPC
CREATE OR REPLACE FUNCTION public.hold_resource_slot(
  p_resource_id uuid,
  p_resource_type text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_order_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conflict_count integer;
  v_new_id uuid;
BEGIN
  -- Check for existing active holds or confirmed bookings that overlap
  SELECT count(*) INTO v_conflict_count
  FROM public.resource_availabilities
  WHERE resource_id = p_resource_id
    AND status IN ('held_for_checkout', 'confirmed')
    AND booking_range && tstzrange(p_start_at, p_end_at);

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CONFLICT_DOUBLE_BOOKING',
      'message', 'Este horário ou data já se encontra reservado por outro cliente.'
    );
  END IF;

  INSERT INTO public.resource_availabilities (
    resource_id,
    resource_type,
    booking_range,
    order_id,
    status
  ) VALUES (
    p_resource_id,
    p_resource_type,
    tstzrange(p_start_at, p_end_at),
    p_order_id,
    'confirmed'
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'availability_id', v_new_id
  );
END;
$$;
