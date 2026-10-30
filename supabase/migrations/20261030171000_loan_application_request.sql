-- Waesy: persist credit requests without implying approval or disbursement.
BEGIN;

CREATE TABLE IF NOT EXISTS public.loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 10000),
  installments_count INTEGER NOT NULL CHECK (installments_count IN (6, 12, 18, 24, 36)),
  monthly_payment_cents BIGINT NOT NULL CHECK (monthly_payment_cents > 0),
  total_payable_cents BIGINT NOT NULL CHECK (total_payable_cents >= amount_cents),
  first_due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loan_applications_customer_select" ON public.loan_applications;
CREATE POLICY "loan_applications_customer_select"
  ON public.loan_applications FOR SELECT
  USING (customer_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.loan_applications FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.loan_applications FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.loan_applications FROM authenticated;
GRANT SELECT ON public.loan_applications TO authenticated;
GRANT ALL ON public.loan_applications TO service_role;

CREATE OR REPLACE FUNCTION public.submit_loan_application(
  p_customer_id UUID,
  p_amount_cents BIGINT,
  p_installments_count INTEGER,
  p_monthly_payment_cents BIGINT,
  p_total_payable_cents BIGINT,
  p_first_due_date DATE
) RETURNS TABLE (id UUID, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Cliente autenticado é obrigatório.';
  END IF;

  IF p_amount_cents < 10000 OR p_total_payable_cents < p_amount_cents THEN
    RAISE EXCEPTION 'Parâmetros financeiros inválidos.';
  END IF;

  RETURN QUERY
  INSERT INTO public.loan_applications (
    customer_id, amount_cents, installments_count, monthly_payment_cents,
    total_payable_cents, first_due_date
  ) VALUES (
    p_customer_id, p_amount_cents, p_installments_count, p_monthly_payment_cents,
    p_total_payable_cents, p_first_due_date
  )
  RETURNING loan_applications.id, loan_applications.status;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_loan_application(UUID, BIGINT, INTEGER, BIGINT, BIGINT, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_loan_application(UUID, BIGINT, INTEGER, BIGINT, BIGINT, DATE) FROM anon;
REVOKE ALL ON FUNCTION public.submit_loan_application(UUID, BIGINT, INTEGER, BIGINT, BIGINT, DATE) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_loan_application(UUID, BIGINT, INTEGER, BIGINT, BIGINT, DATE) TO service_role;

COMMIT;
