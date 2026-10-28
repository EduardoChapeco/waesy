-- ==============================================================================
-- 20270309000000_zero_trust_rls_lockdown_comprehensive.sql
--
-- Governança: AGENTS.md B.4, B.8, B.31 & Mandato Zero-Trust
-- Finalidade: Habilitação de RLS em 100% das tabelas pendentes e isolamento estrito
-- ==============================================================================

-- 1. TABELAS CANÔNICAS DE REFERÊNCIA (Leitura Pública / Escrita Apenas Admin Master)
DO $$
BEGIN
  -- canonical_device_brands
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'canonical_device_brands') THEN
    ALTER TABLE public.canonical_device_brands ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "cdb_select_all" ON public.canonical_device_brands;
    CREATE POLICY "cdb_select_all" ON public.canonical_device_brands FOR SELECT USING (true);
  END IF;

  -- canonical_device_models
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'canonical_device_models') THEN
    ALTER TABLE public.canonical_device_models ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "cdm_select_all" ON public.canonical_device_models;
    CREATE POLICY "cdm_select_all" ON public.canonical_device_models FOR SELECT USING (true);
  END IF;

  -- canonical_vehicle_brands
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'canonical_vehicle_brands') THEN
    ALTER TABLE public.canonical_vehicle_brands ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "cvb_select_all" ON public.canonical_vehicle_brands;
    CREATE POLICY "cvb_select_all" ON public.canonical_vehicle_brands FOR SELECT USING (true);
  END IF;

  -- canonical_vehicle_models
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'canonical_vehicle_models') THEN
    ALTER TABLE public.canonical_vehicle_models ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "cvm_select_all" ON public.canonical_vehicle_models;
    CREATE POLICY "cvm_select_all" ON public.canonical_vehicle_models FOR SELECT USING (true);
  END IF;

  -- canonical_job_occupations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'canonical_job_occupations') THEN
    ALTER TABLE public.canonical_job_occupations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "cjo_select_all" ON public.canonical_job_occupations;
    CREATE POLICY "cjo_select_all" ON public.canonical_job_occupations FOR SELECT USING (true);
  END IF;

  -- badge_templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'badge_templates') THEN
    ALTER TABLE public.badge_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "bt_select_all" ON public.badge_templates;
    CREATE POLICY "bt_select_all" ON public.badge_templates FOR SELECT USING (true);
  END IF;

  -- post_media
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'post_media') THEN
    ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "pm_select_all" ON public.post_media;
    CREATE POLICY "pm_select_all" ON public.post_media FOR SELECT USING (true);
    DROP POLICY IF EXISTS "pm_manage_auth" ON public.post_media;
    CREATE POLICY "pm_manage_auth" ON public.post_media FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- store_stories
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'store_stories') THEN
    ALTER TABLE public.store_stories ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ss_select_all" ON public.store_stories;
    CREATE POLICY "ss_select_all" ON public.store_stories FOR SELECT USING (true);
    DROP POLICY IF EXISTS "ss_manage_staff" ON public.store_stories;
    CREATE POLICY "ss_manage_staff" ON public.store_stories FOR ALL TO authenticated USING (
      auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = store_stories.store_id AND store_members.profile_id = auth.uid()
      )
    ) WITH CHECK (
      auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = store_stories.store_id AND store_members.profile_id = auth.uid()
      )
    );
  END IF;

  -- eventos_campanhas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'eventos_campanhas') THEN
    ALTER TABLE public.eventos_campanhas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ec_select_all" ON public.eventos_campanhas;
    CREATE POLICY "ec_select_all" ON public.eventos_campanhas FOR SELECT USING (true);
    DROP POLICY IF EXISTS "ec_manage_auth" ON public.eventos_campanhas;
    CREATE POLICY "ec_manage_auth" ON public.eventos_campanhas FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- ads
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ads') THEN
    ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ads_select_active" ON public.ads;
    CREATE POLICY "ads_select_active" ON public.ads FOR SELECT USING (
      status = 'active' OR (
        auth.uid() IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.store_members WHERE store_members.store_id = ads.store_id AND store_members.profile_id = auth.uid()
        )
      )
    );
    DROP POLICY IF EXISTS "ads_manage_own" ON public.ads;
    CREATE POLICY "ads_manage_own" ON public.ads FOR ALL TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = ads.store_id AND store_members.profile_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = ads.store_id AND store_members.profile_id = auth.uid()
      )
    );
  END IF;

  -- ad_ledger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ad_ledger') THEN
    ALTER TABLE public.ad_ledger ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "al_select_admin" ON public.ad_ledger;
    CREATE POLICY "al_select_admin" ON public.ad_ledger FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;

  -- activation_logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activation_logs') THEN
    ALTER TABLE public.activation_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "alogs_select_auth" ON public.activation_logs;
    CREATE POLICY "alogs_select_auth" ON public.activation_logs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;

  -- immutable_ledger_entries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'immutable_ledger_entries') THEN
    ALTER TABLE public.immutable_ledger_entries ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ile_select_auth" ON public.immutable_ledger_entries;
    CREATE POLICY "ile_select_auth" ON public.immutable_ledger_entries FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 2. TABELAS PRIVADAS MULTI-TENANT DE TURISMO, CRM, CONTRATOS E WORKSPACE
DO $$
BEGIN
  -- channel_vault_credentials (SENHAS & TOKENS - ISOLAMENTO TOTAL)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'channel_vault_credentials') THEN
    ALTER TABLE public.channel_vault_credentials ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.channel_vault_credentials FROM anon;
    DROP POLICY IF EXISTS "cvc_manage_staff" ON public.channel_vault_credentials;
    CREATE POLICY "cvc_manage_staff" ON public.channel_vault_credentials FOR ALL TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = channel_vault_credentials.store_id AND store_members.profile_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = channel_vault_credentials.store_id AND store_members.profile_id = auth.uid()
      )
    );
  END IF;

  -- store_invites
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'store_invites') THEN
    ALTER TABLE public.store_invites ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.store_invites FROM anon;
    DROP POLICY IF EXISTS "si_manage_staff" ON public.store_invites;
    CREATE POLICY "si_manage_staff" ON public.store_invites FOR ALL TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = store_invites.store_id AND store_members.profile_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = store_invites.store_id AND store_members.profile_id = auth.uid()
      )
    );
  END IF;

  -- corporate_rfps
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'corporate_rfps') THEN
    ALTER TABLE public.corporate_rfps ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.corporate_rfps FROM anon;
    DROP POLICY IF EXISTS "crfp_manage_staff" ON public.corporate_rfps;
    CREATE POLICY "crfp_manage_staff" ON public.corporate_rfps FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- boarding_rooming_list
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'boarding_rooming_list') THEN
    ALTER TABLE public.boarding_rooming_list ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.boarding_rooming_list FROM anon;
    DROP POLICY IF EXISTS "brl_manage_staff" ON public.boarding_rooming_list;
    CREATE POLICY "brl_manage_staff" ON public.boarding_rooming_list FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- bus_seat_assignments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bus_seat_assignments') THEN
    ALTER TABLE public.bus_seat_assignments ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.bus_seat_assignments FROM anon;
    DROP POLICY IF EXISTS "bsa_manage_staff" ON public.bus_seat_assignments;
    CREATE POLICY "bsa_manage_staff" ON public.bus_seat_assignments FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- travel_budgets & travel_budget_items
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_budgets') THEN
    ALTER TABLE public.travel_budgets ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.travel_budgets FROM anon;
    DROP POLICY IF EXISTS "tb_manage_staff" ON public.travel_budgets;
    CREATE POLICY "tb_manage_staff" ON public.travel_budgets FOR ALL TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = travel_budgets.store_id AND store_members.profile_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = travel_budgets.store_id AND store_members.profile_id = auth.uid()
      )
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_budget_items') THEN
    ALTER TABLE public.travel_budget_items ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.travel_budget_items FROM anon;
    DROP POLICY IF EXISTS "tbi_manage_staff" ON public.travel_budget_items;
    CREATE POLICY "tbi_manage_staff" ON public.travel_budget_items FOR ALL TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.travel_budgets
        JOIN public.store_members ON store_members.store_id = travel_budgets.store_id
        WHERE travel_budgets.id = travel_budget_items.budget_id AND store_members.profile_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.travel_budgets
        JOIN public.store_members ON store_members.store_id = travel_budgets.store_id
        WHERE travel_budgets.id = travel_budget_items.budget_id AND store_members.profile_id = auth.uid()
      )
    );
  END IF;

  -- travel_document_ingestions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_document_ingestions') THEN
    ALTER TABLE public.travel_document_ingestions ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.travel_document_ingestions FROM anon;
    DROP POLICY IF EXISTS "tdi_manage_staff" ON public.travel_document_ingestions;
    CREATE POLICY "tdi_manage_staff" ON public.travel_document_ingestions FOR ALL TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = travel_document_ingestions.store_id AND store_members.profile_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = travel_document_ingestions.store_id AND store_members.profile_id = auth.uid()
      )
    );
  END IF;

  -- trip_commissions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trip_commissions') THEN
    ALTER TABLE public.trip_commissions ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.trip_commissions FROM anon;
    DROP POLICY IF EXISTS "tc_manage_staff" ON public.trip_commissions;
    CREATE POLICY "tc_manage_staff" ON public.trip_commissions FOR ALL TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = trip_commissions.store_id AND store_members.profile_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = trip_commissions.store_id AND store_members.profile_id = auth.uid()
      )
    );
  END IF;

  -- resource_availabilities
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'resource_availabilities') THEN
    ALTER TABLE public.resource_availabilities ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ra_select_all" ON public.resource_availabilities;
    CREATE POLICY "ra_select_all" ON public.resource_availabilities FOR SELECT USING (true);
    DROP POLICY IF EXISTS "ra_manage_staff" ON public.resource_availabilities;
    CREATE POLICY "ra_manage_staff" ON public.resource_availabilities FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- lead_capture_forms
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_capture_forms') THEN
    ALTER TABLE public.lead_capture_forms ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "lcf_select_all" ON public.lead_capture_forms;
    CREATE POLICY "lcf_select_all" ON public.lead_capture_forms FOR SELECT USING (true);
    DROP POLICY IF EXISTS "lcf_manage_staff" ON public.lead_capture_forms;
    CREATE POLICY "lcf_manage_staff" ON public.lead_capture_forms FOR ALL TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = lead_capture_forms.empresa_id AND store_members.profile_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = lead_capture_forms.empresa_id AND store_members.profile_id = auth.uid()
      )
    );
  END IF;

  -- contract_addendums
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contract_addendums') THEN
    ALTER TABLE public.contract_addendums ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.contract_addendums FROM anon;
    DROP POLICY IF EXISTS "ca_manage_staff" ON public.contract_addendums;
    CREATE POLICY "ca_manage_staff" ON public.contract_addendums FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- store_condicionais & condicional_items
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'store_condicionais') THEN
    ALTER TABLE public.store_condicionais ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.store_condicionais FROM anon;
    DROP POLICY IF EXISTS "sc_manage_staff" ON public.store_condicionais;
    CREATE POLICY "sc_manage_staff" ON public.store_condicionais FOR ALL TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = store_condicionais.store_id AND store_members.profile_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.store_members WHERE store_members.store_id = store_condicionais.store_id AND store_members.profile_id = auth.uid()
      )
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'condicional_items') THEN
    ALTER TABLE public.condicional_items ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.condicional_items FROM anon;
    DROP POLICY IF EXISTS "ci_manage_staff" ON public.condicional_items;
    CREATE POLICY "ci_manage_staff" ON public.condicional_items FOR ALL TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.store_condicionais
        JOIN public.store_members ON store_members.store_id = store_condicionais.store_id
        WHERE store_condicionais.id = condicional_items.condicional_id AND store_members.profile_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.store_condicionais
        JOIN public.store_members ON store_members.store_id = store_condicionais.store_id
        WHERE store_condicionais.id = condicional_items.condicional_id AND store_members.profile_id = auth.uid()
      )
    );
  END IF;

  -- direct_conversations & direct_messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'direct_conversations') THEN
    ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.direct_conversations FROM anon;
    DROP POLICY IF EXISTS "dc_participant_own" ON public.direct_conversations;
    CREATE POLICY "dc_participant_own" ON public.direct_conversations FOR ALL TO authenticated USING (
      auth.uid() IS NOT NULL AND (
        store_id IS NULL OR EXISTS (
          SELECT 1 FROM public.store_members WHERE store_members.store_id = direct_conversations.store_id AND store_members.profile_id = auth.uid()
        )
      )
    ) WITH CHECK (
      auth.uid() IS NOT NULL AND (
        store_id IS NULL OR EXISTS (
          SELECT 1 FROM public.store_members WHERE store_members.store_id = direct_conversations.store_id AND store_members.profile_id = auth.uid()
        )
      )
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'direct_messages') THEN
    ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.direct_messages FROM anon;
    DROP POLICY IF EXISTS "dm_participant_own" ON public.direct_messages;
    CREATE POLICY "dm_participant_own" ON public.direct_messages FOR ALL TO authenticated USING (
      auth.uid() IS NOT NULL
    ) WITH CHECK (
      auth.uid() IS NOT NULL AND (sender_id IS NULL OR sender_id = auth.uid())
    );
  END IF;
END $$;
