-- ==============================================================================
-- WAVE 6: FINAL TOURISM RLS HARDENING
-- Removes permissive tourism/travel/voucher policies and enforces tenant scope.
-- Public token workflows must use the server-side BFF; direct table access is not
-- a public API for confidential travel data.
-- ==============================================================================

DO $$
DECLARE
  table_name text;
  store_tables text[] := ARRAY[
    'travel_suppliers',
    'travel_visas',
    'travel_vouchers',
    'travel_departures_kanban',
    'traveler_forms'
  ];
BEGIN
  FOREACH table_name IN ARRAY store_tables LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I_store_manage ON public.%I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I_anon_read ON public.%I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I_public_access ON public.%I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I_token_access ON public.%I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I_public_read ON public.%I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I_token_update ON public.%I', table_name, table_name);
      EXECUTE format('CREATE POLICY %I_tenant_manage ON public.%I FOR ALL TO authenticated USING (public.is_platform_admin() OR public.is_store_staff(store_id)) WITH CHECK (public.is_platform_admin() OR public.is_store_staff(store_id))', table_name, table_name);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['agencies','clients','proposals','proposal_items','trips','trip_passengers','vouchers','group_tours','group_tour_enrollments','group_tour_costs','bus_layouts','bus_seat_assignments'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', table_name);
    END IF;
  END LOOP;

  IF to_regclass('public.agencies') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Agencies staff access" ON public.agencies;
    DROP POLICY IF EXISTS agencies_staff_access ON public.agencies;
    DROP POLICY IF EXISTS "agencies_tenant_manage" ON public.agencies;
    CREATE POLICY agencies_tenant_manage ON public.agencies
      FOR ALL TO authenticated
      USING (public.is_platform_admin() OR public.is_store_staff(store_id))
      WITH CHECK (public.is_platform_admin() OR public.is_store_staff(store_id));
  END IF;

  IF to_regclass('public.clients') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Clients staff access" ON public.clients;
    DROP POLICY IF EXISTS clients_staff_access ON public.clients;
    DROP POLICY IF EXISTS clients_tenant_manage ON public.clients;
    CREATE POLICY clients_tenant_manage ON public.clients
      FOR ALL TO authenticated
      USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = clients.agency_id AND public.is_store_staff(a.store_id)))
      WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = clients.agency_id AND public.is_store_staff(a.store_id)));
  END IF;

  IF to_regclass('public.proposals') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read proposals by token" ON public.proposals;
    DROP POLICY IF EXISTS proposals_staff_access ON public.proposals;
    DROP POLICY IF EXISTS "Proposals staff access" ON public.proposals;
    DROP POLICY IF EXISTS proposals_tenant_manage ON public.proposals;
    CREATE POLICY proposals_tenant_manage ON public.proposals
      FOR ALL TO authenticated
      USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = proposals.agency_id AND public.is_store_staff(a.store_id)))
      WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = proposals.agency_id AND public.is_store_staff(a.store_id)));
  END IF;

  IF to_regclass('public.proposal_items') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Proposals staff access" ON public.proposal_items;
    DROP POLICY IF EXISTS proposal_items_access_policy ON public.proposal_items;
    DROP POLICY IF EXISTS proposal_items_tenant_manage ON public.proposal_items;
    CREATE POLICY proposal_items_tenant_manage ON public.proposal_items
      FOR ALL TO authenticated
      USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.proposals p JOIN public.agencies a ON a.id = p.agency_id WHERE p.id = proposal_items.proposal_id AND public.is_store_staff(a.store_id)))
      WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.proposals p JOIN public.agencies a ON a.id = p.agency_id WHERE p.id = proposal_items.proposal_id AND public.is_store_staff(a.store_id)));
  END IF;

  IF to_regclass('public.trips') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Trips staff access" ON public.trips;
    DROP POLICY IF EXISTS trips_staff_access ON public.trips;
    DROP POLICY IF EXISTS trips_tenant_manage ON public.trips;
    CREATE POLICY trips_tenant_manage ON public.trips
      FOR ALL TO authenticated
      USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = trips.agency_id AND public.is_store_staff(a.store_id)))
      WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = trips.agency_id AND public.is_store_staff(a.store_id)));
  END IF;

  IF to_regclass('public.trip_passengers') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Workspace members manage trip passengers" ON public.trip_passengers;
    DROP POLICY IF EXISTS trip_passengers_tenant_manage ON public.trip_passengers;
    CREATE POLICY trip_passengers_tenant_manage ON public.trip_passengers
      FOR ALL TO authenticated
      USING (public.is_platform_admin() OR public.is_store_staff(store_id))
      WITH CHECK (public.is_platform_admin() OR public.is_store_staff(store_id));
  END IF;

  IF to_regclass('public.vouchers') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Vouchers staff access" ON public.vouchers;
    DROP POLICY IF EXISTS vouchers_staff_access ON public.vouchers;
    DROP POLICY IF EXISTS vouchers_tenant_manage ON public.vouchers;
    CREATE POLICY vouchers_tenant_manage ON public.vouchers
      FOR ALL TO authenticated
      USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = vouchers.agency_id AND public.is_store_staff(a.store_id)))
      WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = vouchers.agency_id AND public.is_store_staff(a.store_id)));
  END IF;

  IF to_regclass('public.group_tours') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Group tours staff access" ON public.group_tours;
    DROP POLICY IF EXISTS group_tours_staff_manage ON public.group_tours;
    DROP POLICY IF EXISTS group_tours_tenant_manage ON public.group_tours;
    CREATE POLICY group_tours_tenant_manage ON public.group_tours
      FOR ALL TO authenticated
      USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = group_tours.agency_id AND public.is_store_staff(a.store_id)))
      WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = group_tours.agency_id AND public.is_store_staff(a.store_id)));
  END IF;

  IF to_regclass('public.group_tour_enrollments') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Workspace members manage group tour enrollments" ON public.group_tour_enrollments;
    DROP POLICY IF EXISTS group_tour_enrollments_tenant_manage ON public.group_tour_enrollments;
    CREATE POLICY group_tour_enrollments_tenant_manage ON public.group_tour_enrollments
      FOR ALL TO authenticated
      USING (public.is_platform_admin() OR public.is_store_staff(agency_id))
      WITH CHECK (public.is_platform_admin() OR public.is_store_staff(agency_id));
  END IF;

  IF to_regclass('public.group_tour_costs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Workspace members manage group tour costs" ON public.group_tour_costs;
    DROP POLICY IF EXISTS group_tour_costs_tenant_manage ON public.group_tour_costs;
    CREATE POLICY group_tour_costs_tenant_manage ON public.group_tour_costs
      FOR ALL TO authenticated
      USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.group_tours g JOIN public.agencies a ON a.id = g.agency_id WHERE g.id = group_tour_costs.tour_id AND public.is_store_staff(a.store_id)))
      WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.group_tours g JOIN public.agencies a ON a.id = g.agency_id WHERE g.id = group_tour_costs.tour_id AND public.is_store_staff(a.store_id)));
  END IF;

  IF to_regclass('public.bus_layouts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Bus layouts staff access" ON public.bus_layouts;
    DROP POLICY IF EXISTS bus_layouts_staff_manage ON public.bus_layouts;
    DROP POLICY IF EXISTS bus_layouts_tenant_manage ON public.bus_layouts;
    CREATE POLICY bus_layouts_tenant_manage ON public.bus_layouts
      FOR ALL TO authenticated
      USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = bus_layouts.agency_id AND public.is_store_staff(a.store_id)))
      WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = bus_layouts.agency_id AND public.is_store_staff(a.store_id)));
  END IF;

  IF to_regclass('public.bus_seat_assignments') IS NOT NULL THEN
    DROP POLICY IF EXISTS bus_seat_assignments_public_view ON public.bus_seat_assignments;
    DROP POLICY IF EXISTS bus_seat_assignments_tenant_manage ON public.bus_seat_assignments;
    CREATE POLICY bus_seat_assignments_tenant_manage ON public.bus_seat_assignments
      FOR ALL TO authenticated
      USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.group_tours g WHERE g.id = bus_seat_assignments.group_tour_id AND public.is_store_staff((SELECT a.store_id FROM public.agencies a WHERE a.id = g.agency_id))))
      WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.group_tours g WHERE g.id = bus_seat_assignments.group_tour_id AND public.is_store_staff((SELECT a.store_id FROM public.agencies a WHERE a.id = g.agency_id))));
  END IF;
END $$;

-- Remove direct anonymous access to sensitive travel entities. Public pages use BFF/token RPCs.
REVOKE ALL ON TABLE public.travel_suppliers, public.travel_visas, public.travel_vouchers,
  public.travel_departures_kanban, public.traveler_forms,
  public.agencies, public.clients, public.proposals, public.proposal_items,
  public.trips, public.trip_passengers, public.vouchers,
  public.group_tours, public.group_tour_enrollments, public.group_tour_costs,
  public.bus_layouts, public.bus_seat_assignments
FROM anon;
