-- ==============================================================================
-- MIGRATION: 20260919_financial_immutable_ledger.sql
-- PADRÃO BANCO CENTRAL & BLOCKCHAIN-LIKE APPEND-ONLY CRYPTOGRAPHIC LEDGER
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela Imutável do Ledger Financeiro & Tokens
CREATE TABLE IF NOT EXISTS public.financial_immutable_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_number bigint GENERATED ALWAYS AS IDENTITY,
    prev_hash text NOT NULL,
    entry_hash text NOT NULL,
    transaction_type text NOT NULL,
    amount_cents bigint NOT NULL DEFAULT 0,
    token_amount bigint NOT NULL DEFAULT 0,
    sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    receiver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    reference_entity_type text,
    reference_entity_id text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role text NOT NULL DEFAULT 'authenticated_user',
    ip_address text,
    user_agent text,
    geo_country text,
    geo_city text,
    idempotency_key text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de auditoria e alta performance
CREATE INDEX IF NOT EXISTS idx_ledger_seq ON public.financial_immutable_ledger (sequence_number DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_sender ON public.financial_immutable_ledger (sender_id);
CREATE INDEX IF NOT EXISTS idx_ledger_receiver ON public.financial_immutable_ledger (receiver_id);
CREATE INDEX IF NOT EXISTS idx_ledger_store ON public.financial_immutable_ledger (store_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON public.financial_immutable_ledger (transaction_type);
CREATE INDEX IF NOT EXISTS idx_ledger_idempotency ON public.financial_immutable_ledger (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON public.financial_immutable_ledger (created_at DESC);

-- 2. Trigger Inviolável de Imutabilidade (Nenhum UPDATE ou DELETE permitido)
CREATE OR REPLACE FUNCTION public.prevent_ledger_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA MILITAR/BACEN: O Ledger Financeiro Imutável é append-only. UPDATEs e DELETEs são estritamente proibidos por lei e protocolo criptográfico.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_ledger_modification ON public.financial_immutable_ledger;
CREATE TRIGGER trg_prevent_ledger_modification
BEFORE UPDATE OR DELETE ON public.financial_immutable_ledger
FOR EACH ROW
EXECUTE FUNCTION public.prevent_ledger_modification();

-- 3. Stored Procedure Atômica para Inserção no Ledger com Hash-Chaining SHA-256
CREATE OR REPLACE FUNCTION public.record_immutable_ledger_entry(
    p_transaction_type text,
    p_amount_cents bigint DEFAULT 0,
    p_token_amount bigint DEFAULT 0,
    p_sender_id uuid DEFAULT NULL,
    p_receiver_id uuid DEFAULT NULL,
    p_store_id uuid DEFAULT NULL,
    p_organization_id uuid DEFAULT NULL,
    p_reference_entity_type text DEFAULT NULL,
    p_reference_entity_id text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_actor_id uuid DEFAULT NULL,
    p_actor_role text DEFAULT 'authenticated_user',
    p_ip_address text DEFAULT NULL,
    p_user_agent text DEFAULT NULL,
    p_geo_country text DEFAULT NULL,
    p_geo_city text DEFAULT NULL,
    p_idempotency_key text DEFAULT NULL
)
RETURNS public.financial_immutable_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_last_hash text;
    v_new_hash text;
    v_entry public.financial_immutable_ledger;
    v_payload_string text;
    v_now timestamptz := now();
BEGIN
    -- Obter o hash do último registro (ou o Genesis Hash se for a primeira transação)
    SELECT entry_hash INTO v_last_hash
    FROM public.financial_immutable_ledger
    ORDER BY sequence_number DESC
    LIMIT 1;

    IF v_last_hash IS NULL THEN
        v_last_hash := '0000000000000000000000000000000000000000000000000000000000000000'; -- Genesis Hash
    END IF;

    -- Constrói a string canônica para o hash SHA-256
    v_payload_string := v_last_hash || '|' ||
                        p_transaction_type || '|' ||
                        COALESCE(p_amount_cents::text, '0') || '|' ||
                        COALESCE(p_token_amount::text, '0') || '|' ||
                        COALESCE(p_sender_id::text, '') || '|' ||
                        COALESCE(p_receiver_id::text, '') || '|' ||
                        COALESCE(p_store_id::text, '') || '|' ||
                        COALESCE(p_reference_entity_id::text, '') || '|' ||
                        COALESCE(p_idempotency_key, '') || '|' ||
                        v_now::text;

    v_new_hash := encode(digest(v_payload_string, 'sha256'), 'hex');

    -- Inserção atômica
    INSERT INTO public.financial_immutable_ledger (
        prev_hash,
        entry_hash,
        transaction_type,
        amount_cents,
        token_amount,
        sender_id,
        receiver_id,
        store_id,
        organization_id,
        reference_entity_type,
        reference_entity_id,
        metadata,
        actor_id,
        actor_role,
        ip_address,
        user_agent,
        geo_country,
        geo_city,
        idempotency_key,
        created_at
    ) VALUES (
        v_last_hash,
        v_new_hash,
        p_transaction_type,
        COALESCE(p_amount_cents, 0),
        COALESCE(p_token_amount, 0),
        p_sender_id,
        p_receiver_id,
        p_store_id,
        p_organization_id,
        p_reference_entity_type,
        p_reference_entity_id,
        COALESCE(p_metadata, '{}'::jsonb),
        p_actor_id,
        COALESCE(p_actor_role, 'authenticated_user'),
        p_ip_address,
        p_user_agent,
        p_geo_country,
        p_geo_city,
        p_idempotency_key,
        v_now
    ) RETURNING * INTO v_entry;

    RETURN v_entry;
END;
$$;

-- 4. Função de Verificação Forense da Integridade da Cadeia (Merkle / Hash Chaining)
CREATE OR REPLACE FUNCTION public.verify_ledger_chain_integrity()
RETURNS TABLE (
    is_valid boolean,
    total_entries bigint,
    broken_at_sequence bigint,
    genesis_hash text,
    latest_hash text,
    details text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    r RECORD;
    v_expected_prev_hash text := '0000000000000000000000000000000000000000000000000000000000000000';
    v_count bigint := 0;
    v_latest text := NULL;
    v_calculated_hash text;
    v_payload_string text;
BEGIN
    FOR r IN (
        SELECT * FROM public.financial_immutable_ledger
        ORDER BY sequence_number ASC
    ) LOOP
        v_count := v_count + 1;
        v_latest := r.entry_hash;

        -- 1. Verifica se o prev_hash bate com o hash anterior
        IF r.prev_hash != v_expected_prev_hash THEN
            RETURN QUERY SELECT
                false,
                v_count,
                r.sequence_number,
                '0000000000000000000000000000000000000000000000000000000000000000'::text,
                v_latest,
                ('Cadeia Criptográfica Quebrada no Bloco #' || r.sequence_number || ': prev_hash não corresponde ao hash do bloco anterior.')::text;
            RETURN;
        END IF;

        -- 2. Recalcula o hash do bloco com base nos dados brutos
        v_payload_string := r.prev_hash || '|' ||
                            r.transaction_type || '|' ||
                            COALESCE(r.amount_cents::text, '0') || '|' ||
                            COALESCE(r.token_amount::text, '0') || '|' ||
                            COALESCE(r.sender_id::text, '') || '|' ||
                            COALESCE(r.receiver_id::text, '') || '|' ||
                            COALESCE(r.store_id::text, '') || '|' ||
                            COALESCE(r.reference_entity_id::text, '') || '|' ||
                            COALESCE(r.idempotency_key, '') || '|' ||
                            r.created_at::text;

        v_calculated_hash := encode(digest(v_payload_string, 'sha256'), 'hex');

        IF r.entry_hash != v_calculated_hash THEN
            RETURN QUERY SELECT
                false,
                v_count,
                r.sequence_number,
                '0000000000000000000000000000000000000000000000000000000000000000'::text,
                v_latest,
                ('Adulteração de Dados Detectada no Bloco #' || r.sequence_number || ': o hash registrado não corresponde ao digest dos dados da transação.')::text;
            RETURN;
        END IF;

        v_expected_prev_hash := r.entry_hash;
    END LOOP;

    -- Se chegou aqui, a cadeia está 100% íntegra
    RETURN QUERY SELECT
        true,
        v_count,
        NULL::bigint,
        '0000000000000000000000000000000000000000000000000000000000000000'::text,
        v_latest,
        'Cadeia criptográfica 100% íntegra, matematicamente verificada no padrão Banco Central / Blockchain.'::text;
END;
$$;

-- 5. RLS Zero-Trust: DENY ALL para operações de escrita via PostgREST
ALTER TABLE public.financial_immutable_ledger ENABLE ROW LEVEL SECURITY;

-- Proibição explícita para mutations clientes
DROP POLICY IF EXISTS "Deny insert from client" ON public.financial_immutable_ledger;
CREATE POLICY "Deny insert from client" ON public.financial_immutable_ledger
FOR INSERT TO authenticated, anon
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny update from client" ON public.financial_immutable_ledger;
CREATE POLICY "Deny update from client" ON public.financial_immutable_ledger
FOR UPDATE TO authenticated, anon
USING (false);

DROP POLICY IF EXISTS "Deny delete from client" ON public.financial_immutable_ledger;
CREATE POLICY "Deny delete from client" ON public.financial_immutable_ledger
FOR DELETE TO authenticated, anon
USING (false);

-- Leitura restrita: usuários só enxergam transações onde são remetente, destinatário ou admin
DROP POLICY IF EXISTS "Allow read own ledger entries" ON public.financial_immutable_ledger;
CREATE POLICY "Allow read own ledger entries" ON public.financial_immutable_ledger
FOR SELECT TO authenticated
USING (
    sender_id = auth.uid() OR
    receiver_id = auth.uid() OR
    actor_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'superadmin')
    )
);
