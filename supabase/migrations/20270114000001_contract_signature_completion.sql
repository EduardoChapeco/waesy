-- W2.7.1 — Finalização atômica de assinaturas e conclusão canónica do contrato.
BEGIN;

CREATE OR REPLACE FUNCTION public.promote_contract_after_signatures(
  p_contract_version_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_version public.contract_versions%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_envelope_count INTEGER;
  v_incomplete_count INTEGER;
BEGIN
  SELECT * INTO v_version
    FROM public.contract_versions
   WHERE id = p_contract_version_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'versão do contrato não encontrada';
  END IF;

  SELECT * INTO v_contract
    FROM public.contracts
   WHERE id = v_version.contract_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'contrato da versão não encontrado';
  END IF;

  IF v_contract.current_version <> v_version.version_number THEN
    RAISE EXCEPTION 'a versão assinada não é a versão corrente do contrato';
  END IF;
  IF v_version.is_sealed IS NOT TRUE
     OR v_version.sealed_at IS NULL
     OR v_version.hash_sha256 IS NULL
     OR v_version.hash_sha256 !~ '^[0-9A-Fa-f]{64}$' THEN
    RAISE EXCEPTION 'a versão corrente não possui selo SHA-256 válido';
  END IF;

  SELECT COUNT(*)::INTEGER,
         COUNT(*) FILTER (
           WHERE e.status <> 'signed'
              OR e.signed_at IS NULL
              OR NOT EXISTS (
                SELECT 1
                  FROM public.signature_evidence se
                 WHERE se.envelope_id = e.id
                   AND se.consent_given IS TRUE
              )
         )::INTEGER
    INTO v_envelope_count, v_incomplete_count
    FROM public.signature_envelopes e
   WHERE e.contract_version_id = v_version.id;

  IF v_envelope_count = 0 THEN
    RAISE EXCEPTION 'a versão não tem envelopes de assinatura exigidos';
  END IF;

  IF v_incomplete_count > 0 THEN
    RETURN jsonb_build_object(
      'contract_id', v_contract.id,
      'contract_version_id', v_version.id,
      'contract_status', v_contract.status,
      'all_required_signatures_signed', false,
      'completed', false,
      'idempotent', false
    );
  END IF;

  IF v_contract.status = 'completed' THEN
    RETURN jsonb_build_object(
      'contract_id', v_contract.id,
      'contract_version_id', v_version.id,
      'contract_status', 'completed',
      'all_required_signatures_signed', true,
      'completed', true,
      'idempotent', true
    );
  END IF;

  IF v_contract.status <> 'signing' THEN
    RAISE EXCEPTION 'o contrato não está no estado signing';
  END IF;

  UPDATE public.contracts
     SET status = 'completed', updated_at = clock_timestamp()
   WHERE id = v_contract.id
     AND status = 'signing'
     AND current_version = v_version.version_number;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'não foi possível confirmar a conclusão do contrato';
  END IF;

  RETURN jsonb_build_object(
    'contract_id', v_contract.id,
    'contract_version_id', v_version.id,
    'contract_status', 'completed',
    'all_required_signatures_signed', true,
    'completed', true,
    'idempotent', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_contract_signature(
  p_envelope_id UUID,
  p_signature_digest TEXT,
  p_evidence_payload JSONB,
  p_gov_br_level TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_version_id UUID;
  v_version public.contract_versions%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_envelope public.signature_envelopes%ROWTYPE;
  v_evidence_id UUID;
  v_signed_at TIMESTAMPTZ;
  v_completion JSONB;
  v_gov_br_verified BOOLEAN := p_gov_br_level IS NOT NULL;
  v_auth_method TEXT;
BEGIN
  IF p_signature_digest IS NULL OR length(trim(p_signature_digest)) < 8 THEN
    RAISE EXCEPTION 'digest da assinatura inválido';
  END IF;
  IF p_evidence_payload IS NULL OR jsonb_typeof(p_evidence_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'payload de evidência inválido';
  END IF;
  IF p_evidence_payload->>'consent_given' IS DISTINCT FROM 'true'
     OR p_evidence_payload->>'signature_digest' IS DISTINCT FROM p_signature_digest THEN
    RAISE EXCEPTION 'consentimento ou digest da evidência não corresponde à tentativa';
  END IF;

  v_auth_method := p_evidence_payload->>'auth_method';
  IF p_gov_br_level IS NULL THEN
    IF p_evidence_payload->>'gov_br_verified' = 'true'
       OR v_auth_method IS NULL
       OR v_auth_method NOT IN ('email_otp', 'electronic_consent') THEN
      RAISE EXCEPTION 'método de autenticação manual inválido';
    END IF;
  ELSE
    IF p_gov_br_level NOT IN ('prata', 'ouro')
       OR v_auth_method IS DISTINCT FROM 'gov_br_federated'
       OR jsonb_typeof(p_evidence_payload->'gov_br_raw_claims') IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'evidência Gov.br inválida';
    END IF;
  END IF;

  -- Ordem de locks comum a todas as assinaturas/novos envelopes: versão, contrato, envelope.
  SELECT contract_version_id INTO v_version_id
    FROM public.signature_envelopes
   WHERE id = p_envelope_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'envelope não encontrado';
  END IF;

  SELECT * INTO v_version
    FROM public.contract_versions
   WHERE id = v_version_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'versão do envelope não encontrada';
  END IF;

  SELECT * INTO v_contract
    FROM public.contracts
   WHERE id = v_version.contract_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'contrato do envelope não encontrado';
  END IF;

  SELECT * INTO v_envelope
    FROM public.signature_envelopes
   WHERE id = p_envelope_id
   FOR UPDATE;
  IF NOT FOUND OR v_envelope.contract_version_id <> v_version.id THEN
    RAISE EXCEPTION 'envelope mudou de versão durante a finalização';
  END IF;
  v_signed_at := clock_timestamp();

  IF v_contract.status <> 'signing'
     OR v_contract.current_version <> v_version.version_number THEN
    RAISE EXCEPTION 'o contrato não está assinável na versão corrente';
  END IF;
  IF v_version.is_sealed IS NOT TRUE
     OR v_version.sealed_at IS NULL
     OR v_version.hash_sha256 IS NULL
     OR v_version.hash_sha256 !~ '^[0-9A-Fa-f]{64}$' THEN
    RAISE EXCEPTION 'a versão não possui selo SHA-256 válido';
  END IF;
  IF v_envelope.status <> 'pending' OR v_envelope.expires_at <= v_signed_at THEN
    RAISE EXCEPTION 'o envelope deixou de estar pendente ou expirou';
  END IF;

  INSERT INTO public.signature_evidence (
    envelope_id,
    ip_address,
    user_agent,
    screen_resolution,
    timezone,
    geo_latitude,
    geo_longitude,
    geo_city,
    geo_state,
    auth_method,
    consent_given,
    signature_digest,
    facial_biometrics_hash,
    evidence_manifest,
    gov_br_verified,
    gov_br_level,
    gov_br_raw_claims
  ) VALUES (
    p_envelope_id,
    NULLIF(p_evidence_payload->>'ip_address', ''),
    NULLIF(p_evidence_payload->>'user_agent', ''),
    NULLIF(p_evidence_payload->>'screen_resolution', ''),
    NULLIF(p_evidence_payload->>'timezone', ''),
    NULLIF(p_evidence_payload->>'geo_latitude', '')::DOUBLE PRECISION,
    NULLIF(p_evidence_payload->>'geo_longitude', '')::DOUBLE PRECISION,
    NULLIF(p_evidence_payload->>'geo_city', ''),
    NULLIF(p_evidence_payload->>'geo_state', ''),
    v_auth_method,
    true,
    p_signature_digest,
    NULLIF(p_evidence_payload->>'facial_biometrics_hash', ''),
    jsonb_set(
      CASE
        WHEN jsonb_typeof(p_evidence_payload->'evidence_manifest') = 'object'
          THEN p_evidence_payload->'evidence_manifest'
        ELSE '{}'::jsonb
      END,
      '{timestamp}', to_jsonb(v_signed_at), true
    ),
    v_gov_br_verified,
    p_gov_br_level,
    CASE
      WHEN v_gov_br_verified THEN p_evidence_payload->'gov_br_raw_claims'
      ELSE NULL
    END
  ) RETURNING id INTO v_evidence_id;

  UPDATE public.signature_envelopes
     SET status = 'signed',
         signed_at = v_signed_at,
         gov_br_verified = v_gov_br_verified,
         gov_br_level = p_gov_br_level
   WHERE id = v_envelope.id
     AND status = 'pending'
     AND expires_at > v_signed_at;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'não foi possível confirmar a transição do envelope';
  END IF;

  v_completion := public.promote_contract_after_signatures(v_version.id);
  RETURN v_completion || jsonb_build_object(
    'envelope_id', v_envelope.id,
    'envelope_status', 'signed',
    'signed_at', v_signed_at,
    'evidence_id', v_evidence_id,
    'signature_digest', p_signature_digest
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_envelope_on_completed_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contract_id UUID;
  v_contract_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.contract_version_id IS DISTINCT FROM OLD.contract_version_id THEN
      RAISE EXCEPTION 'a versão de um envelope existente é imutável';
    END IF;
    RETURN NEW;
  END IF;

  SELECT contract_id INTO v_contract_id
    FROM public.contract_versions
   WHERE id = NEW.contract_version_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'versão do envelope não encontrada';
  END IF;

  SELECT status INTO v_contract_status
    FROM public.contracts
   WHERE id = v_contract_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'contrato do envelope não encontrado';
  END IF;
  IF v_contract_status = 'completed' THEN
    RAISE EXCEPTION 'não é permitido acrescentar envelopes a contrato completed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_envelope_on_completed_contract ON public.signature_envelopes;
CREATE TRIGGER prevent_envelope_on_completed_contract
  BEFORE INSERT OR UPDATE OF contract_version_id
  ON public.signature_envelopes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_envelope_on_completed_contract();

REVOKE ALL ON FUNCTION public.promote_contract_after_signatures(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_contract_signature(UUID, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_contract_after_signatures(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_contract_signature(UUID, TEXT, JSONB, TEXT) TO service_role;

-- Backfill estrito: não promove versões antigas sem selo, evidência de consentimento ou todos os envelopes concluídos.
UPDATE public.contracts c
   SET status = 'completed', updated_at = clock_timestamp()
 WHERE c.status = 'signing'
   AND EXISTS (
     SELECT 1
       FROM public.contract_versions v
      WHERE v.contract_id = c.id
        AND v.version_number = c.current_version
        AND v.is_sealed IS TRUE
        AND v.sealed_at IS NOT NULL
        AND v.hash_sha256 ~ '^[0-9A-Fa-f]{64}$'
        AND EXISTS (
          SELECT 1 FROM public.signature_envelopes e
           WHERE e.contract_version_id = v.id
        )
        AND NOT EXISTS (
          SELECT 1
            FROM public.signature_envelopes e
           WHERE e.contract_version_id = v.id
             AND (
               e.status <> 'signed'
               OR e.signed_at IS NULL
               OR NOT EXISTS (
                 SELECT 1 FROM public.signature_evidence se
                  WHERE se.envelope_id = e.id
                    AND se.consent_given IS TRUE
               )
             )
        )
   );

COMMIT;
