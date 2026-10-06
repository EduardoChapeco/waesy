-- ============================================================================
-- Waesy — pipeline canônico de documentos, orçamento, aceite e venda turística
-- Não destrutivo: preserva quotes/travel_proposals/tourism_trips legados para
-- leitura e backfill, mas cria uma autoridade explícita para novos comandos.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.travel_document_ingestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.travel_proposals(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN (
    'operator_quote', 'reservation_confirmation', 'payment_receipt',
    'operator_contact', 'voucher', 'contract', 'other'
  )),
  file_name TEXT,
  file_mime TEXT,
  storage_path TEXT,
  content_sha256 TEXT,
  extraction_provider TEXT,
  extraction_model TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'received' CHECK (extraction_status IN (
    'received', 'processing', 'needs_review', 'approved', 'rejected', 'applied', 'failed'
  )),
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN (
    'pending', 'approved', 'rejected'
  )),
  confidence NUMERIC(5,4) CHECK (confidence IS NULL OR confidence >= 0 AND confidence <= 1),
  extraction JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.travel_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.travel_quotes(id) ON DELETE SET NULL,
  source_ingestion_id UUID REFERENCES public.travel_document_ingestions(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'needs_review' CHECK (status IN (
    'draft', 'needs_review', 'priced', 'sent', 'superseded', 'accepted', 'converted'
  )),
  destination TEXT NOT NULL,
  travel_start_date DATE,
  travel_end_date DATE,
  adults_count INTEGER NOT NULL DEFAULT 1 CHECK (adults_count >= 1),
  children_count INTEGER NOT NULL DEFAULT 0 CHECK (children_count >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  subtotal_cents BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  fees_cents BIGINT NOT NULL DEFAULT 0 CHECK (fees_cents >= 0),
  markup_cents BIGINT NOT NULL DEFAULT 0 CHECK (markup_cents >= 0),
  discount_cents BIGINT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ruleset_version TEXT,
  source_snapshot_hash TEXT,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, source_ingestion_id, version)
);

CREATE TABLE IF NOT EXISTS public.travel_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.travel_budgets(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'package', 'flight', 'hotel', 'transfer', 'tour', 'insurance', 'fee', 'discount', 'other'
  )),
  description TEXT NOT NULL,
  provider_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  total_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.travel_proposal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.travel_proposals(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.travel_budgets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'revoked', 'superseded')),
  proposal_snapshot_hash TEXT NOT NULL,
  terms_version TEXT NOT NULL DEFAULT 'travel-v1',
  acceptance_token_hash TEXT,
  accepted_by_name TEXT,
  accepted_by_email TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, proposal_id),
  UNIQUE (store_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.travel_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.travel_proposals(id) ON DELETE RESTRICT,
  acceptance_id UUID NOT NULL REFERENCES public.travel_proposal_acceptances(id) ON DELETE RESTRICT,
  budget_id UUID REFERENCES public.travel_budgets(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
  currency TEXT NOT NULL DEFAULT 'BRL',
  total_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  idempotency_key TEXT NOT NULL,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, proposal_id),
  UNIQUE (store_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.travel_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.travel_proposals(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES public.travel_budgets(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.travel_sales(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  correlation_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.travel_proposals
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES public.travel_budgets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_ingestion_id UUID REFERENCES public.travel_document_ingestions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposal_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS snapshot_hash TEXT,
  ADD COLUMN IF NOT EXISTS acceptance_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS canonical_status TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE public.travel_contracts
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL;

ALTER TABLE public.tourism_trips
  ADD COLUMN IF NOT EXISTS source_proposal_id UUID REFERENCES public.travel_proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_travel_document_ingestions_store_status
  ON public.travel_document_ingestions(store_id, extraction_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_travel_budgets_lead ON public.travel_budgets(store_id, lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_travel_proposal_acceptances_proposal ON public.travel_proposal_acceptances(store_id, proposal_id);
CREATE INDEX IF NOT EXISTS idx_travel_sales_trip ON public.travel_sales(store_id, trip_id);
CREATE INDEX IF NOT EXISTS idx_travel_timeline_subjects
  ON public.travel_timeline_events(store_id, lead_id, proposal_id, trip_id, created_at DESC);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'travel_document_ingestions', 'travel_budgets', 'travel_budget_items',
    'travel_proposal_acceptances', 'travel_sales', 'travel_timeline_events'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_staff_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (is_store_staff(store_id)) WITH CHECK (is_store_staff(store_id))',
        t || '_staff_all', t
      );
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.record_travel_proposal_acceptance(
  p_proposal_id UUID,
  p_public_token TEXT,
  p_snapshot_hash TEXT,
  p_idempotency_key TEXT,
  p_accepted_by_name TEXT DEFAULT NULL,
  p_accepted_by_email TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_terms_version TEXT DEFAULT 'travel-v1'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_proposal public.travel_proposals%ROWTYPE;
  v_acceptance public.travel_proposal_acceptances%ROWTYPE;
BEGIN
  SELECT * INTO v_proposal
  FROM public.travel_proposals
  WHERE id = p_proposal_id AND public_token = p_public_token
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta ou token inválido.'; END IF;
  IF v_proposal.status IN ('expired', 'rejected') THEN RAISE EXCEPTION 'Proposta não pode ser aceita neste estado.'; END IF;
  IF v_proposal.snapshot_hash IS NOT NULL AND v_proposal.snapshot_hash <> p_snapshot_hash THEN
    RAISE EXCEPTION 'O snapshot da proposta mudou; atualize a página antes de aceitar.';
  END IF;

  SELECT * INTO v_acceptance
  FROM public.travel_proposal_acceptances
  WHERE store_id = v_proposal.store_id AND proposal_id = v_proposal.id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'replayed', true, 'acceptance_id', v_acceptance.id, 'proposal_id', v_proposal.id);
  END IF;

  INSERT INTO public.travel_proposal_acceptances (
    store_id, proposal_id, budget_id, proposal_snapshot_hash, terms_version,
    accepted_by_name, accepted_by_email, ip_address, user_agent, idempotency_key
  ) VALUES (
    v_proposal.store_id, v_proposal.id, v_proposal.budget_id, p_snapshot_hash, p_terms_version,
    p_accepted_by_name, p_accepted_by_email, p_ip_address, p_user_agent, p_idempotency_key
  ) RETURNING * INTO v_acceptance;

  UPDATE public.travel_proposals
  SET status = 'approved', acceptance_status = 'accepted', canonical_status = 'accepted', approved_at = now(), updated_at = now()
  WHERE id = v_proposal.id;

  INSERT INTO public.travel_timeline_events (store_id, proposal_id, budget_id, event_type, correlation_id, payload)
  VALUES (v_proposal.store_id, v_proposal.id, v_proposal.budget_id, 'proposal.accepted', p_idempotency_key,
          jsonb_build_object('acceptance_id', v_acceptance.id, 'snapshot_hash', p_snapshot_hash, 'terms_version', p_terms_version));

  RETURN jsonb_build_object('success', true, 'replayed', false, 'acceptance_id', v_acceptance.id, 'proposal_id', v_proposal.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_accepted_travel_proposal(
  p_proposal_id UUID,
  p_idempotency_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_proposal public.travel_proposals%ROWTYPE;
  v_acceptance public.travel_proposal_acceptances%ROWTYPE;
  v_sale public.travel_sales%ROWTYPE;
  v_trip_id UUID;
  v_voucher_id UUID;
  v_contract_id UUID;
  v_total BIGINT;
  v_meta JSONB;
  v_trip_number TEXT;
  v_voucher_token TEXT;
  v_contract_token TEXT;
  v_name TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('travel-convert:' || p_proposal_id::TEXT));

  SELECT * INTO v_proposal FROM public.travel_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada.'; END IF;

  SELECT * INTO v_sale FROM public.travel_sales WHERE proposal_id = p_proposal_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'replayed', true, 'sale_id', v_sale.id, 'trip_id', v_sale.trip_id);
  END IF;

  SELECT * INTO v_acceptance FROM public.travel_proposal_acceptances
  WHERE proposal_id = p_proposal_id AND status = 'accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'A proposta precisa ter aceite válido antes da conversão.'; END IF;

  v_meta := COALESCE(v_proposal.pricing, '{}'::jsonb);
  v_total := GREATEST(COALESCE((v_meta->>'total_price_cents')::BIGINT, 0), 0);
  v_name := COALESCE(v_proposal.client_name, 'Passageiro Principal');
  v_trip_number := 'VIAGEM-' || to_char(now(), 'YYYY') || '-' || replace(left(gen_random_uuid()::TEXT, 13), '-', '');
  v_voucher_token := 'vch_' || encode(gen_random_bytes(18), 'hex');
  v_contract_token := 'ctr_' || encode(gen_random_bytes(18), 'hex');

  INSERT INTO public.tourism_trips (
    store_id, created_by_profile_id, source_proposal_id, trip_number, title, destination_city,
    travel_start_date, travel_end_date, adults_count, children_count, currency, total_cents,
    status, client_name, client_whatsapp, client_email, cover_image_url, flights, hotels,
    itinerary, includes, excludes, notes
  ) VALUES (
    v_proposal.store_id, auth.uid(), v_proposal.id, v_trip_number, v_proposal.title,
    v_proposal.destination_city, v_proposal.travel_start_date, v_proposal.travel_end_date,
    v_proposal.adults_count, v_proposal.children_count, COALESCE(v_meta->>'currency', 'BRL'),
    v_total, 'confirmed', v_name, v_proposal.client_whatsapp, v_proposal.client_email,
    v_proposal.hero_image_url, v_proposal.flights, v_proposal.hotels, v_proposal.itinerary,
    v_proposal.includes, v_proposal.excludes, array_to_string(v_proposal.important_notes, E'\n')
  ) RETURNING id INTO v_trip_id;

  INSERT INTO public.trip_passengers (trip_id, store_id, full_name, email, phone, is_lead_passenger)
  VALUES (v_trip_id, v_proposal.store_id, v_name, v_proposal.client_email, v_proposal.client_whatsapp, true);

  INSERT INTO public.travel_contracts (
    store_id, created_by_profile_id, proposal_id, trip_id, public_token, contract_title,
    client_name, client_document, client_email, client_phone, destination,
    travel_start_date, travel_end_date, package_summary, total_value_cents,
    payment_conditions, passengers, clauses, signatures, status
  ) VALUES (
    v_proposal.store_id, auth.uid(), v_proposal.id, v_trip_id, v_contract_token,
    'Contrato de Prestação de Serviços Turísticos: ' || v_proposal.destination_city,
    v_name, 'PENDENTE', v_proposal.client_email, v_proposal.client_whatsapp,
    v_proposal.destination_city, v_proposal.travel_start_date, v_proposal.travel_end_date,
    v_proposal.title, v_total, 'Condições conforme proposta aceita.',
    jsonb_build_array(jsonb_build_object('name', v_name)),
    jsonb_build_array(jsonb_build_object('title', 'Objeto', 'content', 'Intermediação dos serviços turísticos descritos na proposta aceita.')),
    '[]'::jsonb, 'draft'
  ) RETURNING id INTO v_contract_id;

  INSERT INTO public.tourism_vouchers (
    trip_id, store_id, public_token, voucher_code, voucher_type, template, destination,
    flights, hotels, passengers, observations
  ) VALUES (
    v_trip_id, v_proposal.store_id, v_voucher_token,
    'VOUCH-' || upper(replace(left(gen_random_uuid()::TEXT, 8), '-', '')),
    'general', 'a4-boarding', v_proposal.destination_city, v_proposal.flights,
    v_proposal.hotels, jsonb_build_array(jsonb_build_object('name', v_name)),
    'Voucher pendente de confirmação operacional dos fornecedores.'
  ) RETURNING id INTO v_voucher_id;

  INSERT INTO public.travel_sales (
    store_id, proposal_id, acceptance_id, budget_id, trip_id, status, currency, total_cents,
    idempotency_key, created_by_profile_id
  ) VALUES (
    v_proposal.store_id, v_proposal.id, v_acceptance.id, v_proposal.budget_id, v_trip_id,
    'confirmed', COALESCE(v_meta->>'currency', 'BRL'), v_total, p_idempotency_key, auth.uid()
  ) RETURNING * INTO v_sale;

  UPDATE public.travel_proposals
  SET canonical_status = 'converted', updated_at = now()
  WHERE id = v_proposal.id;

  INSERT INTO public.travel_timeline_events (
    store_id, proposal_id, budget_id, sale_id, trip_id, event_type, correlation_id, payload
  ) VALUES (
    v_proposal.store_id, v_proposal.id, v_proposal.budget_id, v_sale.id, v_trip_id,
    'proposal.converted_to_trip', p_idempotency_key,
    jsonb_build_object('acceptance_id', v_acceptance.id, 'contract_id', v_contract_id, 'voucher_id', v_voucher_id)
  );

  RETURN jsonb_build_object('success', true, 'replayed', false, 'sale_id', v_sale.id, 'trip_id', v_trip_id,
                            'trip_number', v_trip_number,
                            'contract_id', v_contract_id, 'voucher_id', v_voucher_id, 'voucher_token', v_voucher_token);
END;
$$;

REVOKE ALL ON FUNCTION public.record_travel_proposal_acceptance(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_travel_proposal_acceptance(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.convert_accepted_travel_proposal(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_accepted_travel_proposal(UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.apply_travel_ocr_to_draft(
  p_ingestion_id UUID,
  p_lead_id UUID DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_client_phone TEXT DEFAULT NULL,
  p_client_email TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ingestion public.travel_document_ingestions%ROWTYPE;
  v_extraction JSONB;
  v_lead_id UUID := p_lead_id;
  v_budget_id UUID;
  v_proposal_id UUID;
  v_destination TEXT;
  v_total BIGINT;
  v_currency TEXT;
  v_name TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_proposal_token TEXT;
BEGIN
  SELECT * INTO v_ingestion FROM public.travel_document_ingestions WHERE id = p_ingestion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento OCR não encontrado.'; END IF;
  IF v_ingestion.extraction_status NOT IN ('needs_review', 'approved') THEN
    RAISE EXCEPTION 'Documento OCR ainda não está pronto para aplicação.';
  END IF;

  v_extraction := COALESCE(v_ingestion.extraction, '{}'::jsonb);
  v_destination := COALESCE(NULLIF(v_extraction->>'destination', ''), 'Destino a definir');
  v_total := GREATEST(COALESCE((v_extraction->>'gross_price_cents')::BIGINT, 0), 0);
  v_currency := COALESCE(NULLIF(v_extraction->>'currency', ''), 'BRL');
  v_name := NULLIF(trim(COALESCE(p_client_name, '')), '');
  v_email := NULLIF(trim(COALESCE(p_client_email, '')), '');
  v_phone := NULLIF(trim(COALESCE(p_client_phone, '')), '');

  IF v_lead_id IS NOT NULL THEN
    PERFORM 1 FROM public.leads_crm WHERE id = v_lead_id AND store_id = v_ingestion.store_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lead não pertence à loja do documento.'; END IF;
  ELSIF v_name IS NOT NULL AND v_email IS NOT NULL THEN
    INSERT INTO public.leads_crm (store_id, full_name, email, phone, message, status)
    VALUES (v_ingestion.store_id, v_name, v_email, v_phone,
            'Lead criado a partir de documento OCR da operadora: ' || COALESCE(v_ingestion.file_name, 'arquivo'), 'new')
    RETURNING id INTO v_lead_id;
  END IF;

  INSERT INTO public.travel_budgets (
    store_id, lead_id, source_ingestion_id, destination, travel_start_date, travel_end_date,
    adults_count, children_count, currency, subtotal_cents, total_cents, pricing_snapshot,
    source_snapshot_hash, status
  ) VALUES (
    v_ingestion.store_id, v_lead_id, v_ingestion.id, v_destination,
    NULLIF(v_extraction->>'travel_start', '')::DATE,
    NULLIF(v_extraction->>'travel_end', '')::DATE,
    GREATEST(COALESCE((v_extraction->>'adults_count')::INTEGER, 1), 1),
    GREATEST(COALESCE((v_extraction->>'children_count')::INTEGER, 0), 0),
    v_currency, v_total, v_total, v_extraction, v_ingestion.content_sha256, 'needs_review'
  ) RETURNING id INTO v_budget_id;

  INSERT INTO public.travel_budget_items (
    budget_id, store_id, item_type, description, provider_name, quantity,
    unit_price_cents, total_cents, currency, details
  ) VALUES (
    v_budget_id, v_ingestion.store_id, 'package',
    'Cotação importada de ' || COALESCE(v_extraction->>'operator_name', 'operadora'),
    v_extraction->>'operator_name', 1, v_total, v_total, v_currency, v_extraction
  );

  v_proposal_token := 'prop_' || encode(gen_random_bytes(18), 'hex');
  INSERT INTO public.travel_proposals (
    store_id, lead_id, budget_id, source_ingestion_id, created_by_profile_id, public_token,
    canvas_format, title, destination_city, client_name, client_whatsapp, client_email,
    travel_start_date, travel_end_date, adults_count, children_count, flights, hotels,
    itinerary, pricing, includes, excludes, important_notes, status, canonical_status
  ) VALUES (
    v_ingestion.store_id, v_lead_id, v_budget_id, v_ingestion.id, v_ingestion.created_by_profile_id,
    v_proposal_token, 'a4-portrait',
    'Proposta importada — ' || v_destination, v_destination,
    COALESCE(v_name, 'Cliente a confirmar'), COALESCE(v_phone, ''), v_email,
    NULLIF(v_extraction->>'travel_start', '')::DATE,
    NULLIF(v_extraction->>'travel_end', '')::DATE,
    GREATEST(COALESCE((v_extraction->>'adults_count')::INTEGER, 1), 1),
    GREATEST(COALESCE((v_extraction->>'children_count')::INTEGER, 0), 0),
    COALESCE(v_extraction->'flights', '[]'::jsonb),
    COALESCE(v_extraction->'hotels', '[]'::jsonb),
    jsonb_build_array(jsonb_build_object('transfers', COALESCE(v_extraction->'transfers', '[]'::jsonb), 'tours', COALESCE(v_extraction->'tours', '[]'::jsonb))),
    jsonb_build_object('currency', v_currency, 'total_price_cents', v_total, 'operator_net_cents', COALESCE((v_extraction->>'operator_net_cents')::BIGINT, 0), 'source', 'operator_ocr'),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_extraction->'inclusions', '[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_extraction->'exclusions', '[]'::jsonb))),
    ARRAY[concat_ws(E'\n', 'Documento: ' || COALESCE(v_ingestion.file_name, 'arquivo'), 'Referência: ' || COALESCE(v_extraction->>'quote_reference_number', 'não informada'), COALESCE(v_extraction->>'notes', ''))],
    'draft', 'draft'
  ) RETURNING id INTO v_proposal_id;

  UPDATE public.travel_document_ingestions
  SET lead_id = v_lead_id, proposal_id = v_proposal_id, extraction_status = 'applied', review_status = 'approved',
      reviewed_at = now(), updated_at = now()
  WHERE id = v_ingestion.id;

  INSERT INTO public.travel_timeline_events (
    store_id, lead_id, proposal_id, budget_id, event_type, correlation_id, payload
  ) VALUES (
    v_ingestion.store_id, v_lead_id, v_proposal_id, v_budget_id, 'ocr.applied_to_draft', v_ingestion.id::TEXT,
    jsonb_build_object('ingestion_id', v_ingestion.id, 'source_kind', v_ingestion.source_kind, 'requires_human_review', true)
  );

  RETURN jsonb_build_object('success', true, 'lead_id', v_lead_id, 'budget_id', v_budget_id, 'proposal_id', v_proposal_id, 'proposal_token', v_proposal_token);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_travel_ocr_to_draft(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_travel_ocr_to_draft(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
