-- 1. Taxonomia canonica: leitura publica permitida para dropdowns e filtros
DROP POLICY IF EXISTS "canonical_vehicle_brands_public_read" ON public.canonical_vehicle_brands;
CREATE POLICY "canonical_vehicle_brands_public_read" ON public.canonical_vehicle_brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "canonical_vehicle_models_public_read" ON public.canonical_vehicle_models;
CREATE POLICY "canonical_vehicle_models_public_read" ON public.canonical_vehicle_models FOR SELECT USING (true);

DROP POLICY IF EXISTS "canonical_device_brands_public_read" ON public.canonical_device_brands;
CREATE POLICY "canonical_device_brands_public_read" ON public.canonical_device_brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "canonical_device_models_public_read" ON public.canonical_device_models;
CREATE POLICY "canonical_device_models_public_read" ON public.canonical_device_models FOR SELECT USING (true);

DROP POLICY IF EXISTS "canonical_job_occupations_public_read" ON public.canonical_job_occupations;
CREATE POLICY "canonical_job_occupations_public_read" ON public.canonical_job_occupations FOR SELECT USING (true);

-- 2. Tabelas operacionais com isolamento multi-tenant
DROP POLICY IF EXISTS "brand_kits_tenant_isolation" ON public.brand_kits;
CREATE POLICY "brand_kits_tenant_isolation" ON public.brand_kits
  FOR ALL USING (auth.role() = 'service_role' OR store_id = ANY(auth_user_store_ids()));

DROP POLICY IF EXISTS "folders_tenant_isolation" ON public.folders;
CREATE POLICY "folders_tenant_isolation" ON public.folders
  FOR ALL USING (auth.role() = 'service_role' OR store_id = ANY(auth_user_store_ids()));

DROP POLICY IF EXISTS "ad_ledger_service_or_admin" ON public.ad_ledger;
CREATE POLICY "ad_ledger_service_or_admin" ON public.ad_ledger
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "webhook_events_service_only" ON public.webhook_events;
CREATE POLICY "webhook_events_service_only" ON public.webhook_events
  FOR ALL USING (auth.role() = 'service_role');
