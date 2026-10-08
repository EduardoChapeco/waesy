-- W2.7.2 — Selagem de contratos autorizada e atomicamente persistida.
-- Esta migration é local nesta microfase; não foi aplicada a nenhum banco.
BEGIN;

CREATE OR REPLACE FUNCTION public.seal_and_issue_contract(
  p_contract_id UUID,
  p_version_id UUID,
  p_actor_id UUID,
  p_store_id UUID,
  p_expected_content_markdown TEXT,
  p_expected_clauses JSONB,
  p_expected_signature_fields JSONB,
  p_hash_sha256 TEXT,
  p_signature_fields JSONB,
  p_signers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
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

  -- Ordem de locks igual à RPC de conclusão: primeiro versão, depois contrato.
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

  IF v_contract.creator_id IS DISTINCT FROM p_actor_id
     OR v_contract.store_id IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'ator não é o criador autorizado deste tenant';
  END IF;
  IF v_contract.current_version IS DISTINCT FROM v_version.version_number THEN
    RAISE EXCEPTION 'a versão solicitada não é a versão corrente';
  END IF;
  IF v_contract.status = 'completed' THEN
    RAISE EXCEPTION 'contrato concluído não pode ser reaberto';
  END IF;
  IF v_contract.status = 'cancelled' THEN
    RAISE EXCEPTION 'contrato cancelado não pode ser selado';
  END IF;
  IF v_contract.status = 'signing' THEN
    RAISE EXCEPTION 'contrato já está em assinatura';
  END IF;
  IF v_contract.status NOT IN ('draft', 'reviewing', 'sealed') THEN
    RAISE EXCEPTION 'estado do contrato não permite selagem';
  END IF;
  IF v_version.is_sealed IS TRUE
     OR v_version.sealed_at IS NOT NULL
     OR v_version.hash_sha256 IS NOT NULL THEN
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
         updated_at = clock_timestamp()
   WHERE c.id = v_contract.id
     AND c.creator_id = p_actor_id
     AND c.store_id = p_store_id
     AND c.current_version = v_version.version_number
     AND c.status IN ('draft', 'reviewing', 'sealed');
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
$$;

REVOKE ALL ON FUNCTION public.seal_and_issue_contract(
  UUID, UUID, UUID, UUID, TEXT, JSONB, JSONB, TEXT, JSONB, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seal_and_issue_contract(
  UUID, UUID, UUID, UUID, TEXT, JSONB, JSONB, TEXT, JSONB, JSONB
) TO service_role;

COMMIT;
