-- ============================================================================
-- MIGRATION: 20270606000000_tourism_commissions_offpayroll_rbac_goals_ssot.sql
-- SPEC: docs/specs/SPEC-20261117-TOURISM-COMMISSIONS-OFFPAYROLL-RBAC-GOALS.md
-- ESCOPO:
-- 1. Unificação SSOT de Ficha Financeira, Comissões e Faixas em Turismo
-- 2. Pagamento "Por Fora" (Premiação Variável + Recibo Automático Imutável)
-- 3. Borderô / Lote de Cobrança de Operadoras & Integração Fiscal (Tax Shield)
-- 4. Tabela SQL normalizada `financial_obligations` (substitui JSONB)
-- 5. Tabela histórica de metas multi-escopo `agency_goal_targets`
-- 6. Hardening RLS por Papel e Tenant em todas as tabelas de Turismo/Comissão
-- ============================================================================

-- ── 1. Helpers de Autorização Multi-Tenant e Hierárquica ──────────────────────

CREATE OR REPLACE FUNCTION public.is_agency_store_member(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (
    (SELECT auth.uid()) IS NOT NULL AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = p_store_id AND (
          s.organization_id = (SELECT auth.uid())
          OR s.context_profile_id = (SELECT auth.uid())
          OR s.claimed_by = (SELECT auth.uid())
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id = p_store_id
          AND COALESCE(wm.is_active, true) = true
          AND (wm.user_id = (SELECT auth.uid()) OR wm.profile_id = (SELECT auth.uid()))
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_agency_store_manager(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (
    (SELECT auth.uid()) IS NOT NULL AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = p_store_id AND (
          s.organization_id = (SELECT auth.uid())
          OR s.context_profile_id = (SELECT auth.uid())
          OR s.claimed_by = (SELECT auth.uid())
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id = p_store_id
          AND COALESCE(wm.is_active, true) = true
          AND (wm.user_id = (SELECT auth.uid()) OR wm.profile_id = (SELECT auth.uid()))
          AND LOWER(COALESCE(wm.role::text, '')) IN (
            'owner', 'store_owner', 'proprietario', 'admin', 'manager', 'gerente', 'diretor', 'master', 'gestor'
          )
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_store_manager_or_finance(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (
    (SELECT auth.uid()) IS NOT NULL AND (
      public.is_platform_admin()
      OR public.is_agency_store_manager(p_store_id)
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id = p_store_id
          AND COALESCE(wm.is_active, true) = true
          AND (wm.user_id = (SELECT auth.uid()) OR wm.profile_id = (SELECT auth.uid()))
          AND LOWER(COALESCE(wm.role::text, '')) IN ('finance', 'financeiro', 'contador', 'billing')
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_agency_store_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_agency_store_manager(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_store_manager_or_finance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_agency_store_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_agency_store_manager(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_store_manager_or_finance(uuid) TO authenticated, service_role;

-- ── 2. Lotes / Borderôs de Cobrança de Operadoras ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.travel_operator_billing_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  batch_code TEXT NOT NULL,
  operator_supplier_id UUID REFERENCES public.travel_suppliers(id) ON DELETE SET NULL,
  operator_name TEXT NOT NULL,
  competence_month TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'receivable_from_operator'
    CHECK (direction IN ('receivable_from_operator', 'payable_net_to_operator')),
  sales_count INT NOT NULL DEFAULT 0,
  total_gross_cents BIGINT NOT NULL DEFAULT 0,
  total_net_base_cents BIGINT NOT NULL DEFAULT 0,
  total_commission_cents BIGINT NOT NULL DEFAULT 0,
  total_over_net_cents BIGINT NOT NULL DEFAULT 0,
  total_due_cents BIGINT NOT NULL DEFAULT 0,
  settled_cents BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'billed', 'partial', 'settled', 'divergencia', 'cancelled')),
  nfse_status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (nfse_status IN ('nao_necessaria', 'pendente', 'solicitada', 'emitida', 'conciliada')),
  nfse_number TEXT,
  nfse_amount_cents BIGINT NOT NULL DEFAULT 0,
  due_date DATE,
  settled_at TIMESTAMPTZ,
  financial_obligation_id UUID,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  settled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, batch_code)
);

CREATE INDEX IF NOT EXISTS idx_travel_op_billing_batches_store_month
  ON public.travel_operator_billing_batches (store_id, competence_month, status);

ALTER TABLE public.travel_operator_billing_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_op_billing_batches_select" ON public.travel_operator_billing_batches;
CREATE POLICY "travel_op_billing_batches_select"
  ON public.travel_operator_billing_batches FOR SELECT TO authenticated
  USING (public.is_store_manager_or_finance(store_id));

DROP POLICY IF EXISTS "travel_op_billing_batches_write" ON public.travel_operator_billing_batches;
CREATE POLICY "travel_op_billing_batches_write"
  ON public.travel_operator_billing_batches FOR ALL TO authenticated
  USING (public.is_store_manager_or_finance(store_id))
  WITH CHECK (public.is_store_manager_or_finance(store_id));

-- ── 3. Recibos Automáticos de Premiação Variável ("Por Fora" da Folha CLT) ────

CREATE TABLE IF NOT EXISTS public.travel_commission_payout_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  receipt_code TEXT NOT NULL,
  competence_month TEXT NOT NULL,
  beneficiary_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  beneficiary_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  beneficiary_name TEXT NOT NULL,
  beneficiary_document TEXT,
  payout_nature TEXT NOT NULL DEFAULT 'premiacao_variavel_por_fora'
    CHECK (payout_nature IN (
      'premiacao_variavel_por_fora',
      'bonus_meta',
      'repasse_pj_autonomo',
      'comissao_sobre_recebimento'
    )),
  payout_channel TEXT NOT NULL DEFAULT 'off_payroll_award'
    CHECK (payout_channel IN ('off_payroll_award', 'pj_repasse')),
  include_in_payroll BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method TEXT NOT NULL DEFAULT 'pix'
    CHECK (payment_method IN ('pix', 'transfer', 'cash', 'other')),
  pix_key TEXT,
  gross_sales_reference_cents BIGINT NOT NULL DEFAULT 0,
  net_base_reference_cents BIGINT NOT NULL DEFAULT 0,
  over_net_reference_cents BIGINT NOT NULL DEFAULT 0,
  applied_tier_name TEXT NOT NULL DEFAULT 'Faixa Base',
  applied_commission_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  applied_over_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  gross_award_cents BIGINT NOT NULL DEFAULT 0,
  deductions_cents BIGINT NOT NULL DEFAULT 0,
  net_paid_cents BIGINT NOT NULL DEFAULT 0,
  sales_count INT NOT NULL DEFAULT 0,
  sales_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  receipt_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'paid', 'acknowledged', 'cancelled')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  paid_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_ip TEXT,
  financial_obligation_id UUID,
  financial_transaction_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, receipt_code)
);

CREATE INDEX IF NOT EXISTS idx_travel_comm_receipts_store_month
  ON public.travel_commission_payout_receipts (store_id, competence_month, status);

CREATE INDEX IF NOT EXISTS idx_travel_comm_receipts_beneficiary
  ON public.travel_commission_payout_receipts (store_id, beneficiary_profile_id, issued_at DESC);

ALTER TABLE public.travel_commission_payout_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_comm_receipts_select" ON public.travel_commission_payout_receipts;
CREATE POLICY "travel_comm_receipts_select"
  ON public.travel_commission_payout_receipts FOR SELECT TO authenticated
  USING (
    public.is_store_manager_or_finance(store_id)
    OR (
      public.is_agency_store_member(store_id)
      AND beneficiary_profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "travel_comm_receipts_write_finance" ON public.travel_commission_payout_receipts;
CREATE POLICY "travel_comm_receipts_write_finance"
  ON public.travel_commission_payout_receipts FOR ALL TO authenticated
  USING (public.is_store_manager_or_finance(store_id))
  WITH CHECK (public.is_store_manager_or_finance(store_id));

-- ── 4. Tabela SQL Normalizada `financial_obligations` (Contas a Pagar) ────────

CREATE TABLE IF NOT EXISTS public.financial_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN (
      'supplier', 'rent', 'utilities', 'payroll', 'tax', 'marketing', 'software',
      'off_payroll_award', 'operator_net_payable', 'other'
    )),
  supplier_name TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  barcode TEXT,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  recurrence TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none', 'monthly', 'weekly', 'yearly')),
  source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'payroll', 'off_payroll_award', 'operator_net_payable')),
  source_id UUID,
  off_payroll BOOLEAN NOT NULL DEFAULT FALSE,
  beneficiary_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_obligations_store_due
  ON public.financial_obligations (store_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_financial_obligations_source
  ON public.financial_obligations (store_id, source_type, source_id);

ALTER TABLE public.financial_obligations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_obligations_finance_all" ON public.financial_obligations;
CREATE POLICY "financial_obligations_finance_all"
  ON public.financial_obligations FOR ALL TO authenticated
  USING (public.is_store_manager_or_finance(store_id))
  WITH CHECK (public.is_store_manager_or_finance(store_id));

-- ── 5. Tabela Histórica Multi-Escopo de Metas (`agency_goal_targets`) ─────────

CREATE TABLE IF NOT EXISTS public.agency_goal_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  competence_month TEXT NOT NULL,
  target_scope TEXT NOT NULL DEFAULT 'agency'
    CHECK (target_scope IN ('agency', 'agent', 'channel')),
  agent_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_key TEXT,
  gross_goal_cents BIGINT NOT NULL DEFAULT 0,
  agency_revenue_goal_cents BIGINT NOT NULL DEFAULT 0,
  net_profit_goal_cents BIGINT NOT NULL DEFAULT 0,
  sales_count_goal INT NOT NULL DEFAULT 0,
  avg_ticket_goal_cents BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_goal_targets_scope
  ON public.agency_goal_targets (
    store_id,
    competence_month,
    target_scope,
    COALESCE(agent_profile_id::text, ''),
    COALESCE(channel_key, '')
  );

CREATE INDEX IF NOT EXISTS idx_agency_goal_targets_lookup
  ON public.agency_goal_targets (store_id, competence_month, target_scope);

ALTER TABLE public.agency_goal_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_goal_targets_select" ON public.agency_goal_targets;
CREATE POLICY "agency_goal_targets_select"
  ON public.agency_goal_targets FOR SELECT TO authenticated
  USING (
    public.is_store_manager_or_finance(store_id)
    OR (
      public.is_agency_store_member(store_id)
      AND target_scope = 'agent'
      AND agent_profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "agency_goal_targets_write_manager" ON public.agency_goal_targets;
CREATE POLICY "agency_goal_targets_write_manager"
  ON public.agency_goal_targets FOR ALL TO authenticated
  USING (public.is_agency_store_manager(store_id))
  WITH CHECK (public.is_agency_store_manager(store_id));

-- ── 6. Extensão Relacional da Ficha Financeira Mestre, Operadoras & Perfis ───

ALTER TABLE public.travel_sale_financial_sheets
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.travel_contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operator_supplier_id UUID REFERENCES public.travel_suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seller_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS competence_month TEXT,
  ADD COLUMN IF NOT EXISTS operator_table_price_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS over_payment_method TEXT NOT NULL DEFAULT 'operadora_financiado',
  ADD COLUMN IF NOT EXISTS over_retention_fee_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retained_cash_amount_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operator_balance_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_cash_settled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_operator_invoice BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS agent_tier_name TEXT NOT NULL DEFAULT 'Faixa Base',
  ADD COLUMN IF NOT EXISTS agent_base_commission_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_over_commission_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_base_commission_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_over_commission_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_commission_total_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_commission_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS agent_payout_receipt_id UUID REFERENCES public.travel_commission_payout_receipts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deduct_commission_on_cancel BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS manager_commission_clawback_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operator_billing_batch_id UUID REFERENCES public.travel_operator_billing_batches(id) ON DELETE SET NULL;

-- Backfill de competence_month onde nulo
UPDATE public.travel_sale_financial_sheets
SET competence_month = TO_CHAR(sale_date, 'YYYY-MM')
WHERE competence_month IS NULL AND sale_date IS NOT NULL;

-- Expandir CHECK constraint de settlement_method para incluir balcão à vista e abatimento
DO $$
DECLARE
  v_con text;
BEGIN
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.travel_sale_financial_sheets'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%settlement_method%'
  LOOP
    EXECUTE format('ALTER TABLE public.travel_sale_financial_sheets DROP CONSTRAINT IF EXISTS %I', v_con);
  END LOOP;
END $$;

ALTER TABLE public.travel_sale_financial_sheets
  ADD CONSTRAINT travel_sale_financial_sheets_settlement_method_check
  CHECK (settlement_method IN (
    'fatura_abatida',
    'comissao_balcao_a_vista',
    'abatimento_saldo_devedor',
    'deposito_bancario',
    'pix',
    'credito_operadora',
    'cartao_virtual',
    'misto'
  ));

CREATE INDEX IF NOT EXISTS idx_travel_sheets_store_competence
  ON public.travel_sale_financial_sheets (store_id, competence_month, booking_status);

CREATE INDEX IF NOT EXISTS idx_travel_sheets_seller_competence
  ON public.travel_sale_financial_sheets (store_id, seller_profile_id, competence_month);

CREATE INDEX IF NOT EXISTS idx_travel_sheets_operator_receivable
  ON public.travel_sale_financial_sheets (store_id, primary_operator, receivable_status);

-- Extensão de `agency_agent_commission_profiles`
ALTER TABLE public.agency_agent_commission_profiles
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payout_mode TEXT NOT NULL DEFAULT 'off_payroll_award',
  ADD COLUMN IF NOT EXISTS release_trigger TEXT NOT NULL DEFAULT 'no_recebimento_operadora',
  ADD COLUMN IF NOT EXISTS tier_retroactive_in_month BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS hide_agency_net_from_seller BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- Extensão de `travel_suppliers` para unificação com regras de operadora
ALTER TABLE public.travel_suppliers
  ADD COLUMN IF NOT EXISTS base_agency_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS over_retention_pct_when_financed NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS default_settlement_method TEXT NOT NULL DEFAULT 'fatura_abatida',
  ADD COLUMN IF NOT EXISTS financial_email TEXT,
  ADD COLUMN IF NOT EXISTS nfse_required BOOLEAN NOT NULL DEFAULT TRUE;

-- ── 7. Hardening Estrito de RLS em Tabelas Existentes de Comissões ───────────

-- 7.1 `travel_agent_commission_tiers` (remove política aberta authenticated)
DO $$
BEGIN
  IF to_regclass('public.travel_agent_commission_tiers') IS NOT NULL THEN
    DROP POLICY IF EXISTS "travel_agent_commission_tiers_tenant_all" ON public.travel_agent_commission_tiers;
    DROP POLICY IF EXISTS "travel_agent_commission_tiers_select" ON public.travel_agent_commission_tiers;
    DROP POLICY IF EXISTS "travel_agent_commission_tiers_write" ON public.travel_agent_commission_tiers;
    CREATE POLICY "travel_agent_commission_tiers_select"
      ON public.travel_agent_commission_tiers FOR SELECT TO authenticated
      USING (public.is_agency_store_member(store_id));
    CREATE POLICY "travel_agent_commission_tiers_write"
      ON public.travel_agent_commission_tiers FOR ALL TO authenticated
      USING (public.is_agency_store_manager(store_id))
      WITH CHECK (public.is_agency_store_manager(store_id));
  END IF;
END $$;

-- 7.2 `agency_sales_commission_ledger` (agente só lê as próprias linhas; escrita exclusiva gestor/financeiro)
DROP POLICY IF EXISTS "agency_sales_ledger_select_member" ON public.agency_sales_commission_ledger;
DROP POLICY IF EXISTS "agency_sales_ledger_insert_member" ON public.agency_sales_commission_ledger;
DROP POLICY IF EXISTS "agency_sales_ledger_update_member" ON public.agency_sales_commission_ledger;
DROP POLICY IF EXISTS "agency_sales_ledger_delete_manager" ON public.agency_sales_commission_ledger;

CREATE POLICY "agency_sales_ledger_select_scoped"
  ON public.agency_sales_commission_ledger FOR SELECT TO authenticated
  USING (
    public.is_store_manager_or_finance(store_id)
    OR (
      public.is_agency_store_member(store_id)
      AND (agent_user_id = (SELECT auth.uid()) OR agent_id = (SELECT auth.uid())::text)
    )
  );

CREATE POLICY "agency_sales_ledger_write_manager"
  ON public.agency_sales_commission_ledger FOR ALL TO authenticated
  USING (public.is_store_manager_or_finance(store_id))
  WITH CHECK (public.is_store_manager_or_finance(store_id));

-- 7.3 `travel_sale_financial_sheets` e subtabelas (Zero PostgREST aberto; seller só lê próprias vendas)
DROP POLICY IF EXISTS "travel_sheets_select_scoped" ON public.travel_sale_financial_sheets;
DROP POLICY IF EXISTS "travel_sheets_write_manager_finance" ON public.travel_sale_financial_sheets;

CREATE POLICY "travel_sheets_select_scoped"
  ON public.travel_sale_financial_sheets FOR SELECT TO authenticated
  USING (
    public.is_store_manager_or_finance(store_id)
    OR (
      public.is_agency_store_member(store_id)
      AND seller_profile_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "travel_sheets_write_manager_finance"
  ON public.travel_sale_financial_sheets FOR ALL TO authenticated
  USING (public.is_store_manager_or_finance(store_id))
  WITH CHECK (public.is_store_manager_or_finance(store_id));

DO $$
DECLARE
  v_subtable text;
BEGIN
  FOREACH v_subtable IN ARRAY ARRAY[
    'travel_sale_non_commissionable_fees',
    'travel_sale_over_deductions',
    'travel_sale_internal_costs',
    'travel_sale_supplier_items',
    'travel_financial_audit_logs'
  ]
  LOOP
    IF to_regclass('public.' || v_subtable) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "%s_scoped_read" ON public.%I', v_subtable, v_subtable);
      EXECUTE format('DROP POLICY IF EXISTS "%s_manager_write" ON public.%I', v_subtable, v_subtable);
      EXECUTE format(
        'CREATE POLICY "%s_scoped_read" ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.travel_sale_financial_sheets sh WHERE sh.id = sheet_id AND (public.is_store_manager_or_finance(sh.store_id) OR sh.seller_profile_id = (SELECT auth.uid()))))',
        v_subtable, v_subtable
      );
      EXECUTE format(
        'CREATE POLICY "%s_manager_write" ON public.%I FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.travel_sale_financial_sheets sh WHERE sh.id = sheet_id AND public.is_store_manager_or_finance(sh.store_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.travel_sale_financial_sheets sh WHERE sh.id = sheet_id AND public.is_store_manager_or_finance(sh.store_id)))',
        v_subtable, v_subtable
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
