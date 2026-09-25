-- ==============================================================================
-- MIGRATION: 20260926000000_global_alignment_ssot_telemetry_contracts.sql
-- DESCRIPTION: Master Prompt V26 - Global Alignment, Sanity Check & Quality Assurance
--   1. Blindagem da reconciliação de Telemetria Comportamental ("Brain") para visitantes anônimos e leads
--   2. Sanitização defensiva da RPC de Magic Link (get_public_lead_by_token) contra inputs não-UUID
--   3. Índices de integridade para travel_contracts e contract_audit_chain
-- ==============================================================================

BEGIN;

-- 1. RECONCILIAÇÃO DEFENSIVA DA TELEMETRIA COMPORTAMENTAL ("BRAIN")
-- Permite reconciliar mesmo quando o visitante não possui auth.users (usando apenas customer_id do CRM)
CREATE OR REPLACE FUNCTION public.reconcile_behavioral_telemetry_identity(
  p_session_id TEXT,
  p_user_id UUID DEFAULT NULL,
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
  IF p_session_id IS NULL OR (p_user_id IS NULL AND p_customer_id IS NULL) THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'Parâmetros inválidos: session_id e pelo menos um entre user_id ou customer_id são obrigatórios'
    );
  END IF;

  -- Se p_user_id for nulo, tenta recuperar o profile_id associado ao customer_id no CRM
  IF p_user_id IS NULL AND p_customer_id IS NOT NULL THEN
    SELECT profile_id INTO p_user_id
    FROM public.customers_crm
    WHERE id = p_customer_id;
  END IF;

  -- Associa os eventos anônimos da sessão ao usuário autenticado se houver user_id
  IF p_user_id IS NOT NULL THEN
    UPDATE public.user_behavior_events
    SET user_id = p_user_id
    WHERE session_id = p_session_id AND user_id IS NULL;

    GET DIAGNOSTICS v_migrated_events = ROW_COUNT;
  END IF;

  -- Recalcula os nichos de maior afinidade da sessão ou do usuário
  SELECT jsonb_agg(sub) INTO v_top_niches FROM (
    SELECT niche, total_score, interaction_count
    FROM public.user_category_affinity
    WHERE (p_user_id IS NOT NULL AND user_id = p_user_id) OR session_id = p_session_id
    ORDER BY total_score DESC
    LIMIT 5
  ) sub;

  -- Se fornecido o customer_id do CRM, atualiza atomicamente o perfil comportamental do cliente
  IF p_customer_id IS NOT NULL THEN
    UPDATE public.customers_crm
    SET
      behavioral_profile = jsonb_build_object(
        'top_niches', COALESCE(v_top_niches, '[]'::jsonb),
        'migrated_session_events', v_migrated_events,
        'last_reconciled_at', now()
      ),
      last_commercial_touch_at = now()
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

-- 2. RPC PÚBLICA DEFENSIVA PARA MAGIC LINK (/m/lead/:id)
-- Suporta passagem de UUID em texto seguro sem quebrar o PostgreSQL com syntax error
CREATE OR REPLACE FUNCTION public.get_public_lead_by_token(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead RECORD;
  _store RECORD;
  _token_uuid UUID;
BEGIN
  IF _token IS NULL OR _token = '' THEN
    RETURN NULL;
  END IF;

  -- Verifica se é um UUID válido antes do cast
  IF _token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    _token_uuid := _token::UUID;
    SELECT * INTO _lead
    FROM public.leads_crm
    WHERE magic_token = _token_uuid OR id = _token_uuid
    LIMIT 1;
  ELSE
    RETURN NULL;
  END IF;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT name, logo_url INTO _store
  FROM public.stores
  WHERE id = _lead.store_id;

  RETURN jsonb_build_object(
    'id', _lead.id,
    'full_name', _lead.full_name,
    'destination', _lead.destination,
    'email', _lead.email,
    'phone', _lead.phone,
    'travel_start', _lead.travel_start,
    'travel_end', _lead.travel_end,
    'pax_count', _lead.pax_count,
    'pax_adults', _lead.pax_adults,
    'pax_children', _lead.pax_children,
    'pax_infants', _lead.pax_infants,
    'pax_list', _lead.pax_list,
    'interest_type', _lead.interest_type,
    'interest_period', _lead.interest_period,
    'notes', _lead.notes,
    'lgpd_accepted', _lead.lgpd_accepted,
    'lgpd_accepted_at', _lead.lgpd_accepted_at,
    'pcd', _lead.pcd,
    'reduced_mobility', _lead.reduced_mobility,
    'autism', _lead.autism,
    'health_notes', _lead.health_notes,
    'store_name', COALESCE(_store.name, 'Agência de Viagens'),
    'store_logo', _store.logo_url
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_lead_by_token(TEXT) TO anon, authenticated;

-- 3. ÍNDICES DE DESEMPENHO E FORENSE
CREATE INDEX IF NOT EXISTS idx_travel_contracts_public_token ON public.travel_contracts(public_token);
CREATE INDEX IF NOT EXISTS idx_travel_contracts_store_status ON public.travel_contracts(store_id, status);
CREATE INDEX IF NOT EXISTS idx_contract_audit_chain_contract ON public.contract_audit_chain(contract_id, created_at DESC);

COMMIT;
