-- ============================================================================
-- MIGRATION: 20270419000000_fix_indexed_views_security_invoker.sql
-- FIX: Supabase Security Advisor ERROR `security_definer_view`
-- Reaplica `security_invoker = true` e preserva `GRANT SELECT` nas views de
-- índice público (`indexed_businesses`, `indexed_events`, `indexed_jobs`,
-- `indexed_products`) para que respeitem estritamente o RLS do chamador.
-- ============================================================================

ALTER VIEW IF EXISTS public.indexed_businesses SET (security_invoker = true);
ALTER VIEW IF EXISTS public.indexed_events SET (security_invoker = true);
ALTER VIEW IF EXISTS public.indexed_jobs SET (security_invoker = true);
ALTER VIEW IF EXISTS public.indexed_products SET (security_invoker = true);

REVOKE ALL ON public.indexed_businesses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.indexed_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.indexed_jobs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.indexed_products FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.indexed_businesses TO anon, authenticated, service_role;
GRANT SELECT ON public.indexed_events TO anon, authenticated, service_role;
GRANT SELECT ON public.indexed_jobs TO anon, authenticated, service_role;
GRANT SELECT ON public.indexed_products TO anon, authenticated, service_role;
