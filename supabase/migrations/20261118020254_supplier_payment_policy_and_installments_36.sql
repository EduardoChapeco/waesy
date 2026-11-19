ALTER TABLE public.travel_suppliers
  ADD COLUMN IF NOT EXISTS max_card_installments INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS max_boleto_installments INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS card_interest_free BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS boleto_requires_downpayment BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS boleto_downpayment_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pix_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowed_payment_methods TEXT[] NOT NULL DEFAULT ARRAY['pix','credit_card','boleto']::TEXT[],
  ADD COLUMN IF NOT EXISTS payment_terms_template TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'travel_suppliers_max_card_installments_check'
      AND conrelid = 'public.travel_suppliers'::regclass
  ) THEN
    ALTER TABLE public.travel_suppliers
      ADD CONSTRAINT travel_suppliers_max_card_installments_check
      CHECK (max_card_installments BETWEEN 1 AND 36);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'travel_suppliers_max_boleto_installments_check'
      AND conrelid = 'public.travel_suppliers'::regclass
  ) THEN
    ALTER TABLE public.travel_suppliers
      ADD CONSTRAINT travel_suppliers_max_boleto_installments_check
      CHECK (max_boleto_installments BETWEEN 1 AND 36);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'travel_suppliers_boleto_downpayment_pct_check'
      AND conrelid = 'public.travel_suppliers'::regclass
  ) THEN
    ALTER TABLE public.travel_suppliers
      ADD CONSTRAINT travel_suppliers_boleto_downpayment_pct_check
      CHECK (boleto_downpayment_pct BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'travel_suppliers_pix_discount_pct_check'
      AND conrelid = 'public.travel_suppliers'::regclass
  ) THEN
    ALTER TABLE public.travel_suppliers
      ADD CONSTRAINT travel_suppliers_pix_discount_pct_check
      CHECK (pix_discount_pct BETWEEN 0 AND 100);
  END IF;
END;
$$;

ALTER TABLE public.travel_proposal_acceptances
  DROP CONSTRAINT IF EXISTS travel_proposal_acceptances_payment_installments_check;

ALTER TABLE public.travel_proposal_acceptances
  ADD CONSTRAINT travel_proposal_acceptances_payment_installments_check
  CHECK (payment_installments IS NULL OR payment_installments BETWEEN 1 AND 36);
