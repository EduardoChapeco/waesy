BEGIN;

-- Liquidação de parcelas legadas: nenhuma baixa direta deve ignorar o fluxo financeiro.
CREATE OR REPLACE FUNCTION public.settle_installment_atomic(
  p_installment_id uuid,
  p_settled_by uuid,
  p_payment_method text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_installment record;
  v_plan record;
  v_result jsonb;
BEGIN
  IF p_settled_by IS NULL OR auth.uid() IS DISTINCT FROM p_settled_by THEN
    RAISE EXCEPTION 'actor inválido para liquidação';
  END IF;

  SELECT i.*, p.store_id, p.customer_id
    INTO v_installment
  FROM public.installments i
  JOIN public.installment_plans p ON p.id = i.plan_id
  WHERE i.id = p_installment_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'parcela não encontrada'; END IF;
  IF v_installment.status = 'paid' THEN
    RETURN jsonb_build_object('status','already_settled','installment_id',p_installment_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = p_settled_by
      AND (pr.store_id = v_installment.store_id OR pr.role IN ('admin','master','platform_admin','superadmin'))
  ) THEN
    RAISE EXCEPTION 'ator sem acesso à loja da parcela';
  END IF;

  UPDATE public.installments
     SET status = 'paid', paid_at = now()
   WHERE id = p_installment_id;

  SELECT jsonb_build_object('status','settled','installment_id',p_installment_id,'amount_cents',v_installment.amount_cents)
    INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_installment_atomic(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_installment_atomic(uuid, uuid, text) TO authenticated;

-- Ledger de tentativas de cobrança recorrente: o worker externo/cron pode reclamar jobs sem cobrar duas vezes.
CREATE TABLE IF NOT EXISTS public.recurring_billing_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.classified_subscriptions(id) ON DELETE CASCADE,
  billing_period date NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','canceled')),
  provider text,
  provider_ref text,
  idempotency_key text NOT NULL UNIQUE,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, billing_period)
);
ALTER TABLE public.recurring_billing_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_recurring_billing_due ON public.recurring_billing_attempts(status, billing_period);

DROP POLICY IF EXISTS "subscription parties read billing attempts" ON public.recurring_billing_attempts;
CREATE POLICY "subscription parties read billing attempts"
  ON public.recurring_billing_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classified_subscriptions s
      WHERE s.id = recurring_billing_attempts.subscription_id
        AND (s.subscriber_profile_id = auth.uid() OR s.seller_profile_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.enqueue_due_recurring_billing(p_as_of date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE v_count integer;
BEGIN
  INSERT INTO public.recurring_billing_attempts(subscription_id, billing_period, amount_cents, idempotency_key)
  SELECT s.id, s.next_billing_date, s.price_cents,
         'classified-subscription:' || s.id::text || ':' || s.next_billing_date::text
    FROM public.classified_subscriptions s
   WHERE s.status = 'active'
     AND s.next_billing_date <= p_as_of
  ON CONFLICT (subscription_id, billing_period) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_due_recurring_billing(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_due_recurring_billing(date) TO service_role;

COMMIT;
