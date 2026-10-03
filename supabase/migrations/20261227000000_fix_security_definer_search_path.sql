-- ==============================================================================
-- Migration: 20261227000000_fix_security_definer_search_path.sql
-- Segurança: Fixação de search_path em todas as funções SECURITY DEFINER
-- ==============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE p.prosecdef = true 
      AND (p.proconfig IS NULL OR NOT ('search_path=public, pg_temp' = ANY(p.proconfig)))
      AND n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp', r.nspname, r.proname, r.args);
  END LOOP;
END $$;
