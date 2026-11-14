-- Migration: 20270410000000_omnichannel_identity_attribution_and_pixels.sql
-- Description: Conecta identidades WhatsApp (contatos e grupos @g.us), formulários, Pixels (Meta/Google/TikTok)
--              e anúncios (CTWA referral + UTMs + Click IDs) ao CRM e ao Atendimento em cadeia ponta a ponta.

-- 1. Tabela Canônica de Touchpoints de Atribuição (Anúncio -> Vitrine/Form/Click WhatsApp -> Atendimento/CRM)
CREATE TABLE IF NOT EXISTS public.ad_attribution_touchpoints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  device_id       TEXT,
  visitor_id      TEXT,
  profile_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_e164      TEXT,
  phone_digits    TEXT,
  email           TEXT,
  lead_code       TEXT,
  ctwa_clid       TEXT,
  fbclid          TEXT,
  fbp             TEXT,
  fbc             TEXT,
  gclid           TEXT,
  ttclid          TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  ad_platform     TEXT,
  ad_id           TEXT,
  adset_id        TEXT,
  campaign_id     TEXT,
  creative_id     TEXT,
  form_id         UUID REFERENCES public.lead_forms(id) ON DELETE SET NULL,
  ad_headline     TEXT,
  ad_body         TEXT,
  ad_media_url    TEXT,
  source_url      TEXT,
  landing_url     TEXT,
  referrer        TEXT,
  entity_type     TEXT,
  entity_id       TEXT,
  entity_title    TEXT,
  captured_via    TEXT NOT NULL DEFAULT 'web_visit',
  lead_id         UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  customer_id     UUID,
  thread_id       UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_attr_store_phone
  ON public.ad_attribution_touchpoints(store_id, phone_digits, created_at DESC)
  WHERE phone_digits IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ad_attr_phone_global
  ON public.ad_attribution_touchpoints(phone_digits, created_at DESC)
  WHERE phone_digits IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ad_attr_device
  ON public.ad_attribution_touchpoints(device_id, created_at DESC)
  WHERE device_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ad_attr_lead_code
  ON public.ad_attribution_touchpoints(lead_code)
  WHERE lead_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ad_attr_ctwa_clid
  ON public.ad_attribution_touchpoints(ctwa_clid)
  WHERE ctwa_clid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ad_attr_thread
  ON public.ad_attribution_touchpoints(thread_id, created_at DESC)
  WHERE thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ad_attr_store_recent
  ON public.ad_attribution_touchpoints(store_id, created_at DESC);

ALTER TABLE public.ad_attribution_touchpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_attribution_touchpoints_staff_select" ON public.ad_attribution_touchpoints;
CREATE POLICY "ad_attribution_touchpoints_staff_select"
  ON public.ad_attribution_touchpoints
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR (store_id IS NOT NULL AND public.is_store_staff(store_id))
    OR profile_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "ad_attribution_touchpoints_staff_manage" ON public.ad_attribution_touchpoints;
CREATE POLICY "ad_attribution_touchpoints_staff_manage"
  ON public.ad_attribution_touchpoints
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR (store_id IS NOT NULL AND public.is_store_staff(store_id))
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (store_id IS NOT NULL AND public.is_store_staff(store_id))
  );

DROP POLICY IF EXISTS "ad_attribution_touchpoints_service_all" ON public.ad_attribution_touchpoints;
CREATE POLICY "ad_attribution_touchpoints_service_all"
  ON public.ad_attribution_touchpoints
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. Enriquecimento estrutural de chat_threads (Assunto do Grupo, Telefone E.164, Lead vinculado e Atribuição direta)
ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS group_subject TEXT,
  ADD COLUMN IF NOT EXISTS primary_phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attribution JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_chat_threads_store_phone
  ON public.chat_threads(store_id, primary_phone_e164)
  WHERE primary_phone_e164 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_threads_lead_id
  ON public.chat_threads(lead_id)
  WHERE lead_id IS NOT NULL;

-- 3. Enriquecimento de whatsapp_lead_conversions com parâmetros de Pixel, Ads e Telefone do Lead
ALTER TABLE public.whatsapp_lead_conversions
  ADD COLUMN IF NOT EXISTS lead_phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS fbclid TEXT,
  ADD COLUMN IF NOT EXISTS fbp TEXT,
  ADD COLUMN IF NOT EXISTS fbc TEXT,
  ADD COLUMN IF NOT EXISTS gclid TEXT,
  ADD COLUMN IF NOT EXISTS ttclid TEXT,
  ADD COLUMN IF NOT EXISTS ctwa_clid TEXT,
  ADD COLUMN IF NOT EXISTS ad_id TEXT,
  ADD COLUMN IF NOT EXISTS campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wa_leads_phone_e164
  ON public.whatsapp_lead_conversions(store_id, lead_phone_e164, created_at DESC)
  WHERE lead_phone_e164 IS NOT NULL;

-- 4. Enriquecimento de lead_form_submissions com Click IDs, Cookies Meta e IDs de Anúncio
ALTER TABLE public.lead_form_submissions
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS fbclid TEXT,
  ADD COLUMN IF NOT EXISTS fbp TEXT,
  ADD COLUMN IF NOT EXISTS fbc TEXT,
  ADD COLUMN IF NOT EXISTS gclid TEXT,
  ADD COLUMN IF NOT EXISTS ttclid TEXT,
  ADD COLUMN IF NOT EXISTS ad_id TEXT,
  ADD COLUMN IF NOT EXISTS campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS phone_digits TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_submissions_phone_digits
  ON public.lead_form_submissions(store_id, phone_digits, created_at DESC)
  WHERE phone_digits IS NOT NULL;

-- 5. Enriquecimento de lead_conversion_telemetry para auditoria conectada por Lead/Thread
ALTER TABLE IF EXISTS public.lead_conversion_telemetry
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_source TEXT;

DROP POLICY IF EXISTS "lead_conversion_telemetry_staff_select" ON public.lead_conversion_telemetry;
CREATE POLICY "lead_conversion_telemetry_staff_select"
  ON public.lead_conversion_telemetry
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin() OR public.is_store_staff(store_id)
  );

DROP POLICY IF EXISTS "lead_conversion_telemetry_service_all" ON public.lead_conversion_telemetry;
CREATE POLICY "lead_conversion_telemetry_service_all"
  ON public.lead_conversion_telemetry
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
