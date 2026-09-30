-- =============================================================================
-- V142: THE OMNI-MARKETING ENGINE, EXTERNAL ADS BINDING & MAX TIER ACTIVATION
-- =============================================================================

-- 1. Ensure V141 Billing Invoices & Line Items exist with Ad Boost fee types
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  invoice_number varchar(50) NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_cents int NOT NULL DEFAULT 0,
  status varchar(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PAID', 'VOID', 'OVERDUE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  origin_event_id varchar(120) NOT NULL,
  description varchar(255) NOT NULL,
  amount_cents int NOT NULL,
  fee_type varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_line_items DROP CONSTRAINT IF EXISTS billing_line_items_fee_type_check;
ALTER TABLE public.billing_line_items ADD CONSTRAINT billing_line_items_fee_type_check
  CHECK (fee_type IN ('SUBSCRIPTION_MONTHLY', 'ORDER_MICROFEE_RANDOM', 'EXTRA_USAGE', 'AD_BOOST_SPONSORED', 'EXTERNAL_ADS_BUDGET'));

-- 2. Canonical invoice_ledger table for atomic V141/V142 billing operations
CREATE TABLE IF NOT EXISTS public.invoice_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type varchar(40) NOT NULL CHECK (entity_type IN ('product_boost', 'classified_boost', 'external_ad_campaign', 'subscription', 'order_microfee')),
  entity_id uuid,
  plan_tier varchar(20) NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'mvp', 'pro', 'max')),
  original_amount_cents int NOT NULL DEFAULT 0,
  discount_cents int NOT NULL DEFAULT 0,
  amount_cents int NOT NULL DEFAULT 0,
  currency varchar(10) NOT NULL DEFAULT 'BRL',
  status varchar(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'included_in_max', 'refunded')),
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_ledger_store_id ON public.invoice_ledger(store_id);
CREATE INDEX IF NOT EXISTS idx_invoice_ledger_entity ON public.invoice_ledger(entity_type, entity_id);

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store members read own invoice_ledger" ON public.invoice_ledger;
CREATE POLICY "Store members read own invoice_ledger"
  ON public.invoice_ledger FOR SELECT
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = invoice_ledger.store_id AND wm.profile_id = auth.uid()
    )
  );

-- 3. Sponsored columns on classifieds and products for 1:4 Vitrine Interleaving
ALTER TABLE public.classifieds
  ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsored_until timestamptz;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsored_until timestamptz;

-- Sync existing boosted classifieds
UPDATE public.classifieds
SET is_sponsored = COALESCE(is_boosted, false),
    sponsored_until = boosted_until
WHERE is_boosted = true;

CREATE OR REPLACE FUNCTION public.fn_sync_classified_sponsored_flags()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_sponsored IS DISTINCT FROM OLD.is_sponsored OR NEW.sponsored_until IS DISTINCT FROM OLD.sponsored_until THEN
    NEW.is_boosted := NEW.is_sponsored;
    NEW.boosted_until := NEW.sponsored_until;
  ELSIF NEW.is_boosted IS DISTINCT FROM OLD.is_boosted OR NEW.boosted_until IS DISTINCT FROM OLD.boosted_until THEN
    NEW.is_sponsored := COALESCE(NEW.is_boosted, false);
    NEW.sponsored_until := NEW.boosted_until;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_classified_sponsored_flags ON public.classifieds;
CREATE TRIGGER trg_sync_classified_sponsored_flags
BEFORE UPDATE ON public.classifieds
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_classified_sponsored_flags();

CREATE INDEX IF NOT EXISTS idx_classifieds_sponsored_active
  ON public.classifieds(is_sponsored, sponsored_until DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_products_sponsored_active
  ON public.products(is_sponsored, sponsored_until DESC)
  WHERE status = 'published';

-- 4. External Ad Accounts OAuth 2.0 & Graph API Binding
ALTER TABLE public.store_ad_accounts
  ADD COLUMN IF NOT EXISTS oauth_access_token text,
  ADD COLUMN IF NOT EXISTS oauth_refresh_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_business_id varchar(120),
  ADD COLUMN IF NOT EXISTS pixel_id varchar(120),
  ADD COLUMN IF NOT EXISTS conversion_id varchar(120),
  ADD COLUMN IF NOT EXISTS last_api_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 5. Closed-loop attribution column on orders (V139 Checkout <-> V142 Ads)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS attributed_campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS utm_source varchar(80),
  ADD COLUMN IF NOT EXISTS utm_campaign varchar(120);

CREATE INDEX IF NOT EXISTS idx_orders_attributed_campaign ON public.orders(attributed_campaign_id);
