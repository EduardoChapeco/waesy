-- ============================================================================
-- MIGRATION: 20270127000001_affiliate_meliuz_phia_engine.sql
-- PURPOSE:
--   1. Bilateral Merchant <-> Affiliate Authorization (open, approval_required, invite_only).
--   2. Méliuz-style Lifecycle Commission Ledger (tracked_pending -> awaiting_escrow -> available -> paid_out / cancelled_refunded).
--   3. Merchant Monthly Affiliate Invoices & Reconciliation (merchant_affiliate_invoices).
--   4. Platform External Affiliate Hub (Booking.com, Produtos Naturais, Awin, Lomadee, Amazon).
-- ============================================================================

BEGIN;

-- 1. Autorização Bilateral Loja <-> Afiliado
CREATE TABLE IF NOT EXISTS public.affiliate_store_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  custom_commission_pct NUMERIC(5,2),
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  UNIQUE (store_id, affiliate_user_id)
);

ALTER TABLE public.affiliate_store_partnerships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view partnerships" ON public.affiliate_store_partnerships;
CREATE POLICY "Public view partnerships" ON public.affiliate_store_partnerships FOR SELECT USING (true);

DROP POLICY IF EXISTS "Affiliates request partnership" ON public.affiliate_store_partnerships;
CREATE POLICY "Affiliates request partnership" ON public.affiliate_store_partnerships
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "Participants manage partnerships" ON public.affiliate_store_partnerships;
CREATE POLICY "Participants manage partnerships" ON public.affiliate_store_partnerships
  FOR ALL TO authenticated
  USING (
    auth.uid() = affiliate_user_id OR
    store_id IN (SELECT store_id FROM public.workspace_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = affiliate_user_id OR
    store_id IN (SELECT store_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- 2. Faturas Mensais de Afiliados por Empresa (Merchant Affiliate Invoices)
CREATE TABLE IF NOT EXISTS public.merchant_affiliate_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL, -- 'YYYY-MM'
  total_tracked_sales_cents BIGINT NOT NULL DEFAULT 0,
  total_valid_commission_cents BIGINT NOT NULL DEFAULT 0,
  total_cancelled_commission_cents BIGINT NOT NULL DEFAULT 0,
  platform_fee_cents BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open_accumulating' CHECK (status IN ('open_accumulating', 'closed_pending_payment', 'reconciled_paid', 'overdue')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, reference_month)
);

ALTER TABLE public.merchant_affiliate_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store members view invoices" ON public.merchant_affiliate_invoices;
CREATE POLICY "Store members view invoices" ON public.merchant_affiliate_invoices
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT store_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 3. Livro-Razão de Comissões de Afiliados (Méliuz Lifecycle Ledger)
CREATE TABLE IF NOT EXISTS public.affiliate_commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.merchant_affiliate_invoices(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'internal_store' CHECK (source_type IN ('internal_store', 'external_partner', 'booking_travel', 'natural_products')),
  referral_handle TEXT NOT NULL,
  order_gross_cents INTEGER NOT NULL DEFAULT 0,
  commission_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  total_commission_cents INTEGER NOT NULL DEFAULT 0,
  affiliate_share_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  customer_cashback_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'tracked_pending' CHECK (status IN ('tracked_pending', 'awaiting_escrow', 'available', 'paid_out', 'cancelled_refunded')),
  matures_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  paid_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_commission_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates view own commission ledger" ON public.affiliate_commission_ledger;
CREATE POLICY "Affiliates view own commission ledger" ON public.affiliate_commission_ledger
  FOR SELECT TO authenticated
  USING (
    auth.uid() = affiliate_user_id OR
    store_id IN (SELECT store_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- 4. Hub de Campanhas Externas da Plataforma Waesy (Booking.com, Produtos Naturais, etc.)
CREATE TABLE IF NOT EXISTS public.external_affiliate_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL,
  partner_slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('hospedagem', 'produtos_naturais', 'tecnologia', 'cursos', 'moda_sustentavel')),
  badge_label TEXT NOT NULL DEFAULT 'Parceiro Verificado',
  network_provider TEXT NOT NULL DEFAULT 'direct' CHECK (network_provider IN ('direct', 'booking', 'awin', 'lomadee', 'amazon', 'hotmart')),
  base_url TEXT NOT NULL,
  affiliate_param_template TEXT NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  headline TEXT NOT NULL,
  description TEXT,
  default_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 6.00,
  influencer_split_pct NUMERIC(5,2) NOT NULL DEFAULT 60.00, -- 60% do valor vai pro influenciador
  cashback_split_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00,   -- 20% pro comprador
  platform_split_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00,   -- 20% pro Waesy
  escrow_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.external_affiliate_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view external campaigns" ON public.external_affiliate_campaigns;
CREATE POLICY "Public view external campaigns" ON public.external_affiliate_campaigns FOR SELECT USING (true);

-- Seed Campanhas Estratégicas Globais (Phia + Méliuz style)
INSERT INTO public.external_affiliate_campaigns (partner_name, partner_slug, category, badge_label, network_provider, base_url, affiliate_param_template, logo_url, banner_url, headline, description, default_commission_pct, influencer_split_pct, cashback_split_pct, platform_split_pct, escrow_days)
VALUES
  (
    'Booking.com Hotéis & Pousadas',
    'booking-com',
    'hospedagem',
    'Até 4% de Comissão + Cashback',
    'booking',
    'https://www.booking.com',
    'aid=waesy_master&label={subid}',
    '/icons/partners/booking.svg',
    '/images/partners/booking-banner.jpg',
    'Reserve hotéis, resorts e pousadas em todo o mundo',
    'Parceria oficial de viagens com comissão garantida para o influenciador e cashback creditado na carteira Waesy do viajante.',
    4.00,
    60.00,
    25.00,
    15.00,
    30
  ),
  (
    'Natue & Suplementos Naturais',
    'natue-produtos-naturais',
    'produtos_naturais',
    '8% de Comissão',
    'direct',
    'https://natue.com.br',
    'utm_source=waesy&utm_medium=affiliate&subid={subid}',
    '/icons/partners/natue.svg',
    '/images/partners/natue-banner.jpg',
    'Alimentação saudável, fitoterápicos e suplementos limpos',
    'Catálogo curado de produtos naturais, vitaminas e bem-estar para influenciadores fitness e de vida saudável.',
    8.00,
    65.00,
    20.00,
    15.00,
    15
  ),
  (
    'Amazon Brasil (Tech & Lifestyle)',
    'amazon-brasil',
    'tecnologia',
    'Até 7% de Comissão',
    'amazon',
    'https://www.amazon.com.br',
    'tag=waesy-20&ascsubtag={subid}',
    '/icons/partners/amazon.svg',
    '/images/partners/amazon-banner.jpg',
    'Eletrônicos, livros e itens essenciais do dia a dia',
    'Monetize links de periféricos, gadgets, iluminação para gravação de conteúdo e utilidades domésticas.',
    7.00,
    60.00,
    20.00,
    20.00,
    30
  )
ON CONFLICT (partner_slug) DO UPDATE
SET
  default_commission_pct = EXCLUDED.default_commission_pct,
  influencer_split_pct = EXCLUDED.influencer_split_pct,
  is_active = true;

COMMIT;
