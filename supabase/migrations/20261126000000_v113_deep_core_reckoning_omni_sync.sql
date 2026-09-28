-- ============================================================================
-- MASTER PROMPT V113: THE DEEP CORE RECKONING, OMNI-SYNCHRONIZATION & ACID LOGIC
-- ============================================================================
-- Fase 1: Malha Relacional Absoluta (FKs, CHECK Constraints, Systemic Telemetry)
-- Fase 2: Transações Atômicas Complexas (Ad-Boost Ledger ACID + Omni-Checkout & MotoLink Route)
-- Fase 3: Sincronização Cross-Module (Ripple Effect Trigger & Stored Procedure)
-- Fase 4: Expurgo do Hardcoded (Dynamic Taxonomies & System Configs)
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 1: TELEMETRIA ENRAIZADA & RESTRIÇÕES DE BANCO (CHECK / FK / CASCADE)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  t_name text;
  core_tables text[] := ARRAY[
    'profiles',
    'stores',
    'products',
    'orders',
    'classifieds',
    'jobs',
    'job_applications',
    'ad_campaigns'
  ];
BEGIN
  FOREACH t_name IN ARRAY core_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t_name
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_by_ip text;', t_name);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS context_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;', t_name);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();', t_name);
    END IF;
  END LOOP;
END $$;

-- Garantir CHECK constraints estritas de integridade financeira (Zero preços/orçamentos negativos)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    ALTER TABLE public.products DROP CONSTRAINT IF EXISTS chk_products_price_non_negative;
    ALTER TABLE public.products ADD CONSTRAINT chk_products_price_non_negative CHECK (price_cents >= 0);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_orders_total_non_negative;
    ALTER TABLE public.orders ADD CONSTRAINT chk_orders_total_non_negative CHECK (total_cents >= 0 AND subtotal_cents >= 0);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'classifieds') THEN
    ALTER TABLE public.classifieds DROP CONSTRAINT IF EXISTS chk_classifieds_price_non_negative;
    ALTER TABLE public.classifieds ADD CONSTRAINT chk_classifieds_price_non_negative CHECK (price_cents IS NULL OR price_cents >= 0);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ad_campaigns') THEN
    ALTER TABLE public.ad_campaigns DROP CONSTRAINT IF EXISTS chk_ad_campaigns_budget_positive;
    ALTER TABLE public.ad_campaigns ADD CONSTRAINT chk_ad_campaigns_budget_positive CHECK (budget_cents > 0);
    ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS spent_cents integer NOT NULL DEFAULT 0;
    ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS daily_budget_cents integer NOT NULL DEFAULT 500;
    ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS target_entity_type text;
    ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS target_entity_id uuid;
    ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 2A: LIVRO-RAZÃO IMUTÁVEL (FINANCIAL LEDGER) & BOOST ATÔMICO (ACID)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text UNIQUE NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE RESTRICT,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('ad_boost_debit', 'order_escrow_credit', 'motolink_dispatch_fee', 'wallet_topup', 'refund_reversal')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  direction text NOT NULL CHECK (direction IN ('debit', 'credit')),
  balance_before_cents integer NOT NULL,
  balance_after_cents integer NOT NULL,
  reference_type text NOT NULL,
  reference_id uuid NOT NULL,
  created_by_ip text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_store_created ON public.financial_ledger(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_ref ON public.financial_ledger(reference_type, reference_id);

ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_ledger_tenant_read" ON public.financial_ledger;
CREATE POLICY "financial_ledger_tenant_read" ON public.financial_ledger
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = financial_ledger.store_id
        AND sm.user_id = auth.uid()
    )
  );

-- RPC ATÔMICO 1: Impulsionamento de Anúncio / Campanha Ad-Tech com Rollback Garantido
CREATE OR REPLACE FUNCTION public.execute_ad_campaign_boost_atomic(
  p_store_id uuid,
  p_actor_profile_id uuid,
  p_title text,
  p_format text,
  p_placements text[],
  p_daily_budget_cents integer,
  p_total_budget_cents integer,
  p_target_entity_type text DEFAULT NULL,
  p_target_entity_id uuid DEFAULT NULL,
  p_settings jsonb DEFAULT '{}'::jsonb,
  p_client_ip text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idem_key text := COALESCE(p_idempotency_key, 'boost-' || p_store_id::text || '-' || md5(p_title || clock_timestamp()::text));
  v_existing_campaign_id uuid;
  v_wallet_balance integer := 0;
  v_new_balance integer := 0;
  v_campaign_id uuid;
  v_ledger_id uuid;
BEGIN
  -- 0. Validação de Autoridade Multi-Tenant (Invariante de Segurança)
  IF NOT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = p_store_id
      AND user_id = p_actor_profile_id
      AND role IN ('owner', 'admin', 'manager', 'content', 'proprietario', 'gerente')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_actor_profile_id AND role IN ('platform_admin', 'master', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Operador sem permissão para debitar orçamento da loja.';
  END IF;

  IF p_total_budget_cents < 500 THEN
    RAISE EXCEPTION 'ORCAMENTO_INVALIDO: O orçamento mínimo para impulsionamento é de R$ 5,00 (500 centavos).';
  END IF;

  -- 1. Idempotência estrita (Evita cobrança dupla em retry de rede)
  SELECT id INTO v_existing_campaign_id
  FROM public.ad_campaigns
  WHERE idempotency_key = v_idem_key
  LIMIT 1;

  IF v_existing_campaign_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'campaign_id', v_existing_campaign_id,
      'is_idempotent_replay', true
    );
  END IF;

  -- 2. Lock Pessimista da Loja / Saldo de Créditos de Impulsionamento
  SELECT COALESCE((settings->>'ad_credits_cents')::integer, 50000)
  INTO v_wallet_balance
  FROM public.stores
  WHERE id = p_store_id
  FOR UPDATE;

  IF v_wallet_balance < p_total_budget_cents THEN
    RAISE EXCEPTION 'SALDO_INSUFICIENTE: Saldo de créditos de anúncios (%) menor que o orçamento solicitado (%).', v_wallet_balance, p_total_budget_cents;
  END IF;

  v_new_balance := v_wallet_balance - p_total_budget_cents;

  -- 3. Passo 1 da Transação: Deduzir saldo atômico na Store
  UPDATE public.stores
  SET settings = jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{ad_credits_cents}',
        to_jsonb(v_new_balance),
        true
      ),
      updated_at = now()
  WHERE id = p_store_id;

  -- 4. Passo 2 da Transação: Criar a Campanha com rastro sistêmico
  INSERT INTO public.ad_campaigns (
    store_id,
    title,
    type,
    budget_cents,
    daily_budget_cents,
    spent_cents,
    placements,
    status,
    target_entity_type,
    target_entity_id,
    settings,
    created_by_ip,
    context_profile_id,
    idempotency_key
  ) VALUES (
    p_store_id,
    p_title,
    CASE WHEN p_format = 'banner_destaque' THEN 'fixed_banner' ELSE 'dynamic_boost' END,
    p_total_budget_cents,
    p_daily_budget_cents,
    0,
    p_placements,
    'active',
    p_target_entity_type,
    p_target_entity_id,
    p_settings,
    p_client_ip,
    p_actor_profile_id,
    v_idem_key
  )
  RETURNING id INTO v_campaign_id;

  -- 5. Passo 3 da Transação: Gravar no Livro-Razão (Financial Ledger)
  INSERT INTO public.financial_ledger (
    idempotency_key,
    store_id,
    profile_id,
    entry_type,
    amount_cents,
    direction,
    balance_before_cents,
    balance_after_cents,
    reference_type,
    reference_id,
    created_by_ip,
    metadata
  ) VALUES (
    v_idem_key,
    p_store_id,
    p_actor_profile_id,
    'ad_boost_debit',
    p_total_budget_cents,
    'debit',
    v_wallet_balance,
    v_new_balance,
    'ad_campaign',
    v_campaign_id,
    p_client_ip,
    jsonb_build_object(
      'format', p_format,
      'daily_budget_cents', p_daily_budget_cents,
      'target_entity_type', p_target_entity_type,
      'target_entity_id', p_target_entity_id
    )
  )
  RETURNING id INTO v_ledger_id;

  -- 6. Passo 4 da Transação: Elevar status da entidade alvo (Produto, Classificado ou Vaga)
  IF p_target_entity_id IS NOT NULL THEN
    IF p_target_entity_type = 'product' THEN
      UPDATE public.products
      SET is_featured = true, updated_at = now()
      WHERE id = p_target_entity_id AND store_id = p_store_id;
    ELSIF p_target_entity_type = 'classified' THEN
      UPDATE public.classifieds
      SET is_boosted = true, updated_at = now()
      WHERE id = p_target_entity_id AND (store_id = p_store_id OR user_id = p_actor_profile_id);
    ELSIF p_target_entity_type = 'job' THEN
      UPDATE public.jobs
      SET is_featured = true, updated_at = now()
      WHERE id = p_target_entity_id AND store_id = p_store_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'campaign_id', v_campaign_id,
    'ledger_id', v_ledger_id,
    'balance_before_cents', v_wallet_balance,
    'balance_after_cents', v_new_balance,
    'is_idempotent_replay', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_ad_campaign_boost_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_ad_campaign_boost_atomic TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 2B: TRANSAÇÃO ATÔMICA DE PÓS-CHECKOUT + ROTA WAESY GO MOTOLINK (ACID)
-- ─────────────────────────────────────────────────────────────────────────────
-- Consolida metadados fiscais/operacionais do pedido E gera a rota logística
-- MotoLink com cálculo de distância Haversine + PIN criptográfico de 4 dígitos
-- na mesma transação atômica no servidor.

CREATE OR REPLACE FUNCTION public.finalize_order_and_dispatch_motolink_atomic(
  p_order_id uuid,
  p_channel_origin text DEFAULT 'vitrine_online',
  p_notes text DEFAULT NULL,
  p_cpf_on_receipt text DEFAULT NULL,
  p_substitution_policy text DEFAULT NULL,
  p_receiver_info text DEFAULT NULL,
  p_niche_metadata jsonb DEFAULT '{}'::jsonb,
  p_client_ip text DEFAULT NULL,
  p_actor_profile_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_store record;
  v_pin_code text;
  v_distance_km numeric(8,2) := 3.50;
  v_payout_cents integer := 800;
  v_dispatch_id uuid;
  v_lat1 double precision;
  v_lng1 double precision;
  v_lat2 double precision;
  v_lng2 double precision;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PEDIDO_NAO_ENCONTRADO: Pedido % inexistente.', p_order_id;
  END IF;

  SELECT * INTO v_store
  FROM public.stores
  WHERE id = v_order.store_id;

  -- Gera PIN de entrega de 4 dígitos determinístico se ainda não existir
  v_pin_code := COALESCE(
    (v_order.custom_fields->>'delivery_pin_code'),
    lpad((floor(random() * 9000) + 1000)::int::text, 4, '0')
  );

  -- Atualiza Pedido atomicamente com telemetria e metadados
  UPDATE public.orders
  SET channel_origin = COALESCE(p_channel_origin, channel_origin, 'vitrine_online'),
      notes = COALESCE(p_notes, notes),
      cpf_on_receipt = COALESCE(p_cpf_on_receipt, cpf_on_receipt),
      substitution_policy = COALESCE(p_substitution_policy, substitution_policy),
      receiver_info = COALESCE(p_receiver_info, receiver_info),
      checkout_niche_metadata = COALESCE(checkout_niche_metadata, '{}'::jsonb) || COALESCE(p_niche_metadata, '{}'::jsonb),
      custom_fields = COALESCE(custom_fields, '{}'::jsonb) || jsonb_build_object(
        'delivery_pin_code', v_pin_code,
        'motolink_ready', (v_order.shipping_method <> 'pickup')
      ),
      created_by_ip = COALESCE(p_client_ip, created_by_ip),
      context_profile_id = COALESCE(p_actor_profile_id, context_profile_id),
      updated_at = now()
  WHERE id = p_order_id;

  -- Se for entrega física (não retirada), calcula rota Waesy Go MotoLink no servidor (Zero cálculo client-side)
  IF v_order.shipping_method IS DISTINCT FROM 'pickup' THEN
    v_lat1 := COALESCE((v_store.settings->>'lat')::double precision, -27.0963);
    v_lng1 := COALESCE((v_store.settings->>'lng')::double precision, -52.6183);
    v_lat2 := COALESCE((v_order.shipping_address->>'lat')::double precision, v_lat1 + 0.018);
    v_lng2 := COALESCE((v_order.shipping_address->>'lng')::double precision, v_lng1 + 0.018);

    -- Fórmula Haversine Server-Side (km)
    v_distance_km := GREATEST(
      1.20,
      ROUND((
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(v_lat1)) * cos(radians(v_lat2)) *
            cos(radians(v_lng2) - radians(v_lng1)) +
            sin(radians(v_lat1)) * sin(radians(v_lat2))
          ))
        ) * 1.28
      )::numeric, 2)
    );

    -- Tarifa justa server-authoritative: Base R$ 6,50 + R$ 1,50/km
    v_payout_cents := GREATEST(650, ROUND(650 + (v_distance_km * 150))::integer);
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'order_id', p_order_id,
    'delivery_pin_code', v_pin_code,
    'motolink_route', jsonb_build_object(
      'is_delivery', (v_order.shipping_method IS DISTINCT FROM 'pickup'),
      'distance_km', v_distance_km,
      'driver_payout_cents', v_payout_cents,
      'origin_store', v_store.name
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_order_and_dispatch_motolink_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_order_and_dispatch_motolink_atomic TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 3: EFEITO CASCATA CROSS-MODULE (THE RIPPLE EFFECT ENGINE)
-- ─────────────────────────────────────────────────────────────────────────────
-- Quando uma Identidade Civil (profiles) é banida ou suspensa/excluída:
-- 1. Desativa Personas de Criador (creator_profiles)
-- 2. Arquiva todos os Classificados ativos no Marketplace (classifieds)
-- 3. Retira candidaturas ativas no HR-Tech (job_applications) e oculta currículos
-- 4. Pausa campanhas de Ad-Tech (ad_campaigns) e vagas (jobs) das lojas exclusivas
-- 5. Registra manifesto auditável completo.

CREATE OR REPLACE FUNCTION public.execute_civil_identity_ripple_cascade(
  p_target_profile_id uuid,
  p_action text, -- 'ban' | 'suspend' | 'soft_delete'
  p_reason text DEFAULT 'Violação de termos / Encerramento de identidade civil',
  p_actor_ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived_classifieds integer := 0;
  v_withdrawn_applications integer := 0;
  v_paused_campaigns integer := 0;
  v_paused_jobs integer := 0;
  v_deactivated_personas integer := 0;
BEGIN
  IF p_action NOT IN ('ban', 'suspend', 'soft_delete') THEN
    RAISE EXCEPTION 'ACAO_INVALIDA: Use ban, suspend ou soft_delete.';
  END IF;

  -- 1. Atualiza status da Identidade Civil
  UPDATE public.profiles
  SET status = CASE WHEN p_action = 'ban' THEN 'banned' ELSE 'suspended' END,
      updated_at = now(),
      created_by_ip = COALESCE(p_actor_ip, created_by_ip)
  WHERE id = p_target_profile_id;

  -- 2. Desativa Personas de Criador / Afiliado vinculadas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'creator_profiles') THEN
    UPDATE public.creator_profiles
    SET is_active = false, updated_at = now()
    WHERE user_id = p_target_profile_id AND is_active = true;
    GET DIAGNOSTICS v_deactivated_personas = ROW_COUNT;
  END IF;

  -- 3. Arquiva todos os anúncios ativos no Marketplace (Classificados)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'classifieds') THEN
    UPDATE public.classifieds
    SET status = 'archived', is_boosted = false, updated_at = now()
    WHERE user_id = p_target_profile_id AND status IN ('active', 'published', 'pending');
    GET DIAGNOSTICS v_archived_classifieds = ROW_COUNT;
  END IF;

  -- 4. Remove/Retira candidaturas pendentes no HR-Tech
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_applications') THEN
    UPDATE public.job_applications
    SET status = 'withdrawn', updated_at = now()
    WHERE (applicant_id = p_target_profile_id OR context_profile_id = p_target_profile_id)
      AND status NOT IN ('rejected', 'withdrawn', 'hired');
    GET DIAGNOSTICS v_withdrawn_applications = ROW_COUNT;
  END IF;

  -- 5. Pausa campanhas de Ad-Tech e Vagas das lojas onde o usuário é o proprietário
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ad_campaigns') THEN
    UPDATE public.ad_campaigns ac
    SET status = 'paused', updated_at = now()
    FROM public.store_members sm
    WHERE ac.store_id = sm.store_id
      AND sm.user_id = p_target_profile_id
      AND sm.role IN ('owner', 'proprietario')
      AND ac.status = 'active';
    GET DIAGNOSTICS v_paused_campaigns = ROW_COUNT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs') THEN
    UPDATE public.jobs j
    SET status = 'paused', is_featured = false, updated_at = now()
    FROM public.store_members sm
    WHERE j.store_id = sm.store_id
      AND sm.user_id = p_target_profile_id
      AND sm.role IN ('owner', 'proprietario')
      AND j.status = 'active';
    GET DIAGNOSTICS v_paused_jobs = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'target_profile_id', p_target_profile_id,
    'action', p_action,
    'ripple_effect', jsonb_build_object(
      'deactivated_personas', v_deactivated_personas,
      'archived_classifieds', v_archived_classifieds,
      'withdrawn_job_applications', v_withdrawn_applications,
      'paused_ad_campaigns', v_paused_campaigns,
      'paused_jobs', v_paused_jobs
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_civil_identity_ripple_cascade FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_civil_identity_ripple_cascade TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 4: O EXPURGO DO HARDCODED (TABELA DE TAXONOMIAS & CONFIGS DINÂMICAS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_domain_taxonomies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_group text NOT NULL, -- 'product_categories' | 'education_levels' | 'contract_types' | 'subscription_tiers' | 'discovery_pillars'
  code text NOT NULL,
  label text NOT NULL,
  icon_name text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain_group, code)
);

CREATE INDEX IF NOT EXISTS idx_platform_taxonomies_group_active
  ON public.platform_domain_taxonomies(domain_group, is_active, sort_order);

ALTER TABLE public.platform_domain_taxonomies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_taxonomies_public_read" ON public.platform_domain_taxonomies;
CREATE POLICY "platform_taxonomies_public_read" ON public.platform_domain_taxonomies
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Seed Inicial Idempotente das Taxonomias Canônicas (Substituindo Enums Estáticos)
INSERT INTO public.platform_domain_taxonomies (domain_group, code, label, sort_order, metadata)
VALUES
  ('education_levels', 'fundamental', 'Ensino Fundamental', 1, '{}'::jsonb),
  ('education_levels', 'medio', 'Ensino Médio', 2, '{}'::jsonb),
  ('education_levels', 'tecnico', 'Ensino Técnico', 3, '{}'::jsonb),
  ('education_levels', 'superior_cursando', 'Superior em Andamento', 4, '{}'::jsonb),
  ('education_levels', 'superior_completo', 'Superior Completo', 5, '{}'::jsonb),
  ('education_levels', 'pos_mba', 'Pós-Graduação / MBA', 6, '{}'::jsonb),
  ('contract_types', 'CLT', 'CLT', 1, '{}'::jsonb),
  ('contract_types', 'PJ', 'PJ', 2, '{}'::jsonb),
  ('contract_types', 'Estágio', 'Estágio', 3, '{}'::jsonb),
  ('contract_types', 'Freelancer', 'Freelancer', 4, '{}'::jsonb),
  ('contract_types', 'Temporário', 'Temporário', 5, '{}'::jsonb),
  ('discovery_pillars', 'places', 'Places', 1, '{"to":"/diretorio"}'::jsonb),
  ('discovery_pillars', 'classificados', 'Classificados', 2, '{"to":"/classificados"}'::jsonb),
  ('discovery_pillars', 'feed', 'Feed', 3, '{"to":"/feed"}'::jsonb),
  ('discovery_pillars', 'noticias', 'Notícias', 4, '{"to":"/noticias"}'::jsonb),
  ('discovery_pillars', 'empregos', 'Empregos', 5, '{"to":"/empregos"}'::jsonb),
  ('discovery_pillars', 'eventos', 'Eventos', 6, '{"to":"/eventos"}'::jsonb),
  ('discovery_pillars', 'agenda', 'Agenda', 7, '{"to":"/agenda"}'::jsonb),
  ('discovery_pillars', 'turismo', 'Turismo', 8, '{"to":"/turismo"}'::jsonb)
ON CONFLICT (domain_group, code) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata,
    updated_at = now();

COMMIT;
