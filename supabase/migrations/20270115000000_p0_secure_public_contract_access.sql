-- Waesy P0 B1 — close direct public access to contract records and route
-- legitimate public operations through narrow, server-only SECURITY DEFINER RPCs.
-- This migration is not applied to production as part of this task.

DROP POLICY IF EXISTS "contracts_public_verify" ON public.contracts;
DROP POLICY IF EXISTS "envelopes_token_access" ON public.signature_envelopes;

REVOKE ALL PRIVILEGES ON TABLE public.contracts FROM PUBLIC, anon;
REVOKE ALL PRIVILEGES ON TABLE public.contract_versions FROM PUBLIC, anon;
REVOKE ALL PRIVILEGES ON TABLE public.signature_envelopes FROM PUBLIC, anon;
REVOKE ALL PRIVILEGES ON TABLE public.signature_evidence FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_public_travel_contract_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
SET row_security = off
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_version public.contract_versions%ROWTYPE;
  v_meta JSONB;
  v_store_id UUID;
  v_store public.stores%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 8 OR length(p_token) > 160 THEN
    RETURN NULL;
  END IF;

  SELECT c.* INTO v_contract
    FROM public.contracts AS c
   WHERE c.verification_code = p_token
     AND c.category = 'tourism'
     AND c.status IN ('signing', 'completed')
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT cv.* INTO v_version
    FROM public.contract_versions AS cv
   WHERE cv.contract_id = v_contract.id
     AND cv.version_number = v_contract.current_version;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_meta := COALESCE(v_contract.metadata, '{}'::jsonb);
  BEGIN
    v_store_id := NULLIF(v_meta ->> 'store_id', '')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    v_store_id := NULL;
  END;

  IF v_store_id IS NOT NULL THEN
    SELECT s.* INTO v_store
      FROM public.stores AS s
     WHERE s.id = v_store_id;
  END IF;

  -- Explicit public DTO allowlist; never expose raw contract/version/store rows.
  RETURN jsonb_build_object(
    'id', v_contract.id,
    'store_id', v_store_id,
    'agency_name', COALESCE(v_store.name, v_meta ->> 'agency_name', ''),
    'agency_cnpj', v_store.cnpj,
    'agency_address', v_store.address,
    'agency_whatsapp', COALESCE(v_store.settings ->> 'whatsapp_phone', v_store.settings ->> 'phone', v_meta ->> 'agency_whatsapp'),
    'public_token', v_contract.verification_code,
    'proposal_id', v_meta ->> 'proposal_id',
    'contract_title', COALESCE(v_version.title, v_contract.title),
    'client_name', COALESCE(v_meta ->> 'client_name', ''),
    'client_document', COALESCE(v_meta ->> 'client_document', ''),
    'client_email', v_meta ->> 'client_email',
    'client_phone', COALESCE(v_meta ->> 'client_phone', ''),
    'client_address', v_meta ->> 'client_address',
    'passengers', CASE WHEN jsonb_typeof(v_meta -> 'passengers') = 'array' THEN v_meta -> 'passengers' ELSE '[]'::jsonb END,
    'destination', COALESCE(v_meta ->> 'destination', ''),
    'travel_start_date', v_meta ->> 'travel_start_date',
    'travel_end_date', v_meta ->> 'travel_end_date',
    'package_summary', COALESCE(v_meta ->> 'package_summary', ''),
    'total_value_cents', COALESCE(NULLIF(v_meta ->> 'total_value_cents', '')::BIGINT, 0),
    'payment_conditions', COALESCE(v_meta ->> 'payment_conditions', ''),
    'clauses', CASE WHEN jsonb_typeof(v_version.clauses) = 'array' THEN v_version.clauses ELSE '[]'::jsonb END,
    'signatures', CASE WHEN jsonb_typeof(v_meta -> 'signatures') = 'array' THEN v_meta -> 'signatures' ELSE '[]'::jsonb END,
    'status', v_contract.status,
    'signed_at', v_meta ->> 'signed_at',
    'content_hash', v_meta ->> 'content_hash',
    'certificate_serial', v_meta ->> 'certificate_serial',
    'pdf_url', v_meta ->> 'pdf_url',
    'created_at', v_contract.created_at,
    'updated_at', v_contract.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sign_public_travel_contract(
  p_token TEXT,
  p_signer_name TEXT,
  p_signer_document TEXT,
  p_signer_email TEXT,
  p_signature_image TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_accepted_terms BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
SET row_security = off
AS $$
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

  IF v_contract.status = 'completed' THEN
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

  IF v_contract.status <> 'signing' THEN
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

  IF NOT FOUND OR v_version.hash_sha256 IS NULL OR v_version.hash_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Versão atual do contrato não possui hash íntegro.' USING ERRCODE = '55000';
  END IF;

  v_timestamp := clock_timestamp();
  v_serial := 'CERT-' || upper(encode(extensions.gen_random_bytes(12), 'hex'));
  v_digest := encode(extensions.digest(convert_to(jsonb_build_object(
    'contract_id', v_contract.id,
    'version_id', v_version.id,
    'version_hash', v_version.hash_sha256,
    'signer_name', v_name,
    'signer_document', v_document,
    'signer_email', v_email,
    'signed_at', v_timestamp,
    'certificate_serial', v_serial,
    'consent_version', 'travel-contract-terms-v1'
  )::TEXT, 'UTF8'), 'sha256'), 'hex');
  v_image_digest := CASE WHEN p_signature_image IS NULL THEN NULL ELSE encode(extensions.digest(convert_to(p_signature_image, 'UTF8'), 'sha256'), 'hex') END;

  INSERT INTO public.signature_envelopes (
    contract_version_id, signer_name, signer_email, signer_role, auth_level,
    signing_token, status, signed_at
  ) VALUES (
    v_version.id, v_name, v_email, 'party', 'basic',
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
      'version_hash', v_version.hash_sha256,
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
         sealed_at = v_timestamp
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

  RETURN jsonb_build_object(
    'success', TRUE,
    'certificate_serial', v_serial,
    'message', 'Assinatura registrada com sucesso.'
  );
END;
$$;

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

    v_conditions := jsonb_build_object(
      'contract_title', v_travel_proposal.title,
      'destination_city', v_travel_proposal.destination_city,
      'client_name', v_travel_proposal.client_name,
      'client_email', v_travel_proposal.client_email,
      'client_whatsapp', v_travel_proposal.client_whatsapp,
      'travel_start_date', v_travel_proposal.travel_start_date,
      'travel_end_date', v_travel_proposal.travel_end_date,
      'pricing', jsonb_build_object('total_price_cents', v_price_text),
      'includes', to_jsonb(COALESCE(v_travel_proposal.includes, ARRAY[]::TEXT[]))
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
    v_package_summary := 'Proposta aceita: ' || v_destination || '. Opção: ' || COALESCE(v_option_name, v_selected_option_id, 'padrão') || '. Serviços inclusos: ' || array_to_string(COALESCE(v_travel_proposal.includes, ARRAY[]::TEXT[]), ', ');
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
    v_package_summary := COALESCE(NULLIF(v_conditions ->> 'package_summary', ''), 'Proposta aprovada: ' || v_destination);
    v_payment_conditions := COALESCE(NULLIF(v_conditions ->> 'payment_conditions', ''), 'A confirmar pela agência; nenhuma cobrança ou pagamento foi registrado.');
    v_passengers := COALESCE(v_conditions -> 'passengers', jsonb_build_array(jsonb_build_object('name', v_client_name)));
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
     AND c.metadata ->> 'store_id' = p_store_id::TEXT
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
    'signatures', '[]'::jsonb
  );

  v_content := '# ' || v_title || E'\n\n' || (
    SELECT string_agg('## ' || COALESCE(clause ->> 'section', 'Cláusula') || E'\n' || COALESCE(clause ->> 'clause_text', ''), E'\n\n' ORDER BY clause ->> 'number')
      FROM jsonb_array_elements(v_clauses) AS item(clause)
  );
  v_hash := encode(extensions.digest(convert_to(v_content, 'UTF8'), 'sha256'), 'hex');

  INSERT INTO public.contracts (
    creator_id, title, category, status, current_version, verification_code, metadata
  ) VALUES (
    p_actor_profile_id, v_title, 'tourism', 'signing', 1, v_token, v_meta
  ) RETURNING id INTO v_contract_id;

  INSERT INTO public.contract_versions (
    contract_id, version_number, title, content_markdown, clauses, variables, hash_sha256, is_sealed
  ) VALUES (
    v_contract_id, 1, v_title, v_content, v_clauses, '{}'::jsonb, v_hash, FALSE
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


-- Manual staff issuance: contract and first immutable version are one transaction.
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
  v_total_cents BIGINT;
  v_passengers JSONB;
  v_clauses JSONB;
  v_meta JSONB;
  v_fingerprint TEXT;
  v_content TEXT;
  v_hash TEXT;
  v_token TEXT;
  v_contract_id UUID;
  v_existing public.contracts%ROWTYPE;
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

  v_fingerprint := encode(extensions.digest(convert_to(p_store_id::TEXT || ':' || p_contract_data::TEXT, 'UTF8'), 'sha256'), 'hex');
  SELECT c.* INTO v_existing
    FROM public.contracts AS c
   WHERE c.category = 'tourism'
     AND c.metadata ->> 'store_id' = p_store_id::TEXT
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
  IF CASE WHEN jsonb_typeof(v_clauses) = 'array' THEN jsonb_array_length(v_clauses) = 0 ELSE TRUE END THEN
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

  v_token := 'ct_' || encode(extensions.gen_random_bytes(32), 'hex');
  v_meta := jsonb_build_object(
    'store_id', p_store_id,
    'proposal_id', v_proposal_id,
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
    'travel_start_date', p_contract_data ->> 'travelStartDate',
    'travel_end_date', p_contract_data ->> 'travelEndDate',
    'package_summary', v_summary,
    'total_value_cents', v_total_cents,
    'payment_conditions', v_payment_conditions,
    'payment_status', 'pending_preference',
    'passengers', v_passengers,
    'signatures', '[]'::jsonb
  );

  v_content := '# ' || v_title || E'\n\n' || (
    SELECT string_agg('## ' || COALESCE(clause ->> 'section', 'Cláusula') || E'\n' || COALESCE(clause ->> 'clause_text', ''), E'\n\n' ORDER BY clause ->> 'number')
      FROM jsonb_array_elements(v_clauses) AS item(clause)
  );
  v_hash := encode(extensions.digest(convert_to(v_content, 'UTF8'), 'sha256'), 'hex');

  INSERT INTO public.contracts (creator_id, title, category, status, current_version, verification_code, metadata)
  VALUES (p_actor_profile_id, v_title, 'tourism', 'signing', 1, v_token, v_meta)
  RETURNING id INTO v_contract_id;

  INSERT INTO public.contract_versions (contract_id, version_number, title, content_markdown, clauses, variables, hash_sha256, is_sealed)
  VALUES (v_contract_id, 1, v_title, v_content, v_clauses, '{}'::jsonb, v_hash, FALSE);

  RETURN jsonb_build_object('success', TRUE, 'contract_id', v_contract_id, 'public_token', v_token, 'replayed', FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.create_staff_travel_contract(JSONB, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_travel_contract(JSONB, UUID, UUID) TO service_role;
