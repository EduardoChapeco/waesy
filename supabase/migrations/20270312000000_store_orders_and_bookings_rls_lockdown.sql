-- ==============================================================================
-- 20270312000000_store_orders_and_bookings_rls_lockdown.sql
--
-- Governança: AGENTS.md B.4, B.8, B.31 & Mandato Zero-Trust
-- Finalidade: Habilitação de RLS e isolamento multi-tenant hermético em
--             store_orders e travel_bookings
-- ==============================================================================

DO $$
BEGIN
  -- 1. store_orders
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'store_orders') THEN
    ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.store_orders FROM anon;

    DROP POLICY IF EXISTS "store_orders_store_isolation" ON public.store_orders;
    CREATE POLICY "store_orders_store_isolation" ON public.store_orders
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.store_members sm
          WHERE sm.store_id = store_orders.store_id AND sm.profile_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.store_id = store_orders.store_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.store_members sm
          WHERE sm.store_id = store_orders.store_id AND sm.profile_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.store_id = store_orders.store_id
        )
      );
  END IF;

  -- 2. travel_bookings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_bookings') THEN
    ALTER TABLE public.travel_bookings ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.travel_bookings FROM anon;

    -- Store members isolation
    DROP POLICY IF EXISTS "travel_bookings_store_isolation" ON public.travel_bookings;
    CREATE POLICY "travel_bookings_store_isolation" ON public.travel_bookings
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.store_members sm
          WHERE sm.store_id = travel_bookings.store_id AND sm.profile_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.store_id = travel_bookings.store_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.store_members sm
          WHERE sm.store_id = travel_bookings.store_id AND sm.profile_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.store_id = travel_bookings.store_id
        )
      );

    -- Customer self-service read
    DROP POLICY IF EXISTS "travel_bookings_customer_read" ON public.travel_bookings;
    CREATE POLICY "travel_bookings_customer_read" ON public.travel_bookings
      FOR SELECT
      TO authenticated
      USING (
        customer_id = auth.uid()
      );

    -- Customer self-service insert
    DROP POLICY IF EXISTS "travel_bookings_customer_insert" ON public.travel_bookings;
    CREATE POLICY "travel_bookings_customer_insert" ON public.travel_bookings
      FOR INSERT
      TO authenticated
      WITH CHECK (
        customer_id = auth.uid()
      );
  END IF;
END $$;
