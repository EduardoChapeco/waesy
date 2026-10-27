-- 20270302000001_revoke_anon_new_atomic_rpcs.sql
-- Funcoes criadas por 20270130000000 e 20270223000000 herdaram EXECUTE para anon/PUBLIC.
REVOKE EXECUTE ON FUNCTION public.save_builder_nodes_atomic FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_default_user_address_atomic FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_address_instructions_atomic FROM PUBLIC, anon;