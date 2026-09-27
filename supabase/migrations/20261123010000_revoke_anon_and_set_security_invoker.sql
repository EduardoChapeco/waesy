-- Migration: 20261123010000_revoke_anon_and_set_security_invoker.sql
-- Description: Revoke EXECUTE from anon on sensitive admin/webhook/financial RPCs and set security_invoker = true on views.

-- 1. Set security_invoker = true on public views to respect base table RLS
ALTER VIEW IF EXISTS public.classified_ads SET (security_invoker = true);
ALTER VIEW IF EXISTS public.companies SET (security_invoker = true);
ALTER VIEW IF EXISTS public.eventos_tarefas_view SET (security_invoker = true);
ALTER VIEW IF EXISTS public.indexed_businesses SET (security_invoker = true);
ALTER VIEW IF EXISTS public.indexed_events SET (security_invoker = true);
ALTER VIEW IF EXISTS public.indexed_jobs SET (security_invoker = true);
ALTER VIEW IF EXISTS public.indexed_products SET (security_invoker = true);
ALTER VIEW IF EXISTS public.produtos_evento SET (security_invoker = true);
ALTER VIEW IF EXISTS public.store_integrations SET (security_invoker = true);
ALTER VIEW IF EXISTS public.store_members SET (security_invoker = true);
ALTER VIEW IF EXISTS public.store_memberships SET (security_invoker = true);
ALTER VIEW IF EXISTS public.store_reviews SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_catalog_option_groups SET (security_invoker = true);

-- 2. Revoke execute from anon on sensitive admin functions
REVOKE EXECUTE ON FUNCTION public.admin_modify_order_items(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_ghost_store_claim(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_installment_conciliation(uuid, uuid, bigint, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_invoice_token_discount(uuid, uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_cash_register(uuid, integer, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.perform_stock_audit(uuid, integer, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.adjust_stock(uuid, integer, text, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.elevate_to_store_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dispatch_mining_cron(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.execute_hard_refresh(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reconcile_platform_token_solvency() FROM anon;
REVOKE EXECUTE ON FUNCTION public.refund_service_pass_credit(uuid, uuid, text) FROM anon;

-- 3. Revoke execute from anon on WMS picking and RMA functions
REVOKE EXECUTE ON FUNCTION public.complete_wms_picking(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.inspect_rma_item(uuid, uuid, integer, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.start_wms_picking(uuid, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pick_wms_item(uuid, uuid, integer) FROM anon;

-- 4. Revoke execute from anon on Webhook functions
REVOKE EXECUTE ON FUNCTION public.process_shipment_webhook_atomic(text, text, uuid, text, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_token_payment_webhook_atomic(text, text, uuid, text, integer, integer, text, jsonb) FROM anon;

-- 5. Revoke execute from anon on internal token ledger mutations
REVOKE EXECUTE ON FUNCTION public.charge_token_tollbooth(uuid, integer, text, text, text, text, integer, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.credit_store_tokens_strict(uuid, integer, text, text, text, text, boolean, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_store_tokens(uuid, integer, text, text, integer, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_store_tokens_scoped(uuid, integer, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_immutable_ledger_entry(text, bigint, bigint, uuid, uuid, uuid, uuid, text, text, jsonb, uuid, text, text, text, text, text, text) FROM anon;
