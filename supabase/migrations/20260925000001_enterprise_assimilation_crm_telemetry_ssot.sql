-- ============================================================================
-- Waesy Enterprise Assimilation — Migration 20260925000000:
-- CRM Commercial Recycling, Brain Telemetry Unification & Contract Audit Chain
-- ============================================================================

BEGIN;

-- 1. EXTENSÃO DA TABELA CANÔNICA DE CLIENTES (customers_crm)
ALTER TABLE public.customers_crm
  ADD COLUMN IF NOT EXISTS document               TEXT,
  ADD COLUMN IF NOT EXISTS phone                  TEXT,
  ADD COLUMN IF NOT EXISTS email                  TEXT,
  ADD COLUMN IF NOT EXISTS name                   TEXT,
  ADD COLUMN IF NOT EXISTS profile_id             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lifetime_lead_count    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent_cents      BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS behavioral_profile     JSONB NOT NULL DEFAULT '{"top_niches": [], "score": 0, "last_events": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS documents_metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_commercial_touch_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_customers_crm_store_doc
  ON public.customers_crm(store_id, document) WHERE document IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_crm_store_phone
  ON public.customers_crm(store_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_crm_store_email
  ON public.customers_crm(store_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_crm_profile
  ON public.customers_crm(profile_id) WHERE profile_id IS NOT NULL;

-- 2. ENRIQUECIMENTO DE LEADS COM VÍNCULO OBRIGATÓRIO AO CLIENTE (leads_crm)
ALTER TABLE public.leads_crm
  ADD COLUMN IF NOT EXISTS customer_id        UUID REFERENCES public.customers_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lifecycle_number   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tamper_seal_hash   TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_crm_customer_id
  ON public.leads_crm(customer_id) WHERE customer_id IS NOT NULL;

-- 3. ENRIQUECIMENTO DE CONTRATOS (travel_contracts & contracts)
ALTER TABLE public.travel_contracts
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers_crm(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_travel_contracts_lead
  ON public.travel_contracts(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_travel_contracts_customer
  ON public.travel_contracts(customer_id) WHERE customer_id IS NOT NULL;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers_crm(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_lead
  ON public.contracts(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_customer
  ON public.contracts(customer_id) WHERE customer_id IS NOT NULL;

-- 4. CADEIA FORENSE DE AUDITORIA CRIPTOGRÁFICA DE CONTRATOS (contract_audit_chain)
CREATE TABLE IF NOT EXISTS public.contract_audit_chain (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   UUID NOT NULL,
  store_id      UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  action        TEXT NOT NULL, -- 'CREATED', 'VIEWED', 'SIGNED', 'TAMPER_CHECK', 'REJECTED'
  actor_profile UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address    TEXT,
  user_agent    TEXT,
  payload_hash  TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_audit_chain ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_audit_chain_staff_all" ON public.contract_audit_chain;
CREATE POLICY "contract_audit_chain_staff_all"
  ON public.contract_audit_chain FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'seller', 'support')
    )
  );

-- 5. RPC ATÔMICA: DEDUPLICAÇÃO E RECICLAGEM DE CLIENTE NO CRM
CREATE OR REPLACE FUNCTION public.deduplicate_and_link_lead_to_customer(
  p_lead_id UUID,
  p_store_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_customer_id UUID;
  v_existing_lead_count INTEGER;
BEGIN
  -- 1. Carrega dados do lead
  SELECT * INTO v_lead
  FROM public.leads_crm
  WHERE id = p_lead_id AND store_id = p_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado ou não pertence a este tenant.';
  END IF;

  -- Se já tem customer_id associado, retorna imediatamente (idempotência)
  IF v_lead.customer_id IS NOT NULL THEN
    RETURN v_lead.customer_id;
  END IF;

  -- 2. Tenta encontrar cliente existente na loja por Documento (CPF/CNPJ), Telefone ou E-mail
  IF v_lead.document IS NOT NULL AND v_lead.document != '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers_crm
    WHERE store_id = p_store_id AND document = v_lead.document
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL AND v_lead.phone IS NOT NULL AND v_lead.phone != '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers_crm
    WHERE store_id = p_store_id AND phone = v_lead.phone
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL AND v_lead.email IS NOT NULL AND v_lead.email != '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers_crm
    WHERE store_id = p_store_id AND email = v_lead.email
    LIMIT 1;
  END IF;

  -- 3. Se não existe, cria um novo cliente canônico
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers_crm (
      store_id,
      kind,
      full_name,
      email,
      phone,
      document,
      channel,
      tags,
      notes,
      lifetime_lead_count,
      last_commercial_touch_at
    ) VALUES (
      p_store_id,
      'individual',
      COALESCE(v_lead.full_name, v_lead.title, 'Cliente'),
      v_lead.email,
      v_lead.phone,
      v_lead.document,
      COALESCE(v_lead.source, 'direct'),
      ARRAY['Novo Lead']::text[],
      v_lead.notes,
      1,
      now()
    ) RETURNING id INTO v_customer_id;
  ELSE
    -- Se já existe, atualiza contagem e última interação
    SELECT COUNT(*) INTO v_existing_lead_count
    FROM public.leads_crm
    WHERE customer_id = v_customer_id;

    UPDATE public.customers_crm
    SET
      lifetime_lead_count = v_existing_lead_count + 1,
      last_commercial_touch_at = now(),
      tags = array_append(tags, 'Lead Recorrente')
    WHERE id = v_customer_id;
  END IF;

  -- 4. Vincula o lead ao cliente canônico
  UPDATE public.leads_crm
  SET
    customer_id = v_customer_id,
    lifecycle_number = (SELECT lifetime_lead_count FROM public.customers_crm WHERE id = v_customer_id)
  WHERE id = p_lead_id;

  -- 5. Registra na timeline do lead
  INSERT INTO public.lead_activities (
    lead_id,
    store_id,
    author_id,
    type,
    content,
    metadata
  ) VALUES (
    p_lead_id,
    p_store_id,
    auth.uid(),
    'customer_linked',
    'Lead associado com sucesso ao perfil canônico de cliente.',
    jsonb_build_object('customer_id', v_customer_id)
  );

  RETURN v_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduplicate_and_link_lead_to_customer(UUID, UUID) TO authenticated;

-- 6. RPC ATÔMICA: MOVIMENTAÇÃO DE LEADS NO KANBAN COM SEGURANÇA TRANSACIONAL
CREATE OR REPLACE FUNCTION public.persist_lead_move(
  _lead_id UUID,
  _to_status TEXT,
  _reordered_ids UUID[],
  _store_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Verifica se o lead pertence à loja do usuário
  IF NOT EXISTS (
    SELECT 1 FROM public.leads_crm l
    WHERE l.id = _lead_id AND l.store_id = _store_id
  ) THEN
    RAISE EXCEPTION 'Não autorizado ou lead inexistente';
  END IF;

  -- 2. Atualiza o status do lead movimentado
  UPDATE public.leads_crm
  SET
    status = _to_status,
    updated_at = now(),
    last_contacted_at = now(),
    closed_at = CASE WHEN _to_status IN ('won', 'lost', 'converted') THEN now() ELSE closed_at END
  WHERE id = _lead_id AND store_id = _store_id;

  -- 3. Registra na timeline do lead
  INSERT INTO public.lead_activities (
    lead_id,
    store_id,
    author_id,
    type,
    content,
    metadata
  ) VALUES (
    _lead_id,
    _store_id,
    auth.uid(),
    'status_change',
    'Estágio alterado para: ' || _to_status,
    jsonb_build_object('new_status', _to_status)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.persist_lead_move(UUID, TEXT, UUID[], UUID) TO authenticated;

-- 7. RPC ATÔMICA: RECONCILIAÇÃO DA TELEMETRIA COMPORTAMENTAL ("BRAIN")
CREATE OR REPLACE FUNCTION public.reconcile_behavioral_telemetry_identity(
  p_session_id TEXT,
  p_user_id UUID,
  p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_migrated_events INTEGER := 0;
  v_top_niches JSONB;
BEGIN
  IF p_session_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Parâmetros inválidos');
  END IF;

  -- 1. Associa os eventos anônimos da sessão ao usuário autenticado
  UPDATE public.user_behavior_events
  SET user_id = p_user_id
  WHERE session_id = p_session_id AND user_id IS NULL;

  GET DIAGNOSTICS v_migrated_events = ROW_COUNT;

  -- 2. Recalcula os nichos de maior afinidade do usuário
  SELECT jsonb_agg(sub) INTO v_top_niches FROM (
    SELECT niche, total_score, interaction_count
    FROM public.user_category_affinity
    WHERE user_id = p_user_id OR session_id = p_session_id
    ORDER BY total_score DESC
    LIMIT 5
  ) sub;

  -- 3. Se fornecido o customer_id do CRM, atualiza o perfil comportamental da loja
  IF p_customer_id IS NOT NULL THEN
    UPDATE public.customers_crm
    SET behavioral_profile = jsonb_build_object(
      'top_niches', COALESCE(v_top_niches, '[]'::jsonb),
      'migrated_session_events', v_migrated_events,
      'last_reconciled_at', now()
    )
    WHERE id = p_customer_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'migrated_events', v_migrated_events,
    'top_niches', COALESCE(v_top_niches, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_behavioral_telemetry_identity(TEXT, UUID, UUID) TO authenticated, anon;

COMMIT;
