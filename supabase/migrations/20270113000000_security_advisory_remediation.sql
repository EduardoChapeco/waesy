-- W2: security advisory remediation
-- Explicit deny-by-default for previously policy-less tables; no data mutation.
BEGIN;

ALTER VIEW public.unified_listings_view SET (security_invoker = true);

ALTER FUNCTION public.dispatch_mining_cron(text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.touch_document_artifact()
  SET search_path = public, pg_temp;

DO $$
DECLARE
  table_name text;
  policy_name text;
  policy_tables text[] := ARRAY[
    'abandoned_carts_log', 'ai_brain_settings', 'ai_response_cache',
    'ai_skill_tools', 'ai_skill_versions', 'ai_squads', 'boarding_cards',
    'boarding_tickets', 'brand_kit', 'corporate_clients',
    'employee_financial_records', 'event_checkins', 'inventory_adjustments_log',
    'invite_telemetry', 'jus_lawyer_teams', 'linkedin_sync_logs',
    'signature_evidence', 'simlab_focus_group_messages',
    'simlab_persona_responses', 'simlab_research_sessions',
    'simlab_statistical_synthesis', 'social_posts_assets',
    'store_hr_delegations', 'trip_rooming_list'
  ];
BEGIN
  FOREACH table_name IN ARRAY policy_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      policy_name := table_name || '_service_role_only';
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        policy_name, table_name
      );
    END IF;
  END LOOP;
END $$;

-- These RPCs expose privileged or financial state and are not public APIs.
DO $$
DECLARE
  fn_oid oid;
  fn_name text;
  fn_args text;
  restricted_names text[] := ARRAY[
    'complete_user_onboarding',
    'get_or_create_user_invite',
    'get_store_whatsapp_analytics',
    'get_user_admin_store_ids',
    'get_user_store_ids',
    'get_user_top_affinities',
    'settle_travel_commission',
    'calculate_travel_sale_commissions',
    'auto_calculate_travel_sale_commission'
  ];
BEGIN
  FOR fn_oid, fn_name, fn_args IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY (restricted_names)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', fn_name, fn_args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', fn_name, fn_args);
  END LOOP;
END $$;

COMMIT;
