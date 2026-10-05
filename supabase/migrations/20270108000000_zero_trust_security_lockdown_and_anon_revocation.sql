-- ==============================================================================
-- Migration: 20270108000000_zero_trust_security_lockdown_and_anon_revocation.sql
-- Description:
--   1. Revogação de privilégios de execução (EXECUTE) de PUBLIC e anon em RPCs sensíveis
--      (financeiro, tokens, ledger, admin, estoque, pedidos, rotas de entrega e cotações).
--   2. Definição estrita de search_path = public, pg_temp nas 20 funções mutáveis.
--   3. Hardening e políticas Zero-Trust explícitas nas tabelas confidenciais
--      (signature_evidence, employee_financial_records, corporate_clients, rental_applications, etc).
--   4. Alter default privileges para garantir que futuras funções não herdem EXECUTE por 'anon' ou 'PUBLIC'.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- FASE 1: HARDENING DE SEARCH_PATH NAS FUNÇÕES MUTÁVEIS
-- ------------------------------------------------------------------------------
ALTER FUNCTION public.calculate_auth_risk_score(boolean, smallint, text, boolean, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.dispatch_mining_cron(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_ledger_immutability() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_single_published_page() SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_sync_billing_invoice_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_sync_classified_sponsored_flags() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_quote_number(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_token_transaction_seal(uuid, uuid, integer, integer, text, timestamp with time zone, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_oauth_integrations_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_courier_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_quote_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_tourism_incident_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_tenant_agency_identity() SET search_path = public, pg_temp;
ALTER FUNCTION public.tf_generate_variant_display_name() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_cbp_modtime() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_classified_subscriptions_modtime() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_phase4_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_store_workflows_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------
-- FASE 2: REVOGAÇÃO DE PRIVILÉGIOS EM RPCs CRÍTICAS E SENSÍVEIS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_admin_service_routines TEXT[] := ARRAY[
    'execute_hard_refresh',
    'credit_store_tokens_strict',
    'consume_store_tokens',
    'consume_store_tokens_scoped',
    'charge_token_tollbooth',
    'admin_modify_order_items',
    'approve_ghost_store_claim',
    'approve_installment_conciliation',
    'approve_invoice_token_discount',
    'dispatch_mining_cron',
    'generate_transaction_certificate',
    'create_receivable_with_installments',
    'complete_wms_picking',
    'award_referral_tokens_with_vesting',
    'award_store_new_client_bounty',
    'generate_delivery_magic_link',
    'generate_delivery_pin',
    'generate_event_subpanel_token',
    'generate_ghost_stores_from_high_score_listings',
    'expire_classifieds_cron',
    'deduplicate_and_link_lead_to_customer',
    'auto_heal_workspace_membership',
    'batch_upsert_variant_matrix_v1',
    'batch_upsert_variant_matrix_v2',
    'batch_upsert_variant_matrix_v3',
    'batch_upsert_variant_matrix_v4',
    'batch_upsert_variant_matrix_v5',
    'channel_financial_summary',
    'claim_handle_atomic',
    'get_security_telemetry_overview',
    'convert_proposal_to_trip_native',
    'create_product_transaction_v1',
    'emit_store_loyalty_tokens_to_user',
    'ensure_store_token_wallet',
    'calculate_courier_waiting_penalty',
    'process_order_return',
    'process_pos_sale_transaction',
    'process_exchange_transaction',
    'perform_stock_audit',
    'pick_wms_item',
    'inspect_rma_item',
    'persist_lead_move',
    'process_mined_article',
    'recalculate_installment_interest',
    'record_courier_arrival',
    'record_immutable_ledger_entry',
    'reconcile_platform_token_solvency',
    'process_abandoned_carts',
    'init_evento_kanban',
    'grant_customer_credit',
    'hold_resource_slot',
    'provide_shipping_quote',
    'process_shipment_webhook_atomic',
    'process_token_payment_webhook_atomic',
    'link_event_interaction_to_crm',
    'list_transaction_certificates',
    'merge_guest_cart',
    'notify_new_follower',
    'notify_new_order',
    'notify_order_status_changed',
    'notify_shipment_created',
    'prevent_ledger_modification',
    'propagate_passenger_document_to_client',
    'fn_enforce_systemic_telemetry',
    'fn_orders_generate_order_number',
    'fn_orders_telemetry_trigger',
    'fn_trg_profiles_ripple_effect',
    'record_refund_on_order',
    'record_sale_revenue_on_paid',
    'rls_auto_enable',
    'sync_cart_telemetry_aliases',
    'sync_crawler_source_to_legacy',
    'sync_customer_store_affinity_aliases',
    'sync_employee_audit_details_aliases',
    'sync_form_submissions_route_aliases',
    'sync_store_to_directory',
    'trg_prevent_profile_escalation',
    'rpc_cascade_civil_identity_state',
    'rpc_execute_atomic_ad_boost',
    'start_wms_picking',
    'transfer_stock_between_locations',
    'update_certificate_entity_id',
    'validate_delivery_pin',
    'verify_and_reconcile_store_wallet',
    'verify_ledger_chain_integrity',
    'request_invoice_token_discount',
    'request_order_return',
    'redeem_service_pass_credit',
    'refund_service_pass_credit',
    'reconcile_contracts_for_profile',
    'add_to_cart_atomic_v4',
    'add_to_cart_atomic_v5',
    'rpc_auto_expire_classifieds'
  ];
  v_authenticated_routines TEXT[] := ARRAY[
    'cancel_order',
    'confirm_order_and_deduct_stock',
    'fail_order_payment',
    'create_quote',
    'approve_quote',
    'adjust_stock'
  ];
BEGIN
  -- 1. Rotinas restritas a service_role (Admin / Ledger / Background / BFF)
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(v_admin_service_routines)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated;', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role;', r.proname, r.args);
  END LOOP;

  -- 2. Rotinas de usuários autenticados (bloqueadas para anon/PUBLIC)
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(v_authenticated_routines)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon;', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role;', r.proname, r.args);
  END LOOP;
END $$;

-- Prevenção de novas funções públicas serem expostas à role anon por padrão
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON ROUTINES FROM PUBLIC, anon;

-- ------------------------------------------------------------------------------
-- FASE 3: POLÍTICAS ZERO-TRUST EM TABELAS CONFIDENCIAIS E AUDITORIA
-- ------------------------------------------------------------------------------

-- 3.1 signature_evidence (Evidências biométricas e assinaturas de contratos)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'signature_evidence' AND policyname = 'signature_evidence_select_policy') THEN
    CREATE POLICY signature_evidence_select_policy ON public.signature_evidence
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.signature_envelopes se
          WHERE se.id = signature_evidence.envelope_id
            AND (
              se.signer_profile_id = auth.uid()
              OR se.signer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
              OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('platform_admin', 'master', 'admin'))
            )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'signature_evidence' AND policyname = 'signature_evidence_insert_policy') THEN
    CREATE POLICY signature_evidence_insert_policy ON public.signature_evidence
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.signature_envelopes se
          WHERE se.id = signature_evidence.envelope_id
            AND (
              se.signer_profile_id = auth.uid()
              OR se.signer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
              OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('platform_admin', 'master'))
            )
        )
      );
  END IF;
END $$;

-- 3.2 employee_financial_records (Registros financeiros confidenciais de colaboradores)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_financial_records' AND policyname = 'employee_financial_records_select_policy') THEN
    CREATE POLICY employee_financial_records_select_policy ON public.employee_financial_records
      FOR SELECT TO authenticated
      USING (
        employee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.store_id = employee_financial_records.store_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'finance', 'manager')
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master')
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_financial_records' AND policyname = 'employee_financial_records_write_policy') THEN
    CREATE POLICY employee_financial_records_write_policy ON public.employee_financial_records
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.store_id = employee_financial_records.store_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'finance')
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master')
        )
      );
  END IF;
END $$;

-- 3.3 corporate_clients (Clientes corporativos e limites de crédito)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'corporate_clients' AND policyname = 'corporate_clients_manage_policy') THEN
    CREATE POLICY corporate_clients_manage_policy ON public.corporate_clients
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE (wm.store_id = corporate_clients.agency_id OR wm.store_id = corporate_clients.organization_id)
            AND wm.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master')
        )
      );
  END IF;
END $$;

-- 3.4 proposal_items (Itens de propostas comerciais de viagens e pacotes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proposal_items' AND policyname = 'proposal_items_access_policy') THEN
    CREATE POLICY proposal_items_access_policy ON public.proposal_items
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.travel_proposals tp
          WHERE tp.id = proposal_items.proposal_id
            AND (
              tp.created_by_profile_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.store_id = tp.store_id AND wm.user_id = auth.uid()
              )
              OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master')
              )
            )
        )
      );
  END IF;
END $$;

-- 3.5 rental_applications (Fichas cadastrais de locação imobiliária com renda e fiador)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rental_applications' AND policyname = 'rental_applications_owner_policy') THEN
    CREATE POLICY rental_applications_owner_policy ON public.rental_applications
      FOR ALL TO authenticated
      USING (
        applicant_profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.ad_properties ap
          JOIN public.classifieds c ON c.id = ap.classified_id
          LEFT JOIN public.workspace_members wm ON wm.store_id = c.store_id
          WHERE ap.id = rental_applications.property_id
            AND (c.author_profile_id = auth.uid() OR wm.user_id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles prof
          WHERE prof.id = auth.uid() AND prof.role IN ('platform_admin', 'master')
        )
      );
  END IF;
END $$;

-- 3.6 _applied_migrations (Tabela interna do sistema - Acesso restrito a Master/Admin)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_applied_migrations' AND policyname = '_applied_migrations_admin_only') THEN
    CREATE POLICY _applied_migrations_admin_only ON public._applied_migrations
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master')
        )
      );
  END IF;
END $$;
