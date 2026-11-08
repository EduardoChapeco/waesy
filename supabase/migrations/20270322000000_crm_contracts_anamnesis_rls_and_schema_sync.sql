-- =============================================================================
-- MIGRATION: 20270322000000_crm_contracts_anamnesis_rls_and_schema_sync.sql
-- OBJETIVO:
-- 1. Alinhamento completo de colunas entre BFF e tabelas reais (customers_crm,
--    leads_crm, tourism_trips, contract_templates).
-- 2. Correção de 6 políticas RLS quebradas que usavam current_setting('app.current_store_id')
--    (customer_anamnesis_records, order_fiscal_invoices, service_collaborator_splits,
--    service_consumed_materials, workspace_partner_agreements, workspace_role_permissions).
-- 3. Correção de 20 políticas RLS com subquery correlacionada (SELECT tablename.store_id FROM profiles),
--    garantindo isolamento multi-tenant estrito via public.is_store_staff(store_id).
-- 4. Políticas RLS para acesso de equipe da loja em contracts e contract_versions.
-- 5. RPCs SECURITY DEFINER para fluxos públicos (/m/consent/$leadId, /m/lead/$leadId)
--    e deduplicação segura de leads_crm -> customers_crm.
-- =============================================================================

-- ─── 1. FUNÇÕES AUXILIARES DE AUTORIZAÇÃO MULTI-TENANT ───────────────────────

CREATE OR REPLACE FUNCTION public.is_store_staff(target_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN target_store_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = target_store_id
        AND wm.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = target_store_id
        AND s.organization_id = (SELECT auth.uid())
    )
    OR public.is_platform_admin()
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(target_store_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN target_store_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = target_store_id
        AND wm.profile_id = (SELECT auth.uid())
        AND wm.role = ANY(allowed_roles)
    )
    OR (
      'owner' = ANY(allowed_roles)
      AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = target_store_id
          AND s.organization_id = (SELECT auth.uid())
      )
    )
    OR public.is_platform_admin()
  END;
$$;

-- ─── 2. COLUNAS CANÔNICAS EM customers_crm, leads_crm, tourism_trips, contract_templates ───

ALTER TABLE public.customers_crm
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS address_line text,
  ADD COLUMN IF NOT EXISTS zipcode text,
  ADD COLUMN IF NOT EXISTS credit_limit_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS total_orders integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_order_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS lgpd_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

ALTER TABLE public.leads_crm
  ADD COLUMN IF NOT EXISTS document text;

ALTER TABLE public.tourism_trips
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads_crm(id) ON DELETE SET NULL;

ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS content_markdown text;

-- ─── 3. CORREÇÃO DAS 6 POLÍTICAS COM current_setting('app.current_store_id') ─

ALTER POLICY "p_customer_anamnesis_all" ON public.customer_anamnesis_records
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "p_order_fiscal_all" ON public.order_fiscal_invoices
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "p_service_splits_all" ON public.service_collaborator_splits
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "p_service_materials_all" ON public.service_consumed_materials
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "p_partner_agreements_all" ON public.workspace_partner_agreements
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "p_role_permissions_all" ON public.workspace_role_permissions
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

-- ─── 4. CORREÇÃO DAS 20 POLÍTICAS COM SUBQUERY CORRELACIONADA EM profiles ─────

ALTER POLICY "Usuário visualiza suas próprias execuções de skill" ON public.ai_skill_runs
  USING ((user_id = (SELECT auth.uid())) OR public.is_store_staff(store_id));

ALTER POLICY "Usuários autenticados gerenciam suas execuções de squad" ON public.ai_squad_runs
  USING ((user_id = (SELECT auth.uid())) OR public.is_store_staff(store_id))
  WITH CHECK ((user_id = (SELECT auth.uid())) OR public.is_store_staff(store_id));

ALTER POLICY "Usuários autenticados visualizam handoffs de suas execuções" ON public.ai_squad_handoffs
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_squad_runs r
      WHERE r.id = ai_squad_handoffs.squad_run_id
        AND (r.user_id = (SELECT auth.uid()) OR public.is_store_staff(r.store_id))
    )
  );

ALTER POLICY "Store members can manage their banners" ON public.banners
  USING ((store_id IS NOT NULL) AND public.is_store_staff(store_id))
  WITH CHECK ((store_id IS NOT NULL) AND public.is_store_staff(store_id));

ALTER POLICY "contract_audit_chain_staff_all" ON public.contract_audit_chain
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "customers_crm_staff_all" ON public.customers_crm
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "financial_tx_staff_read" ON public.financial_transactions
  USING (public.has_workspace_role(store_id, ARRAY['owner','admin','manager','finance']));

ALTER POLICY "financial_tx_staff_insert" ON public.financial_transactions
  WITH CHECK (public.has_workspace_role(store_id, ARRAY['owner','admin','manager','finance']));

ALTER POLICY "gc_usages_staff_read" ON public.gift_card_usages
  USING (public.has_workspace_role(store_id, ARRAY['owner','admin','manager','finance']));

ALTER POLICY "lead_activities_staff_all" ON public.lead_activities
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "lead_meetings_staff_all" ON public.lead_meetings
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "order_events_staff_read" ON public.order_events
  USING (public.is_store_staff(store_id));

ALTER POLICY "shipments_staff_manage" ON public.shipments
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "travel_commercial_contacts_staff_all" ON public.travel_commercial_contacts
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "travel_contract_signers_staff_all" ON public.travel_contract_signers
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "travel_interests_staff_all" ON public.travel_interests
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "travel_leads_qualification_staff_all" ON public.travel_leads_qualification
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "travel_monthly_closings_staff_all" ON public.travel_monthly_closings
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "travel_opportunity_matches_staff_all" ON public.travel_opportunity_matches
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "travel_tax_shield_ledger_staff_all" ON public.travel_tax_shield_ledger
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER POLICY "Lojista gerencia skills do seu workspace" ON public.workspace_skill_settings
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

-- ─── 5. POLÍTICAS DE ACESSO DE EQUIPE EM contracts E contract_versions ───────

ALTER POLICY "contracts_creator_all" ON public.contracts
  USING (
    (creator_id = (SELECT auth.uid()))
    OR (store_id IS NOT NULL AND public.is_store_staff(store_id))
    OR (
      (metadata ->> 'store_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.is_store_staff(((metadata ->> 'store_id')::uuid))
    )
  )
  WITH CHECK (
    (creator_id = (SELECT auth.uid()))
    OR (store_id IS NOT NULL AND public.is_store_staff(store_id))
    OR (
      (metadata ->> 'store_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.is_store_staff(((metadata ->> 'store_id')::uuid))
    )
  );

ALTER POLICY "contract_versions_policy" ON public.contract_versions
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_versions.contract_id
        AND (
          c.creator_id = (SELECT auth.uid())
          OR (c.store_id IS NOT NULL AND public.is_store_staff(c.store_id))
          OR (
            (c.metadata ->> 'store_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND public.is_store_staff(((c.metadata ->> 'store_id')::uuid))
          )
          OR EXISTS (
            SELECT 1 FROM public.signature_envelopes se
            WHERE se.contract_version_id = contract_versions.id
              AND se.signer_profile_id = (SELECT auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_versions.contract_id
        AND (
          c.creator_id = (SELECT auth.uid())
          OR (c.store_id IS NOT NULL AND public.is_store_staff(c.store_id))
          OR (
            (c.metadata ->> 'store_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND public.is_store_staff(((c.metadata ->> 'store_id')::uuid))
          )
        )
    )
  );

-- ─── 6. RPCS SECURITY DEFINER ATUALIZADAS PARA FLUXOS PÚBLICOS E CRM ─────────

CREATE OR REPLACE FUNCTION public.deduplicate_and_link_lead_to_customer(
  p_lead_id uuid,
  p_store_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_customer_id UUID;
  v_existing_lead_count INTEGER;
  v_doc TEXT;
BEGIN
  SELECT * INTO v_lead
  FROM public.leads_crm
  WHERE id = p_lead_id AND store_id = p_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado ou não pertence a este tenant.';
  END IF;

  IF v_lead.customer_id IS NOT NULL THEN
    RETURN v_lead.customer_id;
  END IF;

  v_doc := COALESCE(
    NULLIF(btrim(v_lead.document), ''),
    NULLIF(btrim(v_lead.custom_fields ->> 'cpf'), ''),
    NULLIF(btrim(v_lead.custom_fields ->> 'document'), '')
  );

  IF v_doc IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM public.customers_crm
    WHERE store_id = p_store_id AND document = v_doc
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL AND v_lead.phone IS NOT NULL AND v_lead.phone != '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers_crm
    WHERE store_id = p_store_id AND phone = v_lead.phone
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL AND v_lead.email IS NOT NULL AND v_lead.email != '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers_crm
    WHERE store_id = p_store_id AND email = v_lead.email
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers_crm (
      store_id,
      kind,
      full_name,
      name,
      email,
      phone,
      document,
      channel,
      tags,
      notes,
      lifetime_lead_count,
      last_commercial_touch_at,
      lgpd_accepted,
      custom_fields
    ) VALUES (
      p_store_id,
      'individual',
      COALESCE(v_lead.full_name, v_lead.title, 'Cliente'),
      COALESCE(v_lead.full_name, v_lead.title, 'Cliente'),
      v_lead.email,
      v_lead.phone,
      v_doc,
      COALESCE(v_lead.source, 'direct'),
      ARRAY['Novo Lead']::text[],
      v_lead.notes,
      1,
      now(),
      COALESCE(v_lead.lgpd_accepted, false),
      COALESCE(v_lead.custom_fields, '{}'::jsonb)
    ) RETURNING id INTO v_customer_id;
  ELSE
    SELECT COUNT(*) INTO v_existing_lead_count
    FROM public.leads_crm
    WHERE customer_id = v_customer_id;

    UPDATE public.customers_crm
    SET
      lifetime_lead_count = v_existing_lead_count + 1,
      last_commercial_touch_at = now(),
      document = COALESCE(customers_crm.document, v_doc)
    WHERE id = v_customer_id;
  END IF;

  UPDATE public.leads_crm
  SET
    customer_id = v_customer_id,
    document = COALESCE(leads_crm.document, v_doc),
    lifecycle_number = (SELECT lifetime_lead_count FROM public.customers_crm WHERE id = v_customer_id)
  WHERE id = p_lead_id;

  INSERT INTO public.lead_activities (
    lead_id,
    store_id,
    author_id,
    type,
    content,
    metadata
  ) VALUES (
    p_lead_id,
    p_store_id,
    auth.uid(),
    'customer_linked',
    'Lead associado com sucesso ao perfil canônico de cliente.',
    jsonb_build_object('customer_id', v_customer_id)
  );

  RETURN v_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_lead_passengers(
  _token uuid,
  _pax_list jsonb,
  _lgpd_accepted boolean,
  _health_notes text DEFAULT NULL,
  _pcd boolean DEFAULT NULL,
  _reduced_mobility boolean DEFAULT NULL,
  _autism boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads_crm%ROWTYPE;
  v_cf jsonb;
  v_dossiers jsonb;
  v_consents jsonb;
  v_primary_pax jsonb;
  v_idx integer := 0;
  v_pax jsonb;
BEGIN
  SELECT * INTO v_lead
  FROM public.leads_crm
  WHERE magic_token = _token OR id = _token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link de formulário inválido ou expirado.';
  END IF;

  v_cf := COALESCE(v_lead.custom_fields, '{}'::jsonb);

  -- Preserva ou cria a pasta do titular e sincroniza acompanhantes em traveler_dossiers
  IF jsonb_typeof(v_cf -> 'traveler_dossiers') = 'array' AND jsonb_array_length(v_cf -> 'traveler_dossiers') > 0 THEN
    v_primary_pax := (v_cf -> 'traveler_dossiers') -> 0;
  ELSE
    v_primary_pax := jsonb_build_object(
      'id', 'pax-primary',
      'is_primary', true,
      'relationship', 'titular',
      'full_name', COALESCE(v_lead.full_name, 'Passageiro Titular'),
      'document_cpf', COALESCE(v_lead.document, ''),
      'phone', COALESCE(v_lead.phone, ''),
      'email', COALESCE(v_lead.email, '')
    );
  END IF;

  v_dossiers := jsonb_build_array(v_primary_pax);
  IF jsonb_typeof(_pax_list) = 'array' THEN
    FOR v_pax IN SELECT * FROM jsonb_array_elements(_pax_list)
    LOOP
      v_idx := v_idx + 1;
      v_dossiers := v_dossiers || jsonb_build_array(
        jsonb_build_object(
          'id', 'pax-acc-' || v_idx,
          'is_primary', false,
          'relationship', COALESCE(v_pax ->> 'relationship', 'outro'),
          'full_name', COALESCE(v_pax ->> 'full_name', ''),
          'birth_date', COALESCE(v_pax ->> 'birth_date', ''),
          'document_cpf', COALESCE(v_pax ->> 'document', ''),
          'phone', COALESCE(v_pax ->> 'phone', ''),
          'email', COALESCE(v_pax ->> 'email', '')
        )
      );
    END LOOP;
  END IF;

  v_cf := v_cf || jsonb_build_object(
    'traveler_dossiers', v_dossiers,
    'pcd', COALESCE(_pcd, v_lead.pcd, false),
    'reduced_mobility', COALESCE(_reduced_mobility, v_lead.reduced_mobility, false),
    'autism_spectrum', COALESCE(_autism, v_lead.autism, false),
    'health_notes', COALESCE(_health_notes, v_lead.health_notes, '')
  );

  UPDATE public.leads_crm
  SET
    pax_list = COALESCE(_pax_list, pax_list),
    pax_count = GREATEST(1, COALESCE(jsonb_array_length(_pax_list), 0) + 1),
    lgpd_accepted = _lgpd_accepted,
    lgpd_accepted_at = CASE WHEN _lgpd_accepted THEN now() ELSE lgpd_accepted_at END,
    health_notes = COALESCE(_health_notes, health_notes),
    pcd = COALESCE(_pcd, pcd),
    reduced_mobility = COALESCE(_reduced_mobility, reduced_mobility),
    autism = COALESCE(_autism, autism),
    custom_fields = v_cf,
    updated_at = now(),
    last_contacted_at = now()
  WHERE id = v_lead.id;

  INSERT INTO public.lead_activities (
    lead_id,
    store_id,
    type,
    content,
    metadata
  ) VALUES (
    v_lead.id,
    v_lead.store_id,
    'magic_link',
    'Cliente preencheu ficha de passageiro, anamnese e acompanhantes via link público.',
    jsonb_build_object(
      'pax_count', jsonb_array_length(COALESCE(_pax_list, '[]'::jsonb)),
      'lgpd_accepted', _lgpd_accepted,
      'pcd', COALESCE(_pcd, v_lead.pcd, false),
      'reduced_mobility', COALESCE(_reduced_mobility, v_lead.reduced_mobility, false),
      'autism', COALESCE(_autism, v_lead.autism, false),
      'submitted_at', now()
    )
  );

  RETURN jsonb_build_object('success', true, 'lead_id', v_lead.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_lead_consent_bundle(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads_crm%ROWTYPE;
  v_store public.stores%ROWTYPE;
  v_travel_templates jsonb := '[]'::jsonb;
  v_contract_templates jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_lead
  FROM public.leads_crm
  WHERE id = _lead_id OR magic_token = _lead_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_store
  FROM public.stores
  WHERE id = v_lead.store_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'description', t.description,
    'clauses', t.clauses,
    'updated_at', t.updated_at
  )), '[]'::jsonb)
  INTO v_travel_templates
  FROM public.travel_contract_templates t
  WHERE t.store_id = v_lead.store_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ct.id,
    'title', ct.title,
    'category', ct.category,
    'description', ct.description,
    'content_markdown', ct.content_markdown,
    'clauses', COALESCE(ct.clauses, ct.default_clauses)
  )), '[]'::jsonb)
  INTO v_contract_templates
  FROM public.contract_templates ct
  WHERE ct.is_active = true
    AND (ct.store_id = v_lead.store_id OR ct.store_id IS NULL);

  RETURN jsonb_build_object(
    'lead', jsonb_build_object(
      'id', v_lead.id,
      'full_name', v_lead.full_name,
      'phone', v_lead.phone,
      'email', v_lead.email,
      'store_id', v_lead.store_id,
      'customer_id', v_lead.customer_id,
      'lgpd_accepted', v_lead.lgpd_accepted,
      'lgpd_accepted_at', v_lead.lgpd_accepted_at,
      'custom_fields', COALESCE(v_lead.custom_fields, '{}'::jsonb)
    ),
    'store', jsonb_build_object(
      'id', v_store.id,
      'name', COALESCE(v_store.name, 'Agência de Turismo'),
      'settings', COALESCE(v_store.settings, '{}'::jsonb)
    ),
    'travel_templates', v_travel_templates,
    'contract_templates', v_contract_templates
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_public_lead_consent(
  _lead_id uuid,
  _customer_id uuid,
  _consent_record jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads_crm%ROWTYPE;
  v_cf jsonb;
  v_list jsonb := '[]'::jsonb;
  v_filtered jsonb := '[]'::jsonb;
  v_item jsonb;
  v_policy_type text;
  v_cust_cf jsonb;
  v_cust_list jsonb := '[]'::jsonb;
  v_cust_filtered jsonb := '[]'::jsonb;
BEGIN
  v_policy_type := _consent_record ->> 'policy_type';

  IF _lead_id IS NOT NULL THEN
    SELECT * INTO v_lead
    FROM public.leads_crm
    WHERE id = _lead_id OR magic_token = _lead_id
    FOR UPDATE;

    IF FOUND THEN
      v_cf := COALESCE(v_lead.custom_fields, '{}'::jsonb);
      IF jsonb_typeof(v_cf -> 'consent_records') = 'array' THEN
        v_list := v_cf -> 'consent_records';
      END IF;

      FOR v_item IN SELECT * FROM jsonb_array_elements(v_list)
      LOOP
        IF (v_item ->> 'policy_type') IS DISTINCT FROM v_policy_type THEN
          v_filtered := v_filtered || jsonb_build_array(v_item);
        END IF;
      END LOOP;

      v_filtered := jsonb_build_array(_consent_record) || v_filtered;

      UPDATE public.leads_crm
      SET
        lgpd_accepted = CASE WHEN v_policy_type = 'privacy_policy' THEN true ELSE lgpd_accepted END,
        lgpd_accepted_at = CASE WHEN v_policy_type = 'privacy_policy' THEN now() ELSE lgpd_accepted_at END,
        custom_fields = v_cf || jsonb_build_object(
          'consent_records', v_filtered,
          'last_consent_at', now()
        ),
        updated_at = now()
      WHERE id = v_lead.id;
    END IF;
  END IF;

  IF _customer_id IS NOT NULL THEN
    SELECT COALESCE(custom_fields, '{}'::jsonb) INTO v_cust_cf
    FROM public.customers_crm
    WHERE id = _customer_id
    FOR UPDATE;

    IF FOUND THEN
      IF jsonb_typeof(v_cust_cf -> 'consent_records') = 'array' THEN
        v_cust_list := v_cust_cf -> 'consent_records';
      END IF;

      FOR v_item IN SELECT * FROM jsonb_array_elements(v_cust_list)
      LOOP
        IF (v_item ->> 'policy_type') IS DISTINCT FROM v_policy_type THEN
          v_cust_filtered := v_cust_filtered || jsonb_build_array(v_item);
        END IF;
      END LOOP;

      v_cust_filtered := jsonb_build_array(_consent_record) || v_cust_filtered;

      UPDATE public.customers_crm
      SET
        lgpd_accepted = CASE WHEN v_policy_type = 'privacy_policy' THEN true ELSE lgpd_accepted END,
        custom_fields = v_cust_cf || jsonb_build_object(
          'consent_records', v_cust_filtered,
          'last_consent_at', now()
        ),
        updated_at = now()
      WHERE id = _customer_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
