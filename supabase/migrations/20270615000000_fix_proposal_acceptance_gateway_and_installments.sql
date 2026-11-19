-- =============================================================================
-- MIGRATION: 20270615000000_fix_proposal_acceptance_gateway_and_installments.sql
-- OBJETIVO:
--   1. Eliminar o mismatch P0 entre BFF e RPC SQL em travel_proposal_acceptances:
--      - Adicionar 'gateway_online' nas preferencias de pagamento permitidas.
--      - Expandir o limite maximo de parcelas para 36x (politica DEC-501/531).
--   2. Atualizar a RPC public.record_public_travel_proposal_acceptance para:
--      - Validar 'gateway_online' sem lancar excecao.
--      - Suportar parcelamento de 1x ate 36x.
--      - Permitir que gateway_online funcione com ou sem parcelas informadas.
-- =============================================================================

BEGIN;

-- 1. Atualizacao defensiva das constraints da tabela travel_proposal_acceptances
ALTER TABLE public.travel_proposal_acceptances
  DROP CONSTRAINT IF EXISTS travel_proposal_acceptances_payment_preference_check;

ALTER TABLE public.travel_proposal_acceptances
  ADD CONSTRAINT travel_proposal_acceptances_payment_preference_check
  CHECK (
    payment_preference IS NULL
    OR payment_preference IN (
      'pix',
      'cartao_operadora',
      'financiamento_bancario',
      'faturado_agencia',
      'gateway_online'
    )
  );

ALTER TABLE public.travel_proposal_acceptances
  DROP CONSTRAINT IF EXISTS travel_proposal_acceptances_payment_installments_check;

ALTER TABLE public.travel_proposal_acceptances
  ADD CONSTRAINT travel_proposal_acceptances_payment_installments_check
  CHECK (
    payment_installments IS NULL
    OR payment_installments BETWEEN 1 AND 36
  );

-- 2. Atualizacao da RPC record_public_travel_proposal_acceptance
CREATE OR REPLACE FUNCTION public.record_public_travel_proposal_acceptance(
  p_proposal_id UUID,
  p_public_token TEXT,
  p_snapshot_hash TEXT,
  p_selected_option_id TEXT,
  p_idempotency_key TEXT,
  p_accepted_by_name TEXT,
  p_accepted_by_email TEXT,
  p_passenger_manifest JSONB,
  p_payment_preference TEXT,
  p_payment_installments INTEGER,
  p_terms_version TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_proposal public.travel_proposals%ROWTYPE;
  v_acceptance public.travel_proposal_acceptances%ROWTYPE;
  v_manifest_count INTEGER;
  v_accepted_by_name TEXT;
  v_accepted_by_email TEXT;
  v_expected_idempotency_key TEXT;
  v_acceptance_fingerprint TEXT;
  v_is_installment_preference BOOLEAN;
BEGIN
  SELECT * INTO v_proposal
    FROM public.travel_proposals
   WHERE id = p_proposal_id
     AND public_token = p_public_token
   FOR UPDATE;

  IF NOT FOUND OR v_proposal.store_id IS NULL THEN
    RAISE EXCEPTION 'Proposta pública não encontrada ou indisponível para aceite.';
  END IF;
  IF p_snapshot_hash IS NULL OR v_proposal.snapshot_hash IS NULL OR v_proposal.snapshot_hash <> p_snapshot_hash THEN
    RAISE EXCEPTION 'O conteúdo da proposta mudou ou não possui fingerprint verificável; atualize a página.';
  END IF;

  IF p_passenger_manifest IS NULL OR jsonb_typeof(p_passenger_manifest) <> 'array' THEN
    RAISE EXCEPTION 'O manifesto de passageiros é inválido.';
  END IF;
  v_manifest_count := jsonb_array_length(p_passenger_manifest);
  IF v_manifest_count < 1 OR v_manifest_count > 40 THEN
    RAISE EXCEPTION 'O manifesto deve conter entre 1 e 40 passageiros.';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_passenger_manifest) AS manifest_item(passenger)
     WHERE jsonb_typeof(passenger) <> 'object'
        OR length(btrim(COALESCE(passenger ->> 'name', ''))) < 2
        OR length(btrim(COALESCE(passenger ->> 'document', ''))) < 3
        OR (NULLIF(passenger ->> 'birthDate', '') IS NOT NULL AND passenger ->> 'birthDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        OR (NULLIF(passenger ->> 'email', '') IS NOT NULL AND passenger ->> 'email' !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')
  ) THEN
    RAISE EXCEPTION 'Há dados inválidos no manifesto de passageiros.';
  END IF;

  v_accepted_by_name := COALESCE(NULLIF(btrim(p_accepted_by_name), ''), NULLIF(btrim(p_passenger_manifest -> 0 ->> 'name'), ''));
  v_accepted_by_email := NULLIF(lower(btrim(COALESCE(p_accepted_by_email, p_passenger_manifest -> 0 ->> 'email'))), '');
  IF v_accepted_by_name IS NULL OR length(v_accepted_by_name) < 2 THEN
    RAISE EXCEPTION 'Informe o nome de quem registra o aceite.';
  END IF;
  IF v_accepted_by_email IS NOT NULL AND v_accepted_by_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' THEN
    RAISE EXCEPTION 'O e-mail de aceite é inválido.';
  END IF;

  -- Validacao de preferencia de pagamento (suporta pix, cartao_operadora, financiamento_bancario, faturado_agencia e gateway_online)
  IF p_payment_preference IS NULL OR p_payment_preference NOT IN ('pix', 'cartao_operadora', 'financiamento_bancario', 'faturado_agencia', 'gateway_online') THEN
    RAISE EXCEPTION 'A preferência de pagamento informada não é válida.';
  END IF;

  v_is_installment_preference := p_payment_preference IN ('cartao_operadora', 'financiamento_bancario', 'gateway_online');

  IF v_is_installment_preference AND p_payment_installments IS NOT NULL AND (p_payment_installments NOT BETWEEN 1 AND 36) THEN
    RAISE EXCEPTION 'Informe uma quantidade válida de parcelas (entre 1 e 36).';
  END IF;

  IF p_payment_preference IN ('cartao_operadora', 'financiamento_bancario') AND p_payment_installments IS NULL THEN
    RAISE EXCEPTION 'Informe uma quantidade válida de parcelas.';
  END IF;

  IF p_payment_preference = 'pix' AND p_payment_installments IS NOT NULL THEN
    RAISE EXCEPTION 'Esta preferência não admite quantidade de parcelas.';
  END IF;

  IF NULLIF(btrim(p_terms_version), '') IS NULL THEN
    RAISE EXCEPTION 'A versão dos termos é obrigatória.';
  END IF;

  IF jsonb_typeof(COALESCE(v_proposal.options, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'As opções da proposta não são válidas.';
  END IF;
  IF jsonb_array_length(COALESCE(v_proposal.options, '[]'::jsonb)) > 0 THEN
    IF p_selected_option_id IS NULL OR NOT EXISTS (
      SELECT 1
        FROM jsonb_array_elements(v_proposal.options) AS option_item(option)
       WHERE option ->> 'id' = p_selected_option_id
    ) THEN
      RAISE EXCEPTION 'Selecione uma opção válida desta proposta.';
    END IF;
  ELSIF p_selected_option_id IS NOT NULL THEN
    RAISE EXCEPTION 'A opção selecionada não pertence a esta proposta.';
  END IF;

  v_expected_idempotency_key := 'public-acceptance:' || v_proposal.id::TEXT || ':' || p_snapshot_hash;
  IF p_idempotency_key IS DISTINCT FROM v_expected_idempotency_key THEN
    RAISE EXCEPTION 'Chave de idempotência inválida.';
  END IF;

  v_acceptance_fingerprint := encode(
    digest(
      convert_to(
        jsonb_build_object(
          'proposal_id', v_proposal.id,
          'snapshot_hash', p_snapshot_hash,
          'selected_option_id', p_selected_option_id,
          'accepted_by_name', v_accepted_by_name,
          'accepted_by_email', v_accepted_by_email,
          'passenger_manifest', p_passenger_manifest,
          'payment_preference', p_payment_preference,
          'payment_installments', p_payment_installments,
          'terms_version', btrim(p_terms_version)
        )::TEXT,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  SELECT * INTO v_acceptance
    FROM public.travel_proposal_acceptances
   WHERE store_id = v_proposal.store_id
     AND proposal_id = v_proposal.id
     AND status = 'accepted'
   FOR UPDATE;

  IF FOUND THEN
    IF v_acceptance.acceptance_fingerprint IS NOT NULL
       AND v_acceptance.acceptance_fingerprint = v_acceptance_fingerprint THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'replayed', TRUE,
        'acceptance_id', v_acceptance.id,
        'proposal_id', v_proposal.id
      );
    END IF;
    RAISE EXCEPTION 'Já existe um aceite vigente com conteúdo diferente ou legado; a agência precisa revisar antes de novo envio.';
  END IF;

  IF v_proposal.status <> 'sent' THEN
    RAISE EXCEPTION 'A proposta precisa estar publicada/enviada para receber aceite.';
  END IF;
  IF v_proposal.valid_until IS NULL OR v_proposal.valid_until <= now() THEN
    RAISE EXCEPTION 'A validade da proposta terminou ou não foi definida; solicite atualização à agência.';
  END IF;

  INSERT INTO public.travel_proposal_acceptances (
    store_id,
    proposal_id,
    budget_id,
    status,
    proposal_snapshot_hash,
    terms_version,
    acceptance_fingerprint,
    selected_option_id,
    passenger_manifest,
    payment_preference,
    payment_installments,
    accepted_by_name,
    accepted_by_email,
    evidence,
    idempotency_key
  ) VALUES (
    v_proposal.store_id,
    v_proposal.id,
    v_proposal.budget_id,
    'accepted',
    p_snapshot_hash,
    btrim(p_terms_version),
    v_acceptance_fingerprint,
    p_selected_option_id,
    p_passenger_manifest,
    p_payment_preference,
    p_payment_installments,
    v_accepted_by_name,
    v_accepted_by_email,
    jsonb_build_object('source', 'public_link', 'version', 1),
    p_idempotency_key
  ) RETURNING * INTO v_acceptance;

  UPDATE public.travel_proposals
     SET status = 'approved',
         acceptance_status = 'accepted',
         accepted_option_id = p_selected_option_id,
         updated_at = now()
   WHERE id = v_proposal.id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'replayed', FALSE,
    'acceptance_id', v_acceptance.id,
    'proposal_id', v_proposal.id
  );
END;
$$;

COMMIT;
