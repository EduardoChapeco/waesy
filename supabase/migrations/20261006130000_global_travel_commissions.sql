-- Waesy: motor global de comissões turísticas, ledger e auditoria append-only.

ALTER TABLE public.travel_sales
  ADD COLUMN IF NOT EXISTS assigned_profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS group_tour_id UUID REFERENCES public.travel_group_tours(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.travel_commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'store', 'collaborator', 'group', 'excursion')),
  beneficiary_profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  group_tour_id UUID REFERENCES public.travel_group_tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  basis TEXT NOT NULL DEFAULT 'gross' CHECK (basis IN ('gross', 'net', 'margin')),
  rate_percent NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (rate_percent >= 0 AND rate_percent <= 100),
  fixed_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (fixed_amount_cents >= 0),
  priority INTEGER NOT NULL DEFAULT 100 CHECK (priority >= 0),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until > valid_from),
  CHECK (scope IN ('global', 'store', 'group', 'excursion') OR beneficiary_profile_id IS NOT NULL),
  CHECK (scope NOT IN ('group', 'excursion') OR group_tour_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.travel_commission_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.travel_sales(id) ON DELETE RESTRICT,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  rule_id UUID NOT NULL REFERENCES public.travel_commission_rules(id) ON DELETE RESTRICT,
  beneficiary_profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  basis TEXT NOT NULL CHECK (basis IN ('gross', 'net', 'margin')),
  base_cents BIGINT NOT NULL CHECK (base_cents >= 0),
  rate_percent NUMERIC(7,4) NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 100),
  fixed_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (fixed_amount_cents >= 0),
  commission_amount_cents BIGINT NOT NULL CHECK (commission_amount_cents >= 0),
  status TEXT NOT NULL DEFAULT 'accrued' CHECK (status IN ('accrued', 'available', 'paid', 'reversed')),
  rule_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ledger_accrual_id UUID REFERENCES public.financial_immutable_ledger(id) ON DELETE SET NULL,
  ledger_payout_id UUID REFERENCES public.financial_immutable_ledger(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sale_id, beneficiary_profile_id),
  UNIQUE (store_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.travel_commission_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  allocation_id UUID REFERENCES public.travel_commission_allocations(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.travel_sales(id) ON DELETE SET NULL,
  actor_profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('rule_created', 'rule_updated', 'calculated', 'available', 'paid', 'reversed')),
  before_snapshot JSONB,
  after_snapshot JSONB,
  reason TEXT,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_commission_rules_resolution ON public.travel_commission_rules(store_id, scope, is_active, priority, valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_travel_commission_allocations_beneficiary ON public.travel_commission_allocations(store_id, beneficiary_profile_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_travel_commission_allocations_sale ON public.travel_commission_allocations(store_id, sale_id);
CREATE INDEX IF NOT EXISTS idx_travel_commission_audit_store ON public.travel_commission_audit(store_id, created_at DESC);

ALTER TABLE public.travel_commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_commission_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_commission_audit ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='travel_commission_rules' AND policyname='travel_commission_rules_staff') THEN
    CREATE POLICY travel_commission_rules_staff ON public.travel_commission_rules FOR ALL TO authenticated
      USING (store_id IS NULL OR is_store_staff(store_id)) WITH CHECK (store_id IS NULL OR is_store_staff(store_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='travel_commission_allocations' AND policyname='travel_commission_allocations_staff') THEN
    CREATE POLICY travel_commission_allocations_staff ON public.travel_commission_allocations FOR SELECT TO authenticated USING (is_store_staff(store_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='travel_commission_audit' AND policyname='travel_commission_audit_staff') THEN
    CREATE POLICY travel_commission_audit_staff ON public.travel_commission_audit FOR SELECT TO authenticated USING (is_store_staff(store_id));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_travel_commission_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'A trilha de auditoria de comissão é append-only.'; END;
$$;
DROP TRIGGER IF EXISTS trg_travel_commission_audit_immutable ON public.travel_commission_audit;
CREATE TRIGGER trg_travel_commission_audit_immutable BEFORE UPDATE OR DELETE ON public.travel_commission_audit
FOR EACH ROW EXECUTE FUNCTION public.prevent_travel_commission_audit_mutation();

CREATE OR REPLACE FUNCTION public.calculate_travel_sale_commissions(
  p_sale_id UUID, p_beneficiary_profile_id UUID DEFAULT NULL, p_group_tour_id UUID DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_sale public.travel_sales%ROWTYPE; v_rule public.travel_commission_rules%ROWTYPE;
  v_allocation public.travel_commission_allocations%ROWTYPE; v_beneficiary UUID;
  v_base BIGINT; v_net BIGINT; v_margin BIGINT; v_amount BIGINT; v_key TEXT; v_existing JSONB; v_ledger_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('travel-commission:' || p_sale_id::TEXT));
  SELECT * INTO v_sale FROM public.travel_sales WHERE id=p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda turística não encontrada.'; END IF;
  IF p_group_tour_id IS NOT NULL THEN
    UPDATE public.travel_sales SET group_tour_id=p_group_tour_id, updated_at=now() WHERE id=p_sale_id;
    v_sale.group_tour_id := p_group_tour_id;
  END IF;
  v_beneficiary := COALESCE(p_beneficiary_profile_id, v_sale.assigned_profile_id, v_sale.created_by_profile_id);
  IF v_beneficiary IS NULL THEN RAISE EXCEPTION 'Colaborador beneficiário é obrigatório para calcular comissão.'; END IF;
  SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at) INTO v_existing FROM public.travel_commission_allocations a WHERE a.sale_id=p_sale_id;
  IF v_existing IS NOT NULL THEN RETURN jsonb_build_object('success',true,'replayed',true,'allocations',v_existing); END IF;
  v_base := GREATEST(v_sale.total_cents,0);
  SELECT GREATEST(COALESCE((tp.pricing->>'operator_net_cents')::BIGINT,v_base),0) INTO v_net FROM public.travel_proposals tp WHERE tp.id=v_sale.proposal_id;
  v_net := COALESCE(v_net,v_base); v_margin := GREATEST(v_base-v_net,0);
  SELECT r.* INTO v_rule FROM public.travel_commission_rules r
  WHERE r.is_active AND r.valid_from<=now() AND (r.valid_until IS NULL OR r.valid_until>now()) AND (
    (r.scope='excursion' AND r.group_tour_id=v_sale.group_tour_id) OR (r.scope='group' AND r.group_tour_id=v_sale.group_tour_id) OR
    (r.scope='collaborator' AND r.beneficiary_profile_id=v_beneficiary AND (r.store_id IS NULL OR r.store_id=v_sale.store_id)) OR
    (r.scope='store' AND r.store_id=v_sale.store_id) OR (r.scope='global' AND (r.store_id IS NULL OR r.store_id=v_sale.store_id))
  ) ORDER BY CASE r.scope WHEN 'excursion' THEN 1 WHEN 'group' THEN 2 WHEN 'collaborator' THEN 3 WHEN 'store' THEN 4 ELSE 5 END, r.priority, r.valid_from DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',true,'replayed',false,'allocations','[]'::jsonb,'message','Nenhuma regra ativa encontrada.'); END IF;
  v_base := CASE v_rule.basis WHEN 'net' THEN v_net WHEN 'margin' THEN v_margin ELSE v_base END;
  v_amount := CASE WHEN v_rule.fixed_amount_cents>0 THEN v_rule.fixed_amount_cents ELSE floor(v_base*(v_rule.rate_percent/100.0))::BIGINT END;
  v_amount := GREATEST(v_amount,0); v_key := COALESCE(p_idempotency_key,'travel-commission:'||p_sale_id::TEXT||':'||v_rule.id::TEXT);
  INSERT INTO public.travel_commission_allocations(store_id,sale_id,trip_id,rule_id,beneficiary_profile_id,basis,base_cents,rate_percent,fixed_amount_cents,commission_amount_cents,rule_snapshot,idempotency_key)
  VALUES(v_sale.store_id,v_sale.id,v_sale.trip_id,v_rule.id,COALESCE(v_rule.beneficiary_profile_id,v_beneficiary),v_rule.basis,v_base,v_rule.rate_percent,v_rule.fixed_amount_cents,v_amount,to_jsonb(v_rule),v_key) RETURNING * INTO v_allocation;
  SELECT id INTO v_ledger_id FROM public.record_immutable_ledger_entry('commission_accrual',v_amount,0,NULL,v_allocation.beneficiary_profile_id,v_sale.store_id,NULL,'travel_commission_allocation',v_allocation.id::TEXT,jsonb_build_object('sale_id',v_sale.id,'rule_id',v_rule.id,'basis',v_rule.basis,'base_cents',v_base),auth.uid(),COALESCE((SELECT role::TEXT FROM public.profiles WHERE id=auth.uid()),'system'),NULL,NULL,NULL,NULL,v_key||':accrual');
  UPDATE public.travel_commission_allocations SET ledger_accrual_id=v_ledger_id WHERE id=v_allocation.id;
  INSERT INTO public.travel_commission_audit(store_id,allocation_id,sale_id,actor_profile_id,action,after_snapshot,correlation_id) VALUES(v_sale.store_id,v_allocation.id,v_sale.id,auth.uid(),'calculated',to_jsonb(v_allocation),v_key);
  RETURN jsonb_build_object('success',true,'replayed',false,'allocation',to_jsonb(v_allocation));
END; $$;

CREATE OR REPLACE FUNCTION public.settle_travel_commission(p_allocation_id UUID,p_idempotency_key TEXT,p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_allocation public.travel_commission_allocations%ROWTYPE; v_ledger public.financial_immutable_ledger%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('travel-commission-payout:'||p_allocation_id::TEXT));
  SELECT * INTO v_allocation FROM public.travel_commission_allocations WHERE id=p_allocation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Alocação de comissão não encontrada.'; END IF;
  IF v_allocation.status='paid' THEN RETURN jsonb_build_object('success',true,'replayed',true,'allocation_id',v_allocation.id); END IF;
  IF v_allocation.status NOT IN ('accrued','available') THEN RAISE EXCEPTION 'Comissão não está disponível para pagamento.'; END IF;
  SELECT * INTO v_ledger FROM public.record_immutable_ledger_entry('commission_payout',v_allocation.commission_amount_cents,0,NULL,v_allocation.beneficiary_profile_id,v_allocation.store_id,NULL,'travel_commission_allocation',v_allocation.id::TEXT,jsonb_build_object('reason',p_reason,'accrual_ledger_id',v_allocation.ledger_accrual_id),auth.uid(),COALESCE((SELECT role::TEXT FROM public.profiles WHERE id=auth.uid()),'system'),NULL,NULL,NULL,NULL,p_idempotency_key);
  UPDATE public.travel_commission_allocations SET status='paid',paid_at=now(),ledger_payout_id=v_ledger.id,updated_at=now() WHERE id=v_allocation.id;
  INSERT INTO public.travel_commission_audit(store_id,allocation_id,sale_id,actor_profile_id,action,before_snapshot,after_snapshot,reason,correlation_id) VALUES(v_allocation.store_id,v_allocation.id,v_allocation.sale_id,auth.uid(),'paid',to_jsonb(v_allocation),jsonb_build_object('status','paid','ledger_payout_id',v_ledger.id),p_reason,p_idempotency_key);
  RETURN jsonb_build_object('success',true,'replayed',false,'allocation_id',v_allocation.id,'ledger_id',v_ledger.id);
END; $$;

CREATE OR REPLACE FUNCTION public.auto_calculate_travel_sale_commission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.created_by_profile_id IS NOT NULL THEN
    PERFORM public.calculate_travel_sale_commissions(NEW.id,COALESCE(NEW.assigned_profile_id,NEW.created_by_profile_id),NEW.group_tour_id,'travel-sale:'||NEW.id::TEXT);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.travel_commission_audit(store_id,sale_id,actor_profile_id,action,reason,correlation_id) VALUES(NEW.store_id,NEW.id,NEW.created_by_profile_id,'calculated','Falha não bloqueante no cálculo automático: '||SQLERRM,'travel-sale-error:'||NEW.id::TEXT);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_calculate_travel_sale_commission ON public.travel_sales;
CREATE TRIGGER trg_auto_calculate_travel_sale_commission AFTER INSERT ON public.travel_sales FOR EACH ROW EXECUTE FUNCTION public.auto_calculate_travel_sale_commission();

GRANT EXECUTE ON FUNCTION public.calculate_travel_sale_commissions(UUID,UUID,UUID,TEXT) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.settle_travel_commission(UUID,TEXT,TEXT) TO authenticated,service_role;
