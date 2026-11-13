-- ============================================================================
-- MIGRATION: E2E Multi-Niche Omnichannel Sync & Tabular GFM Contract Engine
-- Data: 2026-11-13
-- Descricao:
--   1) Garante email anulavel em leads_crm para captura via WhatsApp/Kanban sem e-mail
--   2) Adiciona source_listing_id / source_listing_origin e custom_fields em leads_crm,
--      travel_proposals, quotes e deals para rastreabilidade 100% ponta a ponta
--   3) Atualiza create_staff_travel_contract_from_proposal preservando todas as travas P0
--      e emitindo resumo/minuta em tabelas Markdown GFM + store_id canonico em contracts
-- ============================================================================

-- 1. Tornar leads_crm.email anulavel com seguranca (evita erro 23502 em fluxos WhatsApp/Kanban)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'leads_crm'
       AND column_name = 'email'
       AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.leads_crm ALTER COLUMN email DROP NOT NULL;
  END IF;
END
$$;

-- 2. Rastreabilidade de origem + campos dinamicos nas entidades de funil
ALTER TABLE public.leads_crm
  ADD COLUMN IF NOT EXISTS source_listing_id TEXT,
  ADD COLUMN IF NOT EXISTS source_listing_origin TEXT,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pax_list JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.travel_proposals
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_listing_id TEXT,
  ADD COLUMN IF NOT EXISTS source_listing_origin TEXT;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_leads_crm_source_listing
  ON public.leads_crm (store_id, source_listing_id)
  WHERE source_listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_travel_proposals_lead_id
  ON public.travel_proposals (store_id, lead_id)
  WHERE lead_id IS NOT NULL;

-- 3. RPC Staff de emissao de contrato turistico com tabelas GFM estruturadas e store_id
CREATE OR REPLACE FUNCTION public.create_staff_travel_contract_from_proposal(
  p_proposal_id UUID,
  p_store_id UUID,
  p_actor_profile_id UUID,
  p_client_document TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
SET row_security = off
AS $$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_travel_proposal public.travel_proposals%ROWTYPE;
  v_acceptance public.travel_proposal_acceptances%ROWTYPE;
  v_existing public.contracts%ROWTYPE;
  v_store public.stores%ROWTYPE;
  v_conditions JSONB := '{}'::jsonb;
  v_snapshot JSONB;
  v_meta JSONB;
  v_clauses JSONB;
  v_passengers JSONB;
  v_itinerary JSONB := '[]'::jsonb;
  v_custom_fields JSONB := '{}'::jsonb;
  v_lead_custom_fields JSONB := '{}'::jsonb;
  v_client_email TEXT;
  v_client_phone TEXT;
  v_travel_start_date TEXT;
  v_travel_end_date TEXT;
  v_package_summary TEXT;
  v_payment_conditions TEXT;
  v_snapshot_hash TEXT;
  v_acceptance_fingerprint TEXT;
  v_acceptance_id UUID;
  v_selected_option_id TEXT;
  v_price_text TEXT;
  v_option_name TEXT;
  v_is_travel_proposal BOOLEAN := FALSE;
  v_content TEXT;
  v_hash TEXT;
  v_token TEXT;
  v_contract_id UUID;
  v_title TEXT;
  v_client_name TEXT;
  v_document TEXT;
  v_destination TEXT;
  v_total_cents BIGINT;
  v_total_formatted TEXT;
  v_parties_table TEXT := '';
  v_items_table TEXT := '';
  v_itinerary_table TEXT := '';
  v_passengers_table TEXT := '';
  v_financial_table TEXT := '';
  v_custom_fields_table TEXT := '';
BEGIN
  IF p_proposal_id IS NULL OR p_store_id IS NULL OR p_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Proposta, loja e ator são obrigatórios.' USING ERRCODE = '22023';
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

  SELECT tp.* INTO v_travel_proposal
    FROM public.travel_proposals AS tp
   WHERE tp.id = p_proposal_id
     AND tp.store_id = p_store_id
   FOR UPDATE;

  IF FOUND THEN
    v_is_travel_proposal := TRUE;
    IF v_travel_proposal.status <> 'approved'
       OR v_travel_proposal.snapshot_hash IS NULL THEN
      RAISE EXCEPTION 'A proposta turística não está aprovada ou não possui fingerprint.' USING ERRCODE = '55000';
    END IF;

    v_snapshot := public.travel_proposal_snapshot_payload(v_travel_proposal);
    IF public.travel_proposal_snapshot_hash(v_snapshot) IS DISTINCT FROM v_travel_proposal.snapshot_hash THEN
      RAISE EXCEPTION 'O snapshot da proposta mudou; revise o aceite antes de emitir contrato.' USING ERRCODE = '55000';
    END IF;

    SELECT a.* INTO v_acceptance
      FROM public.travel_proposal_acceptances AS a
     WHERE a.store_id = p_store_id
       AND a.proposal_id = p_proposal_id
       AND a.status = 'accepted'
       AND a.proposal_snapshot_hash = v_travel_proposal.snapshot_hash
     FOR UPDATE;
    IF NOT FOUND OR v_acceptance.acceptance_fingerprint IS NULL THEN
      RAISE EXCEPTION 'Aceite vigente e verificável não encontrado para esta proposta.' USING ERRCODE = '55000';
    END IF;
    IF jsonb_typeof(v_acceptance.passenger_manifest) <> 'array'
       OR jsonb_array_length(v_acceptance.passenger_manifest) < 1 THEN
      RAISE EXCEPTION 'O manifesto persistido no aceite é inválido.' USING ERRCODE = '55000';
    END IF;
    IF jsonb_typeof(COALESCE(v_travel_proposal.options, '[]'::jsonb)) <> 'array' THEN
      RAISE EXCEPTION 'As opções persistidas da proposta são inválidas.' USING ERRCODE = '55000';
    END IF;
    IF jsonb_array_length(COALESCE(v_travel_proposal.options, '[]'::jsonb)) > 0 THEN
      IF v_acceptance.selected_option_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_travel_proposal.options) AS o(option)
         WHERE option ->> 'id' = v_acceptance.selected_option_id
      ) THEN
        RAISE EXCEPTION 'A opção aceita não existe mais no snapshot persistido.' USING ERRCODE = '55000';
      END IF;
      SELECT COALESCE(option -> 'pricing' ->> 'total_price_cents', option ->> 'total_price_cents'),
             COALESCE(option ->> 'name', option ->> 'title', option ->> 'id')
        INTO v_price_text, v_option_name
        FROM jsonb_array_elements(v_travel_proposal.options) AS o(option)
       WHERE option ->> 'id' = v_acceptance.selected_option_id
       LIMIT 1;
    ELSE
      IF v_acceptance.selected_option_id IS NOT NULL THEN
        RAISE EXCEPTION 'O aceite referencia uma opção ausente no snapshot.' USING ERRCODE = '55000';
      END IF;
      v_price_text := v_travel_proposal.pricing ->> 'total_price_cents';
    END IF;

    IF v_price_text IS NULL THEN
      v_price_text := COALESCE(v_travel_proposal.pricing ->> 'total_price_cents', v_travel_proposal.pricing ->> 'total_cents', '0');
    END IF;
    IF v_price_text !~ '^[0-9]{1,15}$' THEN
      RAISE EXCEPTION 'O valor da opção aceita não é válido.' USING ERRCODE = '22023';
    END IF;

    IF v_travel_proposal.lead_id IS NOT NULL THEN
      SELECT COALESCE(l.custom_fields, '{}'::jsonb)
        INTO v_lead_custom_fields
        FROM public.leads_crm AS l
       WHERE l.id = v_travel_proposal.lead_id
         AND l.store_id = p_store_id
       LIMIT 1;
    END IF;

    v_custom_fields := COALESCE(v_lead_custom_fields, '{}'::jsonb)
      || COALESCE(v_travel_proposal.pricing -> 'custom_fields', '{}'::jsonb)
      || COALESCE(v_travel_proposal.custom_fields, '{}'::jsonb);

    v_itinerary := COALESCE(v_travel_proposal.itinerary, '[]'::jsonb);

    v_conditions := jsonb_build_object(
      'contract_title', v_travel_proposal.title,
      'destination_city', v_travel_proposal.destination_city,
      'client_name', v_travel_proposal.client_name,
      'client_email', v_travel_proposal.client_email,
      'client_whatsapp', v_travel_proposal.client_whatsapp,
      'travel_start_date', v_travel_proposal.travel_start_date,
      'travel_end_date', v_travel_proposal.travel_end_date,
      'pricing', jsonb_build_object('total_price_cents', v_price_text),
      'includes', to_jsonb(COALESCE(v_travel_proposal.includes, ARRAY[]::TEXT[])),
      'custom_fields', v_custom_fields
    );
    v_snapshot_hash := v_travel_proposal.snapshot_hash;
    v_acceptance_fingerprint := v_acceptance.acceptance_fingerprint;
    v_acceptance_id := v_acceptance.id;
    v_selected_option_id := v_acceptance.selected_option_id;
    v_passengers := v_acceptance.passenger_manifest;
    v_client_name := COALESCE(NULLIF(btrim(v_acceptance.accepted_by_name), ''), NULLIF(btrim(v_travel_proposal.client_name), ''));
    v_document := regexp_replace(COALESCE(NULLIF(p_client_document, ''), v_acceptance.passenger_manifest -> 0 ->> 'document', ''), '[^0-9]', '', 'g');
    v_client_email := COALESCE(v_acceptance.accepted_by_email, v_travel_proposal.client_email);
    v_client_phone := v_travel_proposal.client_whatsapp;
    v_destination := COALESCE(NULLIF(btrim(v_travel_proposal.destination_city), ''), 'Não especificado');
    v_travel_start_date := v_travel_proposal.travel_start_date::TEXT;
    v_travel_end_date := v_travel_proposal.travel_end_date::TEXT;
    v_total_cents := v_price_text::BIGINT;
    v_payment_conditions := 'Preferência pendente do cliente: ' || COALESCE(v_acceptance.payment_preference, 'não informada') || CASE WHEN v_acceptance.payment_installments IS NULL THEN '' ELSE ' em ' || v_acceptance.payment_installments::TEXT || ' parcelas pretendidas' END || '. Nenhum pagamento ou cobrança foi registrado.';
  ELSE
    SELECT q.* INTO v_quote
      FROM public.quotes AS q
     WHERE q.id = p_proposal_id
       AND q.store_id = p_store_id
       AND q.status = 'approved'
       AND (q.valid_until IS NULL OR q.valid_until > now())
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Proposta/orçamento aprovado não encontrado nesta loja ou expirado.' USING ERRCODE = 'P0002';
    END IF;
    IF v_quote.conditions IS NOT NULL AND btrim(v_quote.conditions) <> '' THEN
      BEGIN
        v_conditions := v_quote.conditions::jsonb;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Condições do orçamento não são JSON válido; revise a proposta.' USING ERRCODE = '22023';
      END;
    END IF;
    v_client_name := COALESCE(NULLIF(btrim(v_quote.guest_name), ''), NULLIF(btrim(v_conditions ->> 'client_name'), ''));
    v_client_email := COALESCE(v_quote.guest_email, v_conditions ->> 'client_email');
    v_client_phone := COALESCE(v_quote.guest_phone, v_conditions ->> 'client_whatsapp', '');
    v_destination := COALESCE(NULLIF(btrim(v_conditions ->> 'destination_city'), ''), NULLIF(btrim(v_conditions ->> 'destination'), ''), 'Não especificado');
    v_travel_start_date := v_conditions ->> 'travel_start_date';
    v_travel_end_date := v_conditions ->> 'travel_end_date';
    v_payment_conditions := COALESCE(NULLIF(v_conditions ->> 'payment_conditions', ''), 'A confirmar pela agência; nenhuma cobrança ou pagamento foi registrado.');
    v_passengers := COALESCE(v_conditions -> 'passengers', jsonb_build_array(jsonb_build_object('name', v_client_name)));
    v_itinerary := COALESCE(v_conditions -> 'itinerary', '[]'::jsonb);
    v_custom_fields := COALESCE(v_quote.custom_fields, '{}'::jsonb) || COALESCE(v_conditions -> 'custom_fields', '{}'::jsonb);
    v_total_cents := COALESCE(NULLIF(v_conditions -> 'pricing' ->> 'total_price_cents', '')::BIGINT, v_quote.total_cents, 0);
    v_document := regexp_replace(COALESCE(p_client_document, ''), '[^0-9]', '', 'g');
  END IF;

  IF v_client_name IS NULL OR length(v_client_name) < 2 THEN
    RAISE EXCEPTION 'Nome do cliente ausente na proposta aprovada.' USING ERRCODE = '22023';
  END IF;
  IF v_document <> '' AND v_document !~ '^([0-9]{11}|[0-9]{14})$' THEN
    RAISE EXCEPTION 'CPF ou CNPJ do cliente inválido.' USING ERRCODE = '22023';
  END IF;
  v_title := COALESCE(NULLIF(btrim(v_conditions ->> 'contract_title'), ''), 'Contrato de Viagem — ' || v_destination);

  SELECT c.* INTO v_existing
    FROM public.contracts AS c
   WHERE c.category = 'tourism'
     AND (c.store_id = p_store_id OR c.metadata ->> 'store_id' = p_store_id::TEXT)
     AND c.metadata ->> 'proposal_id' = p_proposal_id::TEXT
     AND (NOT v_is_travel_proposal OR c.metadata ->> 'acceptance_id' = v_acceptance_id::TEXT)
     AND c.status IN ('signing', 'completed')
   ORDER BY c.created_at DESC
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'contract_id', v_existing.id,
      'public_token', v_existing.verification_code,
      'replayed', TRUE
    );
  END IF;

  SELECT s.* INTO v_store FROM public.stores AS s WHERE s.id = p_store_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja da proposta não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  v_total_formatted := 'R$ ' || replace(to_char((v_total_cents::numeric / 100.0), 'FM999999990D00'), '.', ',');

  v_parties_table :=
    '| Papel | Identificação | Documento | Contato |' || E'\n' ||
    '| :--- | :--- | :--- | :--- |' || E'\n' ||
    '| Contratada | ' || regexp_replace(replace(COALESCE(v_store.name, 'Agência Contratada'), '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
    ' | ' || regexp_replace(replace(COALESCE(NULLIF(v_store.cnpj, ''), 'Não informado'), '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
    ' | ' || regexp_replace(replace(COALESCE(NULLIF(v_store.phone, ''), NULLIF(v_store.email, ''), 'Canal Waesy'), '|', '/'), E'[\\r\\n]+', ' ', 'g') || ' |' || E'\n' ||
    '| Contratante | ' || regexp_replace(replace(v_client_name, '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
    ' | ' || COALESCE(NULLIF(v_document, ''), 'Informado na assinatura') ||
    ' | ' || regexp_replace(replace(COALESCE(NULLIF(v_client_phone, ''), NULLIF(v_client_email, ''), 'Não informado'), '|', '/'), E'[\\r\\n]+', ' ', 'g') || ' |';

  IF v_is_travel_proposal THEN
    v_items_table :=
      '| Serviço / Pacote | Destino | Opção | Total |' || E'\n' ||
      '| :--- | :--- | :--- | ---: |' || E'\n' ||
      '| ' || regexp_replace(replace(COALESCE(v_travel_proposal.title, 'Pacote Turístico'), '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
      ' | ' || regexp_replace(replace(v_destination, '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
      ' | ' || regexp_replace(replace(COALESCE(v_option_name, v_selected_option_id, 'Padrão'), '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
      ' | ' || v_total_formatted || ' |';

    IF COALESCE(array_length(v_travel_proposal.includes, 1), 0) > 0 THEN
      v_items_table := v_items_table || E'\n\n' ||
        '**Serviços Inclusos:** ' || regexp_replace(replace(array_to_string(v_travel_proposal.includes, ', '), '|', '/'), E'[\\r\\n]+', ' ', 'g');
    END IF;
  ELSE
    SELECT COALESCE(
      '| Item / Serviço | Qtd | Unitário | Total |' || E'\n' ||
      '| :--- | :---: | ---: | ---: |' || E'\n' ||
      string_agg(
        '| ' || regexp_replace(replace(COALESCE(qi.title, 'Item'), '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
        ' | ' || COALESCE(qi.quantity::TEXT, '1') || ' ' || COALESCE(NULLIF(qi.metadata ->> 'unit', ''), 'un') ||
        ' | R$ ' || replace(to_char((COALESCE(qi.unit_price_cents, 0)::numeric / 100.0), 'FM999999990D00'), '.', ',') ||
        ' | R$ ' || replace(to_char((COALESCE(qi.total_cents, 0)::numeric / 100.0), 'FM999999990D00'), '.', ',') || ' |',
        E'\n' ORDER BY qi.position ASC, qi.created_at ASC
      ),
      '| Serviço / Escopo | Destino | Período | Total |' || E'\n' ||
      '| :--- | :--- | :--- | ---: |' || E'\n' ||
      '| ' || regexp_replace(replace(v_title, '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
      ' | ' || regexp_replace(replace(v_destination, '|', '/'), E'[\\r\\n]+', ' ', 'g') ||
      ' | ' || COALESCE(v_travel_start_date, 'A definir') || ' a ' || COALESCE(v_travel_end_date, 'A definir') ||
      ' | ' || v_total_formatted || ' |'
    )
    INTO v_items_table
    FROM public.quote_items AS qi
    WHERE qi.quote_id = p_proposal_id;
  END IF;

  IF jsonb_typeof(v_itinerary) = 'array' AND jsonb_array_length(v_itinerary) > 0 THEN
    SELECT
      '| Dia | Título | Descrição |' || E'\n' ||
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
      '| # | Passageiro | Documento | Embarque / Obs. |' || E'\n' ||
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
      '| Campo / Especificação | Valor Informado |' || E'\n' ||
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
    '| Período Previsto | ' || COALESCE(v_travel_start_date, 'A definir') || ' até ' || COALESCE(v_travel_end_date, 'A definir') || ' |' || E'\n' ||
    '| Condições Registradas | ' || regexp_replace(replace(v_payment_conditions, '|', '/'), E'[\\r\\n]+', ' ', 'g') || ' |';

  v_package_summary := COALESCE(
    NULLIF(v_conditions ->> 'package_summary', ''),
    '### Serviços Contratados' || E'\n\n' || v_items_table ||
    CASE WHEN COALESCE(v_itinerary_table, '') <> '' THEN E'\n\n### Roteiro Dia a Dia\n\n' || v_itinerary_table ELSE '' END ||
    CASE WHEN COALESCE(v_custom_fields_table, '') <> '' THEN E'\n\n### Especificações & Campos do Cliente\n\n' || v_custom_fields_table ELSE '' END
  );

  v_clauses := CASE
    WHEN CASE
      WHEN jsonb_typeof(v_store.settings -> 'tourism_contract_clauses') = 'array'
        THEN jsonb_array_length(v_store.settings -> 'tourism_contract_clauses') > 0
      ELSE FALSE
    END
      THEN v_store.settings -> 'tourism_contract_clauses'
    ELSE jsonb_build_array(
      jsonb_build_object('number', 1, 'section', 'DO OBJETO DO CONTRATO', 'clause_text', 'O presente contrato tem por objeto os serviços de turismo especificados na proposta aprovada.', 'is_mandatory', TRUE),
      jsonb_build_object('number', 2, 'section', 'DAS CONDIÇÕES DE PAGAMENTO', 'clause_text', 'Os valores e condições indicados neste instrumento representam a negociação registrada; a confirmação externa depende da agência.', 'is_mandatory', TRUE),
      jsonb_build_object('number', 3, 'section', 'DOS DOCUMENTOS DE VIAGEM', 'clause_text', 'O contratante é responsável por apresentar documentos válidos exigidos para a viagem.', 'is_mandatory', TRUE),
      jsonb_build_object('number', 4, 'section', 'DO CANCELAMENTO', 'clause_text', 'Cancelamentos e reembolsos observarão as condições informadas e a legislação aplicável.', 'is_mandatory', TRUE),
      jsonb_build_object('number', 5, 'section', 'DO FORO', 'clause_text', 'Eventuais controvérsias serão resolvidas conforme a legislação aplicável.', 'is_mandatory', TRUE)
    )
  END;

  v_token := 'ct_' || encode(extensions.gen_random_bytes(32), 'hex');
  v_meta := jsonb_build_object(
    'store_id', p_store_id,
    'proposal_id', p_proposal_id,
    'public_token', v_token,
    'client_name', v_client_name,
    'client_document', NULLIF(v_document, ''),
    'client_email', NULLIF(lower(btrim(COALESCE(v_client_email, ''))), ''),
    'client_phone', COALESCE(v_client_phone, ''),
    'client_address', NULL,
    'destination', v_destination,
    'travel_start_date', v_travel_start_date,
    'travel_end_date', v_travel_end_date,
    'package_summary', v_package_summary,
    'total_value_cents', v_total_cents,
    'payment_conditions', v_payment_conditions,
    'payment_status', 'pending_preference',
    'payment_preference', CASE WHEN v_is_travel_proposal THEN v_acceptance.payment_preference ELSE NULL END,
    'proposal_snapshot_hash', v_snapshot_hash,
    'acceptance_id', v_acceptance_id,
    'acceptance_fingerprint', v_acceptance_fingerprint,
    'selected_option_id', v_selected_option_id,
    'passengers', COALESCE(v_passengers, jsonb_build_array(jsonb_build_object('name', v_client_name))),
    'custom_fields', v_custom_fields,
    'signatures', '[]'::jsonb
  );

  v_content :=
    '# ' || v_title || E'\n\n' ||
    '## Partes Contratantes' || E'\n' || v_parties_table || E'\n\n' ||
    '## Serviços & Pacote Contratado' || E'\n' || v_items_table ||
    CASE WHEN COALESCE(v_itinerary_table, '') <> '' THEN E'\n\n## Roteiro Dia a Dia\n' || v_itinerary_table ELSE '' END ||
    CASE WHEN COALESCE(v_passengers_table, '') <> '' THEN E'\n\n## Manifesto de Passageiros\n' || v_passengers_table ELSE '' END ||
    CASE WHEN COALESCE(v_custom_fields_table, '') <> '' THEN E'\n\n## Campos Personalizados\n' || v_custom_fields_table ELSE '' END ||
    E'\n\n## Resumo Financeiro\n' || v_financial_table || E'\n\n' ||
    (
      SELECT string_agg('## ' || COALESCE(clause ->> 'section', 'Cláusula') || E'\n' || COALESCE(clause ->> 'clause_text', ''), E'\n\n' ORDER BY clause ->> 'number')
        FROM jsonb_array_elements(v_clauses) AS item(clause)
    );
  v_hash := encode(extensions.digest(convert_to(v_content, 'UTF8'), 'sha256'), 'hex');

  INSERT INTO public.contracts (
    store_id, creator_id, title, category, status, current_version, verification_code, metadata
  ) VALUES (
    p_store_id, p_actor_profile_id, v_title, 'tourism', 'signing', 1, v_token, v_meta
  ) RETURNING id INTO v_contract_id;

  INSERT INTO public.contract_versions (
    contract_id, version_number, title, content_markdown, clauses, variables, hash_sha256, is_sealed
  ) VALUES (
    v_contract_id, 1, v_title, v_content, v_clauses, v_custom_fields, v_hash, FALSE
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'contract_id', v_contract_id,
    'public_token', v_token,
    'replayed', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_travel_contract_by_token(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sign_public_travel_contract(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_staff_travel_contract_from_proposal(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_travel_contract_by_token(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.sign_public_travel_contract(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_staff_travel_contract_from_proposal(UUID, UUID, UUID, TEXT) TO service_role;
