-- ============================================================================
-- MIGRATION: Purga de Legados E2E — Quotes Multi-Nicho, Envelopes e Contratos Tabulares
-- Data: 2026-11-13
-- Descricao:
--   1) Adiciona lead_id, source_listing_id, source_listing_origin, niche_id e
--      custom_fields na tabela public.quotes para rastreabilidade 100% ponta a ponta.
--   2) Substitui create_quote mantendo assinatura retrocompativel (8 parametros base
--      + 5 parametros opcionais) sem criar overload ambiguo no PostgREST.
--   3) Atualiza public.create_staff_travel_contract preservando todas as travas P0,
--      emitindo minuta em tabelas Markdown GFM, vinculando store_id/lead_id/custom_fields
--      e criando automaticamente signature_envelopes para visibilidade em /conta/contratos.
-- ============================================================================

-- 1. Ampliar public.quotes com vinculo canonico ao funil CRM e catalogo CMS
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_listing_id TEXT,
  ADD COLUMN IF NOT EXISTS source_listing_origin TEXT,
  ADD COLUMN IF NOT EXISTS niche_id TEXT,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_quotes_store_lead
  ON public.quotes (store_id, lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_source_listing
  ON public.quotes (store_id, source_listing_id)
  WHERE source_listing_id IS NOT NULL;

-- 2. RPC Unificada create_quote (drop exato da assinatura antiga para evitar PGRST203)
DROP FUNCTION IF EXISTS public.create_quote(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_quote(
  p_store_id              UUID,
  p_customer_id           UUID DEFAULT NULL,
  p_guest_name            TEXT DEFAULT NULL,
  p_guest_email           TEXT DEFAULT NULL,
  p_guest_phone           TEXT DEFAULT NULL,
  p_valid_until           TIMESTAMPTZ DEFAULT NULL,
  p_conditions            TEXT DEFAULT NULL,
  p_internal_notes        TEXT DEFAULT NULL,
  p_lead_id               UUID DEFAULT NULL,
  p_source_listing_id     TEXT DEFAULT NULL,
  p_source_listing_origin TEXT DEFAULT NULL,
  p_niche_id              TEXT DEFAULT NULL,
  p_custom_fields         JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_quote_id UUID;
  v_number   TEXT;
BEGIN
  v_number := public.generate_quote_number(p_store_id);

  INSERT INTO public.quotes (
    store_id,
    customer_id,
    guest_name,
    guest_email,
    guest_phone,
    quote_number,
    valid_until,
    conditions,
    internal_notes,
    lead_id,
    source_listing_id,
    source_listing_origin,
    niche_id,
    custom_fields,
    created_by
  ) VALUES (
    p_store_id,
    p_customer_id,
    p_guest_name,
    p_guest_email,
    p_guest_phone,
    v_number,
    p_valid_until,
    p_conditions,
    p_internal_notes,
    p_lead_id,
    p_source_listing_id,
    p_source_listing_origin,
    p_niche_id,
    COALESCE(p_custom_fields, '{}'::jsonb),
    auth.uid()
  )
  RETURNING id INTO v_quote_id;

  RETURN v_quote_id;
END;
$$;

-- 3. Upgrade da RPC create_staff_travel_contract preservando 100% das travas P0
CREATE OR REPLACE FUNCTION public.create_staff_travel_contract(
  p_contract_data JSONB,
  p_store_id UUID,
  p_actor_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
SET row_security = off
AS $$
DECLARE
  v_store public.stores%ROWTYPE;
  v_title TEXT;
  v_name TEXT;
  v_document TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_destination TEXT;
  v_summary TEXT;
  v_payment_conditions TEXT;
  v_proposal_id UUID;
  v_lead_id UUID;
  v_total_cents BIGINT;
  v_total_formatted TEXT;
  v_passengers JSONB;
  v_itinerary JSONB := '[]'::jsonb;
  v_custom_fields JSONB := '{}'::jsonb;
  v_clauses JSONB;
  v_meta JSONB;
  v_fingerprint TEXT;
  v_content TEXT;
  v_hash TEXT;
  v_token TEXT;
  v_contract_id UUID;
  v_version_id UUID;
  v_existing public.contracts%ROWTYPE;
  v_compiled_markdown TEXT;
  v_template_id TEXT;
  v_travel_start_date TEXT;
  v_travel_end_date TEXT;
  v_parties_table TEXT := '';
  v_items_table TEXT := '';
  v_itinerary_table TEXT := '';
  v_passengers_table TEXT := '';
  v_custom_fields_table TEXT := '';
  v_financial_table TEXT := '';
BEGIN
  IF p_contract_data IS NULL OR jsonb_typeof(p_contract_data) <> 'object'
     OR p_store_id IS NULL OR p_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Payload, loja e ator são obrigatórios.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members AS wm
     WHERE wm.profile_id = p_actor_profile_id
       AND wm.store_id = p_store_id
       AND wm.role IN ('owner', 'store_owner', 'proprietario', 'admin', 'manager', 'gerente', 'seller', 'finance', 'content', 'support', 'stock')
  ) THEN
    RAISE EXCEPTION 'Ator não possui membership staff ativo nesta loja.' USING ERRCODE = '42501';
  END IF;

  SELECT s.* INTO v_store FROM public.stores AS s WHERE s.id = p_store_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  v_title := btrim(COALESCE(p_contract_data ->> 'contractTitle', ''));
  v_name := btrim(COALESCE(p_contract_data ->> 'clientName', ''));
  v_document := regexp_replace(COALESCE(p_contract_data ->> 'clientDocument', ''), '[^0-9]', '', 'g');
  v_email := lower(btrim(COALESCE(p_contract_data ->> 'clientEmail', '')));
  v_phone := btrim(COALESCE(p_contract_data ->> 'clientPhone', ''));
  v_destination := btrim(COALESCE(p_contract_data ->> 'destination', ''));
  v_summary := btrim(COALESCE(p_contract_data ->> 'packageSummary', ''));
  v_payment_conditions := btrim(COALESCE(p_contract_data ->> 'paymentConditions', ''));
  v_passengers := COALESCE(p_contract_data -> 'passengers', '[]'::jsonb);
  v_itinerary := COALESCE(p_contract_data -> 'itinerary', '[]'::jsonb);
  v_custom_fields := COALESCE(p_contract_data -> 'customFields', '{}'::jsonb);
  v_compiled_markdown := btrim(COALESCE(p_contract_data ->> 'compiledMarkdown', ''));
  v_template_id := NULLIF(btrim(COALESCE(p_contract_data ->> 'templateId', '')), '');
  v_travel_start_date := NULLIF(btrim(COALESCE(p_contract_data ->> 'travelStartDate', '')), '');
  v_travel_end_date := NULLIF(btrim(COALESCE(p_contract_data ->> 'travelEndDate', '')), '');

  IF length(v_title) < 3 OR length(v_title) > 240 OR length(v_name) < 2 OR length(v_name) > 160 THEN
    RAISE EXCEPTION 'Título ou nome do contratante inválido.' USING ERRCODE = '22023';
  END IF;
  IF v_document !~ '^([0-9]{11}|[0-9]{14})$' THEN
    RAISE EXCEPTION 'CPF ou CNPJ do contratante inválido.' USING ERRCODE = '22023';
  END IF;
  IF v_email <> '' AND (length(v_email) > 254 OR v_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$') THEN
    RAISE EXCEPTION 'E-mail do contratante inválido.' USING ERRCODE = '22023';
  END IF;
  IF length(v_phone) < 8 OR length(v_phone) > 40 OR length(v_destination) < 2 OR length(v_destination) > 160 THEN
    RAISE EXCEPTION 'Telefone ou destino inválido.' USING ERRCODE = '22023';
  END IF;
  IF length(v_summary) < 5 OR length(v_summary) > 12000 OR length(v_payment_conditions) < 3 OR length(v_payment_conditions) > 4000 THEN
    RAISE EXCEPTION 'Resumo do pacote ou condições de pagamento inválidas.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(v_passengers) <> 'array' THEN
    RAISE EXCEPTION 'Manifesto de passageiros inválido.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(v_passengers) > 40 THEN
    RAISE EXCEPTION 'Manifesto de passageiros inválido.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_passengers) AS p(passenger)
     WHERE jsonb_typeof(passenger) <> 'object'
        OR length(btrim(COALESCE(passenger ->> 'name', ''))) < 2
        OR length(btrim(COALESCE(passenger ->> 'name', ''))) > 160
  ) THEN
    RAISE EXCEPTION 'Há passageiro com nome inválido.' USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_total_cents := COALESCE((p_contract_data ->> 'totalValueCents')::BIGINT, 0);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'Valor do contrato inválido.' USING ERRCODE = '22023';
  END;
  IF v_total_cents < 0 THEN
    RAISE EXCEPTION 'Valor do contrato não pode ser negativo.' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(p_contract_data ->> 'proposalId', '') IS NOT NULL THEN
    BEGIN
      v_proposal_id := (p_contract_data ->> 'proposalId')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Referência de proposta inválida.' USING ERRCODE = '22023';
    END;
    IF NOT EXISTS (SELECT 1 FROM public.travel_proposals tp WHERE tp.id = v_proposal_id AND tp.store_id = p_store_id)
       AND NOT EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = v_proposal_id AND q.store_id = p_store_id) THEN
      RAISE EXCEPTION 'A proposta não pertence à loja ativa.' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NULLIF(p_contract_data ->> 'leadId', '') IS NOT NULL THEN
    BEGIN
      v_lead_id := (p_contract_data ->> 'leadId')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      v_lead_id := NULL;
    END;
  END IF;

  v_fingerprint := encode(extensions.digest(convert_to(p_store_id::TEXT || ':' || p_contract_data::TEXT, 'UTF8'), 'sha256'), 'hex');
  SELECT c.* INTO v_existing
    FROM public.contracts AS c
   WHERE c.category = 'tourism'
     AND (c.store_id = p_store_id OR c.metadata ->> 'store_id' = p_store_id::TEXT)
     AND c.metadata ->> 'creation_fingerprint' = v_fingerprint
     AND c.status IN ('signing', 'completed')
   ORDER BY c.created_at DESC
   LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('success', TRUE, 'contract_id', v_existing.id, 'public_token', v_existing.verification_code, 'replayed', TRUE);
  END IF;

  v_clauses := p_contract_data -> 'customClauses';
  IF v_clauses IS NULL OR jsonb_typeof(v_clauses) <> 'array' THEN
    v_clauses := v_store.settings -> 'tourism_contract_clauses';
  END IF;
  IF jsonb_typeof(v_clauses) <> 'array' OR jsonb_array_length(v_clauses) = 0 THEN
    v_clauses := jsonb_build_array(
      jsonb_build_object('number', 1, 'section', 'DO OBJETO DO CONTRATO', 'clause_text', 'O presente contrato tem por objeto os serviços de turismo especificados neste instrumento.', 'is_mandatory', TRUE),
      jsonb_build_object('number', 2, 'section', 'DAS CONDIÇÕES DE PAGAMENTO', 'clause_text', 'Os valores e condições indicados neste instrumento representam preferências e negociação; não há confirmação de pagamento por este contrato.', 'is_mandatory', TRUE),
      jsonb_build_object('number', 3, 'section', 'DOS DOCUMENTOS DE VIAGEM', 'clause_text', 'O contratante é responsável por apresentar documentos válidos exigidos para a viagem.', 'is_mandatory', TRUE),
      jsonb_build_object('number', 4, 'section', 'DO CANCELAMENTO', 'clause_text', 'Cancelamentos e reembolsos observarão as condições informadas e a legislação aplicável.', 'is_mandatory', TRUE),
      jsonb_build_object('number', 5, 'section', 'DO FORO', 'clause_text', 'Eventuais controvérsias serão resolvidas conforme a legislação aplicável.', 'is_mandatory', TRUE)
    );
  END IF;
  IF jsonb_typeof(v_clauses) <> 'array' THEN
    RAISE EXCEPTION 'Há cláusula inválida no contrato.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(v_clauses) > 40 OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_clauses) AS c(clause)
     WHERE jsonb_typeof(clause) <> 'object'
        OR length(btrim(COALESCE(clause ->> 'section', ''))) < 2
        OR length(btrim(COALESCE(clause ->> 'section', ''))) > 160
        OR length(btrim(COALESCE(clause ->> 'clause_text', ''))) < 5
        OR length(btrim(COALESCE(clause ->> 'clause_text', ''))) > 8000
  ) THEN
    RAISE EXCEPTION 'Há cláusula inválida no contrato.' USING ERRCODE = '22023';
  END IF;

  v_total_formatted := 'R$ ' || replace(to_char((v_total_cents::numeric / 100.0), 'FM999999990D00'), '.', ',');

  v_parties_table :=
    '| Papel | Identificação | Documento | Contato |' || E'\n' ||
    '| :--- | :--- | :--- | :--- |' || E'\n' ||
    '| Contratada | ' || regexp_replace(replace(COALESCE(v_store.name, 'Agência Contratada'), '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
    ' | ' || regexp_replace(replace(COALESCE(NULLIF(v_store.cnpj, ''), 'Não informado'), '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
    ' | ' || regexp_replace(replace(COALESCE(NULLIF(v_store.phone, ''), NULLIF(v_store.email, ''), 'Canal Waesy'), '|', '/'), E'[\\r\\n]+', ' ', 'g') || ' |' || E'\n' ||
    '| Contratante | ' || regexp_replace(replace(v_name, '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
    ' | ' || COALESCE(NULLIF(v_document, ''), 'Informado na assinatura') ||
    ' | ' || regexp_replace(replace(COALESCE(NULLIF(v_phone, ''), NULLIF(v_email, ''), 'Não informado'), '|', '/'), E'[\\r\\n]+', ' ', 'g') || ' |';

  v_items_table :=
    '| Serviço / Objeto | Destino | Período | Total Contratado |' || E'\n' ||
    '| :--- | :--- | :--- | ---: |' || E'\n' ||
    '| ' || regexp_replace(replace(v_title, '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
    ' | ' || regexp_replace(replace(v_destination, '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
    ' | ' || COALESCE(v_travel_start_date, 'A definir') || ' a ' || COALESCE(v_travel_end_date, 'A definir') ||
    ' | ' || v_total_formatted || ' |';

  IF jsonb_typeof(v_itinerary) = 'array' AND jsonb_array_length(v_itinerary) > 0 THEN
    SELECT
      '| Dia | Programação | Descrição |' || E'\n' ||
      '| :---: | :--- | :--- |' || E'\n' ||
      string_agg(
        '| Dia ' || COALESCE(elem ->> 'day_number', elem ->> 'day', (ord)::TEXT) ||
        ' | ' || regexp_replace(replace(COALESCE(elem ->> 'title', 'Programação'), '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
        ' | ' || regexp_replace(replace(COALESCE(elem ->> 'description', 'Conforme roteiro'), '|', '/'), E'[\\r\\n]+', ' ', 'g') || ' |',
        E'\n' ORDER BY ord
      )
      INTO v_itinerary_table
      FROM jsonb_array_elements(v_itinerary) WITH ORDINALITY AS t(elem, ord);
  END IF;

  IF jsonb_typeof(v_passengers) = 'array' AND jsonb_array_length(v_passengers) > 0 THEN
    SELECT
      '| # | Viajante | Documento | Embarque |' || E'\n' ||
      '| :---: | :--- | :--- | :--- |' || E'\n' ||
      string_agg(
        '| ' || (ord)::TEXT ||
        ' | ' || regexp_replace(replace(COALESCE(pax ->> 'full_name', pax ->> 'name', 'Passageiro'), '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
        ' | ' || regexp_replace(replace(COALESCE(pax ->> 'document', pax ->> 'cpf', pax ->> 'rg', 'A informar'), '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
        ' | ' || regexp_replace(replace(COALESCE(pax ->> 'boarding_point', pax ->> 'boarding', v_custom_fields ->> 'boarding_point', 'Padrão'), '|', '/'), E'[\\r\\n]+', ' ', 'g') || ' |',
        E'\n' ORDER BY ord
      )
      INTO v_passengers_table
      FROM jsonb_array_elements(v_passengers) WITH ORDINALITY AS p(pax, ord);
  END IF;

  IF jsonb_typeof(v_custom_fields) = 'object' AND EXISTS (SELECT 1 FROM jsonb_each_text(v_custom_fields) WHERE COALESCE(btrim(value), '') <> '') THEN
    SELECT
      '| Campo Personalizado | Valor Registrado |' || E'\n' ||
      '| :--- | :--- |' || E'\n' ||
      string_agg(
        '| ' || regexp_replace(replace(initcap(replace(key, '_', ' ')), '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
        ' | ' || regexp_replace(replace(value, '|', '/'), E'[\\r\\n]+', ' ', 'g') || ' |',
        E'\n' ORDER BY key
      )
      INTO v_custom_fields_table
      FROM jsonb_each_text(v_custom_fields)
      WHERE COALESCE(btrim(value), '') <> '';
  END IF;

  v_financial_table :=
    '| Descrição Financeira | Detalhe |' || E'\n' ||
    '| :--- | :--- |' || E'\n' ||
    '| Valor Total Contratado | ' || v_total_formatted || ' |' || E'\n' ||
    '| Período | ' || COALESCE(v_travel_start_date, 'A definir') || ' até ' || COALESCE(v_travel_end_date, 'A definir') || ' |' || E'\n' ||
    '| Condições de Pagamento | ' || regexp_replace(replace(v_payment_conditions, '|', '/'), E'[\\r\\n]+', ' ', 'g') || ' |';

  IF v_compiled_markdown <> '' AND length(v_compiled_markdown) >= 20 THEN
    v_content := v_compiled_markdown;
  ELSE
    v_content :=
      '# ' || v_title || E'\n\n' ||
      '## Partes Contratantes' || E'\n' || v_parties_table || E'\n\n' ||
      '## Objeto & Serviços Contratados' || E'\n' || v_items_table ||
      CASE WHEN v_summary <> '' AND position('|' IN v_summary) > 0 THEN E'\n\n' || v_summary
           WHEN v_summary <> '' THEN E'\n\n**Resumo do Pacote:** ' || regexp_replace(v_summary, E'[\\r\\n]+', ' ', 'g')
           ELSE '' END ||
      CASE WHEN COALESCE(v_itinerary_table, '') <> '' THEN E'\n\n## Roteiro Dia a Dia\n' || v_itinerary_table ELSE '' END ||
      CASE WHEN COALESCE(v_passengers_table, '') <> '' THEN E'\n\n## Manifesto de Passageiros\n' || v_passengers_table ELSE '' END ||
      CASE WHEN COALESCE(v_custom_fields_table, '') <> '' THEN E'\n\n## Especificações & Campos Dinâmicos\n' || v_custom_fields_table ELSE '' END ||
      E'\n\n## Quadro Financeiro\n' || v_financial_table || E'\n\n' ||
      (
        SELECT string_agg('## ' || COALESCE(clause ->> 'section', 'Cláusula') || E'\n' || COALESCE(clause ->> 'clause_text', ''), E'\n\n' ORDER BY (clause ->> 'number')::INT)
          FROM jsonb_array_elements(v_clauses) AS item(clause)
      );
  END IF;

  v_token := 'ct_' || encode(extensions.gen_random_bytes(32), 'hex');
  v_meta := jsonb_build_object(
    'store_id', p_store_id,
    'proposal_id', v_proposal_id,
    'lead_id', v_lead_id,
    'template_id', v_template_id,
    'public_token', v_token,
    'creation_fingerprint', v_fingerprint,
    'agency_name', v_store.name,
    'agency_cnpj', v_store.cnpj,
    'agency_address', v_store.address,
    'client_name', v_name,
    'client_document', v_document,
    'client_email', NULLIF(v_email, ''),
    'client_phone', v_phone,
    'client_address', NULLIF(btrim(COALESCE(p_contract_data ->> 'clientAddress', '')), ''),
    'destination', v_destination,
    'travel_start_date', v_travel_start_date,
    'travel_end_date', v_travel_end_date,
    'package_summary', v_summary,
    'total_value_cents', v_total_cents,
    'payment_conditions', v_payment_conditions,
    'payment_status', 'pending_preference',
    'passengers', v_passengers,
    'custom_fields', v_custom_fields,
    'signatures', '[]'::jsonb
  );

  v_hash := encode(extensions.digest(convert_to(v_content, 'UTF8'), 'sha256'), 'hex');

  INSERT INTO public.contracts (
    store_id,
    creator_id,
    lead_id,
    title,
    category,
    status,
    current_version,
    verification_code,
    metadata
  )
  VALUES (
    p_store_id,
    p_actor_profile_id,
    v_lead_id,
    v_title,
    'tourism',
    'signing',
    1,
    v_token,
    v_meta
  )
  RETURNING id INTO v_contract_id;

  INSERT INTO public.contract_versions (
    contract_id,
    version_number,
    title,
    content_markdown,
    clauses,
    variables,
    hash_sha256,
    is_sealed
  )
  VALUES (
    v_contract_id,
    1,
    v_title,
    v_content,
    v_clauses,
    v_custom_fields,
    v_hash,
    FALSE
  )
  RETURNING id INTO v_version_id;

  INSERT INTO public.signature_envelopes (
    contract_version_id,
    signer_name,
    signer_email,
    signer_phone,
    signer_cpf,
    signer_role,
    dispatch_channel,
    status
  )
  VALUES (
    v_version_id,
    v_name,
    COALESCE(NULLIF(v_email, ''), 'cliente@waesy.com'),
    NULLIF(v_phone, ''),
    NULLIF(v_document, ''),
    'party',
    CASE WHEN NULLIF(v_phone, '') IS NOT NULL THEN 'whatsapp' ELSE 'email' END,
    'pending'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'contract_id', v_contract_id,
    'public_token', v_token,
    'replayed', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_staff_travel_contract(JSONB, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_travel_contract(JSONB, UUID, UUID) TO service_role;
