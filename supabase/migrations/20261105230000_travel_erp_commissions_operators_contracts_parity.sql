-- ============================================================================
-- MIGRATION: 20261105230000_travel_erp_commissions_operators_contracts_parity.sql
-- DESCRIÇÃO:
--   1. Cria tabelas relacionais para o ERP de Turismo Multi-Tenant:
--      - agency_operator_rules (Regras comerciais, retenção de over, parcelamento e canal de pagamento por operadora)
--      - agency_agent_commission_profiles (Perfis globais de comissionamento e faixas de meta por agente/consultor)
--      - agency_sales_commission_ledger (Planilha relacional in-page de vendas, faturamento bruto/líquido, over e comissões)
--      - agency_contract_cancellation_policies (Políticas configuráveis de cancelamento, faixas de multa % por antecedência e cláusulas)
--   2. Aplica RLS por Papel (Gestor/Owner configura e edita; Agente visualiza suas regras e lança vendas sem alterar parâmetros globais).
--   3. Garante paridade estrutural de colunas em travel_proposals e travel_client_trips (multimodal, quartos, ônibus, políticas).
-- ============================================================================

-- Helper seguro para verificar se o usuário autenticado é membro da loja
CREATE OR REPLACE FUNCTION public.is_agency_store_member(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.store_members sm
        WHERE sm.store_id = p_store_id AND (sm.user_id = auth.uid() OR sm.profile_id = auth.uid())
      )
    )
  );
$$;

-- Helper seguro para verificar se o usuário autenticado é Gestor/Owner da agência
CREATE OR REPLACE FUNCTION public.is_agency_store_manager(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.store_members sm
        WHERE sm.store_id = p_store_id
          AND (sm.user_id = auth.uid() OR sm.profile_id = auth.uid())
          AND LOWER(COALESCE(sm.role::text, '')) IN ('owner', 'admin', 'manager', 'gerente', 'diretor', 'master', 'gestor')
      )
    )
  );
$$;

-- ============================================================================
-- 1. TABELA: agency_operator_rules
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_operator_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  operator_name text NOT NULL,
  operator_slug text NOT NULL DEFAULT '',
  base_agency_commission_pct numeric(5,2) NOT NULL DEFAULT 0,
  over_retention_pct_when_financed numeric(5,2) NOT NULL DEFAULT 0,
  max_boleto_installments integer NOT NULL DEFAULT 1,
  boleto_requires_downpayment boolean NOT NULL DEFAULT false,
  boleto_downpayment_pct numeric(5,2) NOT NULL DEFAULT 0,
  max_card_installments integer NOT NULL DEFAULT 1,
  pix_discount_pct numeric(5,2) NOT NULL DEFAULT 0,
  payment_channel_code text NOT NULL DEFAULT 'portal_operadora',
  payment_guidance_badge text NOT NULL DEFAULT '',
  payment_guidance_title text NOT NULL DEFAULT '',
  payment_guidance_instructions text NOT NULL DEFAULT '',
  payment_portal_url text,
  cancellation_fine_pct numeric(5,2) NOT NULL DEFAULT 0,
  cancellation_free_days_before integer NOT NULL DEFAULT 0,
  cancellation_policy_notes text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, operator_name)
);

CREATE INDEX IF NOT EXISTS idx_agency_operator_rules_store
  ON public.agency_operator_rules(store_id);

ALTER TABLE public.agency_operator_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_operator_rules_select_member" ON public.agency_operator_rules;
CREATE POLICY "agency_operator_rules_select_member"
  ON public.agency_operator_rules
  FOR SELECT
  TO authenticated
  USING (public.is_agency_store_member(store_id));

DROP POLICY IF EXISTS "agency_operator_rules_write_manager" ON public.agency_operator_rules;
CREATE POLICY "agency_operator_rules_write_manager"
  ON public.agency_operator_rules
  FOR ALL
  TO authenticated
  USING (public.is_agency_store_manager(store_id))
  WITH CHECK (public.is_agency_store_manager(store_id));

-- ============================================================================
-- 2. TABELA: agency_agent_commission_profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_agent_commission_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_identifier text NOT NULL,
  agent_name text NOT NULL,
  goal_evaluation_basis text NOT NULL DEFAULT 'gross_sale',
  commission_calculation_basis text NOT NULL DEFAULT 'net_sale_plus_over',
  base_commission_pct numeric(5,2) NOT NULL DEFAULT 0,
  default_over_commission_pct numeric(5,2) NOT NULL DEFAULT 0,
  current_month_revenue_cents bigint NOT NULL DEFAULT 0,
  tiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  can_override_commission_in_proposal boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, agent_identifier)
);

CREATE INDEX IF NOT EXISTS idx_agency_agent_commission_profiles_store
  ON public.agency_agent_commission_profiles(store_id);

ALTER TABLE public.agency_agent_commission_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_agent_profiles_select_member" ON public.agency_agent_commission_profiles;
CREATE POLICY "agency_agent_profiles_select_member"
  ON public.agency_agent_commission_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_agency_store_member(store_id));

DROP POLICY IF EXISTS "agency_agent_profiles_write_manager" ON public.agency_agent_commission_profiles;
CREATE POLICY "agency_agent_profiles_write_manager"
  ON public.agency_agent_commission_profiles
  FOR ALL
  TO authenticated
  USING (public.is_agency_store_manager(store_id))
  WITH CHECK (public.is_agency_store_manager(store_id));

-- ============================================================================
-- 3. TABELA: agency_sales_commission_ledger
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_sales_commission_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  row_code text NOT NULL,
  proposal_id uuid,
  trip_id uuid,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  client_name text NOT NULL DEFAULT '',
  passengers_count integer NOT NULL DEFAULT 1,
  operator_name text NOT NULL DEFAULT '',
  operator_package_code text NOT NULL DEFAULT '',
  contract_signed boolean NOT NULL DEFAULT false,
  booking_status text NOT NULL DEFAULT 'confirmada',
  gross_sale_cents bigint NOT NULL DEFAULT 0,
  taxes_and_fees_cents bigint NOT NULL DEFAULT 0,
  operator_table_price_cents bigint NOT NULL DEFAULT 0,
  base_commission_pct numeric(5,2) NOT NULL DEFAULT 0,
  over_retention_fee_pct numeric(5,2) NOT NULL DEFAULT 0,
  paid_100pct_via_operator boolean NOT NULL DEFAULT true,
  over_payment_method text NOT NULL DEFAULT 'operadora_financiado',
  agent_id text NOT NULL DEFAULT '',
  agent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_name text NOT NULL DEFAULT '',
  agent_commission_pct_override numeric(5,2),
  agent_over_commission_pct_override numeric(5,2),
  agent_commission_cents_override bigint,
  deduct_commission_on_cancel boolean NOT NULL DEFAULT false,
  manager_commission_clawback_cents bigint,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, row_code)
);

CREATE INDEX IF NOT EXISTS idx_agency_sales_commission_ledger_store
  ON public.agency_sales_commission_ledger(store_id, sale_date DESC);

ALTER TABLE public.agency_sales_commission_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_sales_ledger_select_member" ON public.agency_sales_commission_ledger;
CREATE POLICY "agency_sales_ledger_select_member"
  ON public.agency_sales_commission_ledger
  FOR SELECT
  TO authenticated
  USING (public.is_agency_store_member(store_id));

DROP POLICY IF EXISTS "agency_sales_ledger_insert_member" ON public.agency_sales_commission_ledger;
CREATE POLICY "agency_sales_ledger_insert_member"
  ON public.agency_sales_commission_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_agency_store_member(store_id));

DROP POLICY IF EXISTS "agency_sales_ledger_update_member" ON public.agency_sales_commission_ledger;
CREATE POLICY "agency_sales_ledger_update_member"
  ON public.agency_sales_commission_ledger
  FOR UPDATE
  TO authenticated
  USING (public.is_agency_store_member(store_id))
  WITH CHECK (public.is_agency_store_member(store_id));

DROP POLICY IF EXISTS "agency_sales_ledger_delete_manager" ON public.agency_sales_commission_ledger;
CREATE POLICY "agency_sales_ledger_delete_manager"
  ON public.agency_sales_commission_ledger
  FOR DELETE
  TO authenticated
  USING (public.is_agency_store_manager(store_id));

-- ============================================================================
-- 4. TABELA: agency_contract_cancellation_policies
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_contract_cancellation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  policy_name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  free_cancellation_window_days integer NOT NULL DEFAULT 7,
  anac_regret_hours integer NOT NULL DEFAULT 24,
  anac_min_advance_days integer NOT NULL DEFAULT 7,
  default_fine_pct numeric(5,2) NOT NULL DEFAULT 0,
  fine_tiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  allow_operator_credit_conversion boolean NOT NULL DEFAULT true,
  credit_validity_months integer NOT NULL DEFAULT 12,
  contract_clauses_template text NOT NULL DEFAULT '',
  rescheduling_policy_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, policy_name)
);

CREATE INDEX IF NOT EXISTS idx_agency_contract_cancellation_policies_store
  ON public.agency_contract_cancellation_policies(store_id);

ALTER TABLE public.agency_contract_cancellation_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_cancellation_policies_select_member" ON public.agency_contract_cancellation_policies;
CREATE POLICY "agency_cancellation_policies_select_member"
  ON public.agency_contract_cancellation_policies
  FOR SELECT
  TO authenticated
  USING (public.is_agency_store_member(store_id));

DROP POLICY IF EXISTS "agency_cancellation_policies_write_manager" ON public.agency_contract_cancellation_policies;
CREATE POLICY "agency_cancellation_policies_write_manager"
  ON public.agency_contract_cancellation_policies
  FOR ALL
  TO authenticated
  USING (public.is_agency_store_manager(store_id))
  WITH CHECK (public.is_agency_store_manager(store_id));

-- ============================================================================
-- 5. PARIDADE ESTRUTURAL EM travel_proposals E travel_client_trips
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_proposals') THEN
    ALTER TABLE public.travel_proposals
      ADD COLUMN IF NOT EXISTS origin_city text,
      ADD COLUMN IF NOT EXISTS transport_modality text DEFAULT 'aereo',
      ADD COLUMN IF NOT EXISTS bus_details jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS room_occupancies jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS agency_commission_pct numeric(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS agent_commission_pct numeric(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS operator_name text,
      ADD COLUMN IF NOT EXISTS payment_breakdown jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_client_trips') THEN
    ALTER TABLE public.travel_client_trips
      ADD COLUMN IF NOT EXISTS origin_city text,
      ADD COLUMN IF NOT EXISTS transport_modality text DEFAULT 'aereo',
      ADD COLUMN IF NOT EXISTS bus_details jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS room_occupancies jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS cancellation_policy_snapshot jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS operator_payment_guidance jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
