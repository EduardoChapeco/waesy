-- ============================================================================
-- MIGRATION: 20270322010000_sync_travel_and_canonical_contract_signing.sql
-- Objetivo:
-- 1. Sincronizar sign_public_travel_contract com public.travel_contracts e
--    garantir hash SHA-256 íntegro em contract_versions.
-- 2. Permitir que seal_and_issue_contract sele versões não seladas (is_sealed = false)
--    mesmo quando o contrato turístico foi pré-inicializado com status = 'signing'
--    ou por outro membro da equipe da mesma loja (store_id).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seal_and_issue_contract(
  p_contract_id uuid,
  p_version_id uuid,
  p_actor_id uuid,
  p_store_id uuid,
  p_expected_content_markdown text,
  p_expected_clauses jsonb,
  p_expected_signature_fields jsonb,
  p_hash_sha256 text,
  p_signature_fields jsonb,
  p_signers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_version public.contract_versions%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_signer JSONB;
  v_envelope public.signature_envelopes%ROWTYPE;
  v_envelopes JSONB := '[]'::JSONB;
  v_signer_count INTEGER;
BEGIN
  IF p_actor_id IS NULL OR p_store_id IS NULL THEN
    RAISE EXCEPTION 'ator e tenant são obrigatórios';
  END IF;
  IF p_hash_sha256 IS NULL OR p_hash_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'hash SHA-256 inválido';
  END IF;
  IF jsonb_typeof(p_signature_fields) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_signature_fields) > 200 THEN
    RAISE EXCEPTION 'campos de assinatura inválidos';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_signature_fields) AS field(value)
     WHERE jsonb_typeof(field.value) IS DISTINCT FROM 'object'
  ) THEN
    RAISE EXCEPTION 'cada campo de assinatura deve ser um objeto';
  END IF;
  IF jsonb_typeof(p_signers) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'lista de signatários inválida';
  END IF;
  v_signer_count := jsonb_array_length(p_signers);
  IF v_signer_count < 1 OR v_signer_count > 50 THEN
    RAISE EXCEPTION 'quantidade de signatários fora do limite';
  END IF;

  SELECT cv.*
    INTO v_version
    FROM public.contract_versions AS cv
   WHERE cv.id = p_version_id
     AND cv.contract_id = p_contract_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'versão do contrato não encontrada';
  END IF;

  SELECT c.*
    INTO v_contract
    FROM public.contracts AS c
   WHERE c.id = p_contract_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'contrato não encontrado';
  END IF;

  IF v_contract.store_id IS DISTINCT FROM p_store_id
     AND v_contract.creator_id IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'ator não pertence ao tenant autorizado deste contrato';
  END IF;
  IF v_contract.current_version IS DISTINCT FROM v_version.version_number THEN
    RAISE EXCEPTION 'a versão solicitada não é a versão corrente';
  END IF;
  IF v_contract.status = 'completed' OR v_contract.status = 'signed' THEN
    RAISE EXCEPTION 'contrato concluído não pode ser reaberto';
  END IF;
  IF v_contract.status = 'cancelled' THEN
    RAISE EXCEPTION 'contrato cancelado não pode ser selado';
  END IF;
  IF v_contract.status NOT IN ('draft', 'reviewing', 'sealed', 'signing', 'sent') THEN
    RAISE EXCEPTION 'estado do contrato não permite selagem';
  END IF;
  IF v_version.is_sealed IS TRUE
     OR v_version.sealed_at IS NOT NULL THEN
    RAISE EXCEPTION 'versão já selada não pode receber novos envelopes';
  END IF;
  IF v_version.content_markdown IS DISTINCT FROM p_expected_content_markdown
     OR v_version.clauses IS DISTINCT FROM p_expected_clauses
     OR v_version.signature_fields IS DISTINCT FROM p_expected_signature_fields THEN
    RAISE EXCEPTION 'a versão mudou durante a preparação da selagem';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.signature_envelopes AS existing_envelope
     WHERE existing_envelope.contract_version_id = v_version.id
  ) THEN
    RAISE EXCEPTION 'a versão já possui envelopes de assinatura';
  END IF;

  FOR v_signer IN SELECT signer.value FROM jsonb_array_elements(p_signers) AS signer(value)
  LOOP
    IF jsonb_typeof(v_signer) IS DISTINCT FROM 'object'
       OR length(btrim(COALESCE(v_signer->>'name', ''))) < 2
       OR length(btrim(COALESCE(v_signer->>'name', ''))) > 200
       OR length(btrim(COALESCE(v_signer->>'email', ''))) > 320
       OR length(COALESCE(v_signer->>'phone', '')) > 40
       OR length(COALESCE(v_signer->>'cpf', '')) > 40
       OR btrim(COALESCE(v_signer->>'email', '')) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       OR COALESCE(v_signer->>'role', '') NOT IN ('party', 'witness', 'guarantor')
       OR COALESCE(v_signer->>'authLevel', '') NOT IN ('basic', 'advanced', 'qualified')
       OR COALESCE(v_signer->>'dispatchChannel', '') NOT IN ('email', 'whatsapp', 'sms', 'direct_link')
       OR COALESCE(v_signer->>'colorCode', '') !~ '^#[0-9A-Fa-f]{6}$'
       OR COALESCE(v_signer->>'signingOrderIndex', '') !~ '^([1-9]|[1-4][0-9]|50)$' THEN
      RAISE EXCEPTION 'dados do signatário inválidos';
    END IF;
  END LOOP;

  UPDATE public.contract_versions AS cv
     SET is_sealed = TRUE,
         sealed_at = clock_timestamp(),
         hash_sha256 = p_hash_sha256,
         signature_fields = p_signature_fields
   WHERE cv.id = v_version.id
     AND cv.is_sealed IS FALSE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'não foi possível selar a versão';
  END IF;

  UPDATE public.contracts AS c
     SET status = 'signing',
         store_id = COALESCE(c.store_id, p_store_id),
         updated_at = clock_timestamp()
   WHERE c.id = v_contract.id
     AND c.current_version = v_version.version_number
     AND c.status IN ('draft', 'reviewing', 'sealed', 'signing', 'sent');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'não foi possível iniciar a assinatura';
  END IF;

  FOR v_signer IN SELECT signer.value FROM jsonb_array_elements(p_signers) AS signer(value)
  LOOP
    INSERT INTO public.signature_envelopes (
      contract_version_id,
      signer_name,
      signer_email,
      signer_phone,
      signer_cpf,
      signer_role,
      auth_level,
      dispatch_channel,
      signing_order_index,
      color_code,
      require_facial_biometrics,
      require_cpf_confirmation,
      signer_profile_id,
      status
    ) VALUES (
      v_version.id,
      btrim(v_signer->>'name'),
      lower(btrim(v_signer->>'email')),
      NULLIF(btrim(v_signer->>'phone'), ''),
      NULLIF(btrim(v_signer->>'cpf'), ''),
      v_signer->>'role',
      v_signer->>'authLevel',
      v_signer->>'dispatchChannel',
      (v_signer->>'signingOrderIndex')::INTEGER,
      v_signer->>'colorCode',
      COALESCE((v_signer->>'requireFacialBiometrics')::BOOLEAN, FALSE),
      COALESCE((v_signer->>'requireCpfConfirmation')::BOOLEAN, FALSE),
      NULLIF(v_signer->>'profileId', '')::UUID,
      'pending'
    )
    RETURNING * INTO v_envelope;

    v_envelopes := v_envelopes || jsonb_build_array(to_jsonb(v_envelope));
  END LOOP;

  IF jsonb_array_length(v_envelopes) <> v_signer_count THEN
    RAISE EXCEPTION 'a quantidade de envelopes persistidos não corresponde aos signatários';
  END IF;

  RETURN jsonb_build_object(
    'status', 'sealed',
    'contract_id', v_contract.id,
    'contract_version_id', v_version.id,
    'contract_status', 'signing',
    'hash_sha256', p_hash_sha256,
    'envelopes', v_envelopes
  );
END;
$function$;

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

  -- Sincroniza espelho em public.travel_contracts se existir
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

  RETURN jsonb_build_object(
    'success', TRUE,
    'certificate_serial', v_serial,
    'message', 'Assinatura registrada com sucesso.'
  );
END;
$function$;
