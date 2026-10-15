-- ==============================================================================
-- 20270125000000_m3_rls_tenant_hardening_and_rpc_lockdown.sql
-- Waesy Master Plan: Marco 3
-- 1. Elimina politicas permissivas publicas/anon em tabelas operacionais e de scraping
-- 2. Restringe RPCs criticas com SECURITY DEFINER para acesso exclusivo via service_role
-- 3. Garante isolamento multi-tenant soberano por store_id e workspace_members
-- ==============================================================================

BEGIN;

-- ── 1. HARDENING DE POLÍTICAS DE RLS PERMISSIVAS ──────────────────────────────

-- crawl_cache
DROP POLICY IF EXISTS "crawl_cache_staff_all" ON public.crawl_cache;
DROP POLICY IF EXISTS "crawl_cache_service_role" ON public.crawl_cache;
CREATE POLICY "crawl_cache_service_role" ON public.crawl_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- crawl_queue
DROP POLICY IF EXISTS "crawl_queue_staff_all" ON public.crawl_queue;
DROP POLICY IF EXISTS "crawl_queue_service_role" ON public.crawl_queue;
CREATE POLICY "crawl_queue_service_role" ON public.crawl_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- crawl_seeds
DROP POLICY IF EXISTS "crawl_seeds_staff_all" ON public.crawl_seeds;
DROP POLICY IF EXISTS "crawl_seeds_service_role" ON public.crawl_seeds;
CREATE POLICY "crawl_seeds_service_role" ON public.crawl_seeds
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- domain_configs
DROP POLICY IF EXISTS "domain_configs_staff_all" ON public.domain_configs;
DROP POLICY IF EXISTS "domain_configs_service_role" ON public.domain_configs;
CREATE POLICY "domain_configs_service_role" ON public.domain_configs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- domain_cooldowns
DROP POLICY IF EXISTS "domain_cooldowns_staff_all" ON public.domain_cooldowns;
DROP POLICY IF EXISTS "domain_cooldowns_service_role" ON public.domain_cooldowns;
CREATE POLICY "domain_cooldowns_service_role" ON public.domain_cooldowns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- mined_products
DROP POLICY IF EXISTS "mined_products_staff_all" ON public.mined_products;
DROP POLICY IF EXISTS "mined_products_service_role" ON public.mined_products;
DROP POLICY IF EXISTS "mined_products_public_select" ON public.mined_products;
CREATE POLICY "mined_products_service_role" ON public.mined_products
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mined_products_public_select" ON public.mined_products
  FOR SELECT TO anon, authenticated USING (true);

-- mining_schedules
DROP POLICY IF EXISTS "mining_schedules_staff_all" ON public.mining_schedules;
DROP POLICY IF EXISTS "allow_service_role_all" ON public.mining_schedules;
DROP POLICY IF EXISTS "mining_schedules_service_role" ON public.mining_schedules;
CREATE POLICY "mining_schedules_service_role" ON public.mining_schedules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- delivery_events (run_id -> delivery_runs.id)
DROP POLICY IF EXISTS "delivery_events_insert_all" ON public.delivery_events;
DROP POLICY IF EXISTS "delivery_events_service_role" ON public.delivery_events;
DROP POLICY IF EXISTS "delivery_events_auth_select" ON public.delivery_events;
CREATE POLICY "delivery_events_service_role" ON public.delivery_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "delivery_events_auth_select" ON public.delivery_events
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.delivery_runs dr
      JOIN public.workspace_members wm ON wm.store_id = dr.store_id
      WHERE dr.id = delivery_events.run_id AND wm.profile_id = auth.uid()
    )
  );

-- delivery_runs
DROP POLICY IF EXISTS "delivery_runs_update_by_token" ON public.delivery_runs;
DROP POLICY IF EXISTS "delivery_runs_service_role" ON public.delivery_runs;
DROP POLICY IF EXISTS "delivery_runs_store_members" ON public.delivery_runs;
CREATE POLICY "delivery_runs_service_role" ON public.delivery_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "delivery_runs_store_members" ON public.delivery_runs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = delivery_runs.store_id AND wm.profile_id = auth.uid()
    )
  );

-- order_events
DROP POLICY IF EXISTS "order_events_service_all" ON public.order_events;
DROP POLICY IF EXISTS "order_events_service_role" ON public.order_events;
DROP POLICY IF EXISTS "order_events_store_members" ON public.order_events;
CREATE POLICY "order_events_service_role" ON public.order_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "order_events_store_members" ON public.order_events
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = order_events.store_id AND wm.profile_id = auth.uid()
    )
  );

-- rss_feeds
DROP POLICY IF EXISTS "rss_feeds_staff_all" ON public.rss_feeds;
DROP POLICY IF EXISTS "rss_feeds_service_role" ON public.rss_feeds;
DROP POLICY IF EXISTS "rss_feeds_public_select" ON public.rss_feeds;
CREATE POLICY "rss_feeds_service_role" ON public.rss_feeds
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "rss_feeds_public_select" ON public.rss_feeds
  FOR SELECT TO anon, authenticated USING (true);

-- scraper_audit_log
DROP POLICY IF EXISTS "scraper_audit_log_staff_all" ON public.scraper_audit_log;
DROP POLICY IF EXISTS "allow_service_role_all" ON public.scraper_audit_log;
DROP POLICY IF EXISTS "scraper_audit_log_service_role" ON public.scraper_audit_log;
CREATE POLICY "scraper_audit_log_service_role" ON public.scraper_audit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- scraper_configs
DROP POLICY IF EXISTS "scraper_configs_staff_all" ON public.scraper_configs;
DROP POLICY IF EXISTS "scraper_configs_service_role" ON public.scraper_configs;
CREATE POLICY "scraper_configs_service_role" ON public.scraper_configs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- sdr_chat_sessions
DROP POLICY IF EXISTS "Service role anon can update chat sessions" ON public.sdr_chat_sessions;
DROP POLICY IF EXISTS "Service role anon can insert chat sessions" ON public.sdr_chat_sessions;
DROP POLICY IF EXISTS "sdr_chat_sessions_service_role" ON public.sdr_chat_sessions;
DROP POLICY IF EXISTS "sdr_chat_sessions_user_access" ON public.sdr_chat_sessions;
CREATE POLICY "sdr_chat_sessions_service_role" ON public.sdr_chat_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "sdr_chat_sessions_user_access" ON public.sdr_chat_sessions
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.store_id = sdr_chat_sessions.store_id AND wm.profile_id = auth.uid()
    )
  );

-- mobility_offers_negotiations
DROP POLICY IF EXISTS "Participants can view and create negotiations" ON public.mobility_offers_negotiations;
DROP POLICY IF EXISTS "mobility_offers_negotiations_service_role" ON public.mobility_offers_negotiations;
DROP POLICY IF EXISTS "mobility_offers_negotiations_participants" ON public.mobility_offers_negotiations;
CREATE POLICY "mobility_offers_negotiations_service_role" ON public.mobility_offers_negotiations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mobility_offers_negotiations_participants" ON public.mobility_offers_negotiations
  FOR ALL TO authenticated USING (
    courier_profile_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.store_id = mobility_offers_negotiations.store_id AND wm.profile_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.mobility_requests mr
      WHERE mr.id = mobility_offers_negotiations.request_id AND mr.customer_id = auth.uid()
    )
  ) WITH CHECK (
    courier_profile_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.store_id = mobility_offers_negotiations.store_id AND wm.profile_id = auth.uid()
    )
  );

-- ── 2. RESTRIÇÃO DE ACESSO PÚBLICO EM RPCS SECURITY DEFINER ──────────────────

-- Revoga privilégio de execução pública / anon / authenticated em RPCs administrativas
REVOKE EXECUTE ON FUNCTION public.apply_infotravel_booking(uuid, uuid, text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.calculate_travel_sale_commissions(uuid, uuid, uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_calculate_travel_sale_commission() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.settle_travel_commission(uuid, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_store_whatsapp_analytics(uuid, integer) FROM anon, authenticated, public;

-- Concede privilégio de execução estritamente para service_role (BFF Server Functions)
GRANT EXECUTE ON FUNCTION public.apply_infotravel_booking(uuid, uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_travel_sale_commissions(uuid, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_calculate_travel_sale_commission() TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_travel_commission(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_store_whatsapp_analytics(uuid, integer) TO service_role;

COMMIT;
