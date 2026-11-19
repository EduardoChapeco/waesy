-- ============================================================================
-- Migration: Omnichannel Lead Dedup, Internal Contacts, Marketing Sources,
--            Multi-Pixel CAPI Routing, Private Chat Media Bucket & SLA Index
-- Spec: docs/specs/SPEC-20261116-OMNICHANNEL-CRM-MULTIPIXEL-SDR-SLA.md
-- ============================================================================

-- ── 1. Deduplicacao deterministica de Leads CRM por telefone normalizado ────
ALTER TABLE public.leads_crm
  ADD COLUMN IF NOT EXISTS phone_normalized_digits text;

CREATE OR REPLACE FUNCTION public.normalize_crm_phone_digits(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_digits text;
BEGIN
  IF p_raw IS NULL OR btrim(p_raw) = '' THEN
    RETURN NULL;
  END IF;
  v_digits := regexp_replace(split_part(btrim(p_raw), '@', 1), '\D', '', 'g');
  IF length(v_digits) < 8 OR length(v_digits) > 15 THEN
    RETURN NULL;
  END IF;
  RETURN v_digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_leads_crm_phone_normalized()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.phone_normalized_digits := public.normalize_crm_phone_digits(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_leads_crm_phone_normalized ON public.leads_crm;
CREATE TRIGGER trg_sync_leads_crm_phone_normalized
  BEFORE INSERT OR UPDATE OF phone ON public.leads_crm
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_leads_crm_phone_normalized();

UPDATE public.leads_crm
SET phone_normalized_digits = public.normalize_crm_phone_digits(phone)
WHERE phone IS NOT NULL
  AND phone_normalized_digits IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_crm_store_phone_digits
  ON public.leads_crm (store_id, phone_normalized_digits)
  WHERE phone_normalized_digits IS NOT NULL;

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
BEGIN
  SELECT * INTO v_lead
  FROM public.leads_crm
  WHERE id = p_lead_id AND store_id = p_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado ou não pertence a este tenant.';
  END IF;

  IF v_lead.customer_id IS NOT NULL THEN
    RETURN v_lead.customer_id;
  END IF;

  v_doc := COALESCE(
    NULLIF(btrim(v_lead.document), ''),
    NULLIF(btrim(v_lead.custom_fields ->> 'cpf'), ''),
    NULLIF(btrim(v_lead.custom_fields ->> 'document'), '')
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
      store_id,
      kind,
      full_name,
      name,
      email,
      phone,
      document,
      channel,
      tags,
      notes,
      lifetime_lead_count,
      last_commercial_touch_at,
      lgpd_accepted,
      custom_fields
    ) VALUES (
      p_store_id,
      'individual',
      COALESCE(v_lead.full_name, v_lead.title, 'Cliente'),
      COALESCE(v_lead.full_name, v_lead.title, 'Cliente'),
      CASE WHEN v_is_real_email THEN v_lead.email ELSE NULL END,
      v_lead.phone,
      v_doc,
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
      lifetime_lead_count = GREATEST(lifetime_lead_count, v_existing_lead_count + 1),
      last_commercial_touch_at = now(),
      updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  UPDATE public.leads_crm
  SET customer_id = v_customer_id, updated_at = now()
  WHERE id = p_lead_id AND store_id = p_store_id;

  RETURN v_customer_id;
END;
$$;

-- ── 2. Classificacao de Contatos Internos / Silenciamento CRM ────────────────
ALTER TABLE public.whatsapp_contact_identities
  ADD COLUMN IF NOT EXISTS contact_scope text NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS suppress_lead_capture boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_role_label text,
  ADD COLUMN IF NOT EXISTS muted_at timestamptz;

DO $$
BEGIN
  ALTER TABLE public.whatsapp_contact_identities
    DROP CONSTRAINT IF EXISTS whatsapp_contact_identities_contact_scope_check;
  ALTER TABLE public.whatsapp_contact_identities
    ADD CONSTRAINT whatsapp_contact_identities_contact_scope_check
    CHECK (contact_scope IN ('lead', 'internal_team', 'stakeholder', 'supplier', 'ignored'));
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_identity_scope_suppress
  ON public.whatsapp_contact_identities (store_id, suppress_lead_capture, contact_scope);

-- ── 3. Fontes de Aquisicao & Multi-Pixel / Roteamento CAPI ───────────────────
CREATE TABLE IF NOT EXISTS public.marketing_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'meta_ads'
    CHECK (platform IN ('meta_ads', 'google_ads', 'tiktok_ads', 'web_portal', 'whatsapp_organic', 'referral', 'offline', 'custom')),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_marketing_sources_store
  ON public.marketing_sources (store_id, is_active, created_at DESC);

ALTER TABLE public.marketing_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_sources FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_sources_staff_all" ON public.marketing_sources;
CREATE POLICY "marketing_sources_staff_all"
  ON public.marketing_sources
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_store_staff(store_id))
  WITH CHECK (public.is_platform_admin() OR public.is_store_staff(store_id));

DROP POLICY IF EXISTS "marketing_sources_service_all" ON public.marketing_sources;
CREATE POLICY "marketing_sources_service_all"
  ON public.marketing_sources
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.marketing_source_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.marketing_sources(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'meta_pixel'
    CHECK (provider IN ('meta_pixel', 'google_ads', 'ga4', 'tiktok_pixel', 'custom_capi')),
  external_pixel_id text NOT NULL,
  ad_account_id text,
  page_id text,
  secret_payload_encrypted text,
  capi_token_configured boolean NOT NULL DEFAULT false,
  test_event_code text,
  enabled_events jsonb NOT NULL DEFAULT '{"page_view":true,"view_content":true,"lead":true,"qualified_lead":true,"contact":true,"purchase":true}'::jsonb,
  routing_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  last_fired_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_source_pixels_store_active
  ON public.marketing_source_pixels (store_id, provider, is_active, is_default DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_source_pixels_source
  ON public.marketing_source_pixels (source_id, is_active);

ALTER TABLE public.marketing_source_pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_source_pixels FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_source_pixels_staff_all" ON public.marketing_source_pixels;
CREATE POLICY "marketing_source_pixels_staff_all"
  ON public.marketing_source_pixels
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_store_staff(store_id))
  WITH CHECK (public.is_platform_admin() OR public.is_store_staff(store_id));

DROP POLICY IF EXISTS "marketing_source_pixels_service_all" ON public.marketing_source_pixels;
CREATE POLICY "marketing_source_pixels_service_all"
  ON public.marketing_source_pixels
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.lead_conversion_telemetry
  ADD COLUMN IF NOT EXISTS source_pixel_id uuid REFERENCES public.marketing_source_pixels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_pixel_id text,
  ADD COLUMN IF NOT EXISTS payload_diagnostics jsonb;

CREATE INDEX IF NOT EXISTS idx_telemetry_source_pixel
  ON public.lead_conversion_telemetry (store_id, source_pixel_id, dispatched_at DESC)
  WHERE source_pixel_id IS NOT NULL;

ALTER TABLE IF EXISTS public.store_ad_campaigns
  ADD COLUMN IF NOT EXISTS adset_id text,
  ADD COLUMN IF NOT EXISTS adset_name text,
  ADD COLUMN IF NOT EXISTS external_ad_id text,
  ADD COLUMN IF NOT EXISTS external_ad_name text,
  ADD COLUMN IF NOT EXISTS creative_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS source_pixel_id uuid REFERENCES public.marketing_source_pixels(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.ad_campaigns
  ADD COLUMN IF NOT EXISTS external_campaign_id text,
  ADD COLUMN IF NOT EXISTS external_adset_id text,
  ADD COLUMN IF NOT EXISTS external_ad_id text,
  ADD COLUMN IF NOT EXISTS adset_name text,
  ADD COLUMN IF NOT EXISTS ad_name text,
  ADD COLUMN IF NOT EXISTS creative_thumbnail_url text;

-- Exposicao publica segura de multi-pixels (jamais expoe secret_payload_encrypted ou tokens CAPI)
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
    'track_whatsapp_leads', COALESCE((SELECT track_whatsapp_leads FROM legacy), true),
    'track_page_views', COALESCE((SELECT track_page_views FROM legacy), true),
    'track_catalog_views', COALESCE((SELECT track_catalog_views FROM legacy), true),
    'track_quotes', COALESCE((SELECT track_quotes FROM legacy), true),
    'track_purchases', COALESCE((SELECT track_purchases FROM legacy), true),
    'source_pixels', COALESCE((SELECT items FROM active_multi), '[]'::jsonb)
  );
$$;

-- ── 4. Storage privado para midias do Chat WhatsApp ──────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media-private',
  'chat-media-private',
  false,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'audio/ogg', 'audio/opus', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800;

DROP POLICY IF EXISTS "chat_media_private_staff_select" ON storage.objects;
CREATE POLICY "chat_media_private_staff_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media-private'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id::text = (storage.foldername(name))[1]
          AND wm.profile_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "chat_media_private_staff_insert" ON storage.objects;
CREATE POLICY "chat_media_private_staff_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media-private'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id::text = (storage.foldername(name))[1]
          AND wm.profile_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "chat_media_private_staff_delete" ON storage.objects;
CREATE POLICY "chat_media_private_staff_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-media-private'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id::text = (storage.foldername(name))[1]
          AND wm.profile_id = (SELECT auth.uid())
      )
    )
  );

-- ── 5. Indices e colunas SLA em chat_threads ─────────────────────────────────
ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS last_customer_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_staff_reply_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_chat_threads_store_waiting_sla
  ON public.chat_threads (store_id, status, last_customer_message_at DESC)
  WHERE status IN ('open', 'pending');
