-- ============================================================================
-- Migration: Holistic Security, RLS Lockdown, Storage Buckets & RPC Hardening
-- Spec: docs/specs/SPEC-20261117-HOLISTIC-REMEDIATION-E2E.md (Microphase M2)
-- ============================================================================

-- ── 1. Provisionamento de Buckets Faltantes (recipes, order-receipts, rma-proofs) ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'recipes',
    'recipes',
    true,
    15728640,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']::text[]
  ),
  (
    'order-receipts',
    'order-receipts',
    false,
    20971520,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
  ),
  (
    'rma-proofs',
    'rma-proofs',
    false,
    20971520,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf']::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 2. Blindagem RLS em storage.objects ─────────────────────────────────────────
-- 2.1 home-banners & home-categories: escrita restrita a platform_admin
DROP POLICY IF EXISTS "home_storage_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "home_storage_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "home_storage_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "home_storage_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "home_storage_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "home_storage_admin_delete" ON storage.objects;

DROP POLICY IF EXISTS "home_storage_admin_insert" ON storage.objects;
CREATE POLICY "home_storage_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('home-banners', 'home-categories') AND public.is_platform_admin());

DROP POLICY IF EXISTS "home_storage_admin_update" ON storage.objects;
CREATE POLICY "home_storage_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('home-banners', 'home-categories') AND public.is_platform_admin())
  WITH CHECK (bucket_id IN ('home-banners', 'home-categories') AND public.is_platform_admin());

DROP POLICY IF EXISTS "home_storage_admin_delete" ON storage.objects;
CREATE POLICY "home_storage_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('home-banners', 'home-categories') AND public.is_platform_admin());

-- 2.2 recipes: leitura pública, mutação apenas por staff da loja ou platform_admin
DROP POLICY IF EXISTS "recipes_public_read" ON storage.objects;
DROP POLICY IF EXISTS "recipes_staff_insert" ON storage.objects;
DROP POLICY IF EXISTS "recipes_staff_delete" ON storage.objects;

DROP POLICY IF EXISTS "recipes_public_read" ON storage.objects;
CREATE POLICY "recipes_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'recipes');

DROP POLICY IF EXISTS "recipes_staff_insert" ON storage.objects;
CREATE POLICY "recipes_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'recipes'
    AND (
      public.is_platform_admin()
      OR ((storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' AND public.is_store_staff(((storage.foldername(name))[1])::uuid))
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "recipes_staff_delete" ON storage.objects;
CREATE POLICY "recipes_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'recipes'
    AND (
      public.is_platform_admin()
      OR ((storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' AND public.is_store_staff(((storage.foldername(name))[1])::uuid))
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  );

-- 2.3 order-receipts & rma-proofs: privados, escopados por pasta do usuário ou staff da loja
DROP POLICY IF EXISTS "private_proofs_scoped_select" ON storage.objects;
DROP POLICY IF EXISTS "private_proofs_scoped_insert" ON storage.objects;
DROP POLICY IF EXISTS "private_proofs_scoped_delete" ON storage.objects;

DROP POLICY IF EXISTS "private_proofs_scoped_select" ON storage.objects;
CREATE POLICY "private_proofs_scoped_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('order-receipts', 'rma-proofs')
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR ((storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' AND public.is_store_staff(((storage.foldername(name))[1])::uuid))
    )
  );

DROP POLICY IF EXISTS "private_proofs_scoped_insert" ON storage.objects;
CREATE POLICY "private_proofs_scoped_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('order-receipts', 'rma-proofs')
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR ((storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' AND public.is_store_staff(((storage.foldername(name))[1])::uuid))
    )
  );

DROP POLICY IF EXISTS "private_proofs_scoped_delete" ON storage.objects;
CREATE POLICY "private_proofs_scoped_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('order-receipts', 'rma-proofs')
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR ((storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' AND public.is_store_staff(((storage.foldername(name))[1])::uuid))
    )
  );

-- 2.4 chat-media-private: exigir vínculo ativo em workspace_members
DROP POLICY IF EXISTS "chat_media_private_staff_select" ON storage.objects;
CREATE POLICY "chat_media_private_staff_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media-private'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id::text = (storage.foldername(name))[1]
          AND COALESCE(wm.is_active, true) = true
          AND (wm.profile_id = (SELECT auth.uid()) OR wm.user_id = (SELECT auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "chat_media_private_staff_insert" ON storage.objects;
CREATE POLICY "chat_media_private_staff_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media-private'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id::text = (storage.foldername(name))[1]
          AND COALESCE(wm.is_active, true) = true
          AND (wm.profile_id = (SELECT auth.uid()) OR wm.user_id = (SELECT auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "chat_media_private_staff_delete" ON storage.objects;
CREATE POLICY "chat_media_private_staff_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-media-private'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id::text = (storage.foldername(name))[1]
          AND COALESCE(wm.is_active, true) = true
          AND (wm.profile_id = (SELECT auth.uid()) OR wm.user_id = (SELECT auth.uid()))
      )
    )
  );

-- ── 3. Remoção / Substituição de Policies Permissivas USING(true) em Tabelas Sensíveis ──
DO $$
BEGIN
  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.classified_delivery_dispatches')), false) THEN
    DROP POLICY IF EXISTS "classified_dispatches_update_token" ON public.classified_delivery_dispatches;
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.mobility_offers_negotiations')), false) THEN
    DROP POLICY IF EXISTS "Participants can view and create negotiations" ON public.mobility_offers_negotiations;
    DROP POLICY IF EXISTS "mobility_offers_negotiations_service_all" ON public.mobility_offers_negotiations;
    DROP POLICY IF EXISTS "mobility_offers_negotiations_service_all" ON public.mobility_offers_negotiations;
    CREATE POLICY "mobility_offers_negotiations_service_all" ON public.mobility_offers_negotiations
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.carona_waypoints')), false) THEN
    DROP POLICY IF EXISTS "Authenticated manage waypoints" ON public.carona_waypoints;
    DROP POLICY IF EXISTS "carona_waypoints_public_select" ON public.carona_waypoints;
    DROP POLICY IF EXISTS "carona_waypoints_admin_all" ON public.carona_waypoints;
    DROP POLICY IF EXISTS "carona_waypoints_public_select" ON public.carona_waypoints;
    CREATE POLICY "carona_waypoints_public_select" ON public.carona_waypoints FOR SELECT TO public USING (true);
    DROP POLICY IF EXISTS "carona_waypoints_admin_all" ON public.carona_waypoints;
    CREATE POLICY "carona_waypoints_admin_all" ON public.carona_waypoints FOR ALL TO authenticated
      USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.mobility_vehicle_sprites')), false) THEN
    DROP POLICY IF EXISTS "Authenticated update vehicle sprites" ON public.mobility_vehicle_sprites;
    DROP POLICY IF EXISTS "mobility_vehicle_sprites_public_select" ON public.mobility_vehicle_sprites;
    DROP POLICY IF EXISTS "mobility_vehicle_sprites_admin_all" ON public.mobility_vehicle_sprites;
    DROP POLICY IF EXISTS "mobility_vehicle_sprites_public_select" ON public.mobility_vehicle_sprites;
    CREATE POLICY "mobility_vehicle_sprites_public_select" ON public.mobility_vehicle_sprites FOR SELECT TO public USING (true);
    DROP POLICY IF EXISTS "mobility_vehicle_sprites_admin_all" ON public.mobility_vehicle_sprites;
    CREATE POLICY "mobility_vehicle_sprites_admin_all" ON public.mobility_vehicle_sprites FOR ALL TO authenticated
      USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.chat_messages')), false) THEN
    DROP POLICY IF EXISTS "chat_messages_wave2_update" ON public.chat_messages;
    DROP POLICY IF EXISTS "chat_messages_wave2_update" ON public.chat_messages;
    CREATE POLICY "chat_messages_wave2_update" ON public.chat_messages
      FOR UPDATE TO authenticated
      USING (
        public.is_platform_admin()
        OR sender_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.chat_threads ct
          WHERE ct.id = chat_messages.thread_id
            AND ct.store_id IS NOT NULL
            AND public.is_store_staff(ct.store_id)
        )
      )
      WITH CHECK (
        public.is_platform_admin()
        OR sender_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.chat_threads ct
          WHERE ct.id = chat_messages.thread_id
            AND ct.store_id IS NOT NULL
            AND public.is_store_staff(ct.store_id)
        )
      );
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.crawler_sources')), false) THEN
    DROP POLICY IF EXISTS "crawler_sources_admin_all" ON public.crawler_sources;
    DROP POLICY IF EXISTS "crawler_sources_admin_all" ON public.crawler_sources;
    CREATE POLICY "crawler_sources_admin_all" ON public.crawler_sources
      FOR ALL TO authenticated
      USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.indexed_businesses')), false) THEN
    DROP POLICY IF EXISTS "indexed_businesses_write" ON public.indexed_businesses;
    DROP POLICY IF EXISTS "indexed_businesses_public_read" ON public.indexed_businesses;
    CREATE POLICY "indexed_businesses_public_read" ON public.indexed_businesses FOR SELECT TO public USING (true);
    DROP POLICY IF EXISTS "indexed_businesses_admin_write" ON public.indexed_businesses;
    CREATE POLICY "indexed_businesses_admin_write" ON public.indexed_businesses FOR ALL TO authenticated
      USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.indexed_events')), false) THEN
    DROP POLICY IF EXISTS "indexed_events_write" ON public.indexed_events;
    DROP POLICY IF EXISTS "indexed_events_public_read" ON public.indexed_events;
    CREATE POLICY "indexed_events_public_read" ON public.indexed_events FOR SELECT TO public USING (true);
    DROP POLICY IF EXISTS "indexed_events_admin_write" ON public.indexed_events;
    CREATE POLICY "indexed_events_admin_write" ON public.indexed_events FOR ALL TO authenticated
      USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.indexed_jobs')), false) THEN
    DROP POLICY IF EXISTS "indexed_jobs_write" ON public.indexed_jobs;
    DROP POLICY IF EXISTS "indexed_jobs_public_read" ON public.indexed_jobs;
    CREATE POLICY "indexed_jobs_public_read" ON public.indexed_jobs FOR SELECT TO public USING (true);
    DROP POLICY IF EXISTS "indexed_jobs_admin_write" ON public.indexed_jobs;
    CREATE POLICY "indexed_jobs_admin_write" ON public.indexed_jobs FOR ALL TO authenticated
      USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.indexed_products')), false) THEN
    DROP POLICY IF EXISTS "indexed_products_write" ON public.indexed_products;
    DROP POLICY IF EXISTS "indexed_products_public_read" ON public.indexed_products;
    CREATE POLICY "indexed_products_public_read" ON public.indexed_products FOR SELECT TO public USING (true);
    DROP POLICY IF EXISTS "indexed_products_admin_write" ON public.indexed_products;
    CREATE POLICY "indexed_products_admin_write" ON public.indexed_products FOR ALL TO authenticated
      USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.lead_form_fields')), false) THEN
    DROP POLICY IF EXISTS "Allow read lead_form_fields for all" ON public.lead_form_fields;
    DROP POLICY IF EXISTS "lead_form_fields_public_read" ON public.lead_form_fields;
    CREATE POLICY "lead_form_fields_public_read" ON public.lead_form_fields FOR SELECT TO anon, authenticated USING (true);
    DROP POLICY IF EXISTS "lead_form_fields_staff_manage" ON public.lead_form_fields;
    CREATE POLICY "lead_form_fields_staff_manage" ON public.lead_form_fields FOR ALL TO authenticated
      USING (
        public.is_platform_admin()
        OR EXISTS (SELECT 1 FROM public.lead_forms lf WHERE lf.id = lead_form_fields.form_id AND public.is_store_staff(lf.store_id))
      )
      WITH CHECK (
        public.is_platform_admin()
        OR EXISTS (SELECT 1 FROM public.lead_forms lf WHERE lf.id = lead_form_fields.form_id AND public.is_store_staff(lf.store_id))
      );
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.push_subscriptions')), false) THEN
    DROP POLICY IF EXISTS "push_subscriptions_service_all" ON public.push_subscriptions;
    DROP POLICY IF EXISTS "push_subscriptions_service_all" ON public.push_subscriptions;
    CREATE POLICY "push_subscriptions_service_all" ON public.push_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "push_subscriptions_own_manage" ON public.push_subscriptions;
    CREATE POLICY "push_subscriptions_own_manage" ON public.push_subscriptions FOR ALL TO authenticated
      USING (profile_id = (SELECT auth.uid())) WITH CHECK (profile_id = (SELECT auth.uid()));
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.travel_contract_signers')), false) THEN
    DROP POLICY IF EXISTS "travel_contract_signers_public_update" ON public.travel_contract_signers;
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.travel_price_history')), false) THEN
    DROP POLICY IF EXISTS "travel_price_history_staff_insert" ON public.travel_price_history;
    DROP POLICY IF EXISTS "travel_price_history_staff_insert" ON public.travel_price_history;
    CREATE POLICY "travel_price_history_staff_insert" ON public.travel_price_history FOR INSERT TO authenticated
      WITH CHECK (public.is_platform_admin() OR (store_id IS NOT NULL AND public.is_store_staff(store_id)));
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.travel_price_observations')), false) THEN
    DROP POLICY IF EXISTS "travel_price_observations_insert_auth" ON public.travel_price_observations;
    DROP POLICY IF EXISTS "travel_price_observations_insert_auth" ON public.travel_price_observations;
    CREATE POLICY "travel_price_observations_insert_auth" ON public.travel_price_observations FOR INSERT TO authenticated
      WITH CHECK (public.is_platform_admin() OR (store_id IS NOT NULL AND public.is_store_staff(store_id)));
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.simlab_focus_group_messages')), false) THEN
    DROP POLICY IF EXISTS "store_access_focus_messages" ON public.simlab_focus_group_messages;
    DROP POLICY IF EXISTS "Lojista gerencia mensagens do focus group" ON public.simlab_focus_group_messages;
    DROP POLICY IF EXISTS "simlab_focus_group_messages_service_all" ON public.simlab_focus_group_messages;
    CREATE POLICY "simlab_focus_group_messages_service_all" ON public.simlab_focus_group_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.simlab_focus_group_sessions')), false) THEN
    DROP POLICY IF EXISTS "Lojista gerencia sessoes de focus group" ON public.simlab_focus_group_sessions;
    DROP POLICY IF EXISTS "simlab_focus_group_sessions_staff_all" ON public.simlab_focus_group_sessions;
    CREATE POLICY "simlab_focus_group_sessions_staff_all" ON public.simlab_focus_group_sessions FOR ALL TO authenticated
      USING (public.is_platform_admin() OR public.is_store_staff(store_id))
      WITH CHECK (public.is_platform_admin() OR public.is_store_staff(store_id));
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.simlab_market_experiments')), false) THEN
    DROP POLICY IF EXISTS "Lojista gerencia seus experimentos no SimLab" ON public.simlab_market_experiments;
    DROP POLICY IF EXISTS "simlab_market_experiments_staff_all" ON public.simlab_market_experiments;
    CREATE POLICY "simlab_market_experiments_staff_all" ON public.simlab_market_experiments FOR ALL TO authenticated
      USING (public.is_platform_admin() OR public.is_store_staff(store_id))
      WITH CHECK (public.is_platform_admin() OR public.is_store_staff(store_id));
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.simlab_persona_responses')), false) THEN
    DROP POLICY IF EXISTS "store_access_simlab_responses" ON public.simlab_persona_responses;
    DROP POLICY IF EXISTS "Lojista acessa respostas dos seus experimentos" ON public.simlab_persona_responses;
    DROP POLICY IF EXISTS "simlab_persona_responses_service_all" ON public.simlab_persona_responses;
    CREATE POLICY "simlab_persona_responses_service_all" ON public.simlab_persona_responses FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.simlab_statistical_synthesis')), false) THEN
    DROP POLICY IF EXISTS "store_access_simlab_synthesis" ON public.simlab_statistical_synthesis;
    DROP POLICY IF EXISTS "Lojista acessa sintese dos seus experimentos" ON public.simlab_statistical_synthesis;
    DROP POLICY IF EXISTS "simlab_statistical_synthesis_service_all" ON public.simlab_statistical_synthesis;
    CREATE POLICY "simlab_statistical_synthesis_service_all" ON public.simlab_statistical_synthesis FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF COALESCE((SELECT c.relkind IN ('r','p') FROM pg_class c WHERE c.oid = to_regclass('public.workspace_pro_waitlist')), false) THEN
    DROP POLICY IF EXISTS "workspace_waitlist_all_policy" ON public.workspace_pro_waitlist;
    DROP POLICY IF EXISTS "workspace_waitlist_insert_public" ON public.workspace_pro_waitlist;
    CREATE POLICY "workspace_waitlist_insert_public" ON public.workspace_pro_waitlist FOR INSERT TO anon, authenticated WITH CHECK (true);
    DROP POLICY IF EXISTS "workspace_waitlist_admin_read" ON public.workspace_pro_waitlist;
    CREATE POLICY "workspace_waitlist_admin_read" ON public.workspace_pro_waitlist FOR ALL TO authenticated
      USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

-- ── 4. Correção de check_store_vertical_quota (remover hardcode de slug e checar autoridade) ──
CREATE OR REPLACE FUNCTION public.check_store_vertical_quota(
  p_store_id uuid,
  p_resource text,
  p_planned_increment integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store record;
  v_plan_limits jsonb;
  v_limit integer;
  v_current integer := 0;
  v_limit_key text;
BEGIN
  IF p_store_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'store_id ausente');
  END IF;

  IF auth.role() <> 'service_role'
     AND NOT public.is_platform_admin()
     AND NOT public.is_store_staff(p_store_id) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Acesso não autorizado a este tenant');
  END IF;

  SELECT
    id,
    slug,
    is_platform_root,
    plan_tier,
    vertical_sku,
    subscription_status,
    quota_overrides
  INTO v_store
  FROM public.stores
  WHERE id = p_store_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Loja não encontrada');
  END IF;

  IF COALESCE(v_store.is_platform_root, false)
     OR COALESCE(v_store.subscription_status, '') = 'exempt'
     OR COALESCE(v_store.slug, '') IN ('waesy', 'platform-demo') THEN
    RETURN jsonb_build_object('allowed', true, 'exempt', true, 'current', 0, 'limit', 999999);
  END IF;

  IF COALESCE(v_store.subscription_status, 'trialing') IN ('cancelled', 'past_due') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', format('Assinatura com status "%s". Regularize a fatura para continuar.', v_store.subscription_status)
    );
  END IF;

  v_limit_key := CASE p_resource
    WHEN 'catalog_items' THEN 'maxCatalogItems'
    WHEN 'team_members' THEN 'maxTeamMembers'
    WHEN 'whatsapp_instances' THEN 'maxWhatsappInstances'
    WHEN 'ai_calls' THEN 'maxMonthlyAiCalls'
    ELSE p_resource
  END;

  IF v_store.vertical_sku IS NOT NULL THEN
    SELECT limits INTO v_plan_limits
    FROM public.platform_vertical_plans
    WHERE sku = v_store.vertical_sku
      AND is_active = true;
  END IF;

  v_limit := NULLIF((COALESCE(v_store.quota_overrides, '{}'::jsonb) ->> v_limit_key), '')::integer;

  IF v_limit IS NULL AND v_plan_limits IS NOT NULL THEN
    v_limit := NULLIF((v_plan_limits ->> v_limit_key), '')::integer;
  END IF;

  IF v_limit IS NULL THEN
    v_limit := CASE
      WHEN v_limit_key = 'maxTeamMembers' AND v_store.plan_tier IN ('enterprise', 'WAESY_MAX') THEN 999
      WHEN v_limit_key = 'maxTeamMembers' AND v_store.plan_tier = 'professional' THEN 15
      WHEN v_limit_key = 'maxTeamMembers' AND v_store.plan_tier = 'starter' THEN 5
      WHEN v_limit_key = 'maxTeamMembers' THEN 2
      WHEN v_limit_key = 'maxWhatsappInstances' AND v_store.plan_tier IN ('enterprise', 'WAESY_MAX') THEN 20
      WHEN v_limit_key = 'maxWhatsappInstances' AND v_store.plan_tier = 'professional' THEN 3
      WHEN v_limit_key = 'maxWhatsappInstances' AND v_store.plan_tier = 'starter' THEN 1
      WHEN v_limit_key = 'maxWhatsappInstances' THEN 0
      WHEN v_limit_key = 'maxCatalogItems' AND v_store.plan_tier IN ('enterprise', 'WAESY_MAX') THEN 50000
      WHEN v_limit_key = 'maxCatalogItems' AND v_store.plan_tier = 'professional' THEN 1000
      WHEN v_limit_key = 'maxCatalogItems' AND v_store.plan_tier = 'starter' THEN 250
      WHEN v_limit_key = 'maxCatalogItems' THEN 40
      ELSE 1000
    END;
  END IF;

  IF p_resource = 'catalog_items' THEN
    SELECT COUNT(*)::integer INTO v_current FROM public.products WHERE store_id = p_store_id;
  ELSIF p_resource = 'team_members' THEN
    SELECT COUNT(*)::integer INTO v_current
    FROM public.workspace_members
    WHERE store_id = p_store_id
      AND COALESCE(is_active, true) = true
      AND role IN ('owner', 'admin', 'manager', 'seller', 'cashier', 'finance', 'content', 'stock', 'support');
  ELSIF p_resource = 'whatsapp_instances' THEN
    SELECT COUNT(*)::integer INTO v_current
    FROM public.whatsapp_channel_instances
    WHERE store_id = p_store_id
      AND is_active = true;
  END IF;

  RETURN jsonb_build_object(
    'allowed', (v_current + GREATEST(p_planned_increment, 0)) <= v_limit,
    'exempt', false,
    'current', v_current,
    'limit', v_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_store_vertical_quota(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_store_vertical_quota(uuid, text, integer) TO authenticated, service_role;

-- ── 5. Blindagem de deduplicate_and_link_lead_to_customer ────────────────────────
REVOKE ALL ON FUNCTION public.deduplicate_and_link_lead_to_customer(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deduplicate_and_link_lead_to_customer(uuid, uuid) TO authenticated, service_role;

-- ── 6. Garantir search_path explícito em todas as funções SECURITY DEFINER em public ──
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT
      p.oid,
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
        )
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      fn.nspname,
      fn.proname,
      fn.args
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
