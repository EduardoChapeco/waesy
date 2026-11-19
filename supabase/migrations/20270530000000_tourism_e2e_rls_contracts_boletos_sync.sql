-- ============================================================================
-- Migration: 20270530000000_tourism_e2e_rls_contracts_boletos_sync.sql
-- Spec: docs/specs/SPEC-TOURISM-E2E-SYNC-CLOSURE.md
-- Objetivos:
--  1. RLS Deny-by-Default em travel_trip_official_documents e travel_trip_installment_boletos
--     via helper is_trip_member_or_owner(p_trip_id) + is_store_staff(store_id).
--  2. Propaga lead_id, customer_id, selected_option_id e preserva contrato em 'signing'
--     em convert_accepted_travel_proposal_staff (sem quebrar /contrato/$token).
--  3. Reconcilia signer_profile_id, tourism_trips e cria signed_contract em
--     travel_trip_official_documents ao concluir sign_public_travel_contract.
--  4. Registra confirmação da operadora em travel_trip_official_documents ao rodar
--     apply_operator_voucher_atomic quando houver storage_path/original_pdf_url real.
-- ============================================================================

-- 1. Garantir colunas relacionais e índices em tourism_trips
ALTER TABLE public.tourism_trips
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tourism_trips_store_lead
  ON public.tourism_trips(store_id, lead_id);

CREATE INDEX IF NOT EXISTS idx_tourism_trips_source_proposal
  ON public.tourism_trips(source_proposal_id);

CREATE INDEX IF NOT EXISTS idx_tourism_trips_customer
  ON public.tourism_trips(customer_id);

-- 2. Helper RLS Zero-Trust para titular / passageiro da viagem
CREATE OR REPLACE FUNCTION public.is_trip_member_or_owner(p_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT CASE
    WHEN p_trip_id IS NULL OR (SELECT auth.uid()) IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1
      FROM public.tourism_trips AS tt
      LEFT JOIN public.profiles AS pr ON pr.id = (SELECT auth.uid())
      WHERE tt.id = p_trip_id
        AND (
          tt.customer_id = (SELECT auth.uid())
          OR (
            NULLIF(lower(btrim(COALESCE((SELECT auth.jwt() ->> 'email'), ''))), '') IS NOT NULL
            AND lower(btrim(COALESCE(tt.client_email, ''))) = lower(btrim(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
          )
          OR (
            length(regexp_replace(COALESCE(pr.cpf, ''), '[^0-9]', '', 'g')) = 11
            AND regexp_replace(COALESCE(pr.cpf, ''), '[^0-9]', '', 'g') !~ '^(\d)\1{10}$'
            AND regexp_replace(COALESCE(tt.client_document, ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(pr.cpf, ''), '[^0-9]', '', 'g')
          )
          OR EXISTS (
            SELECT 1
            FROM public.trip_passengers AS tp
            WHERE tp.trip_id = tt.id
              AND (
                (
                  NULLIF(lower(btrim(COALESCE((SELECT auth.jwt() ->> 'email'), ''))), '') IS NOT NULL
                  AND lower(btrim(COALESCE(tp.email, ''))) = lower(btrim(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
                )
                OR (
                  length(regexp_replace(COALESCE(pr.cpf, ''), '[^0-9]', '', 'g')) = 11
                  AND regexp_replace(COALESCE(pr.cpf, ''), '[^0-9]', '', 'g') !~ '^(\d)\1{10}$'
                  AND regexp_replace(COALESCE(tp.document, ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(pr.cpf, ''), '[^0-9]', '', 'g')
                )
              )
          )
        )
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.is_trip_member_or_owner(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_trip_member_or_owner(UUID) TO authenticated, service_role;

-- 3. Fechar P0 Cross-Tenant em travel_trip_official_documents e adicionar escrita Staff
DROP POLICY IF EXISTS "travel_trip_official_documents_read" ON public.travel_trip_official_documents;
DROP POLICY IF EXISTS "travel_trip_official_documents_select" ON public.travel_trip_official_documents;
DROP POLICY IF EXISTS "travel_trip_official_documents_staff_insert" ON public.travel_trip_official_documents;
DROP POLICY IF EXISTS "travel_trip_official_documents_staff_update" ON public.travel_trip_official_documents;
DROP POLICY IF EXISTS "travel_trip_official_documents_staff_delete" ON public.travel_trip_official_documents;

CREATE POLICY "travel_trip_official_documents_select"
  ON public.travel_trip_official_documents
  FOR SELECT
  TO authenticated
  USING (
    public.is_store_staff(store_id)
    OR (
      is_visible_to_client = true
      AND public.is_trip_member_or_owner(trip_id)
    )
  );

CREATE POLICY "travel_trip_official_documents_staff_insert"
  ON public.travel_trip_official_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_store_staff(store_id));

CREATE POLICY "travel_trip_official_documents_staff_update"
  ON public.travel_trip_official_documents
  FOR UPDATE
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

CREATE POLICY "travel_trip_official_documents_staff_delete"
  ON public.travel_trip_official_documents
  FOR DELETE
  TO authenticated
  USING (public.is_store_staff(store_id));

-- Reforçar travel_trip_installment_boletos (somente staff gerencia ou titular/membro lê; upload de comprovante vai via BFF)
DROP POLICY IF EXISTS "travel_trip_installment_boletos_access" ON public.travel_trip_installment_boletos;
DROP POLICY IF EXISTS "travel_trip_installment_boletos_select" ON public.travel_trip_installment_boletos;
DROP POLICY IF EXISTS "travel_trip_installment_boletos_staff_manage" ON public.travel_trip_installment_boletos;

CREATE POLICY "travel_trip_installment_boletos_select"
  ON public.travel_trip_installment_boletos
  FOR SELECT
  TO authenticated
  USING (
    public.is_store_staff(store_id)
    OR client_profile_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.tourism_trips AS tt
      LEFT JOIN public.profiles AS pr ON pr.id = (SELECT auth.uid())
      WHERE tt.id = travel_trip_installment_boletos.trip_id
        AND (
          tt.customer_id = (SELECT auth.uid())
          OR (
            NULLIF(lower(btrim(COALESCE((SELECT auth.jwt() ->> 'email'), ''))), '') IS NOT NULL
            AND lower(btrim(COALESCE(tt.client_email, ''))) = lower(btrim(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
          )
          OR (
            length(regexp_replace(COALESCE(pr.cpf, ''), '[^0-9]', '', 'g')) = 11
            AND regexp_replace(COALESCE(pr.cpf, ''), '[^0-9]', '', 'g') !~ '^(\d)\1{10}$'
            AND regexp_replace(COALESCE(tt.client_document, ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(pr.cpf, ''), '[^0-9]', '', 'g')
          )
        )
    )
  );

CREATE POLICY "travel_trip_installment_boletos_staff_manage"
  ON public.travel_trip_installment_boletos
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

-- 4. Corrigir convert_accepted_travel_proposal_staff: preservar lead_id, customer_id,
--    selected_option_id, proposal_id (quando existente em quotes) e manter contrato em 'signing'.
CREATE OR REPLACE FUNCTION public.convert_accepted_travel_proposal_staff(
  p_proposal_id UUID,
  p_store_id UUID,
  p_actor_profile_id UUID,
  p_idempotency_key TEXT,
  p_lead_passenger JSONB DEFAULT NULL,
  p_additional_passengers JSONB DEFAULT '[]'::jsonb,
  p_payment_details JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
SET row_security = off
AS $$
DECLARE
  v_proposal public.travel_proposals%ROWTYPE;
  v_acceptance public.travel_proposal_acceptances%ROWTYPE;
  v_sale public.travel_sales%ROWTYPE;
  v_existing_trip_number TEXT := NULL;
  v_existing_trip_status TEXT := 'pending_review';
  v_manifest JSONB;
  v_passenger JSONB;
  v_passenger_index INTEGER := 0;
  v_snapshot JSONB;
  v_selected_option JSONB := NULL;
  v_web_page JSONB := NULL;
  v_portal_content JSONB := '{}'::jsonb;
  v_flights JSONB;
  v_hotels JSONB;
  v_transfers JSONB;
  v_tours JSONB;
  v_itinerary JSONB;
  v_rooms JSONB;
  v_includes TEXT[];
  v_excludes TEXT[];
  v_destination TEXT;
  v_cover_image_url TEXT;
  v_price_text TEXT;
  v_option_name TEXT;
  v_total_cents BIGINT;
  v_name TEXT;
  v_document TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_lead_id UUID;
  v_customer_id UUID;
  v_quote_fk_id UUID := NULL;
  v_trip_id UUID;
  v_trip_number TEXT;
  v_contract_result JSONB;
  v_contract_id UUID;
  v_contract_token TEXT;
  v_sale_id UUID;
  v_correlation_id TEXT;
BEGIN
  IF p_proposal_id IS NULL OR p_store_id IS NULL OR p_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Proposta, loja e ator são obrigatórios.' USING ERRCODE = '22023';
  END IF;
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 OR length(p_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Chave de idempotência inválida.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.workspace_members AS wm
     WHERE wm.profile_id = p_actor_profile_id
       AND wm.store_id = p_store_id
       AND wm.role IN ('owner', 'store_owner', 'proprietario', 'admin', 'manager', 'gerente', 'seller', 'finance', 'content', 'support', 'stock')
  ) THEN
    RAISE EXCEPTION 'Ator não possui membership staff ativo nesta loja.' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('travel-staff-convert:' || p_store_id::TEXT || ':' || p_proposal_id::TEXT));

  SELECT tp.* INTO v_proposal
    FROM public.travel_proposals AS tp
   WHERE tp.id = p_proposal_id
     AND tp.store_id = p_store_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta não encontrada nesta loja.' USING ERRCODE = 'P0002';
  END IF;

  SELECT ts.* INTO v_sale
    FROM public.travel_sales AS ts
   WHERE ts.store_id = p_store_id
     AND ts.proposal_id = p_proposal_id
   LIMIT 1;
  IF FOUND THEN
    SELECT tt.trip_number, COALESCE(tt.status, 'pending_review')
      INTO v_existing_trip_number, v_existing_trip_status
      FROM public.tourism_trips AS tt
     WHERE tt.id = v_sale.trip_id
       AND tt.store_id = p_store_id
     LIMIT 1;

    SELECT c.id, c.verification_code
      INTO v_contract_id, v_contract_token
      FROM public.contracts AS c
     WHERE c.category = 'tourism'
       AND c.metadata ->> 'store_id' = p_store_id::TEXT
       AND c.metadata ->> 'proposal_id' = p_proposal_id::TEXT
       AND c.metadata ->> 'acceptance_id' = v_sale.acceptance_id::TEXT
     ORDER BY c.created_at DESC
     LIMIT 1;

    SELECT a.selected_option_id INTO v_option_name
      FROM public.travel_proposal_acceptances AS a
     WHERE a.id = v_sale.acceptance_id
     LIMIT 1;

    RETURN jsonb_build_object(
      'success', TRUE,
      'replayed', TRUE,
      'trip_id', v_sale.trip_id,
      'trip_number', v_existing_trip_number,
      'trip_status', COALESCE(v_existing_trip_status, 'pending_review'),
      'payment_status', v_sale.status,
      'contract_id', v_contract_id,
      'voucher_id', NULL,
      'voucher_token', NULL,
      'contract_public_token', v_contract_token,
      'selected_option_id', v_option_name
    );
  END IF;

  IF v_proposal.status <> 'approved'
     OR v_proposal.acceptance_status <> 'accepted'
     OR v_proposal.snapshot_hash IS NULL THEN
    RAISE EXCEPTION 'A proposta precisa ter aceite válido antes da conversão.' USING ERRCODE = '55000';
  END IF;

  v_snapshot := public.travel_proposal_snapshot_payload(v_proposal);
  IF public.travel_proposal_snapshot_hash(v_snapshot) IS DISTINCT FROM v_proposal.snapshot_hash THEN
    RAISE EXCEPTION 'O snapshot da proposta mudou; revise o aceite antes da conversão.' USING ERRCODE = '55000';
  END IF;

  SELECT a.* INTO v_acceptance
    FROM public.travel_proposal_acceptances AS a
   WHERE a.store_id = p_store_id
     AND a.proposal_id = p_proposal_id
     AND a.status = 'accepted'
     AND a.proposal_snapshot_hash = v_proposal.snapshot_hash
   FOR UPDATE;
  IF NOT FOUND OR v_acceptance.acceptance_fingerprint IS NULL THEN
    RAISE EXCEPTION 'Aceite vigente e verificável não encontrado para esta proposta.' USING ERRCODE = '55000';
  END IF;

  v_manifest := v_acceptance.passenger_manifest;
  IF jsonb_typeof(v_manifest) <> 'array' OR jsonb_array_length(v_manifest) < 1 OR jsonb_array_length(v_manifest) > 40 THEN
    RAISE EXCEPTION 'O manifesto persistido no aceite é inválido.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(COALESCE(v_proposal.options, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'As opções persistidas da proposta são inválidas.' USING ERRCODE = '55000';
  END IF;

  IF jsonb_array_length(COALESCE(v_proposal.options, '[]'::jsonb)) > 0 THEN
    IF v_acceptance.selected_option_id IS NULL OR NOT EXISTS (
      SELECT 1
        FROM jsonb_array_elements(v_proposal.options) AS option_row(option)
       WHERE option ->> 'id' = v_acceptance.selected_option_id
    ) THEN
      RAISE EXCEPTION 'A opção aceita não existe mais no snapshot persistido.' USING ERRCODE = '55000';
    END IF;
    SELECT option,
           COALESCE(option -> 'pricing' ->> 'total_price_cents', option ->> 'total_price_cents'),
           COALESCE(option ->> 'name', option ->> 'title', option ->> 'id')
      INTO v_selected_option, v_price_text, v_option_name
      FROM jsonb_array_elements(v_proposal.options) AS option_row(option)
     WHERE option ->> 'id' = v_acceptance.selected_option_id
     LIMIT 1;
  ELSE
    IF v_acceptance.selected_option_id IS NOT NULL THEN
      RAISE EXCEPTION 'O aceite referencia uma opção ausente no snapshot.' USING ERRCODE = '55000';
    END IF;
    v_price_text := v_proposal.pricing ->> 'total_price_cents';
  END IF;
  v_price_text := COALESCE(v_price_text, v_proposal.pricing ->> 'total_cents', '0');
  IF v_price_text !~ '^[0-9]{1,15}$' THEN
    RAISE EXCEPTION 'O valor da proposta aceita não é válido.' USING ERRCODE = '22023';
  END IF;
  v_total_cents := v_price_text::BIGINT;

  v_flights := CASE
    WHEN v_selected_option IS NOT NULL AND jsonb_typeof(v_selected_option -> 'flights') = 'array' AND jsonb_array_length(v_selected_option -> 'flights') > 0
      THEN v_selected_option -> 'flights'
    ELSE COALESCE(v_proposal.flights, '[]'::jsonb)
  END;
  v_hotels := CASE
    WHEN v_selected_option IS NOT NULL AND jsonb_typeof(v_selected_option -> 'hotels') = 'array' AND jsonb_array_length(v_selected_option -> 'hotels') > 0
      THEN v_selected_option -> 'hotels'
    WHEN v_selected_option IS NOT NULL AND NULLIF(btrim(COALESCE(v_selected_option ->> 'hotel_name', '')), '') IS NOT NULL
      THEN jsonb_build_array(jsonb_build_object(
        'hotel_name', v_selected_option ->> 'hotel_name',
        'stars', v_selected_option -> 'hotel_stars',
        'room_type', v_selected_option ->> 'room_type',
        'board_basis', v_selected_option ->> 'meal_plan'
      ))
    ELSE COALESCE(v_proposal.hotels, '[]'::jsonb)
  END;
  v_transfers := CASE
    WHEN v_selected_option IS NOT NULL AND jsonb_typeof(v_selected_option -> 'transfers') = 'array' AND jsonb_array_length(v_selected_option -> 'transfers') > 0
      THEN v_selected_option -> 'transfers'
    ELSE COALESCE(v_proposal.transfers, '[]'::jsonb)
  END;
  v_tours := CASE
    WHEN v_selected_option IS NOT NULL AND jsonb_typeof(v_selected_option -> 'tours') = 'array' AND jsonb_array_length(v_selected_option -> 'tours') > 0
      THEN v_selected_option -> 'tours'
    ELSE COALESCE(v_proposal.tours, '[]'::jsonb)
  END;
  v_itinerary := CASE
    WHEN v_selected_option IS NOT NULL AND jsonb_typeof(v_selected_option -> 'itinerary') = 'array' AND jsonb_array_length(v_selected_option -> 'itinerary') > 0
      THEN v_selected_option -> 'itinerary'
    ELSE COALESCE(v_proposal.itinerary, '[]'::jsonb)
  END;
  v_rooms := CASE
    WHEN v_selected_option IS NOT NULL AND jsonb_typeof(v_selected_option -> 'rooms') = 'array' AND jsonb_array_length(v_selected_option -> 'rooms') > 0
      THEN v_selected_option -> 'rooms'
    ELSE COALESCE(v_proposal.rooms, '[]'::jsonb)
  END;
  v_includes := CASE
    WHEN v_selected_option IS NOT NULL AND jsonb_typeof(v_selected_option -> 'includes') = 'array' AND jsonb_array_length(v_selected_option -> 'includes') > 0
      THEN ARRAY(SELECT jsonb_array_elements_text(v_selected_option -> 'includes'))
    ELSE COALESCE(v_proposal.includes, ARRAY[]::TEXT[])
  END;
  v_excludes := CASE
    WHEN v_selected_option IS NOT NULL AND jsonb_typeof(v_selected_option -> 'excludes') = 'array' AND jsonb_array_length(v_selected_option -> 'excludes') > 0
      THEN ARRAY(SELECT jsonb_array_elements_text(v_selected_option -> 'excludes'))
    ELSE COALESCE(v_proposal.excludes, ARRAY[]::TEXT[])
  END;
  v_destination := COALESCE(
    NULLIF(btrim(COALESCE(v_selected_option ->> 'destination_city', v_proposal.destination_city, '')), ''),
    'Destino não informado'
  );
  v_cover_image_url := COALESCE(
    NULLIF(btrim(COALESCE(v_selected_option ->> 'cover_image_url', '')), ''),
    NULLIF(btrim(COALESCE(v_proposal.hero_image_url, '')), '')
  );

  SELECT to_jsonb(pwp) INTO v_web_page
    FROM public.proposal_web_pages AS pwp
   WHERE pwp.proposal_id = v_proposal.id
   LIMIT 1;

  v_portal_content := jsonb_strip_nulls(jsonb_build_object(
    'welcome_note', COALESCE(NULLIF(v_web_page ->> 'subheadline', ''), NULLIF(v_proposal.subtitle, '')),
    'portal_media', COALESCE(v_web_page -> 'hero_media', '[]'::jsonb),
    'portal_tips', '[]'::jsonb,
    'selected_option_id', v_acceptance.selected_option_id,
    'selected_option_name', v_option_name
  ));

  v_lead_id := v_proposal.lead_id;
  v_customer_id := v_proposal.customer_id;
  IF v_customer_id IS NULL AND v_lead_id IS NOT NULL THEN
    SELECT lc.customer_id INTO v_customer_id
      FROM public.leads_crm AS lc
     WHERE lc.id = v_lead_id
       AND lc.store_id = p_store_id
     LIMIT 1;
  END IF;
  IF EXISTS (SELECT 1 FROM public.quotes AS q WHERE q.id = v_proposal.id) THEN
    v_quote_fk_id := v_proposal.id;
  END IF;

  v_passenger := v_manifest -> 0;
  v_name := COALESCE(NULLIF(btrim(v_passenger ->> 'name'), ''), NULLIF(btrim(v_proposal.client_name), ''), 'Passageiro Principal');
  v_document := NULLIF(regexp_replace(COALESCE(v_passenger ->> 'document', ''), '[^0-9]', '', 'g'), '');
  v_email := COALESCE(NULLIF(lower(btrim(v_passenger ->> 'email')), ''), v_proposal.client_email);
  v_phone := COALESCE(NULLIF(btrim(v_passenger ->> 'phone'), ''), v_proposal.client_whatsapp, '');
  v_trip_number := 'VIAGEM-' || to_char(now(), 'YYYY') || '-' || upper(replace(left(extensions.gen_random_uuid()::TEXT, 13), '-', ''));
  v_correlation_id := btrim(p_idempotency_key);

  INSERT INTO public.tourism_trips (
    store_id, created_by_profile_id, lead_id, customer_id, proposal_id, source_proposal_id,
    trip_number, title, destination_city,
    travel_start_date, travel_end_date, adults_count, children_count, currency, total_cents,
    status, client_name, client_whatsapp, client_email, client_document, cover_image_url,
    flights, hotels, transfers, tours, insurance, itinerary, rooms, includes, excludes, notes, portal_content
  ) VALUES (
    p_store_id, p_actor_profile_id, v_lead_id, v_customer_id, v_quote_fk_id, v_proposal.id,
    v_trip_number,
    CASE WHEN v_option_name IS NOT NULL THEN v_proposal.title || ' — ' || v_option_name ELSE v_proposal.title END,
    v_destination,
    v_proposal.travel_start_date, v_proposal.travel_end_date, v_proposal.adults_count,
    v_proposal.children_count, COALESCE(v_selected_option -> 'pricing' ->> 'currency', v_proposal.pricing ->> 'currency', 'BRL'), v_total_cents,
    'pending_review', v_name, v_phone, v_email, v_document, v_cover_image_url,
    v_flights, v_hotels, v_transfers, v_tours,
    '{}'::jsonb, v_itinerary, v_rooms, v_includes, v_excludes,
    'Aceite recebido; aguardando revisão operacional. Nenhuma reserva, pagamento ou voucher confirmado.',
    v_portal_content
  ) RETURNING id INTO v_trip_id;

  FOR v_passenger IN SELECT value FROM jsonb_array_elements(v_manifest) LOOP
    INSERT INTO public.trip_passengers (
      trip_id, store_id, full_name, document, birth_date, email, phone, is_lead_passenger
    ) VALUES (
      v_trip_id, p_store_id,
      COALESCE(NULLIF(btrim(v_passenger ->> 'name'), ''), 'Passageiro não identificado'),
      NULLIF(regexp_replace(COALESCE(v_passenger ->> 'document', ''), '[^0-9]', '', 'g'), ''),
      NULLIF(v_passenger ->> 'birthDate', '')::DATE,
      NULLIF(lower(btrim(v_passenger ->> 'email')), ''),
      NULLIF(btrim(v_passenger ->> 'phone'), ''),
      v_passenger_index = 0
    );
    v_passenger_index := v_passenger_index + 1;
  END LOOP;

  v_contract_result := public.create_staff_travel_contract_from_proposal(
    p_proposal_id, p_store_id, p_actor_profile_id, v_document
  );
  IF COALESCE((v_contract_result ->> 'success')::BOOLEAN, FALSE) IS NOT TRUE
     OR NULLIF(v_contract_result ->> 'contract_id', '') IS NULL THEN
    RAISE EXCEPTION 'Contrato de revisão não foi criado; conversão cancelada.' USING ERRCODE = '55000';
  END IF;
  v_contract_id := (v_contract_result ->> 'contract_id')::UUID;
  v_contract_token := v_contract_result ->> 'public_token';

  -- Preserva status 'signing' para o link público /contrato/$token funcionar após conversão
  UPDATE public.contracts
     SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('trip_id', v_trip_id),
         updated_at = now()
   WHERE id = v_contract_id
     AND creator_id = p_actor_profile_id
     AND metadata ->> 'store_id' = p_store_id::TEXT
     AND metadata ->> 'proposal_id' = p_proposal_id::TEXT;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato criado fora do tenant esperado; conversão cancelada.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.travel_sales (
    store_id, proposal_id, acceptance_id, budget_id, trip_id, status, currency, total_cents,
    idempotency_key, created_by_profile_id
  ) VALUES (
    p_store_id, p_proposal_id, v_acceptance.id, v_proposal.budget_id, v_trip_id, 'pending',
    COALESCE(v_selected_option -> 'pricing' ->> 'currency', v_proposal.pricing ->> 'currency', 'BRL'), v_total_cents, v_correlation_id, p_actor_profile_id
  ) RETURNING id INTO v_sale_id;

  UPDATE public.travel_proposals
     SET canonical_status = 'converted',
         converted_trip_id = v_trip_id,
         updated_at = now()
   WHERE id = p_proposal_id AND store_id = p_store_id;

  INSERT INTO public.travel_timeline_events (
    store_id, proposal_id, budget_id, sale_id, trip_id, actor_profile_id, event_type, correlation_id, payload
  ) VALUES (
    p_store_id, p_proposal_id, v_proposal.budget_id, v_sale_id, v_trip_id, p_actor_profile_id,
    'proposal.converted_to_trip', v_correlation_id,
    jsonb_build_object(
      'acceptance_id', v_acceptance.id,
      'contract_id', v_contract_id,
      'selected_option_id', v_acceptance.selected_option_id,
      'option_name', v_option_name,
      'payment_preference', v_acceptance.payment_preference,
      'payment_installments', v_acceptance.payment_installments,
      'payment_status', 'pending',
      'voucher_status', 'not_created'
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'replayed', FALSE,
    'trip_id', v_trip_id,
    'trip_number', v_trip_number,
    'trip_status', 'pending_review',
    'payment_status', 'pending',
    'contract_id', v_contract_id,
    'contract_public_token', v_contract_token,
    'selected_option_id', v_acceptance.selected_option_id,
    'voucher_id', NULL,
    'voucher_token', NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.convert_accepted_travel_proposal_staff(UUID, UUID, UUID, TEXT, JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_accepted_travel_proposal_staff(UUID, UUID, UUID, TEXT, JSONB, JSONB, JSONB) TO service_role;

-- 5. Atualizar sign_public_travel_contract para vincular signer_profile_id,
--    espellhar travel_contracts e gravar signed_contract em travel_trip_official_documents.
CREATE OR REPLACE FUNCTION public.sign_public_travel_contract(
  p_token text,
  p_signer_name text,
  p_signer_document text,
  p_signer_email text,
  p_signature_image text,
  p_ip_address text,
  p_user_agent text,
  p_accepted_terms boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions'
SET row_security TO 'off'
AS $function$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_version public.contract_versions%ROWTYPE;
  v_envelope_id UUID;
  v_meta JSONB;
  v_signatures JSONB;
  v_name TEXT;
  v_document TEXT;
  v_email TEXT;
  v_serial TEXT;
  v_timestamp TIMESTAMPTZ;
  v_digest TEXT;
  v_image_digest TEXT;
  v_version_hash TEXT;
  v_signer_profile_id UUID := NULL;
  v_store_id UUID := NULL;
  v_proposal_id UUID := NULL;
  v_trip_id UUID := NULL;
BEGIN
  IF p_token IS NULL OR length(p_token) < 8 OR length(p_token) > 160 THEN
    RAISE EXCEPTION 'Token de assinatura inválido.' USING ERRCODE = '22023';
  END IF;
  IF p_accepted_terms IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'O consentimento explícito é obrigatório.' USING ERRCODE = '22023';
  END IF;

  v_name := btrim(COALESCE(p_signer_name, ''));
  v_document := regexp_replace(COALESCE(p_signer_document, ''), '[^0-9]', '', 'g');
  v_email := lower(btrim(COALESCE(p_signer_email, '')));

  IF length(v_name) < 2 OR length(v_name) > 160 THEN
    RAISE EXCEPTION 'Nome do signatário inválido.' USING ERRCODE = '22023';
  END IF;
  IF v_document !~ '^([0-9]{11}|[0-9]{14})$' THEN
    RAISE EXCEPTION 'CPF ou CNPJ do signatário inválido.' USING ERRCODE = '22023';
  END IF;
  IF length(v_email) > 254 OR v_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' THEN
    RAISE EXCEPTION 'E-mail do signatário inválido.' USING ERRCODE = '22023';
  END IF;
  IF p_signature_image IS NOT NULL AND (
    length(p_signature_image) > 350000 OR
    p_signature_image !~ '^data:image/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$'
  ) THEN
    RAISE EXCEPTION 'Imagem de assinatura inválida ou acima do limite.' USING ERRCODE = '22023';
  END IF;

  SELECT c.* INTO v_contract
    FROM public.contracts AS c
   WHERE c.verification_code = p_token
     AND c.category = 'tourism'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  v_meta := COALESCE(v_contract.metadata, '{}'::jsonb);
  v_signatures := CASE WHEN jsonb_typeof(v_meta -> 'signatures') = 'array' THEN v_meta -> 'signatures' ELSE '[]'::jsonb END;

  IF v_contract.status = 'completed' OR v_contract.status = 'signed' THEN
    IF v_meta ->> 'certificate_serial' IS NOT NULL
       AND lower(COALESCE(v_signatures -> 0 ->> 'signer_name', '')) = lower(v_name)
       AND regexp_replace(COALESCE(v_signatures -> 0 ->> 'signer_document', ''), '[^0-9]', '', 'g') = v_document
       AND lower(COALESCE(v_signatures -> 0 ->> 'signer_email', '')) = v_email
       AND COALESCE(v_signatures -> 0 ->> 'signature_image_url', '') = COALESCE(p_signature_image, '') THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'certificate_serial', v_meta ->> 'certificate_serial',
        'message', 'Assinatura já registrada; repetição idempotente confirmada.'
      );
    END IF;
    RAISE EXCEPTION 'Contrato já concluído com conteúdo de assinatura diferente.' USING ERRCODE = '55000';
  END IF;

  IF v_contract.status NOT IN ('signing', 'sent', 'draft', 'sealed') THEN
    RAISE EXCEPTION 'Contrato não está aberto para assinatura.' USING ERRCODE = '55000';
  END IF;
  IF NULLIF(regexp_replace(COALESCE(v_meta ->> 'client_document', ''), '[^0-9]', '', 'g'), '') IS NOT NULL
     AND regexp_replace(v_meta ->> 'client_document', '[^0-9]', '', 'g') <> v_document THEN
    RAISE EXCEPTION 'O documento do signatário não corresponde ao contratante registrado.' USING ERRCODE = '42501';
  END IF;

  SELECT cv.* INTO v_version
    FROM public.contract_versions AS cv
   WHERE cv.contract_id = v_contract.id
     AND cv.version_number = v_contract.current_version
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versão atual do contrato não encontrada.' USING ERRCODE = '55000';
  END IF;

  IF v_version.hash_sha256 IS NOT NULL AND v_version.hash_sha256 ~ '^[0-9a-f]{64}$' THEN
    v_version_hash := v_version.hash_sha256;
  ELSE
    v_version_hash := encode(extensions.digest(convert_to(COALESCE(v_version.content_markdown, ''), 'UTF8'), 'sha256'), 'hex');
  END IF;

  -- Tentar vincular profile do assinante pelo CPF
  SELECT pr.id INTO v_signer_profile_id
    FROM public.profiles AS pr
   WHERE regexp_replace(COALESCE(pr.cpf, ''), '[^0-9]', '', 'g') = v_document
   LIMIT 1;

  v_timestamp := clock_timestamp();
  v_serial := 'CERT-' || upper(encode(extensions.gen_random_bytes(12), 'hex'));
  v_digest := encode(extensions.digest(convert_to(jsonb_build_object(
    'contract_id', v_contract.id,
    'version_id', v_version.id,
    'version_hash', v_version_hash,
    'signer_name', v_name,
    'signer_document', v_document,
    'signer_email', v_email,
    'signed_at', v_timestamp,
    'certificate_serial', v_serial,
    'consent_version', 'travel-contract-terms-v1'
  )::TEXT, 'UTF8'), 'sha256'), 'hex');
  v_image_digest := CASE WHEN p_signature_image IS NULL THEN NULL ELSE encode(extensions.digest(convert_to(p_signature_image, 'UTF8'), 'sha256'), 'hex') END;

  INSERT INTO public.signature_envelopes (
    contract_version_id, signer_profile_id, signer_name, signer_email, signer_role, auth_level,
    signing_token, status, signed_at
  ) VALUES (
    v_version.id, v_signer_profile_id, v_name, v_email, 'party', 'basic',
    encode(extensions.gen_random_bytes(32), 'hex'), 'signed', v_timestamp
  ) RETURNING id INTO v_envelope_id;

  INSERT INTO public.signature_evidence (
    envelope_id, ip_address, user_agent, auth_method, consent_given,
    evidence_manifest, signature_digest, created_at
  ) VALUES (
    v_envelope_id,
    NULLIF(left(COALESCE(p_ip_address, ''), 64), ''),
    NULLIF(left(COALESCE(p_user_agent, ''), 1024), ''),
    'document_cpf', TRUE,
    jsonb_build_object(
      'signer_name', v_name,
      'signer_document', v_document,
      'signer_email', v_email,
      'certificate_serial', v_serial,
      'contract_version_id', v_version.id,
      'version_hash', v_version_hash,
      'signature_image_sha256', v_image_digest,
      'terms_version', 'travel-contract-terms-v1'
    ),
    v_digest,
    v_timestamp
  );

  v_signatures := v_signatures || jsonb_build_array(jsonb_build_object(
    'signer_name', v_name,
    'signer_document', v_document,
    'signer_email', v_email,
    'signed_at', v_timestamp,
    'ip_address', NULLIF(left(COALESCE(p_ip_address, ''), 64), ''),
    'user_agent', NULLIF(left(COALESCE(p_user_agent, ''), 1024), ''),
    'signature_image_url', p_signature_image,
    'content_hash', v_digest,
    'auth_serial', v_serial
  ));

  UPDATE public.contract_versions
     SET is_sealed = TRUE,
         sealed_at = v_timestamp,
         hash_sha256 = v_version_hash
   WHERE id = v_version.id;

  UPDATE public.contracts
     SET status = 'completed',
         metadata = v_meta || jsonb_build_object(
           'signatures', v_signatures,
           'signed_at', v_timestamp,
           'content_hash', v_digest,
           'certificate_serial', v_serial
         ),
         updated_at = v_timestamp
   WHERE id = v_contract.id;

  UPDATE public.travel_contracts
     SET status = 'signed',
         signed_at = v_timestamp,
         signer_ip = NULLIF(left(COALESCE(p_ip_address, ''), 64), ''),
         signer_user_agent = NULLIF(left(COALESCE(p_user_agent, ''), 1024), ''),
         signature_image_url = p_signature_image,
         content_hash = v_digest,
         certificate_serial = v_serial,
         updated_at = v_timestamp
   WHERE id = v_contract.id
      OR public_token = p_token;

  BEGIN
    v_store_id := COALESCE(v_contract.store_id, NULLIF(v_meta ->> 'store_id', '')::UUID);
    v_proposal_id := NULLIF(v_meta ->> 'proposal_id', '')::UUID;
    v_trip_id := NULLIF(v_meta ->> 'trip_id', '')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    v_trip_id := NULL;
  END;

  IF v_store_id IS NOT NULL THEN
    IF v_trip_id IS NULL AND v_proposal_id IS NOT NULL THEN
      SELECT tt.id INTO v_trip_id
        FROM public.tourism_trips AS tt
       WHERE tt.store_id = v_store_id
         AND (tt.source_proposal_id = v_proposal_id OR tt.proposal_id = v_proposal_id)
       ORDER BY tt.created_at DESC
       LIMIT 1;
    END IF;

    IF v_trip_id IS NOT NULL THEN
      INSERT INTO public.travel_trip_official_documents (
        store_id, trip_id, doc_category, operator_name, reservation_code, title,
        original_pdf_url, ocr_extracted_json, is_visible_to_client
      )
      SELECT
        v_store_id, v_trip_id, 'signed_contract',
        COALESCE(v_meta ->> 'agency_name', 'Agência de Viagens'),
        v_serial,
        COALESCE(v_version.title, v_contract.title, 'Contrato de Viagem') || ' (Assinado)',
        '/contrato/' || p_token,
        jsonb_build_object(
          'contract_id', v_contract.id,
          'certificate_serial', v_serial,
          'content_hash', v_digest,
          'signed_at', v_timestamp,
          'signer_name', v_name
        ),
        TRUE
      WHERE NOT EXISTS (
        SELECT 1
          FROM public.travel_trip_official_documents AS od
         WHERE od.trip_id = v_trip_id
           AND od.doc_category = 'signed_contract'
           AND od.reservation_code = v_serial
      );

      INSERT INTO public.travel_timeline_events (
        store_id, proposal_id, trip_id, actor_profile_id, event_type, correlation_id, payload
      ) VALUES (
        v_store_id, v_proposal_id, v_trip_id, v_signer_profile_id,
        'contract.signed', v_serial,
        jsonb_build_object(
          'contract_id', v_contract.id,
          'certificate_serial', v_serial,
          'signer_name', v_name,
          'signed_at', v_timestamp
        )
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'certificate_serial', v_serial,
    'message', 'Assinatura registrada com sucesso.'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.sign_public_travel_contract(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_public_travel_contract(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;

-- 6. Enriquecer apply_operator_voucher_atomic para registrar documento oficial real
--    em travel_trip_official_documents quando houver storage_path ou original_pdf_url.
CREATE OR REPLACE FUNCTION public.apply_operator_voucher_atomic(
  p_store_id UUID,
  p_actor_profile_id UUID,
  p_trip_id UUID DEFAULT NULL,
  p_ingestion_id UUID DEFAULT NULL,
  p_parsed_data JSONB DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
SET row_security = off
AS $$
DECLARE
  v_identity_ok BOOLEAN;
  v_trip public.tourism_trips%ROWTYPE;
  v_ingestion public.travel_document_ingestions%ROWTYPE;
  v_operation public.travel_voucher_apply_operations%ROWTYPE;
  v_payload JSONB;
  v_item JSONB;
  v_pax JSONB;
  v_hotel JSONB;
  v_transfer JSONB;
  v_tour JSONB;
  v_merged_flights JSONB;
  v_merged_hotels JSONB;
  v_merged_transfers JSONB;
  v_merged_tours JSONB;
  v_merged_passengers JSONB;
  v_trip_id UUID := p_trip_id;
  v_trip_number TEXT;
  v_voucher_id UUID;
  v_voucher_token TEXT;
  v_voucher_code TEXT;
  v_result JSONB;
  v_operation_key TEXT;
  v_existing_pax_id UUID;
  v_existing_voucher public.tourism_vouchers%ROWTYPE;
  v_existing_item_id UUID;
  v_doc_url TEXT := NULL;
  v_doc_file_name TEXT := NULL;
BEGIN
  IF p_store_id IS NULL OR p_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Agência e operador são obrigatórios.' USING ERRCODE = '22023';
  END IF;
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 OR length(btrim(p_idempotency_key)) > 240 THEN
    RAISE EXCEPTION 'Chave de idempotência inválida.' USING ERRCODE = '22023';
  END IF;
  IF p_ingestion_id IS NULL AND p_parsed_data IS NULL THEN
    RAISE EXCEPTION 'Documento OCR ou dados estruturados são obrigatórios.' USING ERRCODE = '22023';
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL AND p_actor_profile_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Ator divergente da sessão autenticada.' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.workspace_members AS wm
     WHERE wm.profile_id = p_actor_profile_id
       AND wm.store_id = p_store_id
       AND wm.role <> 'customer'
  ) INTO v_identity_ok;
  IF NOT v_identity_ok THEN
    RAISE EXCEPTION 'Operador não possui membership staff ativo nesta agência.' USING ERRCODE = '42501';
  END IF;

  v_operation_key := btrim(p_idempotency_key);
  PERFORM pg_advisory_xact_lock(hashtext('travel-voucher-apply:' || p_store_id::TEXT || ':' || v_operation_key));

  SELECT * INTO v_operation
    FROM public.travel_voucher_apply_operations
   WHERE store_id = p_store_id
     AND idempotency_key = v_operation_key
   FOR UPDATE;
  IF FOUND AND v_operation.result IS NOT NULL THEN
    RETURN v_operation.result || jsonb_build_object('replayed', TRUE);
  END IF;
  IF NOT FOUND THEN
    INSERT INTO public.travel_voucher_apply_operations (store_id, idempotency_key, ingestion_id, trip_id)
    VALUES (p_store_id, v_operation_key, p_ingestion_id, p_trip_id)
    RETURNING * INTO v_operation;
  END IF;

  IF p_ingestion_id IS NOT NULL THEN
    SELECT * INTO v_ingestion
      FROM public.travel_document_ingestions
     WHERE id = p_ingestion_id
       AND store_id = p_store_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Documento OCR não encontrado nesta agência.' USING ERRCODE = 'P0002';
    END IF;
    IF v_ingestion.source_kind = 'operator_quote' THEN
      RAISE EXCEPTION 'Cotações devem ser aplicadas como draft, não como voucher.' USING ERRCODE = '55000';
    END IF;
    IF v_ingestion.extraction_status = 'applied' AND v_ingestion.trip_id = p_trip_id THEN
      SELECT tv.id, tv.public_token INTO v_voucher_id, v_voucher_token
        FROM public.tourism_vouchers AS tv
       WHERE tv.trip_id = p_trip_id
         AND tv.store_id = p_store_id
       ORDER BY tv.updated_at DESC
       LIMIT 1;
      v_result := jsonb_build_object(
        'success', TRUE, 'replayed', TRUE, 'trip_id', p_trip_id,
        'trip_number', NULL, 'voucher_id', v_voucher_id,
        'voucher_token', v_voucher_token,
        'voucher_url', CASE WHEN v_voucher_token IS NULL THEN NULL ELSE '/voucher/' || v_voucher_token END
      );
      UPDATE public.travel_voucher_apply_operations
         SET result = v_result, trip_id = p_trip_id, updated_at = now()
       WHERE id = v_operation.id;
      RETURN v_result;
    END IF;
    IF v_ingestion.extraction_status NOT IN ('needs_review', 'approved') THEN
      RAISE EXCEPTION 'O documento precisa estar aguardando revisão antes da aplicação.' USING ERRCODE = '55000';
    END IF;
    v_payload := v_ingestion.extraction;
    v_doc_url := NULLIF(btrim(COALESCE(v_ingestion.storage_path, v_payload ->> 'original_pdf_url', '')), '');
    v_doc_file_name := NULLIF(btrim(COALESCE(v_ingestion.file_name, '')), '');
  ELSE
    v_payload := p_parsed_data;
    v_doc_url := NULLIF(btrim(COALESCE(v_payload ->> 'original_pdf_url', '')), '');
  END IF;

  IF p_trip_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.travel_document_conflicts AS c
     WHERE c.store_id = p_store_id
       AND c.trip_id = p_trip_id
       AND c.severity = 'critical'
       AND c.status IN ('open', 'suggested')
  ) THEN
    RAISE EXCEPTION 'Aplicação bloqueada: existem conflitos críticos não resolvidos.' USING ERRCODE = '55000';
  END IF;

  IF p_trip_id IS NOT NULL THEN
    SELECT * INTO v_trip
      FROM public.tourism_trips
     WHERE id = p_trip_id
       AND store_id = p_store_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Viagem não encontrada nesta agência.' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    v_trip_number := 'TRIP-' || to_char(now(), 'YYYY') || '-' || upper(replace(left(extensions.gen_random_uuid()::TEXT, 13), '-', ''));
    INSERT INTO public.tourism_trips (
      store_id, created_by_profile_id, trip_number, title, destination_city,
      travel_start_date, travel_end_date, adults_count, children_count, currency,
      total_cents, status, client_name, client_whatsapp, client_document,
      operator_name, operator_contacts, tariff_rules, payment_method,
      installments_count, financial_details, flights, hotels, transfers, tours,
      insurance, itinerary, rooms, includes, excludes, notes
    ) VALUES (
      p_store_id, p_actor_profile_id, v_trip_number,
      COALESCE(NULLIF(v_payload ->> 'trip_title', ''), 'Viagem para ' || COALESCE(NULLIF(v_payload ->> 'destination_city', ''), 'Destino não informado')),
      COALESCE(NULLIF(v_payload ->> 'destination_city', ''), 'Destino não informado'),
      NULLIF(v_payload ->> 'travel_start_date', '')::DATE,
      NULLIF(v_payload ->> 'travel_end_date', '')::DATE,
      GREATEST(COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(v_payload -> 'passengers') = 'array' THEN v_payload -> 'passengers' ELSE '[]'::jsonb END), 0), 1),
      0, COALESCE(NULLIF(v_payload -> 'financial_details' ->> 'currency', ''), 'BRL'),
      GREATEST(COALESCE((v_payload -> 'financial_details' ->> 'total_amount_cents')::BIGINT, 0), 0),
      'confirmed', COALESCE(NULLIF(v_payload ->> 'client_name', ''), 'Passageiro titular'),
      COALESCE(v_payload ->> 'client_whatsapp', ''), NULLIF(v_payload ->> 'client_document', ''),
      NULLIF(v_payload ->> 'operator_name', ''), COALESCE(v_payload -> 'operator_contacts', '{}'::jsonb),
      COALESCE(v_payload -> 'tariff_rules', '{}'::jsonb), NULLIF(v_payload -> 'financial_details' ->> 'payment_method', ''),
      COALESCE((v_payload -> 'financial_details' ->> 'installments_count')::INTEGER, 1),
      COALESCE(v_payload -> 'financial_details', '{}'::jsonb),
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
      COALESCE(v_payload -> 'insurance', '{}'::jsonb), '[]'::jsonb, '[]'::jsonb, '{}', '{}',
      NULLIF(v_payload ->> 'observations', '')
    ) RETURNING * INTO v_trip;
    v_trip_id := v_trip.id;
  END IF;

  v_merged_flights := COALESCE(v_trip.flights, '[]'::jsonb);
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'flights', '[]'::jsonb)) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_merged_flights) AS existing(value)
       WHERE (NULLIF(existing.value ->> 'locator', '') IS NOT NULL AND existing.value ->> 'locator' = v_item ->> 'locator' AND COALESCE(existing.value ->> 'flight_number', '') = COALESCE(v_item ->> 'flight_number', ''))
          OR (NULLIF(existing.value ->> 'flight_number', '') IS NOT NULL AND existing.value ->> 'flight_number' = v_item ->> 'flight_number' AND COALESCE(existing.value ->> 'date', '') = COALESCE(v_item ->> 'date', ''))
    ) THEN
      v_merged_flights := v_merged_flights || jsonb_build_array(v_item);
    END IF;
  END LOOP;

  v_merged_hotels := COALESCE(v_trip.hotels, '[]'::jsonb);
  FOR v_hotel IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'hotels', '[]'::jsonb)) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_merged_hotels) AS existing(value)
       WHERE lower(COALESCE(existing.value ->> 'name', '')) <> ''
         AND lower(existing.value ->> 'name') = lower(COALESCE(v_hotel ->> 'name', ''))
         AND COALESCE(existing.value ->> 'checkin', '') = COALESCE(v_hotel ->> 'checkin', '')
    ) THEN
      v_merged_hotels := v_merged_hotels || jsonb_build_array(v_hotel);
    END IF;
  END LOOP;

  v_merged_transfers := COALESCE(v_trip.transfers, '[]'::jsonb);
  FOR v_transfer IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'transfers', '[]'::jsonb)) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_merged_transfers) AS existing(value)
       WHERE (NULLIF(existing.value ->> 'confirmation', '') IS NOT NULL AND existing.value ->> 'confirmation' = v_transfer ->> 'confirmation')
          OR (
            lower(COALESCE(existing.value ->> 'type', '')) = lower(COALESCE(v_transfer ->> 'type', ''))
            AND COALESCE(existing.value ->> 'date', '') = COALESCE(v_transfer ->> 'date', '')
            AND lower(COALESCE(existing.value ->> 'origin', '')) = lower(COALESCE(v_transfer ->> 'origin', ''))
            AND lower(COALESCE(existing.value ->> 'destination', '')) = lower(COALESCE(v_transfer ->> 'destination', ''))
          )
    ) THEN
      v_merged_transfers := v_merged_transfers || jsonb_build_array(v_transfer);
    END IF;
  END LOOP;

  v_merged_tours := COALESCE(v_trip.tours, '[]'::jsonb);
  FOR v_tour IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'tours', '[]'::jsonb)) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_merged_tours) AS existing(value)
       WHERE lower(COALESCE(existing.value ->> 'title', '')) <> ''
         AND lower(existing.value ->> 'title') = lower(COALESCE(v_tour ->> 'title', ''))
         AND COALESCE(existing.value ->> 'date', '') = COALESCE(v_tour ->> 'date', '')
    ) THEN
      v_merged_tours := v_merged_tours || jsonb_build_array(v_tour);
    END IF;
  END LOOP;

  UPDATE public.tourism_trips
     SET destination_city = COALESCE(NULLIF(v_trip.destination_city, ''), NULLIF(v_payload ->> 'destination_city', ''), v_trip.destination_city),
         travel_start_date = COALESCE(NULLIF(v_payload ->> 'travel_start_date', '')::DATE, v_trip.travel_start_date),
         travel_end_date = COALESCE(NULLIF(v_payload ->> 'travel_end_date', '')::DATE, v_trip.travel_end_date),
         operator_name = COALESCE(NULLIF(v_payload ->> 'operator_name', ''), v_trip.operator_name),
         operator_contacts = COALESCE(v_payload -> 'operator_contacts', v_trip.operator_contacts, '{}'::jsonb),
         tariff_rules = COALESCE(v_payload -> 'tariff_rules', v_trip.tariff_rules, '{}'::jsonb),
         payment_method = COALESCE(NULLIF(v_payload -> 'financial_details' ->> 'payment_method', ''), v_trip.payment_method),
         installments_count = COALESCE((v_payload -> 'financial_details' ->> 'installments_count')::INTEGER, v_trip.installments_count, 1),
         financial_details = COALESCE(v_payload -> 'financial_details', v_trip.financial_details, '{}'::jsonb),
         total_cents = CASE WHEN v_trip.total_cents > 0 THEN v_trip.total_cents ELSE GREATEST(COALESCE((v_payload -> 'financial_details' ->> 'total_amount_cents')::BIGINT, 0), 0) END,
         flights = v_merged_flights, hotels = v_merged_hotels, transfers = v_merged_transfers, tours = v_merged_tours,
         insurance = COALESCE(v_payload -> 'insurance', v_trip.insurance, '{}'::jsonb),
         notes = COALESCE(NULLIF(v_payload ->> 'observations', ''), v_trip.notes), updated_at = now()
   WHERE id = v_trip_id AND store_id = p_store_id;

  FOR v_pax IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'passengers', '[]'::jsonb)) LOOP
    IF NULLIF(btrim(v_pax ->> 'name'), '') IS NULL THEN CONTINUE; END IF;
    SELECT tp.id INTO v_existing_pax_id
      FROM public.trip_passengers AS tp
     WHERE tp.trip_id = v_trip_id AND tp.store_id = p_store_id
       AND lower(btrim(tp.full_name)) = lower(btrim(v_pax ->> 'name'))
     LIMIT 1;
    IF v_existing_pax_id IS NULL THEN
      INSERT INTO public.trip_passengers (
        trip_id, store_id, full_name, document_type, document, document_expiry,
        nationality, birth_date, seat_number, is_lead_passenger, documents_metadata
      ) VALUES (
        v_trip_id, p_store_id, btrim(v_pax ->> 'name'), COALESCE(NULLIF(v_pax ->> 'document_type', ''), 'rg'),
        NULLIF(v_pax ->> 'document', ''), NULLIF(v_pax ->> 'document_expiry', '')::DATE,
        COALESCE(NULLIF(v_pax ->> 'nationality', ''), 'Brasileira'), NULLIF(v_pax ->> 'birth_date', '')::DATE,
        NULLIF(v_pax ->> 'seat', ''), COALESCE((v_pax ->> 'is_lead')::BOOLEAN, FALSE),
        jsonb_build_object('last_ocr_at', now())
      );
    ELSE
      UPDATE public.trip_passengers
         SET document_type = COALESCE(NULLIF(v_pax ->> 'document_type', ''), document_type),
             document = COALESCE(NULLIF(v_pax ->> 'document', ''), document),
             document_expiry = COALESCE(NULLIF(v_pax ->> 'document_expiry', '')::DATE, document_expiry),
             nationality = COALESCE(NULLIF(v_pax ->> 'nationality', ''), nationality),
             birth_date = COALESCE(NULLIF(v_pax ->> 'birth_date', '')::DATE, birth_date),
             seat_number = COALESCE(NULLIF(v_pax ->> 'seat', ''), seat_number),
             is_lead_passenger = COALESCE((v_pax ->> 'is_lead')::BOOLEAN, is_lead_passenger),
             documents_metadata = COALESCE(documents_metadata, '{}'::jsonb) || jsonb_build_object('last_ocr_at', now()),
             updated_at = now()
       WHERE id = v_existing_pax_id AND trip_id = v_trip_id AND store_id = p_store_id;
    END IF;
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'flights', '[]'::jsonb)) LOOP
    IF NULLIF(v_item ->> 'locator', '') IS NOT NULL THEN
      SELECT tci.id INTO v_existing_item_id FROM public.trip_confirmation_items AS tci
       WHERE tci.trip_id = v_trip_id AND tci.store_id = p_store_id AND tci.item_type = 'flight' AND tci.locator_code = v_item ->> 'locator' LIMIT 1;
      IF v_existing_item_id IS NULL THEN
        INSERT INTO public.trip_confirmation_items (trip_id, store_id, item_type, provider_name, locator_code, status, service_date, notes)
        VALUES (v_trip_id, p_store_id, 'flight', COALESCE(v_item ->> 'airline', v_payload ->> 'operator_name', 'Companhia aérea'), v_item ->> 'locator', 'confirmed', NULLIF(v_item ->> 'date', '')::DATE, NULLIF(v_item ->> 'notes', ''));
      END IF;
    END IF;
  END LOOP;
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'hotels', '[]'::jsonb)) LOOP
    IF NULLIF(v_item ->> 'confirmation', '') IS NOT NULL THEN
      SELECT tci.id INTO v_existing_item_id FROM public.trip_confirmation_items AS tci
       WHERE tci.trip_id = v_trip_id AND tci.store_id = p_store_id AND tci.item_type = 'hotel' AND tci.locator_code = v_item ->> 'confirmation' LIMIT 1;
      IF v_existing_item_id IS NULL THEN
        INSERT INTO public.trip_confirmation_items (trip_id, store_id, item_type, provider_name, locator_code, status, service_date, notes)
        VALUES (v_trip_id, p_store_id, 'hotel', COALESCE(v_item ->> 'name', 'Hotel'), v_item ->> 'confirmation', 'confirmed', NULLIF(v_item ->> 'checkin', '')::DATE, NULLIF(v_item ->> 'notes', ''));
      END IF;
    END IF;
  END LOOP;
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'transfers', '[]'::jsonb)) LOOP
    IF NULLIF(v_item ->> 'confirmation', '') IS NOT NULL THEN
      SELECT tci.id INTO v_existing_item_id FROM public.trip_confirmation_items AS tci
       WHERE tci.trip_id = v_trip_id AND tci.store_id = p_store_id AND tci.item_type = 'transfer' AND tci.locator_code = v_item ->> 'confirmation' LIMIT 1;
      IF v_existing_item_id IS NULL THEN
        INSERT INTO public.trip_confirmation_items (trip_id, store_id, item_type, provider_name, locator_code, status, service_date, notes)
        VALUES (v_trip_id, p_store_id, 'transfer', COALESCE(v_item ->> 'supplier', 'Receptivo local'), v_item ->> 'confirmation', 'confirmed', NULLIF(v_item ->> 'date', '')::DATE, NULLIF(v_item ->> 'notes', ''));
      END IF;
    END IF;
  END LOOP;

  SELECT * INTO v_existing_voucher
    FROM public.tourism_vouchers
   WHERE trip_id = v_trip_id AND store_id = p_store_id
   ORDER BY updated_at DESC
   LIMIT 1
   FOR UPDATE;
  IF FOUND THEN
    v_voucher_id := v_existing_voucher.id;
    v_voucher_token := v_existing_voucher.public_token;
    v_voucher_code := v_existing_voucher.voucher_code;

    v_merged_passengers := COALESCE(v_existing_voucher.passengers, '[]'::jsonb);
    FOR v_pax IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload -> 'passengers', '[]'::jsonb)) LOOP
      IF NULLIF(btrim(v_pax ->> 'name'), '') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_merged_passengers) AS existing(value)
         WHERE lower(btrim(COALESCE(existing.value ->> 'name', ''))) = lower(btrim(v_pax ->> 'name'))
      ) THEN
        v_merged_passengers := v_merged_passengers || jsonb_build_array(v_pax);
      END IF;
    END LOOP;

    UPDATE public.tourism_vouchers
       SET destination = COALESCE(NULLIF(v_payload ->> 'destination_city', ''), destination),
           flights = v_merged_flights, hotels = v_merged_hotels,
           transfers = v_merged_transfers, tours = v_merged_tours,
           insurance = COALESCE(v_payload -> 'insurance', insurance),
           passengers = v_merged_passengers,
           emergency_contacts = COALESCE(v_payload -> 'emergency_contacts', emergency_contacts),
           observations = COALESCE(NULLIF(v_payload ->> 'observations', ''), observations), updated_at = now()
     WHERE id = v_existing_voucher.id;
  ELSE
    v_voucher_token := 'vch_' || encode(extensions.gen_random_bytes(24), 'hex');
    v_voucher_code := 'VOUCH-' || upper(encode(extensions.gen_random_bytes(5), 'hex'));
    INSERT INTO public.tourism_vouchers (
      trip_id, store_id, public_token, voucher_code, voucher_type, template, destination,
      flights, hotels, transfers, tours, insurance, passengers, emergency_contacts, observations
    ) VALUES (
      v_trip_id, p_store_id, v_voucher_token, v_voucher_code, 'general', 'a4-boarding',
      NULLIF(v_payload ->> 'destination_city', ''), v_merged_flights, v_merged_hotels,
      v_merged_transfers, v_merged_tours, COALESCE(v_payload -> 'insurance', '{}'::jsonb),
      COALESCE(v_payload -> 'passengers', '[]'::jsonb), COALESCE(v_payload -> 'emergency_contacts', '[]'::jsonb),
      NULLIF(v_payload ->> 'observations', '')
    ) RETURNING id INTO v_voucher_id;
  END IF;

  -- Persistir documento oficial quando houver arquivo real da operadora ou token de voucher
  IF v_doc_url IS NOT NULL OR v_voucher_token IS NOT NULL THEN
    INSERT INTO public.travel_trip_official_documents (
      store_id, trip_id, doc_category, operator_name, reservation_code, title,
      original_pdf_url, ocr_extracted_json, cancellation_rules_text, is_visible_to_client
    )
    SELECT
      p_store_id,
      v_trip_id,
      'operator_confirmation',
      COALESCE(NULLIF(v_payload ->> 'operator_name', ''), 'Operadora de Turismo'),
      COALESCE(NULLIF(v_payload ->> 'reservation_code', ''), v_voucher_code),
      COALESCE(v_doc_file_name, 'Confirmação da Operadora — ' || COALESCE(NULLIF(v_payload ->> 'operator_name', ''), v_voucher_code)),
      COALESCE(v_doc_url, '/voucher/' || v_voucher_token),
      COALESCE(v_payload, '{}'::jsonb),
      v_payload -> 'tariff_rules' ->> 'cancellation_penalty',
      TRUE
    WHERE NOT EXISTS (
      SELECT 1
        FROM public.travel_trip_official_documents AS od
       WHERE od.trip_id = v_trip_id
         AND od.doc_category = 'operator_confirmation'
         AND od.original_pdf_url = COALESCE(v_doc_url, '/voucher/' || v_voucher_token)
    );
  END IF;

  IF p_ingestion_id IS NOT NULL THEN
    UPDATE public.travel_document_ingestions
       SET extraction_status = 'applied', review_status = 'approved', trip_id = v_trip_id,
           reviewed_by_profile_id = p_actor_profile_id, reviewed_at = COALESCE(reviewed_at, now()),
           error_message = NULL, updated_at = now()
     WHERE id = p_ingestion_id AND store_id = p_store_id;
  END IF;

  INSERT INTO public.travel_timeline_events (
    store_id, trip_id, event_type, actor_profile_id, correlation_id, payload
  ) VALUES (
    p_store_id, v_trip_id, 'ocr.applied_to_trip', p_actor_profile_id,
    COALESCE(p_ingestion_id::TEXT, v_operation_key),
    jsonb_build_object(
      'ingestion_id', p_ingestion_id, 'voucher_id', v_voucher_id,
      'voucher_code', v_voucher_code, 'idempotency_key', v_operation_key
    )
  );

  v_result := jsonb_build_object(
    'success', TRUE, 'replayed', FALSE, 'trip_id', v_trip_id,
    'trip_number', COALESCE(v_trip_number, v_trip.trip_number),
    'voucher_id', v_voucher_id, 'voucher_token', v_voucher_token,
    'voucher_url', '/voucher/' || v_voucher_token
  );
  UPDATE public.travel_voucher_apply_operations
     SET result = v_result, trip_id = v_trip_id, updated_at = now()
   WHERE id = v_operation.id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_operator_voucher_atomic(UUID, UUID, UUID, UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_operator_voucher_atomic(UUID, UUID, UUID, UUID, JSONB, TEXT) TO service_role;
