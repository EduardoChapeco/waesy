-- ==============================================================================
-- MIGRATION: 20260927000000_deep_synchronization_nativization_integrity.sql
-- DESCRIPTION: Master Prompt V27 - Deep Synchronization, Nativization & Architectural Integrity
--   1. Harmonização e Integridade de customers_crm (desacoplamento de auth.users rígido, default UUID, colunas canônicas)
--   2. Expansão de Telemetria Comportamental ("Brain") para Eventos, Receitas, Contratos e Ações de Engajamento
--   3. Procedimento de Interligação Inter-Módulos: Eventos & Ingressos ➔ Leads & Clientes CRM ➔ Telemetria
--   4. Blindagem de Foreign Keys e Cascades contra Dados Órfãos
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. HARMONIZAÇÃO DE customers_crm
-- ------------------------------------------------------------------------------
-- Desacopla id de auth.users(id) para permitir clientes criados a partir de leads ou importações
ALTER TABLE public.customers_crm
  DROP CONSTRAINT IF EXISTS customers_crm_id_fkey;

ALTER TABLE public.customers_crm
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Adiciona colunas canônicas ausentes
ALTER TABLE public.customers_crm
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS document TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Índices funcionais de deduplicação e busca rápida
CREATE INDEX IF NOT EXISTS idx_customers_crm_store_doc
  ON public.customers_crm(store_id, document) WHERE document IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_crm_store_phone
  ON public.customers_crm(store_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_crm_store_email
  ON public.customers_crm(store_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_crm_status
  ON public.customers_crm(store_id, status);

-- ------------------------------------------------------------------------------
-- 2. EXPANSÃO DE user_behavior_events (Brain Telemetry)
-- ------------------------------------------------------------------------------
-- Atualiza restrições CHECK para aceitar novos tipos de entidade e novos eventos
ALTER TABLE public.user_behavior_events
  DROP CONSTRAINT IF EXISTS user_behavior_events_entity_type_check,
  DROP CONSTRAINT IF EXISTS user_behavior_events_event_type_check;

ALTER TABLE public.user_behavior_events
  ADD CONSTRAINT user_behavior_events_entity_type_check
    CHECK (entity_type IN (
      'product', 'store', 'classified', 'job', 'tourism', 'directory',
      'service', 'event', 'recipe', 'contract', 'lead', 'content'
    )),
  ADD CONSTRAINT user_behavior_events_event_type_check
    CHECK (event_type IN (
      'view_item', 'search', 'click_banner', 'click_whatsapp',
      'add_to_cart', 'quote_request', 'booking_complete', 'order_complete',
      'share_item', 'view_proposal', 'sign_contract', 'ticket_purchase',
      'download_pdf', 'checkin'
    ));

-- Atualiza a stored procedure record_user_behavior_event com os novos pesos ponderados
CREATE OR REPLACE FUNCTION public.record_user_behavior_event(
  p_user_id UUID,
  p_session_id TEXT,
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_category_slug TEXT,
  p_niche TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weight INTEGER := 1;
  v_niche TEXT := COALESCE(p_niche, 'geral');
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Calibração algorítmica de pesos por ação
  CASE p_event_type
    WHEN 'view_item' THEN v_weight := 1;
    WHEN 'search' THEN v_weight := 2;
    WHEN 'click_banner' THEN v_weight := 2;
    WHEN 'share_item' THEN v_weight := 3;
    WHEN 'download_pdf' THEN v_weight := 3;
    WHEN 'click_whatsapp' THEN v_weight := 5;
    WHEN 'add_to_cart' THEN v_weight := 5;
    WHEN 'view_proposal' THEN v_weight := 5;
    WHEN 'checkin' THEN v_weight := 5;
    WHEN 'quote_request' THEN v_weight := 10;
    WHEN 'ticket_purchase' THEN v_weight := 15;
    WHEN 'booking_complete' THEN v_weight := 15;
    WHEN 'order_complete' THEN v_weight := 20;
    WHEN 'sign_contract' THEN v_weight := 25;
    ELSE v_weight := 1;
  END CASE;

  -- 1. Inserir evento atômico
  INSERT INTO public.user_behavior_events (
    user_id, session_id, event_type, entity_type, entity_id, category_slug, niche, weight_score, metadata, created_at
  ) VALUES (
    p_user_id, p_session_id, p_event_type, p_entity_type, p_entity_id, p_category_slug, v_niche, v_weight, p_metadata, v_now
  );

  -- 2. Atualizar ou criar registro de afinidade para Usuário Autenticado
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.user_category_affinity (
      user_id, niche, total_score, interaction_count, last_interacted_at
    ) VALUES (
      p_user_id, v_niche, v_weight, 1, v_now
    )
    ON CONFLICT (user_id, niche) DO UPDATE SET
      total_score = ROUND(((public.user_category_affinity.total_score * 0.95) + v_weight)::numeric, 2),
      interaction_count = public.user_category_affinity.interaction_count + 1,
      last_interacted_at = v_now;
  -- 3. Atualizar ou criar para Sessão Anônima
  ELSIF p_session_id IS NOT NULL THEN
    INSERT INTO public.user_category_affinity (
      session_id, niche, total_score, interaction_count, last_interacted_at
    ) VALUES (
      p_session_id, v_niche, v_weight, 1, v_now
    )
    ON CONFLICT (session_id, niche) DO UPDATE SET
      total_score = ROUND(((public.user_category_affinity.total_score * 0.95) + v_weight)::numeric, 2),
      interaction_count = public.user_category_affinity.interaction_count + 1,
      last_interacted_at = v_now;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'weight', v_weight,
    'niche', v_niche,
    'timestamp', v_now
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. INTERLIGAÇÃO INTER-MÓDULOS: EVENTOS & INGRESSOS ➔ CRM ➔ TELEMETRIA
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_event_interaction_to_crm(
  p_event_id UUID,
  p_store_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_interaction_type TEXT DEFAULT 'rsvp', -- 'rsvp', 'ticket_buy', 'question'
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_lead_id UUID;
  v_customer_id UUID;
  v_lead_title TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Localiza o evento
  SELECT id, title, store_id INTO v_event
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evento não encontrado');
  END IF;

  v_lead_title := COALESCE(v_event.title, 'Participação em Evento');

  -- 2. Localiza se já existe lead correspondente para este participante e evento
  SELECT id INTO v_lead_id
  FROM public.leads_crm
  WHERE store_id = p_store_id
    AND ((p_email IS NOT NULL AND email = p_email) OR (p_phone IS NOT NULL AND phone = p_phone))
    AND metadata->>'event_id' = p_event_id::text
  LIMIT 1;

  -- 3. Cria ou atualiza o lead
  IF v_lead_id IS NULL THEN
    INSERT INTO public.leads_crm (
      store_id,
      full_name,
      email,
      phone,
      title,
      status,
      acquisition_channel,
      message,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      p_store_id,
      COALESCE(p_full_name, 'Participante Anônimo'),
      COALESCE(p_email, 'anonimo@usewaesy.com'),
      p_phone,
      'Interesse: ' || v_lead_title,
      CASE WHEN p_interaction_type = 'ticket_buy' THEN 'converted' ELSE 'contacted' END,
      'events',
      'Interação no evento: ' || v_lead_title || ' (' || p_interaction_type || ')',
      jsonb_build_object(
        'event_id', p_event_id,
        'interaction_type', p_interaction_type,
        'interaction_at', v_now
      ) || p_metadata,
      v_now,
      v_now
    )
    RETURNING id INTO v_lead_id;
  ELSE
    UPDATE public.leads_crm
    SET
      status = CASE WHEN p_interaction_type = 'ticket_buy' THEN 'converted' ELSE status END,
      updated_at = v_now,
      metadata = metadata || jsonb_build_object(
        'latest_interaction', p_interaction_type,
        'latest_interaction_at', v_now
      ) || p_metadata
    WHERE id = v_lead_id;
  END IF;

  -- 4. Deduplica e vincula ao cliente canônico (customers_crm)
  v_customer_id := public.deduplicate_and_link_lead_to_customer(v_lead_id, p_store_id);

  -- 5. Dispara evento de telemetria comportamental correspondente
  PERFORM public.record_user_behavior_event(
    p_user_id,
    NULL,
    CASE WHEN p_interaction_type = 'ticket_buy' THEN 'ticket_purchase' ELSE 'booking_complete' END,
    'event',
    p_event_id,
    'eventos',
    'eventos',
    jsonb_build_object('lead_id', v_lead_id, 'customer_id', v_customer_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'customer_id', v_customer_id,
    'event_id', p_event_id
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. BLINDAGEM DE INTEGRIDADE RELACIONAL (CASCADE & ORPHAN PREVENTION)
-- ------------------------------------------------------------------------------
-- Assegura que assigned_to em leads_crm não aponte para perfis deletados
ALTER TABLE public.leads_crm
  DROP CONSTRAINT IF EXISTS leads_crm_assigned_to_fkey;

ALTER TABLE public.leads_crm
  ADD CONSTRAINT leads_crm_assigned_to_fkey
    FOREIGN KEY (assigned_to)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

COMMIT;
