-- Migration: 20270105000000_master_360_telemetry_and_governance.sql
-- Propósito: Camada Unificada de Persistência, Telemetria 360º & Governança Forense Multi-Tenant
-- Requisito R1: Plataforma de Auditoria Forense, Conciliação Transacional e Dossiê 360º
-- 
-- Entidades Criadas:
-- 1. user_form_submissions_log: Auditoria de formulários civis/comerciais (propostas, orçamentos, candidaturas, suporte, cadastros)
-- 2. user_cart_telemetry: Event-stream segundo a segundo de engajamento no carrinho (adições, remoções, abandono e checkout)
-- 3. employee_tenant_audit_logs: Trilha forense de ações corporativas vinculadas compulsóriamente ao CPF físico do operador
-- 4. customer_store_affinity: Matriz agregada de retenção e LTV entre consumidor e loja parceira (lead, visitante, comprador, fã, VIP)
--
-- Governança de Acesso:
-- - RLS Deny-by-Default com isolamento estrito
-- - Acesso total para Master Admins via public.is_platform_admin()
-- - Acesso contextual para o próprio usuário via (SELECT auth.uid())
-- - Acesso contextual para lojistas via public.auth_user_store_ids()

-- ============================================================================
-- 1. TABELA: user_form_submissions_log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_form_submissions_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  store_id            UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  form_type           TEXT NOT NULL CHECK (
                        form_type IN ('proposal', 'quote', 'job_application', 'support_ticket', 'user_registration', 'classified_lead', 'contact', 'other', 'custom')
                      ),
  form_name           TEXT NOT NULL,
  route               TEXT NOT NULL,
  route_path          TEXT,
  sanitized_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address          TEXT,
  is_vpn              BOOLEAN NOT NULL DEFAULT false,
  vpn_provider        TEXT,
  user_agent          TEXT,
  device_fingerprint  TEXT,
  geo_city            TEXT,
  geo_state           TEXT,
  geo_country         TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comentários Semânticos
COMMENT ON TABLE public.user_form_submissions_log IS 'Log forense imutável de formulários submetidos por usuários e visitantes no ecossistema Waesy';
COMMENT ON COLUMN public.user_form_submissions_log.sanitized_payload IS 'Dados preenchidos higienizados sem senhas, tokens ou dados sensíveis';
COMMENT ON COLUMN public.user_form_submissions_log.is_vpn IS 'Indicador de detecção de IP originado em VPN, proxy ou datacenter anônimo';

-- Índices B-Tree de Alta Performance
CREATE INDEX IF NOT EXISTS idx_user_form_subs_user_id ON public.user_form_submissions_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_form_subs_profile_id ON public.user_form_submissions_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_form_subs_store_id ON public.user_form_submissions_log(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_form_subs_form_type ON public.user_form_submissions_log(form_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_form_subs_created_at ON public.user_form_submissions_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_form_subs_ip ON public.user_form_submissions_log(ip_address);

-- Trigger de Sincronização de Alias de Rota (route <-> route_path)
CREATE OR REPLACE FUNCTION public.sync_form_submissions_route_aliases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.route IS NULL AND NEW.route_path IS NOT NULL THEN
    NEW.route := NEW.route_path;
  ELSIF NEW.route_path IS NULL AND NEW.route IS NOT NULL THEN
    NEW.route_path := NEW.route;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_form_submissions_route_aliases ON public.user_form_submissions_log;
CREATE TRIGGER trg_sync_form_submissions_route_aliases
  BEFORE INSERT OR UPDATE ON public.user_form_submissions_log
  FOR EACH ROW EXECUTE FUNCTION public.sync_form_submissions_route_aliases();

-- RLS Deny-by-Default
ALTER TABLE public.user_form_submissions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admins_manage_form_submissions_log" ON public.user_form_submissions_log;
CREATE POLICY "platform_admins_manage_form_submissions_log"
  ON public.user_form_submissions_log FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "users_view_own_form_submissions_log" ON public.user_form_submissions_log;
CREATE POLICY "users_view_own_form_submissions_log"
  ON public.user_form_submissions_log FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "stores_view_own_form_submissions_log" ON public.user_form_submissions_log;
CREATE POLICY "stores_view_own_form_submissions_log"
  ON public.user_form_submissions_log FOR SELECT
  TO authenticated
  USING (store_id IS NOT NULL AND store_id = ANY (public.auth_user_store_ids()));

DROP POLICY IF EXISTS "allow_insert_form_submissions_log" ON public.user_form_submissions_log;
CREATE POLICY "allow_insert_form_submissions_log"
  ON public.user_form_submissions_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = (SELECT auth.uid()))
    AND (profile_id IS NULL OR profile_id = (SELECT auth.uid()))
  );


-- ============================================================================
-- 2. TABELA: user_cart_telemetry
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_cart_telemetry (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id             UUID REFERENCES public.carts(id) ON DELETE SET NULL,
  store_id            UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_token       TEXT,
  session_id          TEXT,
  product_id          UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id          UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  event_type          TEXT NOT NULL CHECK (
                        event_type IN (
                          'item_added', 'item_removed', 'quantity_updated', 'cart_abandoned',
                          'cart_cleared', 'checkout_started', 'cart_restored',
                          'add', 'remove', 'update_quantity', 'abandon', 'checkout_start'
                        )
                      ),
  quantity_delta      INTEGER NOT NULL DEFAULT 0,
  unit_price_cents    INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  total_cart_cents    INTEGER NOT NULL DEFAULT 0 CHECK (total_cart_cents >= 0),
  items_count         INTEGER NOT NULL DEFAULT 0 CHECK (items_count >= 0),
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address          TEXT,
  user_agent          TEXT,
  device_fingerprint  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comentários Semânticos
COMMENT ON TABLE public.user_cart_telemetry IS 'Registro cronológico granular de interações no carrinho de compras e abandonos';
COMMENT ON COLUMN public.user_cart_telemetry.event_type IS 'Tipo do evento de carrinho (item_added, item_removed, cart_abandoned, etc)';
COMMENT ON COLUMN public.user_cart_telemetry.total_cart_cents IS 'Valor consolidado do carrinho no momento do evento em centavos';

-- Índices B-Tree
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_user ON public.user_cart_telemetry(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_store ON public.user_cart_telemetry(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_cart ON public.user_cart_telemetry(cart_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_product ON public.user_cart_telemetry(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_variant ON public.user_cart_telemetry(variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_event ON public.user_cart_telemetry(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_created_at ON public.user_cart_telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_session ON public.user_cart_telemetry(session_token);

-- Trigger de Sincronização de Aliases de Carrinho (session_token <-> session_id e payload <-> metadata)
CREATE OR REPLACE FUNCTION public.sync_cart_telemetry_aliases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_token IS NULL AND NEW.session_id IS NOT NULL THEN
    NEW.session_token := NEW.session_id;
  ELSIF NEW.session_id IS NULL AND NEW.session_token IS NOT NULL THEN
    NEW.session_id := NEW.session_token;
  END IF;

  IF (NEW.payload IS NULL OR NEW.payload = '{}'::jsonb) AND (NEW.metadata IS NOT NULL AND NEW.metadata <> '{}'::jsonb) THEN
    NEW.payload := NEW.metadata;
  ELSIF (NEW.metadata IS NULL OR NEW.metadata = '{}'::jsonb) AND (NEW.payload IS NOT NULL AND NEW.payload <> '{}'::jsonb) THEN
    NEW.metadata := NEW.payload;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_cart_telemetry_aliases ON public.user_cart_telemetry;
CREATE TRIGGER trg_sync_cart_telemetry_aliases
  BEFORE INSERT OR UPDATE ON public.user_cart_telemetry
  FOR EACH ROW EXECUTE FUNCTION public.sync_cart_telemetry_aliases();

-- RLS Deny-by-Default
ALTER TABLE public.user_cart_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admins_manage_cart_telemetry" ON public.user_cart_telemetry;
CREATE POLICY "platform_admins_manage_cart_telemetry"
  ON public.user_cart_telemetry FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "users_view_own_cart_telemetry" ON public.user_cart_telemetry;
CREATE POLICY "users_view_own_cart_telemetry"
  ON public.user_cart_telemetry FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "stores_view_own_cart_telemetry" ON public.user_cart_telemetry;
CREATE POLICY "stores_view_own_cart_telemetry"
  ON public.user_cart_telemetry FOR SELECT
  TO authenticated
  USING (store_id = ANY (public.auth_user_store_ids()));

DROP POLICY IF EXISTS "allow_insert_cart_telemetry" ON public.user_cart_telemetry;
CREATE POLICY "allow_insert_cart_telemetry"
  ON public.user_cart_telemetry FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = (SELECT auth.uid())
  );


-- ============================================================================
-- 3. TABELA: employee_tenant_audit_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employee_tenant_audit_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  store_id            UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  operator_cpf        TEXT,
  operator_role       TEXT NOT NULL DEFAULT 'operator',
  module              TEXT NOT NULL,
  action              TEXT NOT NULL,
  target_entity_type  TEXT,
  target_entity_id    TEXT,
  before_payload      JSONB,
  after_payload       JSONB,
  diff_summary        TEXT,
  details             JSONB DEFAULT '{}'::jsonb,
  ip_address          TEXT,
  is_vpn              BOOLEAN NOT NULL DEFAULT false,
  user_agent          TEXT,
  device_fingerprint  TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comentários Semânticos
COMMENT ON TABLE public.employee_tenant_audit_logs IS 'Auditoria corporativa vinculando ações em painéis de lojas ao CPF físico do operador';
COMMENT ON COLUMN public.employee_tenant_audit_logs.operator_cpf IS 'CPF do funcionário/operador registrado no momento da ação para responsabilidade legal';
COMMENT ON COLUMN public.employee_tenant_audit_logs.module IS 'Módulo acessado no painel da loja (catalogo, precos, pdv, pedidos, configs)';

-- Índices B-Tree
CREATE INDEX IF NOT EXISTS idx_emp_audit_user ON public.employee_tenant_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emp_audit_profile ON public.employee_tenant_audit_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_emp_audit_store ON public.employee_tenant_audit_logs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emp_audit_module ON public.employee_tenant_audit_logs(module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emp_audit_action ON public.employee_tenant_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emp_audit_cpf ON public.employee_tenant_audit_logs(operator_cpf);
CREATE INDEX IF NOT EXISTS idx_emp_audit_created ON public.employee_tenant_audit_logs(created_at DESC);

-- Trigger de Sincronização de Alias (details <-> metadata)
CREATE OR REPLACE FUNCTION public.sync_employee_audit_details_aliases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.details IS NULL OR NEW.details = '{}'::jsonb) AND (NEW.metadata IS NOT NULL AND NEW.metadata <> '{}'::jsonb) THEN
    NEW.details := NEW.metadata;
  ELSIF (NEW.metadata IS NULL OR NEW.metadata = '{}'::jsonb) AND (NEW.details IS NOT NULL AND NEW.details <> '{}'::jsonb) THEN
    NEW.metadata := NEW.details;
  END IF;

  IF NEW.details IS NULL THEN
    NEW.details := '{}'::jsonb;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_employee_audit_details_aliases ON public.employee_tenant_audit_logs;
CREATE TRIGGER trg_sync_employee_audit_details_aliases
  BEFORE INSERT OR UPDATE ON public.employee_tenant_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_employee_audit_details_aliases();

-- RLS Deny-by-Default
ALTER TABLE public.employee_tenant_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admins_manage_employee_tenant_audit_logs" ON public.employee_tenant_audit_logs;
CREATE POLICY "platform_admins_manage_employee_tenant_audit_logs"
  ON public.employee_tenant_audit_logs FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "employees_view_own_tenant_actions" ON public.employee_tenant_audit_logs;
CREATE POLICY "employees_view_own_tenant_actions"
  ON public.employee_tenant_audit_logs FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "stores_view_own_employee_audit_logs" ON public.employee_tenant_audit_logs;
CREATE POLICY "stores_view_own_employee_audit_logs"
  ON public.employee_tenant_audit_logs FOR SELECT
  TO authenticated
  USING (store_id = ANY (public.auth_user_store_ids()));

DROP POLICY IF EXISTS "employees_insert_own_tenant_actions" ON public.employee_tenant_audit_logs;
CREATE POLICY "employees_insert_own_tenant_actions"
  ON public.employee_tenant_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND store_id = ANY (public.auth_user_store_ids())
  );


-- ============================================================================
-- 4. TABELA: customer_store_affinity
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_store_affinity (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id              UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  affinity_level        TEXT NOT NULL DEFAULT 'visitor' CHECK (
                          affinity_level IN ('lead', 'visitor', 'buyer', 'fan', 'vip')
                        ),
  total_visits          INTEGER NOT NULL DEFAULT 1 CHECK (total_visits >= 0),
  visits_count          INTEGER NOT NULL DEFAULT 1 CHECK (visits_count >= 0),
  total_cart_additions  INTEGER NOT NULL DEFAULT 0 CHECK (total_cart_additions >= 0),
  cart_additions_count  INTEGER NOT NULL DEFAULT 0 CHECK (cart_additions_count >= 0),
  total_orders_count    INTEGER NOT NULL DEFAULT 0 CHECK (total_orders_count >= 0),
  orders_count          INTEGER NOT NULL DEFAULT 0 CHECK (orders_count >= 0),
  total_revenue_cents   BIGINT NOT NULL DEFAULT 0 CHECK (total_revenue_cents >= 0),
  total_spent_cents     BIGINT NOT NULL DEFAULT 0 CHECK (total_spent_cents >= 0),
  average_ticket_cents  INTEGER NOT NULL DEFAULT 0 CHECK (average_ticket_cents >= 0),
  last_visit_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_interaction_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_cart_activity_at TIMESTAMPTZ,
  last_order_at         TIMESTAMPTZ,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_customer_store_affinity UNIQUE (customer_id, store_id)
);

-- Comentários Semânticos
COMMENT ON TABLE public.customer_store_affinity IS 'Métricas consolidadas de afinidade e LTV entre consumidor e estabelecimento';
COMMENT ON COLUMN public.customer_store_affinity.affinity_level IS 'Classificação relacional: lead, visitor, buyer, fan ou vip';
COMMENT ON COLUMN public.customer_store_affinity.total_revenue_cents IS 'Receita total gerada pelo cliente na loja em centavos';

-- Índices B-Tree
CREATE INDEX IF NOT EXISTS idx_cust_affinity_customer ON public.customer_store_affinity(customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_affinity_store ON public.customer_store_affinity(store_id);
CREATE INDEX IF NOT EXISTS idx_cust_affinity_level ON public.customer_store_affinity(store_id, affinity_level);
CREATE INDEX IF NOT EXISTS idx_cust_affinity_revenue ON public.customer_store_affinity(store_id, total_revenue_cents DESC);
CREATE INDEX IF NOT EXISTS idx_cust_affinity_last_visit ON public.customer_store_affinity(store_id, last_visit_at DESC);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS customer_store_affinity_updated_at ON public.customer_store_affinity;
CREATE TRIGGER customer_store_affinity_updated_at
  BEFORE UPDATE ON public.customer_store_affinity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger de Sincronização de Aliases Métricos (visits_count <-> total_visits, etc)
CREATE OR REPLACE FUNCTION public.sync_customer_store_affinity_aliases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.total_visits <> OLD.total_visits AND NEW.visits_count = OLD.visits_count THEN
    NEW.visits_count := NEW.total_visits;
  ELSIF NEW.visits_count <> OLD.visits_count AND NEW.total_visits = OLD.total_visits THEN
    NEW.total_visits := NEW.visits_count;
  END IF;

  IF NEW.total_cart_additions <> OLD.total_cart_additions AND NEW.cart_additions_count = OLD.cart_additions_count THEN
    NEW.cart_additions_count := NEW.total_cart_additions;
  ELSIF NEW.cart_additions_count <> OLD.cart_additions_count AND NEW.total_cart_additions = OLD.total_cart_additions THEN
    NEW.total_cart_additions := NEW.cart_additions_count;
  END IF;

  IF NEW.total_orders_count <> OLD.total_orders_count AND NEW.orders_count = OLD.orders_count THEN
    NEW.orders_count := NEW.total_orders_count;
  ELSIF NEW.orders_count <> OLD.orders_count AND NEW.total_orders_count = OLD.total_orders_count THEN
    NEW.total_orders_count := NEW.orders_count;
  END IF;

  IF NEW.total_revenue_cents <> OLD.total_revenue_cents AND NEW.total_spent_cents = OLD.total_spent_cents THEN
    NEW.total_spent_cents := NEW.total_revenue_cents;
  ELSIF NEW.total_spent_cents <> OLD.total_spent_cents AND NEW.total_revenue_cents = OLD.total_revenue_cents THEN
    NEW.total_revenue_cents := NEW.total_spent_cents;
  END IF;

  IF NEW.last_visit_at <> OLD.last_visit_at AND NEW.last_interaction_at = OLD.last_interaction_at THEN
    NEW.last_interaction_at := NEW.last_visit_at;
  ELSIF NEW.last_interaction_at <> OLD.last_interaction_at AND NEW.last_visit_at = OLD.last_visit_at THEN
    NEW.last_visit_at := NEW.last_interaction_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_store_affinity_aliases ON public.customer_store_affinity;
CREATE TRIGGER trg_sync_customer_store_affinity_aliases
  BEFORE UPDATE ON public.customer_store_affinity
  FOR EACH ROW EXECUTE FUNCTION public.sync_customer_store_affinity_aliases();

-- RLS Deny-by-Default
ALTER TABLE public.customer_store_affinity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admins_manage_customer_store_affinity" ON public.customer_store_affinity;
CREATE POLICY "platform_admins_manage_customer_store_affinity"
  ON public.customer_store_affinity FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "customers_view_own_store_affinity" ON public.customer_store_affinity;
CREATE POLICY "customers_view_own_store_affinity"
  ON public.customer_store_affinity FOR SELECT
  TO authenticated
  USING (customer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "stores_view_own_customer_affinity" ON public.customer_store_affinity;
CREATE POLICY "stores_view_own_customer_affinity"
  ON public.customer_store_affinity FOR SELECT
  TO authenticated
  USING (store_id = ANY (public.auth_user_store_ids()));

DROP POLICY IF EXISTS "stores_manage_own_customer_affinity" ON public.customer_store_affinity;
CREATE POLICY "stores_manage_own_customer_affinity"
  ON public.customer_store_affinity FOR ALL
  TO authenticated
  USING (store_id = ANY (public.auth_user_store_ids()))
  WITH CHECK (store_id = ANY (public.auth_user_store_ids()));
