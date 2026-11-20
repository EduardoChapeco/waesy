-- ============================================================================
-- Migration: Phase 2 Wave 5 — RFV 8-State Machine, Referral Wallet & Review Booster
-- Spec: docs/specs/SPEC-20261119-PHASE2-CORE-MULTINICHE-TURIS.md
-- ============================================================================

-- 1. Expand customers_crm with RFV Lifecycle & Post-Sale columns
ALTER TABLE IF EXISTS public.customers_crm
  ADD COLUMN IF NOT EXISTS rfv_stage TEXT NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS rfv_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrals_converted_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_nps_score INTEGER,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS passport_expires_at DATE,
  ADD COLUMN IF NOT EXISTS referral_credit_balance_cents BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers_crm') THEN
    ALTER TABLE public.customers_crm
      DROP CONSTRAINT IF EXISTS customers_crm_rfv_stage_check;
    ALTER TABLE public.customers_crm
      ADD CONSTRAINT customers_crm_rfv_stage_check
      CHECK (rfv_stage IN ('unknown', 'lead', 'opportunity', 'non_client', 'first_purchase', 'recurring', 'ex_client', 'promoter'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_crm_store_rfv_stage
  ON public.customers_crm (store_id, rfv_stage);

-- 2. customer_referral_credits (Carteira de Créditos de Indicação com Expiração e Alertas 30d/7d/1d)
CREATE TABLE IF NOT EXISTS public.customer_referral_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  advocate_customer_id UUID NOT NULL REFERENCES public.customers_crm(id) ON DELETE CASCADE,
  referred_customer_id UUID REFERENCES public.customers_crm(id) ON DELETE SET NULL,
  referred_lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  remaining_cents BIGINT NOT NULL CHECK (remaining_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '180 days'),
  alert_30d_sent_at TIMESTAMPTZ,
  alert_7d_sent_at TIMESTAMPTZ,
  alert_1d_sent_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_referral_credits_store_advocate
  ON public.customer_referral_credits (store_id, advocate_customer_id, status);

CREATE INDEX IF NOT EXISTS idx_customer_referral_credits_expiry
  ON public.customer_referral_credits (store_id, expires_at)
  WHERE status = 'active';

ALTER TABLE public.customer_referral_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_referral_credits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_referral_credits_staff_all" ON public.customer_referral_credits;
CREATE POLICY "customer_referral_credits_staff_all"
  ON public.customer_referral_credits
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

-- 3. referral_credit_ledger (Ledger Imutável de Concessão, Abatimento e Expiração)
CREATE TABLE IF NOT EXISTS public.referral_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  credit_id UUID NOT NULL REFERENCES public.customer_referral_credits(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers_crm(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('grant', 'redemption', 'expiration', 'reversal')),
  amount_cents BIGINT NOT NULL,
  target_entity_type TEXT,
  target_entity_id TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_credit_ledger_store_customer
  ON public.referral_credit_ledger (store_id, customer_id, created_at DESC);

ALTER TABLE public.referral_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_credit_ledger FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_credit_ledger_staff_all" ON public.referral_credit_ledger;
CREATE POLICY "referral_credit_ledger_staff_all"
  ON public.referral_credit_ledger
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

-- 4. review_booster_submissions (Motor Review Booster & Blindagem de Reputação)
CREATE TABLE IF NOT EXISTS public.review_booster_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers_crm(id) ON DELETE SET NULL,
  trip_id UUID,
  order_id UUID,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  destination_or_item TEXT,
  nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  testimonial_compiled TEXT,
  routing_decision TEXT CHECK (routing_decision IN ('public_gmb', 'private_retention')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted')),
  redirected_to_gmb BOOLEAN NOT NULL DEFAULT false,
  internal_retention_alert_created BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_review_booster_store_status
  ON public.review_booster_submissions (store_id, status, created_at DESC);

ALTER TABLE public.review_booster_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_booster_submissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_booster_staff_all" ON public.review_booster_submissions;
CREATE POLICY "review_booster_staff_all"
  ON public.review_booster_submissions
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

NOTIFY pgrst, 'reload schema';
