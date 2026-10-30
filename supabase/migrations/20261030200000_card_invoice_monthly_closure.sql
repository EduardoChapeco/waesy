-- Fechamento mensal idempotente de faturas de cartão.
-- A função calcula o total a partir de card_invoice_items e não aceita valores do cliente.

CREATE OR REPLACE FUNCTION public.close_due_card_invoices()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_row RECORD;
  next_period DATE;
  next_month INTEGER;
  next_year INTEGER;
  closed_count INTEGER := 0;
  invoice_total BIGINT;
BEGIN
  UPDATE public.card_invoices
  SET status = 'OVERDUE', updated_at = now()
  WHERE status = 'CLOSED'
    AND due_date < current_date
    AND paid_amount_cents < amount_cents;

  FOR invoice_row IN
    SELECT id, card_id, profile_id, reference_month, reference_year, closing_date
    FROM public.card_invoices
    WHERE status = 'OPEN'
      AND closing_date <= current_date
    FOR UPDATE
  LOOP
    SELECT COALESCE(SUM(amount_cents), 0)::BIGINT
      INTO invoice_total
    FROM public.card_invoice_items
    WHERE invoice_id = invoice_row.id;

    UPDATE public.card_invoices
    SET status = 'CLOSED',
        amount_cents = invoice_total,
        updated_at = now()
    WHERE id = invoice_row.id
      AND status = 'OPEN';

    next_period := make_date(invoice_row.reference_year, invoice_row.reference_month, 1) + INTERVAL '1 month';
    next_month := EXTRACT(MONTH FROM next_period)::INTEGER;
    next_year := EXTRACT(YEAR FROM next_period)::INTEGER;

    INSERT INTO public.card_invoices (
      card_id, profile_id, reference_month, reference_year,
      due_date, closing_date, status, amount_cents, paid_amount_cents
    )
    VALUES (
      invoice_row.card_id,
      invoice_row.profile_id,
      next_month,
      next_year,
      make_date(next_year, next_month, 15),
      make_date(next_year, next_month, 8),
      'OPEN',
      0,
      0
    )
    ON CONFLICT (card_id, reference_year, reference_month) DO NOTHING;

    closed_count := closed_count + 1;
  END LOOP;

  RETURN closed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.close_due_card_invoices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_due_card_invoices() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'waesy-card-invoice-closure-daily'
    ) THEN
      PERFORM cron.schedule(
        'waesy-card-invoice-closure-daily',
        '5 3 * * *',
        'SELECT public.close_due_card_invoices();'
      );
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron indisponível; fechamento permanece executável por job externo seguro.';
END;
$$;
