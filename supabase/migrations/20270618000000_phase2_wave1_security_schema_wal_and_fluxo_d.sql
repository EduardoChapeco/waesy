-- ============================================================================
-- Migration: Phase 2 Wave 1 — Security/RLS Hardening, Schema Parity, WAL Relief & Fluxo D
-- Spec: docs/specs/SPEC-20261119-PHASE2-CORE-MULTINICHE-TURIS.md
-- ============================================================================

-- 1. Harden deduplicate_and_link_lead_to_customer (tenant guard + REVOKE PUBLIC)
CREATE OR REPLACE FUNCTION public.deduplicate_and_link_lead_to_customer(
  p_lead_id uuid,
  p_store_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead RECORD;
  v_customer_id UUID;
  v_existing_lead_count INTEGER;
  v_doc TEXT;
  v_lead_digits TEXT;
  v_suffix8 TEXT;
  v_is_real_email BOOLEAN;
  v_avatar TEXT;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_store_staff(p_store_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: acesso negado ao tenant %', p_store_id;
  END IF;

  SELECT * INTO v_lead
  FROM public.leads_crm
  WHERE id = p_lead_id AND store_id = p_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado ou não pertence a este tenant.';
  END IF;

  IF v_lead.customer_id IS NOT NULL THEN
    IF v_lead.phone IS NOT NULL AND btrim(v_lead.phone) <> '' THEN
      v_lead_digits := public.normalize_crm_phone_digits(v_lead.phone);
      v_suffix8 := CASE WHEN length(v_lead_digits) >= 8 THEN right(v_lead_digits, 8) ELSE NULL END;

      UPDATE public.chat_threads
      SET customer_id = v_lead.customer_id, updated_at = now()
      WHERE store_id = p_store_id
        AND customer_id IS NULL
        AND (
          lead_id = p_lead_id
          OR primary_phone_e164 = v_lead.phone
          OR (v_lead_digits IS NOT NULL AND public.normalize_crm_phone_digits(primary_phone_e164) = v_lead_digits)
          OR (v_suffix8 IS NOT NULL AND right(COALESCE(public.normalize_crm_phone_digits(primary_phone_e164), ''), 8) = v_suffix8)
        );
    END IF;

    RETURN v_lead.customer_id;
  END IF;

  v_doc := COALESCE(
    NULLIF(btrim(v_lead.document), ''),
    NULLIF(btrim(v_lead.custom_fields ->> 'cpf'), ''),
    NULLIF(btrim(v_lead.custom_fields ->> 'document'), '')
  );

  v_avatar := COALESCE(
    NULLIF(btrim(v_lead.custom_fields ->> 'avatar_url'), ''),
    NULLIF(btrim(v_lead.custom_fields ->> 'photo_url'), '')
  );

  IF v_doc IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM public.customers_crm
    WHERE store_id = p_store_id AND document = v_doc
    LIMIT 1;
  END IF;

  v_lead_digits := COALESCE(v_lead.phone_normalized_digits, public.normalize_crm_phone_digits(v_lead.phone));
  v_suffix8 := CASE WHEN v_lead_digits IS NOT NULL AND length(v_lead_digits) >= 8 THEN right(v_lead_digits, 8) ELSE NULL END;

  IF v_customer_id IS NULL AND v_lead.phone IS NOT NULL AND btrim(v_lead.phone) <> '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers_crm
    WHERE store_id = p_store_id
      AND (
        phone = v_lead.phone
        OR (v_lead_digits IS NOT NULL AND public.normalize_crm_phone_digits(phone) = v_lead_digits)
        OR (v_suffix8 IS NOT NULL AND right(COALESCE(public.normalize_crm_phone_digits(phone), ''), 8) = v_suffix8)
      )
    LIMIT 1;
  END IF;

  v_is_real_email :=
    v_lead.email IS NOT NULL
    AND btrim(v_lead.email) <> ''
    AND lower(v_lead.email) NOT LIKE '%@whatsapp.waesy'
    AND lower(v_lead.email) NOT LIKE '%@sem-email.waesy.local';

  IF v_customer_id IS NULL AND v_is_real_email THEN
    SELECT id INTO v_customer_id
    FROM public.customers_crm
    WHERE store_id = p_store_id AND lower(email) = lower(v_lead.email)
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers_crm (
      store_id, kind, full_name, name, email, phone, document, avatar_url,
      channel, tags, notes, lifetime_lead_count, last_commercial_touch_at,
      lgpd_accepted, custom_fields
    ) VALUES (
      p_store_id,
      'individual',
      COALESCE(v_lead.full_name, v_lead.title, 'Cliente'),
      COALESCE(v_lead.full_name, v_lead.title, 'Cliente'),
      CASE WHEN v_is_real_email THEN v_lead.email ELSE NULL END,
      v_lead.phone,
      v_doc,
      v_avatar,
      COALESCE(v_lead.source, 'kanban'),
      COALESCE(v_lead.tags, ARRAY[]::text[]),
      v_lead.notes,
      1,
      COALESCE(v_lead.created_at, now()),
      COALESCE(v_lead.lgpd_accepted, true),
      COALESCE(v_lead.custom_fields, '{}'::jsonb)
    )
    RETURNING id INTO v_customer_id;
  ELSE
    SELECT COUNT(*) INTO v_existing_lead_count
    FROM public.leads_crm
    WHERE store_id = p_store_id AND customer_id = v_customer_id;

    UPDATE public.customers_crm
    SET
      full_name = COALESCE(NULLIF(btrim(full_name), ''), v_lead.full_name),
      name = COALESCE(NULLIF(btrim(name), ''), v_lead.full_name),
      phone = COALESCE(NULLIF(btrim(phone), ''), v_lead.phone),
      email = COALESCE(NULLIF(btrim(email), ''), CASE WHEN v_is_real_email THEN v_lead.email ELSE NULL END),
      document = COALESCE(NULLIF(btrim(document), ''), v_doc),
      avatar_url = COALESCE(NULLIF(btrim(avatar_url), ''), v_avatar),
      lifetime_lead_count = GREATEST(lifetime_lead_count, v_existing_lead_count + 1),
      last_commercial_touch_at = now(),
      updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  UPDATE public.leads_crm
  SET customer_id = v_customer_id, updated_at = now()
  WHERE id = p_lead_id AND store_id = p_store_id;

  IF v_lead.phone IS NOT NULL AND btrim(v_lead.phone) <> '' THEN
    UPDATE public.chat_threads
    SET customer_id = v_customer_id, updated_at = now()
    WHERE store_id = p_store_id
      AND (customer_id IS NULL OR customer_id = v_customer_id)
      AND (
        lead_id = p_lead_id
        OR primary_phone_e164 = v_lead.phone
        OR (v_lead_digits IS NOT NULL AND public.normalize_crm_phone_digits(primary_phone_e164) = v_lead_digits)
        OR (v_suffix8 IS NOT NULL AND right(COALESCE(public.normalize_crm_phone_digits(primary_phone_e164), ''), 8) = v_suffix8)
      );
  END IF;

  RETURN v_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.deduplicate_and_link_lead_to_customer(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduplicate_and_link_lead_to_customer(uuid, uuid) TO authenticated, service_role;

-- 2. Harden match_next_cards_batch (cap p_limit <= 50 + REVOKE PUBLIC)
CREATE OR REPLACE FUNCTION public.match_next_cards_batch(
  p_store_id UUID,
  p_visitor_session_id TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  deck_template_id UUID,
  card_kind TEXT,
  title TEXT,
  subtitle TEXT,
  badge TEXT,
  cover_image_url TEXT,
  media_urls JSONB,
  metadata JSONB,
  trade_off_axis TEXT,
  axis_weights JSONB,
  linked_entity_id UUID,
  cta_label TEXT,
  display_order INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    mc.id,
    mc.deck_template_id,
    mc.card_kind,
    mc.title,
    mc.subtitle,
    mc.badge,
    mc.cover_image_url,
    mc.media_urls,
    mc.metadata,
    mc.trade_off_axis,
    mc.axis_weights,
    mc.linked_entity_id,
    mc.cta_label,
    mc.display_order
  FROM public.match_cards mc
  WHERE mc.store_id = p_store_id
    AND mc.active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.match_time_swipes mts
      WHERE mts.match_card_id = mc.id
        AND mts.visitor_session_id = p_visitor_session_id
    )
  ORDER BY mc.display_order ASC, mc.created_at ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
$$;

REVOKE ALL ON FUNCTION public.match_next_cards_batch(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_next_cards_batch(uuid, text, integer) TO anon, authenticated, service_role;

-- 3. Tighten system_error_logs INSERT policy (no anonymous flood)
DROP POLICY IF EXISTS "system_error_logs_insert" ON public.system_error_logs;
CREATE POLICY "system_error_logs_authenticated_insert"
  ON public.system_error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

-- 4. Restore full fields + source_pixels in get_store_public_pixels(uuid)
CREATE OR REPLACE FUNCTION public.get_store_public_pixels(p_store_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH legacy AS (
    SELECT
      meta_pixel_id,
      google_ads_id,
      google_ads_conversion_label,
      ga4_measurement_id,
      gtm_id,
      tiktok_pixel_id,
      google_site_verification,
      meta_domain_verification,
      track_whatsapp_leads,
      track_page_views,
      track_catalog_views,
      track_quotes,
      track_purchases
    FROM public.store_pixel_configs
    WHERE store_id = p_store_id
    LIMIT 1
  ),
  active_multi AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'provider', p.provider,
        'external_pixel_id', p.external_pixel_id,
        'enabled_events', p.enabled_events,
        'routing_rules', p.routing_rules,
        'is_default', p.is_default
      )
      ORDER BY p.is_default DESC, p.created_at ASC
    ) AS items
    FROM public.marketing_source_pixels p
    WHERE p.store_id = p_store_id
      AND p.is_active = true
  )
  SELECT jsonb_build_object(
    'meta_pixel_id', (SELECT meta_pixel_id FROM legacy),
    'google_ads_id', (SELECT google_ads_id FROM legacy),
    'google_ads_conversion_label', (SELECT google_ads_conversion_label FROM legacy),
    'ga4_measurement_id', (SELECT ga4_measurement_id FROM legacy),
    'gtm_id', (SELECT gtm_id FROM legacy),
    'tiktok_pixel_id', (SELECT tiktok_pixel_id FROM legacy),
    'google_site_verification', (SELECT google_site_verification FROM legacy),
    'meta_domain_verification', (SELECT meta_domain_verification FROM legacy),
    'track_whatsapp_leads', COALESCE((SELECT track_whatsapp_leads FROM legacy), true),
    'track_page_views', COALESCE((SELECT track_page_views FROM legacy), true),
    'track_catalog_views', COALESCE((SELECT track_catalog_views FROM legacy), true),
    'track_quotes', COALESCE((SELECT track_quotes FROM legacy), true),
    'track_purchases', COALESCE((SELECT track_purchases FROM legacy), true),
    'source_pixels', COALESCE((SELECT items FROM active_multi), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.get_store_public_pixels(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_store_public_pixels(uuid) TO anon, authenticated, service_role;

-- 5. Schema parity columns for Attribution, CAPI Telemetry, Lead Forms, Ads 360, Kanban, CRM & Fluxo D
ALTER TABLE IF EXISTS public.ad_attribution_touchpoints
  ADD COLUMN IF NOT EXISTS source_pixel_id UUID,
  ADD COLUMN IF NOT EXISTS external_form_id TEXT,
  ADD COLUMN IF NOT EXISTS ad_effective_status TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_conversion_telemetry') THEN
    ALTER TABLE public.lead_conversion_telemetry
      DROP CONSTRAINT IF EXISTS lead_conversion_telemetry_channel_check;
    ALTER TABLE public.lead_conversion_telemetry
      ADD CONSTRAINT lead_conversion_telemetry_channel_check
      CHECK (channel IN ('meta_capi', 'google_ads', 'tiktok', 'ga4_mp', 'meta_ads'));
  END IF;
END $$;

ALTER TABLE IF EXISTS public.lead_forms
  ADD COLUMN IF NOT EXISTS background_image_url TEXT,
  ADD COLUMN IF NOT EXISTS default_source_pixel_id UUID,
  ADD COLUMN IF NOT EXISTS financial_qualification_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.lead_form_fields
  ADD COLUMN IF NOT EXISTS step_index INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS skip_to_step INTEGER;

ALTER TABLE IF EXISTS public.financial_transactions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_transactions_store_proposal_ref
  ON public.financial_transactions (store_id, (metadata ->> 'proposal_id'))
  WHERE metadata ? 'proposal_id' AND NULLIF(metadata ->> 'proposal_id', '') IS NOT NULL;

ALTER TABLE IF EXISTS public.signature_envelopes
  ADD COLUMN IF NOT EXISTS otp_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_sent_to TEXT;

ALTER TABLE IF EXISTS public.store_ad_campaigns
  ADD COLUMN IF NOT EXISTS external_adset_id TEXT,
  ADD COLUMN IF NOT EXISTS external_ad_id TEXT,
  ADD COLUMN IF NOT EXISTS effective_status TEXT,
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS spend_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impressions BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS adsets_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ads_json JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_store_ad_campaigns_store_channel_external
  ON public.store_ad_campaigns (store_id, channel, external_campaign_id)
  WHERE external_campaign_id IS NOT NULL;

ALTER TABLE IF EXISTS public.kanban_stage_configs
  ADD COLUMN IF NOT EXISTS capi_event_name TEXT,
  ADD COLUMN IF NOT EXISTS qualification_tier TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'kanban_stage_configs') THEN
    ALTER TABLE public.kanban_stage_configs
      DROP CONSTRAINT IF EXISTS kanban_stage_configs_qualification_tier_check;
    ALTER TABLE public.kanban_stage_configs
      ADD CONSTRAINT kanban_stage_configs_qualification_tier_check
      CHECK (qualification_tier IS NULL OR qualification_tier IN ('raw', 'mql', 'sql', 'won', 'lost'));
  END IF;
END $$;

ALTER TABLE IF EXISTS public.leads_crm
  ADD COLUMN IF NOT EXISTS ad_effective_status TEXT,
  ADD COLUMN IF NOT EXISTS ad_deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out_reason TEXT,
  ADD COLUMN IF NOT EXISTS sondagem_checklist JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.customers_crm
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out_at TIMESTAMPTZ;

-- 6. WAL Relief: switch chat_messages from REPLICA IDENTITY FULL -> DEFAULT (DEC-536 EBS protection)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    EXECUTE 'ALTER TABLE public.chat_messages REPLICA IDENTITY DEFAULT';
  END IF;
END $$;

-- 7. Critical performance indexes (guarded for schema resilience)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created_desc
      ON public.chat_messages (thread_id, created_at DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads_crm') THEN
    CREATE INDEX IF NOT EXISTS idx_leads_crm_store_status_updated
      ON public.leads_crm (store_id, status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_leads_crm_store_opt_out
      ON public.leads_crm (store_id, whatsapp_opt_out)
      WHERE whatsapp_opt_out = true;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers_crm') THEN
    CREATE INDEX IF NOT EXISTS idx_customers_crm_store_phone
      ON public.customers_crm (store_id, phone);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ad_campaigns') THEN
    CREATE INDEX IF NOT EXISTS idx_ad_campaigns_store_id
      ON public.ad_campaigns (store_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_sales') THEN
    CREATE INDEX IF NOT EXISTS idx_travel_sales_store_created
      ON public.travel_sales (store_id, created_at DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tourism_experiences') THEN
    CREATE INDEX IF NOT EXISTS idx_tourism_experiences_store_id
      ON public.tourism_experiences (store_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offer_campaign_dispatches') THEN
    CREATE INDEX IF NOT EXISTS idx_offer_campaign_dispatches_store_created
      ON public.offer_campaign_dispatches (store_id, created_at DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_scheduled_messages' AND column_name = 'scheduled_for') THEN
    CREATE INDEX IF NOT EXISTS idx_whatsapp_scheduled_messages_due
      ON public.whatsapp_scheduled_messages (store_id, scheduled_for)
      WHERE status = 'scheduled';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
