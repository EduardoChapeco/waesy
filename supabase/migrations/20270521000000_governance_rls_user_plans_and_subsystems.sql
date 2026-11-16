-- =============================================================================
-- MIGRATION: 20270521000000_governance_rls_user_plans_and_subsystems.sql
-- OBJETIVO:
-- 1. Triggers BEFORE UPDATE anti-escalacao em public.profiles e public.stores
-- 2. Governanca individual de usuario/membro (user_plan_tier, modules, approval_status)
-- 3. Catalogo SSOT public.platform_vertical_subsystems + flags globais de raiz/aprovacao
-- =============================================================================

-- ─── 1. COLUNAS DE GOVERNANCA EM PROFILES & STORES (ADITIVO / IDEMPOTENTE) ───

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  ADD COLUMN IF NOT EXISTS user_plan_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (user_plan_tier IN ('free', 'starter', 'professional', 'enterprise', 'WAESY_MAX')),
  ADD COLUMN IF NOT EXISTS enabled_modules TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS disabled_modules TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID;

UPDATE public.stores
SET approval_status = 'suspended'
WHERE is_active = false
  AND approval_status = 'approved';

ALTER TABLE public.platform_brand_settings
  ADD COLUMN IF NOT EXISTS root_experience_mode TEXT NOT NULL DEFAULT 'landing_vendas'
    CHECK (root_experience_mode IN ('landing_vendas', 'marketplace_local')),
  ADD COLUMN IF NOT EXISTS require_company_approval BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_user_approval BOOLEAN NOT NULL DEFAULT false;

-- ─── 2. TRIGGER DE PROTECAO ESTRITA EM public.profiles ────────────────────────

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role TEXT;
BEGIN
  BEGIN
    v_jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;

  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.verified_badge_url IS DISTINCT FROM OLD.verified_badge_url
       OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
       OR NEW.user_plan_tier IS DISTINCT FROM OLD.user_plan_tier
       OR NEW.enabled_modules IS DISTINCT FROM OLD.enabled_modules
       OR NEW.disabled_modules IS DISTINCT FROM OLD.disabled_modules
       OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
       OR NEW.approval_notes IS DISTINCT FROM OLD.approval_notes
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
      RAISE EXCEPTION 'Somente o Admin Master Global (via servidor autenticado) pode alterar cargos, planos, modulos ou aprovacao de conta.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- ─── 3. TRIGGER DE PROTECAO ESTRITA EM public.stores ──────────────────────────

CREATE OR REPLACE FUNCTION public.protect_store_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role TEXT;
  v_reserved_keys TEXT[] := ARRAY[
    'plan_tier',
    'subscription_tier',
    'vertical_sku',
    'active_modules',
    'enabled_modules',
    'subscription_status',
    'blocked_due_to_debt',
    'approval_status'
  ];
  v_k TEXT;
BEGIN
  BEGIN
    v_jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;

  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF NEW.is_platform_root IS DISTINCT FROM OLD.is_platform_root
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
       OR NEW.plan_tier IS DISTINCT FROM OLD.plan_tier
       OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
       OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
       OR NEW.vertical_sku IS DISTINCT FROM OLD.vertical_sku
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
       OR NEW.billing_cycle IS DISTINCT FROM OLD.billing_cycle
       OR NEW.primary_niche_id IS DISTINCT FROM OLD.primary_niche_id
       OR NEW.enabled_niches IS DISTINCT FROM OLD.enabled_niches
       OR NEW.enabled_modules IS DISTINCT FROM OLD.enabled_modules
       OR NEW.quota_overrides IS DISTINCT FROM OLD.quota_overrides
       OR NEW.brand_origin IS DISTINCT FROM OLD.brand_origin
       OR NEW.verified_badge_url IS DISTINCT FROM OLD.verified_badge_url THEN
      RAISE EXCEPTION 'Somente o Admin Master Global pode alterar plano, SKU vertical, status de aprovacao ou modulos da empresa.';
    END IF;

    FOREACH v_k IN ARRAY v_reserved_keys LOOP
      IF (COALESCE(NEW.settings, '{}'::jsonb) -> v_k) IS DISTINCT FROM (COALESCE(OLD.settings, '{}'::jsonb) -> v_k) THEN
        RAISE EXCEPTION 'Chave reservada de governanca (%) nao pode ser alterada diretamente pelo cliente.', v_k;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_store_sensitive_columns ON public.stores;
CREATE TRIGGER trg_protect_store_sensitive_columns
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_store_sensitive_columns();

-- ─── 4. TABELA SSOT DE SUBSISTEMAS VERTICAIS & DOMINIOS ──────────────────────

CREATE TABLE IF NOT EXISTS public.platform_vertical_subsystems (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sales_hub', 'public_app', 'vertical_workspace', 'saas_brand', 'admin')),
  subdomain TEXT NOT NULL,
  canonical_domain TEXT NOT NULL,
  target_path TEXT NOT NULL,
  description TEXT NOT NULL,
  modules_included TEXT[] NOT NULL DEFAULT '{}'::text[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_in_hub BOOLEAN NOT NULL DEFAULT true,
  show_on_landing BOOLEAN NOT NULL DEFAULT true,
  is_standalone_app BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_vertical_subsystems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_vertical_subsystems FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_vertical_subsystems_public_read" ON public.platform_vertical_subsystems;
CREATE POLICY "platform_vertical_subsystems_public_read"
  ON public.platform_vertical_subsystems
  FOR SELECT
  USING (is_active = true OR public.is_platform_admin());

DROP POLICY IF EXISTS "platform_vertical_subsystems_admin_all" ON public.platform_vertical_subsystems;
CREATE POLICY "platform_vertical_subsystems_admin_all"
  ON public.platform_vertical_subsystems
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

INSERT INTO public.platform_vertical_subsystems (
  id, name, short_name, category, subdomain, canonical_domain, target_path, description, modules_included, is_active, show_in_hub, show_on_landing, is_standalone_app, sort_order
) VALUES
  ('waesy', 'Waesy Hub & Institucional', 'Waesy Hub', 'sales_hub', '@', 'waesy.com.br', '/', 'Portal principal comercial da plataforma Waesy, vitrine institucional e Hub central dos aplicativos.', ARRAY['landing', 'hub', 'marketplace_preview'], true, true, false, false, 10),
  ('pro', 'Waesy Pro All-in-One', 'Waesy Pro', 'vertical_workspace', 'pro', 'pro.waesy.com.br', '/painel', 'Suite completa ERP + CRM + PDV + Estoque + RH + Financeiro + IA em um workspace unificado.', ARRAY['catalog', 'orders', 'pdv', 'crm', 'financial', 'hr', 'contracts', 'copilot'], true, true, true, true, 20),
  ('marketplace', 'Waesy Marketplace', 'Marketplace', 'public_app', 'marketplace', 'marketplace.waesy.com.br', '/marketplace', 'App de vitrines comerciais locais com checkout integrado, entrega e empresas verificadas.', ARRAY['marketplace', 'cart', 'checkout', 'offers'], true, true, true, true, 30),
  ('classificados', 'Waesy Classificados', 'Classificados', 'public_app', 'classificados', 'classificados.waesy.com.br', '/classificados', 'App completo de compra, venda, imoveis, veiculos, locacoes e servicos regionais.', ARRAY['classifieds', 'classifieds_publish', 'classifieds_boost'], true, true, true, true, 40),
  ('noticias', 'Waesy Noticias', 'Noticias', 'public_app', 'noticias', 'noticias.waesy.com.br', '/noticias', 'Portal editorial de jornalismo regional, consorcio de imprensa e cobertura por cidade.', ARRAY['news', 'press_consortium'], true, true, true, true, 50),
  ('go', 'Waesy Go Mobilidade', 'Waesy Go', 'public_app', 'go', 'go.waesy.com.br', '/mobilidade', 'App de corridas urbanas, entregas rapidas e fretes a taxa fixa sem comissao abusiva.', ARRAY['mobility', 'courier', 'freight'], true, true, true, true, 60),
  ('talk', 'Waesy Talk (Chat & CRM)', 'Talk CRM', 'vertical_workspace', 'talk', 'talk.waesy.com.br', '/workspace/atendimento/chat', 'App dedicado de atendimento omnichannel WhatsApp, filas, CRM 360 e audio PTT com IA.', ARRAY['module_omnichannel_whatsapp', 'crm', 'voice_ptt'], true, true, true, true, 70),
  ('copilot', 'Waesy Copilot IA', 'Copilot', 'public_app', 'copilot', 'copilot.waesy.com.br', '/copilot', 'Agente autonomo com subagentes paralelos, navegador interativo, sandbox e artefatos vivos.', ARRAY['copilot', 'mcp', 'browser_agent', 'sandbox'], true, true, true, true, 80),
  ('places', 'Waesy Places & Diretorio', 'Places', 'public_app', 'places', 'places.waesy.com.br', '/diretorio', 'Guia oficial de estabelecimentos verificados com CNPJ, horarios e avaliacoes reais.', ARRAY['directory', 'places'], true, true, true, true, 90),
  ('studio', 'Waesy Studio Criativo', 'Studio', 'vertical_workspace', 'studio', 'studio.waesy.com.br', '/workspace/estudio', 'Estudio visual de pecas, carrosseis, cardapios, midia e identidade comercial.', ARRAY['studio', 'builder'], true, true, true, true, 100),
  ('turis', 'Turis — Sistema para Agencias', 'Turis', 'saas_brand', 'turis', 'turis.waesy.com.br', '/painel', 'Vertical especializada para agencias de viagens, roteiros, embarcacoes, poltronas 2D e vouchers.', ARRAY['module_tourism_studio', 'quotes', 'proposals', 'boarding', 'fleet'], true, true, true, true, 110),
  ('tableway', 'TableWay — Gastronomia & KDS', 'TableWay', 'saas_brand', 'tableway', 'tableway.waesy.com.br', '/painel', 'Sistema para restaurantes e delivery com PDV touch, comandas, KDS de cozinha e mesas.', ARRAY['module_food_delivery', 'kds', 'tables', 'pdv'], true, true, true, true, 120),
  ('wowbook', 'WowBook — Agenda & Clinicas', 'WowBook', 'saas_brand', 'wowbook', 'wowbook.waesy.com.br', '/painel', 'Vertical de agendamentos, escalas, comissoes Salao-Parceiro e fichas para clinicas e saloes.', ARRAY['agenda_services', 'reservations', 'crm'], true, true, true, true, 130),
  ('passhub', 'PassHub — Eventos & Bilheteria', 'PassHub', 'saas_brand', 'passhub', 'passhub.waesy.com.br', '/painel', 'Gestao completa de eventos, lotes de ingressos, QR Code de portaria e promoters.', ARRAY['events', 'tickets', 'affiliates'], true, true, true, true, 140),
  ('lexcloud', 'LexCloud — Juridico JUS', 'LexCloud', 'saas_brand', 'lexcloud', 'lexcloud.waesy.com.br', '/painel', 'Gestao para escritorios de advocacia, prazos processuais, DataJud e contratos.', ARRAY['legal', 'contracts', 'crm'], true, true, true, true, 150),
  ('talentlink', 'TalentLink — Vagas & RH', 'TalentLink', 'saas_brand', 'talentlink', 'talentlink.waesy.com.br', '/painel', 'Portal e ATS de vagas, recrutamento, candidatos, ponto digital e folha.', ARRAY['jobs', 'hr', 'payroll'], true, true, true, true, 160),
  ('signflow', 'SignFlow — Contratos & Assinaturas', 'SignFlow', 'saas_brand', 'signflow', 'signflow.waesy.com.br', '/painel', 'Emissao de minutas dinamicas, assinatura eletronica verificada e dossie criptografico.', ARRAY['contracts', 'kyc'], true, true, true, true, 170),
  ('admin', 'Admin Master Global', 'Admin Master', 'admin', 'admin', 'admin.waesy.com.br', '/admin-master', 'Console soberano de controle global sobre modulos, planos, usuarios, empresas e dominios.', ARRAY['platform_admin'], true, false, false, true, 999)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
