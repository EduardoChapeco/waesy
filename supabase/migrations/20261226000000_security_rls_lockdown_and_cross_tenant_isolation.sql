-- ==============================================================================
-- Migration: 20261226000000_security_rls_lockdown_and_cross_tenant_isolation.sql
-- Plano 4 — Bloco 8 (R51): RLS Lockdown e Isolamento Multi-Tenant Estrito
-- ==============================================================================

-- 1. Reference / Canonical Catalogs (Read-only para público, mutação restrita)
ALTER TABLE IF EXISTS public.canonical_device_brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "canonical_device_brands_read" ON public.canonical_device_brands;
CREATE POLICY "canonical_device_brands_read" ON public.canonical_device_brands
  FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.canonical_device_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "canonical_device_models_read" ON public.canonical_device_models;
CREATE POLICY "canonical_device_models_read" ON public.canonical_device_models
  FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.canonical_vehicle_brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "canonical_vehicle_brands_read" ON public.canonical_vehicle_brands;
CREATE POLICY "canonical_vehicle_brands_read" ON public.canonical_vehicle_brands
  FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.canonical_vehicle_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "canonical_vehicle_models_read" ON public.canonical_vehicle_models;
CREATE POLICY "canonical_vehicle_models_read" ON public.canonical_vehicle_models
  FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.canonical_job_occupations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "canonical_job_occupations_read" ON public.canonical_job_occupations;
CREATE POLICY "canonical_job_occupations_read" ON public.canonical_job_occupations
  FOR SELECT USING (true);

-- 2. Tourism & Operational Tables RLS Enforcement
ALTER TABLE IF EXISTS public.boarding_rooming_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "boarding_rooming_list_tenant_isolation" ON public.boarding_rooming_list;
CREATE POLICY "boarding_rooming_list_tenant_isolation" ON public.boarding_rooming_list
  FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT a.id FROM public.agencies a
      JOIN public.stores s ON s.id = a.store_id
      JOIN public.store_members sm ON sm.store_id = s.id
      WHERE sm.user_id = auth.uid()
    )
  );

ALTER TABLE IF EXISTS public.bus_seat_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bus_seat_assignments_tenant_isolation" ON public.bus_seat_assignments;
CREATE POLICY "bus_seat_assignments_tenant_isolation" ON public.bus_seat_assignments
  FOR ALL
  TO authenticated
  USING (
    group_tour_id IN (
      SELECT gt.id FROM public.group_tours gt
      JOIN public.agencies a ON a.id = gt.agency_id
      JOIN public.stores s ON s.id = a.store_id
      JOIN public.store_members sm ON sm.store_id = s.id
      WHERE sm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bus_seat_assignments_public_view" ON public.bus_seat_assignments;
CREATE POLICY "bus_seat_assignments_public_view" ON public.bus_seat_assignments
  FOR SELECT
  TO public
  USING (status = 'occupied');

ALTER TABLE IF EXISTS public.corporate_rfps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "corporate_rfps_tenant_isolation" ON public.corporate_rfps;
CREATE POLICY "corporate_rfps_tenant_isolation" ON public.corporate_rfps
  FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT a.id FROM public.agencies a
      JOIN public.stores s ON s.id = a.store_id
      JOIN public.store_members sm ON sm.store_id = s.id
      WHERE sm.user_id = auth.uid()
    )
  );

ALTER TABLE IF EXISTS public.resource_availabilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resource_availabilities_public_read" ON public.resource_availabilities;
CREATE POLICY "resource_availabilities_public_read" ON public.resource_availabilities
  FOR SELECT
  TO public
  USING (status IN ('confirmed', 'held_for_checkout'));

DROP POLICY IF EXISTS "resource_availabilities_store_manage" ON public.resource_availabilities;
CREATE POLICY "resource_availabilities_store_manage" ON public.resource_availabilities
  FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.store_members sm ON sm.store_id = o.store_id
      WHERE sm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.booking_resources br
      JOIN public.store_members sm ON sm.store_id = br.store_id
      WHERE br.id = resource_id AND sm.user_id = auth.uid()
    )
  );

-- Garantir que service_role mantenha bypass em todas as tabelas
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
