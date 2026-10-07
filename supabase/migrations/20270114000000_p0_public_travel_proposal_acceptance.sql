-- Waesy P0 — canonical public travel proposal acceptance.
-- This migration is additive, preserves historical acceptance rows, and does not
-- create reservations, sales, payment intents, tickets, contracts, or vouchers.

ALTER TABLE public.travel_proposals
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS template_theme TEXT NOT NULL DEFAULT 'editorial-flat',
  ADD COLUMN IF NOT EXISTS transfers JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tours JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rooms JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS special_notes TEXT;

ALTER TABLE public.travel_proposal_acceptances
  ADD COLUMN IF NOT EXISTS acceptance_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS selected_option_id TEXT,
  ADD COLUMN IF NOT EXISTS passenger_manifest JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_preference TEXT,
  ADD COLUMN IF NOT EXISTS payment_installments INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'travel_proposal_acceptances_fingerprint_check'
      AND conrelid = 'public.travel_proposal_acceptances'::regclass
  ) THEN
    ALTER TABLE public.travel_proposal_acceptances
      ADD CONSTRAINT travel_proposal_acceptances_fingerprint_check
      CHECK (acceptance_fingerprint IS NULL OR acceptance_fingerprint ~ '^[0-9a-f]{64}$');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'travel_proposal_acceptances_manifest_array_check'
      AND conrelid = 'public.travel_proposal_acceptances'::regclass
  ) THEN
    ALTER TABLE public.travel_proposal_acceptances
      ADD CONSTRAINT travel_proposal_acceptances_manifest_array_check
      CHECK (jsonb_typeof(passenger_manifest) = 'array');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'travel_proposal_acceptances_payment_preference_check'
      AND conrelid = 'public.travel_proposal_acceptances'::regclass
  ) THEN
    ALTER TABLE public.travel_proposal_acceptances
      ADD CONSTRAINT travel_proposal_acceptances_payment_preference_check
      CHECK (payment_preference IS NULL OR payment_preference IN ('pix', 'cartao_operadora', 'financiamento_bancario', 'faturado_agencia'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'travel_proposal_acceptances_payment_installments_check'
      AND conrelid = 'public.travel_proposal_acceptances'::regclass
  ) THEN
    ALTER TABLE public.travel_proposal_acceptances
      ADD CONSTRAINT travel_proposal_acceptances_payment_installments_check
      CHECK (payment_installments IS NULL OR payment_installments BETWEEN 1 AND 12);
  END IF;
END;
$$;

-- Keep prior rows as history while allowing one current acceptance and subsequent
-- explicitly superseded/revoked records for a proposal.
ALTER TABLE public.travel_proposal_acceptances
  DROP CONSTRAINT IF EXISTS travel_proposal_acceptances_store_id_proposal_id_key,
  DROP CONSTRAINT IF EXISTS travel_proposal_acceptances_store_id_idempotency_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_travel_proposal_acceptances_active_proposal
  ON public.travel_proposal_acceptances(store_id, proposal_id)
  WHERE status = 'accepted';
CREATE UNIQUE INDEX IF NOT EXISTS uq_travel_proposal_acceptances_active_idempotency
  ON public.travel_proposal_acceptances(store_id, idempotency_key)
  WHERE status = 'accepted';

CREATE OR REPLACE FUNCTION public.travel_proposal_snapshot_payload(p public.travel_proposals)
RETURNS JSONB
LANGUAGE SQL
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT jsonb_build_object(
    'schema_version', 'travel-proposal-snapshot-v1',
    'title', p.title,
    'subtitle', p.subtitle,
    'destination_city', p.destination_city,
    'client_name', p.client_name,
    'travel_start_date', p.travel_start_date,
    'travel_end_date', p.travel_end_date,
    'adults_count', p.adults_count,
    'children_count', p.children_count,
    'canvas_format', p.canvas_format,
    'template_theme', p.template_theme,
    'hero_image_url', p.hero_image_url,
    'flights', COALESCE(p.flights, '[]'::jsonb),
    'hotels', COALESCE(p.hotels, '[]'::jsonb),
    'itinerary', COALESCE(p.itinerary, '[]'::jsonb),
    'transfers', COALESCE(p.transfers, '[]'::jsonb),
    'tours', COALESCE(p.tours, '[]'::jsonb),
    'pricing', COALESCE(p.pricing, '{}'::jsonb),
    'includes', to_jsonb(COALESCE(p.includes, ARRAY[]::TEXT[])),
    'excludes', to_jsonb(COALESCE(p.excludes, ARRAY[]::TEXT[])),
    'options', COALESCE(p.options, '[]'::jsonb),
    'valid_until', p.valid_until
  );
$$;

CREATE OR REPLACE FUNCTION public.travel_proposal_snapshot_hash(p_payload JSONB)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(digest(convert_to(COALESCE(p_payload, '{}'::jsonb)::text, 'UTF8'), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.set_travel_proposal_snapshot_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_snapshot_hash TEXT;
BEGIN
  v_snapshot_hash := public.travel_proposal_snapshot_hash(public.travel_proposal_snapshot_payload(NEW));
  IF TG_OP = 'UPDATE' THEN
    IF v_snapshot_hash IS DISTINCT FROM OLD.snapshot_hash
       AND OLD.status = 'approved'
       AND NEW.status = OLD.status THEN
      NEW.status := 'draft';
      NEW.acceptance_status := 'pending';
      NEW.canonical_status := 'draft';
      NEW.approved_at := NULL;
    END IF;
  END IF;
  NEW.snapshot_hash := v_snapshot_hash;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_travel_proposal_snapshot_hash ON public.travel_proposals;
CREATE TRIGGER trg_travel_proposal_snapshot_hash
BEFORE INSERT OR UPDATE ON public.travel_proposals
FOR EACH ROW EXECUTE FUNCTION public.set_travel_proposal_snapshot_hash();

CREATE OR REPLACE FUNCTION public.supersede_stale_travel_proposal_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.snapshot_hash IS DISTINCT FROM OLD.snapshot_hash THEN
    UPDATE public.travel_proposal_acceptances
       SET status = 'superseded'
     WHERE store_id = NEW.store_id
       AND proposal_id = NEW.id
       AND status = 'accepted'
       AND proposal_snapshot_hash IS DISTINCT FROM NEW.snapshot_hash;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supersede_stale_travel_proposal_acceptance ON public.travel_proposals;
CREATE TRIGGER trg_supersede_stale_travel_proposal_acceptance
AFTER UPDATE ON public.travel_proposals
FOR EACH ROW EXECUTE FUNCTION public.supersede_stale_travel_proposal_acceptance();

-- Recompute fingerprints from persisted server-side fields, replacing any value
-- previously supplied by an application client.
UPDATE public.travel_proposals SET snapshot_hash = snapshot_hash;

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

  IF p_payment_preference IS NULL OR p_payment_preference NOT IN ('pix', 'cartao_operadora', 'financiamento_bancario', 'faturado_agencia') THEN
    RAISE EXCEPTION 'A preferência de pagamento informada não é válida.';
  END IF;
  v_is_installment_preference := p_payment_preference IN ('cartao_operadora', 'financiamento_bancario');
  IF v_is_installment_preference AND (p_payment_installments IS NULL OR p_payment_installments NOT BETWEEN 1 AND 12) THEN
    RAISE EXCEPTION 'Informe uma quantidade válida de parcelas.';
  END IF;
  IF NOT v_is_installment_preference AND p_payment_installments IS NOT NULL THEN
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
         canonical_status = 'accepted',
         approved_at = COALESCE(approved_at, now()),
         updated_at = now()
   WHERE id = v_proposal.id
     AND store_id = v_proposal.store_id;

  INSERT INTO public.travel_timeline_events (
    store_id, proposal_id, budget_id, event_type, correlation_id, payload
  ) VALUES (
    v_proposal.store_id,
    v_proposal.id,
    v_proposal.budget_id,
    'proposal.accepted',
    p_idempotency_key,
    jsonb_build_object(
      'acceptance_id', v_acceptance.id,
      'snapshot_hash', p_snapshot_hash,
      'selected_option_id', p_selected_option_id,
      'terms_version', btrim(p_terms_version)
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'replayed', FALSE,
    'acceptance_id', v_acceptance.id,
    'proposal_id', v_proposal.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_unaccepted_travel_proposal(
  p_proposal_id UUID,
  p_store_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_proposal public.travel_proposals%ROWTYPE;
  v_deleted_count INTEGER;
BEGIN
  SELECT * INTO v_proposal
    FROM public.travel_proposals
   WHERE id = p_proposal_id
     AND store_id = p_store_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta não encontrada para a loja autenticada.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.travel_proposal_acceptances
     WHERE store_id = v_proposal.store_id
       AND proposal_id = v_proposal.id
  ) THEN
    RAISE EXCEPTION 'Propostas com qualquer histórico de aceite não podem ser apagadas; preserve a evidência e arquive/revise o registro.';
  END IF;

  DELETE FROM public.quotes
   WHERE store_id = v_proposal.store_id
     AND id = v_proposal.id;
  DELETE FROM public.travel_proposals
   WHERE store_id = v_proposal.store_id
     AND id = v_proposal.id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count <> 1 THEN
    RAISE EXCEPTION 'A proposta não foi excluída; nenhuma alteração parcial foi mantida.';
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'proposal_id', v_proposal.id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_travel_proposal_acceptance(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_public_travel_proposal_acceptance(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_public_travel_proposal_acceptance(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, TEXT)
  TO service_role;
REVOKE ALL ON FUNCTION public.delete_unaccepted_travel_proposal(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_unaccepted_travel_proposal(UUID, UUID)
  TO service_role;

-- Public web pages must use the server-side allowlisted projection; never expose
-- the base table (which contains PII and internal commercial data) to anon/PUBLIC.
DROP POLICY IF EXISTS "Public travel proposal read by token" ON public.travel_proposals;
REVOKE ALL PRIVILEGES ON TABLE public.travel_proposals FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.travel_proposals TO authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.travel_proposal_acceptances FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.travel_proposal_acceptances TO authenticated;

COMMENT ON FUNCTION public.record_public_travel_proposal_acceptance(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, TEXT)
  IS 'Service-role-only atomic public acceptance; records passenger manifest and payment preference, never reservation or payment.';
