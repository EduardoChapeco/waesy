-- 20270302000000_security_hardening_anon_exec_and_search_path.sql
-- Fecha exposicao P0 detectada na auditoria de producao 2026-10-22:
--   * SECURITY DEFINER financeiras/operacionais executaveis por anon/PUBLIC
--   * SECURITY DEFINER sem search_path fixo
-- Aditivo e idempotente. Mantem authenticated e service_role.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname IN (
        'wz_get_or_create_bucket','wz_grant_tokens_atomic','wz_reserve_tokens_atomic',
        'wz_commit_reserved_tokens_atomic','wz_release_reserved_tokens_atomic',
        'wz_claim_gift_card_atomic','wz_migrate_legacy_credits_and_tokens',
        'adjust_service_pass_credits','mark_appointment_no_show','expire_outdated_service_passes',
        'release_resource_slot','decrement_ticket_sold','get_or_create_wallet_account',
        'calculate_wallet_balance_cents','claim_healthy_api_keys_for_provider',
        'save_user_address_atomic','delete_user_address_atomic',
        'supersede_stale_travel_proposal_acceptance','prevent_envelope_on_completed_contract',
        'enforce_civil_data_immutability')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND (p.proconfig IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) x WHERE x LIKE 'search_path=%'))
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;
