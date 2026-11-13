-- =============================================================================
-- MIGRATION: 20270404000000_unified_niche_systems_vertical_plans_and_entitlements.sql
-- OBJETIVO:
-- 1. Erradicar conflito de CHECK constraint em public.stores.plan_tier (FREE_MVP/WAESY_MAX vs free/starter/professional/enterprise)
-- 2. Adicionar governança vertical standalone em public.stores (primary_niche_id, enabled_niches, vertical_sku, subscription_status, trial_ends_at, billing_cycle, quota_overrides)
-- 3. Criar catálogo oficial public.platform_vertical_plans (10 SKUs standalone e combo) com RLS estrito
-- 4. Expandir colunas reais de domínio em customers_crm, booking_appointments, service_orders e products + corrigir RLS de service_orders
-- 5. Instalar helper atômico public.check_store_vertical_quota + índice em platform_invoices
-- =============================================================================

-- ─── 1. NORMALIZAÇÃO DE CONSTRAINTS E COLUNAS VERTICAIS EM public.stores ─────

DO $$
DECLARE
  v_conname text;
BEGIN
  FOR v_conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'stores'
      AND c.contype = 'c'
      AND (
        pg_get_constraintdef(c.oid) ILIKE '%plan_tier%'
        OR pg_get_constraintdef(c.oid) ILIKE '%subscription_tier%'
        OR pg_get_constraintdef(c.oid) ILIKE '%subscription_status%'
        OR pg_get_constraintdef(c.oid) ILIKE '%billing_cycle%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;
END $$;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS primary_niche_id TEXT,
  ADD COLUMN IF NOT EXISTS enabled_niches TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vertical_sku TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS quota_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Normaliza valores legados desconhecidos antes de aplicar os CHECKs canônicos
UPDATE public.stores
SET plan_tier = 'starter'
WHERE plan_tier IS NOT NULL
  AND plan_tier NOT IN ('free', 'starter', 'professional', 'enterprise', 'FREE_MVP', 'WAESY_MAX');

UPDATE public.stores
SET subscription_tier = 'enterprise'
WHERE subscription_tier IS NOT NULL
  AND subscription_tier NOT IN ('free', 'starter', 'pro', 'professional', 'enterprise', 'vertical_standalone');

UPDATE public.stores
SET subscription_status = 'exempt'
WHERE is_platform_root = true
   OR slug IN ('waesy', 'platform-demo')
   OR slug LIKE 'excelencia-tour%';

ALTER TABLE public.stores
  ADD CONSTRAINT stores_plan_tier_check
    CHECK (plan_tier IN ('free', 'starter', 'professional', 'enterprise', 'FREE_MVP', 'WAESY_MAX')),
  ADD CONSTRAINT stores_subscription_tier_check
    CHECK (subscription_tier IN ('free', 'starter', 'pro', 'professional', 'enterprise', 'vertical_standalone')),
  ADD CONSTRAINT stores_subscription_status_check
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'cancelled', 'exempt')),
  ADD CONSTRAINT stores_billing_cycle_check
    CHECK (billing_cycle IN ('monthly', 'annual'));

CREATE INDEX IF NOT EXISTS idx_stores_vertical_billing
  ON public.stores(primary_niche_id, vertical_sku, subscription_status);

COMMENT ON COLUMN public.stores.primary_niche_id IS 'Identificador canônico SSOT do nicho principal (beauty_salon, barbershop, automotive, tourism, etc.)';
COMMENT ON COLUMN public.stores.enabled_niches IS 'Lista de nichos adicionais habilitados para lojas multi-nicho';
COMMENT ON COLUMN public.stores.vertical_sku IS 'SKU comercial contratado (ex: waesy_salon_beauty, waesy_barbershop, waesy_bundle_pro)';
COMMENT ON COLUMN public.stores.subscription_status IS 'Estado da assinatura (trialing, active, past_due, cancelled, exempt)';

-- ─── 2. CATÁLOGO OFICIAL DE PLANOS VERTICAIS STANDALONE & COMBOS ─────────────

CREATE TABLE IF NOT EXISTS public.platform_vertical_plans (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  vertical_id TEXT NOT NULL,
  niche_ids TEXT[] NOT NULL DEFAULT '{}',
  base_tier TEXT NOT NULL DEFAULT 'professional'
    CHECK (base_tier IN ('free', 'starter', 'professional', 'enterprise')),
  monthly_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (monthly_price_cents >= 0),
  annual_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (annual_price_cents >= 0),
  included_modules TEXT[] NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_standalone BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_vertical_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_vertical_plans_public_read" ON public.platform_vertical_plans;
CREATE POLICY "platform_vertical_plans_public_read"
  ON public.platform_vertical_plans
  FOR SELECT
  USING (is_active = true OR public.is_platform_admin());

DROP POLICY IF EXISTS "platform_vertical_plans_admin_write" ON public.platform_vertical_plans;
CREATE POLICY "platform_vertical_plans_admin_write"
  ON public.platform_vertical_plans
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

INSERT INTO public.platform_vertical_plans (
  sku, name, tagline, vertical_id, niche_ids, base_tier,
  monthly_price_cents, annual_price_cents, included_modules, limits, is_standalone, sort_order
) VALUES
  (
    'waesy_salon_beauty',
    'Waesy Salões & Estética',
    'Sistema completo para salões de beleza, esmalterias e clínicas de estética com agenda, comandas, fórmulas químicas e repasse Salão-Parceiro.',
    'services_specialists',
    ARRAY['beauty_salon', 'aesthetics_clinic'],
    'professional',
    11900,
    114000,
    ARRAY['agenda_services', 'crm_customers', 'staff_permissions', 'financial_ledger', 'whatsapp_inbox'],
    '{"maxTeamMembers": 12, "maxWhatsappInstances": 2, "maxCatalogItems": 300, "maxMonthlyAiCalls": 1500}'::jsonb,
    true,
    10
  ),
  (
    'waesy_barbershop',
    'Waesy Barbearia Pro',
    'Agenda por barbeiro, assinaturas de clube de corte, controle de comissões, estoque de pomadas e atendimento WhatsApp.',
    'services_specialists',
    ARRAY['barbershop'],
    'starter',
    8900,
    85400,
    ARRAY['agenda_services', 'crm_customers', 'staff_permissions', 'financial_ledger', 'whatsapp_inbox'],
    '{"maxTeamMembers": 6, "maxWhatsappInstances": 1, "maxCatalogItems": 150, "maxMonthlyAiCalls": 600}'::jsonb,
    true,
    20
  ),
  (
    'waesy_health_clinic',
    'Waesy Clínicas & Saúde',
    'Prontuário e anamnese em nuvem, retorno preventivo de pacientes, agenda multi-especialidades e lembretes automáticos.',
    'services_specialists',
    ARRAY['healthcare', 'dental', 'psychology', 'vet_petshop'],
    'professional',
    16900,
    162200,
    ARRAY['agenda_services', 'crm_customers', 'staff_permissions', 'financial_ledger', 'whatsapp_inbox', 'ai_sdr_autonomous'],
    '{"maxTeamMembers": 15, "maxWhatsappInstances": 3, "maxCatalogItems": 500, "maxMonthlyAiCalls": 2500}'::jsonb,
    true,
    30
  ),
  (
    'waesy_gastro_delivery',
    'Waesy Food & Delivery',
    'Cardápio digital QR Code, KDS de cozinha, mesas, modificadores em camadas, logística própria ou MotoLink.',
    'gastronomy',
    ARRAY['gastronomy'],
    'professional',
    12900,
    123800,
    ARRAY['storefront_cms', 'crm_customers', 'staff_permissions', 'financial_ledger', 'whatsapp_inbox', 'delivery_logistics'],
    '{"maxTeamMembers": 15, "maxWhatsappInstances": 2, "maxCatalogItems": 500, "maxMonthlyAiCalls": 1500}'::jsonb,
    true,
    40
  ),
  (
    'waesy_automotive_workshop',
    'Waesy Oficinas & Autocenters',
    'Ordens de Serviço (OS) com placa, chassi, odômetro, checklist de inspeção, orçamento peça + mão de obra e WhatsApp.',
    'automotive',
    ARRAY['automotive'],
    'professional',
    14900,
    143000,
    ARRAY['service_orders', 'crm_customers', 'staff_permissions', 'financial_ledger', 'whatsapp_inbox'],
    '{"maxTeamMembers": 12, "maxWhatsappInstances": 2, "maxCatalogItems": 1000, "maxMonthlyAiCalls": 1200}'::jsonb,
    true,
    50
  ),
  (
    'waesy_tourism_pro',
    'Waesy Turismo & Fretamento',
    'Roteiros multimídia, cotações inteligentes, rooming list, mapa de poltronas de ônibus e portal de embarque do viajante.',
    'tourism',
    ARRAY['tourism'],
    'enterprise',
    24900,
    239000,
    ARRAY['tourism_ops', 'storefront_cms', 'crm_customers', 'staff_permissions', 'financial_ledger', 'whatsapp_inbox', 'ai_sdr_autonomous'],
    '{"maxTeamMembers": 25, "maxWhatsappInstances": 4, "maxCatalogItems": 1000, "maxMonthlyAiCalls": 5000}'::jsonb,
    true,
    60
  ),
  (
    'waesy_real_estate',
    'Waesy Imobiliária & Locações',
    'Catálogo de imóveis venda/aluguel, qualificação de leads interessados, agendamento de visitas e contratos digitais.',
    'real_estate',
    ARRAY['real_estate'],
    'professional',
    15900,
    152600,
    ARRAY['storefront_cms', 'crm_customers', 'staff_permissions', 'financial_ledger', 'whatsapp_inbox'],
    '{"maxTeamMembers": 15, "maxWhatsappInstances": 2, "maxCatalogItems": 800, "maxMonthlyAiCalls": 2000}'::jsonb,
    true,
    70
  ),
  (
    'waesy_retail_commerce',
    'Waesy Varejo & Mercados',
    'Grade de tamanhos/cores ou seção de mercado/farmácia, frente de caixa PDV, controle de estoque e entregas locais.',
    'retail',
    ARRAY['retail', 'market_perishables', 'pharmacy'],
    'starter',
    9900,
    95000,
    ARRAY['storefront_cms', 'crm_customers', 'staff_permissions', 'financial_ledger', 'delivery_logistics'],
    '{"maxTeamMembers": 10, "maxWhatsappInstances": 2, "maxCatalogItems": 2000, "maxMonthlyAiCalls": 800}'::jsonb,
    true,
    80
  ),
  (
    'waesy_legal_office',
    'Waesy Escritórios & B2B',
    'Gestão de clientes corporativos, prazos, honorários, contratos e fluxos para advocacia, contabilidade e serviços.',
    'services_specialists',
    ARRAY['law_firm', 'accounting', 'services', 'education', 'events', 'organizations'],
    'professional',
    14900,
    143000,
    ARRAY['agenda_services', 'crm_customers', 'staff_permissions', 'financial_ledger', 'whatsapp_inbox', 'service_orders'],
    '{"maxTeamMembers": 12, "maxWhatsappInstances": 2, "maxCatalogItems": 500, "maxMonthlyAiCalls": 1800}'::jsonb,
    true,
    90
  ),
  (
    'waesy_bundle_pro',
    'Waesy Ecossistema Full (Todas Verticais)',
    'Acesso irrestrito a todos os sistemas verticais, múltiplos canais WhatsApp, IA SDR autônoma, NFS-e e multi-operação.',
    'retail',
    ARRAY[
      'beauty_salon', 'barbershop', 'aesthetics_clinic', 'healthcare', 'dental',
      'psychology', 'vet_petshop', 'gastronomy', 'market_perishables', 'pharmacy',
      'automotive', 'tourism', 'retail', 'real_estate', 'services', 'law_firm',
      'accounting', 'education', 'events', 'organizations'
    ],
    'enterprise',
    39900,
    383000,
    ARRAY[
      'agenda_services', 'service_orders', 'tourism_ops', 'storefront_cms',
      'crm_customers', 'staff_permissions', 'financial_ledger',
      'whatsapp_inbox', 'delivery_logistics', 'ai_sdr_autonomous', 'nfse_fiscal'
    ],
    '{"maxTeamMembers": 999, "maxWhatsappInstances": 20, "maxCatalogItems": 50000, "maxMonthlyAiCalls": 25000}'::jsonb,
    false,
    100
  )
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  vertical_id = EXCLUDED.vertical_id,
  niche_ids = EXCLUDED.niche_ids,
  base_tier = EXCLUDED.base_tier,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  included_modules = EXCLUDED.included_modules,
  limits = EXCLUDED.limits,
  is_standalone = EXCLUDED.is_standalone,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ─── 3. EXPANSÃO DE COLUNAS REAIS DE DOMÍNIO POR NICHO ──────────────────────

ALTER TABLE public.customers_crm
  ADD COLUMN IF NOT EXISTS niche_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS health_notes TEXT,
  ADD COLUMN IF NOT EXISTS preferred_professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.booking_appointments
  ADD COLUMN IF NOT EXISTS formula_notes TEXT,
  ADD COLUMN IF NOT EXISTS service_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS return_reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supplies_deducted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS niche_id TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_brand_model TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_year INTEGER,
  ADD COLUMN IF NOT EXISTS odometer_km INTEGER,
  ADD COLUMN IF NOT EXISTS chassis_vin TEXT,
  ADD COLUMN IF NOT EXISTS inspection_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assigned_technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ;

-- Corrige RLS de service_orders para cobrir donos (stores.organization_id), staff e admin master
DROP POLICY IF EXISTS "service_orders_store_members" ON public.service_orders;
CREATE POLICY "service_orders_store_members"
  ON public.service_orders
  FOR ALL
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS niche_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_service_orders_store_status
  ON public.service_orders(store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_appointments_return_reminder
  ON public.booking_appointments(store_id, return_reminder_at)
  WHERE return_reminder_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_invoices_store_status
  ON public.platform_invoices(store_id, status, due_date DESC);

-- ─── 4. HELPER ATÔMICO DE VERIFICAÇÃO DE QUOTA & ENTITLEMENTS ───────────────

CREATE OR REPLACE FUNCTION public.check_store_vertical_quota(
  p_store_id uuid,
  p_resource text,
  p_planned_increment integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store record;
  v_plan_limits jsonb;
  v_limit integer;
  v_current integer := 0;
  v_limit_key text;
BEGIN
  IF p_store_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'store_id ausente');
  END IF;

  SELECT
    id,
    slug,
    is_platform_root,
    plan_tier,
    vertical_sku,
    subscription_status,
    quota_overrides
  INTO v_store
  FROM public.stores
  WHERE id = p_store_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Loja não encontrada');
  END IF;

  IF COALESCE(v_store.is_platform_root, false)
     OR COALESCE(v_store.subscription_status, '') = 'exempt'
     OR COALESCE(v_store.slug, '') IN ('waesy', 'platform-demo')
     OR COALESCE(v_store.slug, '') LIKE 'excelencia-tour%' THEN
    RETURN jsonb_build_object('allowed', true, 'exempt', true, 'current', 0, 'limit', 999999);
  END IF;

  IF COALESCE(v_store.subscription_status, 'trialing') IN ('cancelled', 'past_due') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', format('Assinatura com status "%s". Regularize a fatura para continuar.', v_store.subscription_status)
    );
  END IF;

  v_limit_key := CASE p_resource
    WHEN 'catalog_items' THEN 'maxCatalogItems'
    WHEN 'team_members' THEN 'maxTeamMembers'
    WHEN 'whatsapp_instances' THEN 'maxWhatsappInstances'
    WHEN 'ai_calls' THEN 'maxMonthlyAiCalls'
    ELSE p_resource
  END;

  IF v_store.vertical_sku IS NOT NULL THEN
    SELECT limits INTO v_plan_limits
    FROM public.platform_vertical_plans
    WHERE sku = v_store.vertical_sku
      AND is_active = true;
  END IF;

  v_limit := NULLIF((COALESCE(v_store.quota_overrides, '{}'::jsonb) ->> v_limit_key), '')::integer;

  IF v_limit IS NULL AND v_plan_limits IS NOT NULL THEN
    v_limit := NULLIF((v_plan_limits ->> v_limit_key), '')::integer;
  END IF;

  IF v_limit IS NULL THEN
    v_limit := CASE
      WHEN v_limit_key = 'maxTeamMembers' AND v_store.plan_tier IN ('enterprise', 'WAESY_MAX') THEN 999
      WHEN v_limit_key = 'maxTeamMembers' AND v_store.plan_tier = 'professional' THEN 15
      WHEN v_limit_key = 'maxTeamMembers' AND v_store.plan_tier = 'starter' THEN 5
      WHEN v_limit_key = 'maxTeamMembers' THEN 2
      WHEN v_limit_key = 'maxWhatsappInstances' AND v_store.plan_tier IN ('enterprise', 'WAESY_MAX') THEN 20
      WHEN v_limit_key = 'maxWhatsappInstances' AND v_store.plan_tier = 'professional' THEN 3
      WHEN v_limit_key = 'maxWhatsappInstances' AND v_store.plan_tier = 'starter' THEN 1
      WHEN v_limit_key = 'maxWhatsappInstances' THEN 0
      WHEN v_limit_key = 'maxCatalogItems' AND v_store.plan_tier IN ('enterprise', 'WAESY_MAX') THEN 50000
      WHEN v_limit_key = 'maxCatalogItems' AND v_store.plan_tier = 'professional' THEN 1000
      WHEN v_limit_key = 'maxCatalogItems' AND v_store.plan_tier = 'starter' THEN 250
      WHEN v_limit_key = 'maxCatalogItems' THEN 40
      ELSE 1000
    END;
  END IF;

  IF p_resource = 'catalog_items' THEN
    SELECT COUNT(*)::integer INTO v_current FROM public.products WHERE store_id = p_store_id;
  ELSIF p_resource = 'team_members' THEN
    SELECT COUNT(*)::integer INTO v_current
    FROM public.workspace_members
    WHERE store_id = p_store_id
      AND role IN ('owner', 'admin', 'manager', 'seller', 'cashier', 'finance', 'content', 'stock', 'support');
  ELSIF p_resource = 'whatsapp_instances' THEN
    SELECT COUNT(*)::integer INTO v_current
    FROM public.whatsapp_channel_instances
    WHERE store_id = p_store_id
      AND is_active = true;
  END IF;

  RETURN jsonb_build_object(
    'allowed', (v_current + GREATEST(p_planned_increment, 0)) <= v_limit,
    'exempt', false,
    'current', v_current,
    'limit', v_limit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_store_vertical_quota(uuid, text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
