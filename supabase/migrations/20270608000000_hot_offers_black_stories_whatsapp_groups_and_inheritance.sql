-- ============================================================================
-- Migration: 20270608000000_hot_offers_black_stories_whatsapp_groups_and_inheritance.sql
-- Purpose:
--   1. Create `public.hot_offers` (Master Public Offer, Zero-PII) with strict RLS.
--   2. Add bilateral inheritance columns on `public.travel_proposals` (`source_offer_id`, `promoted_to_offer_id`, `is_offer_source_eligible`, `historical_price_verdict`, `override_notes`).
--   3. Extend `public.stories` with `story_kind`, `hot_offer_id`, `source_proposal_id`, `offer_badge_label`, `offer_price_cents`, `flame_style`.
--   4. Extend `public.whatsapp_groups_directory` with `group_role`, `auto_publish_eligible`, `silence_lead_capture`, `default_instance_id`, `offer_dispatch_preferences` + trigger enforcing `internal_team` invariants.
--   5. Create `public.offer_campaign_dispatches` for WhatsApp group & Radar lead dispatch auditing with strict RLS.
-- ============================================================================

-- 1. TABELA DE OFERTAS PÚBLICAS MESTRAS (`public.hot_offers` — ZERO PII)
CREATE TABLE IF NOT EXISTS public.hot_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  source_proposal_id UUID REFERENCES public.travel_proposals(id) ON DELETE SET NULL,
  source_quote_id UUID,
  tourism_experience_id UUID REFERENCES public.tourism_experiences(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  badge_kind TEXT NOT NULL DEFAULT 'hot_offer'
    CHECK (badge_kind IN ('hot_offer', 'hot_black', 'flash', 'opportunity')),
  flame_style TEXT NOT NULL DEFAULT 'pixel_fire'
    CHECK (flame_style IN ('none', 'instagram_ring', 'pixel_fire', 'hot_black')),
  destination_city TEXT NOT NULL,
  destination_state TEXT,
  destination_country TEXT DEFAULT 'Brasil',
  origin_city TEXT,
  origin_iata TEXT,
  destination_iata TEXT,
  departure_date DATE,
  return_date DATE,
  nights_count INTEGER NOT NULL DEFAULT 0 CHECK (nights_count >= 0),
  adults_base_count INTEGER NOT NULL DEFAULT 2 CHECK (adults_base_count >= 1),
  children_base_count INTEGER NOT NULL DEFAULT 0 CHECK (children_base_count >= 0),
  price_cents BIGINT NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  original_price_cents BIGINT CHECK (original_price_cents IS NULL OR original_price_cents >= 0),
  discount_pct NUMERIC(5,2) CHECK (discount_pct IS NULL OR (discount_pct >= 0 AND discount_pct <= 99)),
  historical_verdict TEXT NOT NULL DEFAULT 'insufficient_history'
    CHECK (historical_verdict IN ('great_deal', 'fair_price', 'above_market', 'insufficient_history')),
  historical_savings_pct NUMERIC(5,2),
  historical_median_cents BIGINT,
  installments_max INTEGER NOT NULL DEFAULT 10 CHECK (installments_max >= 1 AND installments_max <= 36),
  installment_value_cents BIGINT,
  pix_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  seats_left INTEGER CHECK (seats_left IS NULL OR seats_left >= 0),
  flights JSONB NOT NULL DEFAULT '[]'::jsonb,
  hotels JSONB NOT NULL DEFAULT '[]'::jsonb,
  transfers JSONB NOT NULL DEFAULT '[]'::jsonb,
  itinerary JSONB NOT NULL DEFAULT '[]'::jsonb,
  inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
  exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  story_media_url TEXT,
  group_media_url TEXT,
  whatsapp_copy_summary TEXT,
  boarding_requirements TEXT,
  cancellation_policy TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'paused', 'expired', 'archived')),
  is_published_in_app BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  views_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  leads_generated_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_hot_offers_store_status_expires
  ON public.hot_offers (store_id, status, is_published_in_app, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_hot_offers_source_proposal
  ON public.hot_offers (source_proposal_id)
  WHERE source_proposal_id IS NOT NULL;

ALTER TABLE public.hot_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_offers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hot_offers_staff_all" ON public.hot_offers;
CREATE POLICY "hot_offers_staff_all"
  ON public.hot_offers
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

DROP POLICY IF EXISTS "hot_offers_public_active_select" ON public.hot_offers;
CREATE POLICY "hot_offers_public_active_select"
  ON public.hot_offers
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND is_published_in_app = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- 2. HERANÇA BILATERAL EM `public.travel_proposals` (OFERTA-MESTRE <-> PROPOSTA POR CLIENTE)
ALTER TABLE public.travel_proposals
  ADD COLUMN IF NOT EXISTS source_offer_id UUID REFERENCES public.hot_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promoted_to_offer_id UUID REFERENCES public.hot_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_offer_source_eligible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS historical_price_verdict JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS override_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_travel_proposals_source_offer
  ON public.travel_proposals (store_id, source_offer_id)
  WHERE source_offer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_travel_proposals_promoted_to_offer
  ON public.travel_proposals (store_id, promoted_to_offer_id)
  WHERE promoted_to_offer_id IS NOT NULL;

-- 3. EVOLUÇÃO DE `public.stories` PARA HOT STORIES & FLAME STYLE
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS story_kind TEXT NOT NULL DEFAULT 'standard'
    CHECK (story_kind IN ('standard', 'hot_offer', 'hot_black')),
  ADD COLUMN IF NOT EXISTS hot_offer_id UUID REFERENCES public.hot_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_proposal_id UUID REFERENCES public.travel_proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_badge_label TEXT,
  ADD COLUMN IF NOT EXISTS offer_price_cents BIGINT,
  ADD COLUMN IF NOT EXISTS flame_style TEXT NOT NULL DEFAULT 'pixel_fire'
    CHECK (flame_style IN ('none', 'instagram_ring', 'pixel_fire', 'hot_black'));

CREATE INDEX IF NOT EXISTS idx_stories_store_kind_expires
  ON public.stories (store_id, story_kind, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_stories_hot_offer_id
  ON public.stories (hot_offer_id)
  WHERE hot_offer_id IS NOT NULL;

-- 4. EVOLUÇÃO DE `public.whatsapp_groups_directory` PARA GOVERNANÇA DE PAPÉIS
ALTER TABLE public.whatsapp_groups_directory
  ADD COLUMN IF NOT EXISTS group_role TEXT NOT NULL DEFAULT 'unclassified'
    CHECK (group_role IN ('unclassified', 'promo_offers', 'internal_team', 'client_vip', 'operational')),
  ADD COLUMN IF NOT EXISTS auto_publish_eligible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS silence_lead_capture BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_instance_id UUID REFERENCES public.whatsapp_channel_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_dispatch_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_directory_store_role
  ON public.whatsapp_groups_directory (store_id, group_role, auto_publish_eligible);

CREATE OR REPLACE FUNCTION public.enforce_whatsapp_group_role_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.group_role = 'internal_team' THEN
    NEW.silence_lead_capture := true;
    NEW.auto_publish_eligible := false;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_whatsapp_group_role_invariants ON public.whatsapp_groups_directory;
CREATE TRIGGER trg_enforce_whatsapp_group_role_invariants
  BEFORE INSERT OR UPDATE ON public.whatsapp_groups_directory
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_whatsapp_group_role_invariants();

-- 5. AUDITORIA DE DISPAROS DE OFERTAS (`public.offer_campaign_dispatches`)
CREATE TABLE IF NOT EXISTS public.offer_campaign_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  hot_offer_id UUID NOT NULL REFERENCES public.hot_offers(id) ON DELETE CASCADE,
  source_proposal_id UUID REFERENCES public.travel_proposals(id) ON DELETE SET NULL,
  target_kind TEXT NOT NULL DEFAULT 'whatsapp_group'
    CHECK (target_kind IN ('whatsapp_group', 'matched_lead')),
  whatsapp_group_id UUID REFERENCES public.whatsapp_groups_directory(id) ON DELETE SET NULL,
  group_jid TEXT,
  group_name TEXT,
  lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  inherited_proposal_id UUID REFERENCES public.travel_proposals(id) ON DELETE SET NULL,
  recipient_phone TEXT,
  instance_id UUID REFERENCES public.whatsapp_channel_instances(id) ON DELETE SET NULL,
  media_url TEXT,
  caption_text TEXT NOT NULL,
  tracked_url TEXT NOT NULL,
  outbox_id UUID,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'blocked_internal_group')),
  error_message TEXT,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  dispatched_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_campaign_dispatches_store_offer
  ON public.offer_campaign_dispatches (store_id, hot_offer_id, dispatched_at DESC);

ALTER TABLE public.offer_campaign_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_campaign_dispatches FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offer_campaign_dispatches_staff_all" ON public.offer_campaign_dispatches;
CREATE POLICY "offer_campaign_dispatches_staff_all"
  ON public.offer_campaign_dispatches
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));
