-- Meta CAPI/Lead Ads contracts: tenant-safe secrets, idempotent lead identity and truthful ingest.

ALTER TABLE public.store_pixel_configs
  ADD COLUMN IF NOT EXISTS meta_test_event_code text;

ALTER TABLE public.leads_crm
  ALTER COLUMN email DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_crm_meta_leadgen
  ON public.leads_crm (store_id, ((custom_fields ->> 'meta_leadgen_id')))
  WHERE custom_fields ? 'meta_leadgen_id';

CREATE INDEX IF NOT EXISTS idx_integration_credentials_meta_page
  ON public.integration_credentials (provider, ((public_metadata ->> 'page_id')))
  WHERE provider IN ('meta_ads', 'meta_pixel');

CREATE OR REPLACE FUNCTION public.ingest_meta_lead_atomic(
  p_store_id uuid,
  p_leadgen_id text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_custom_fields jsonb,
  p_form_id text,
  p_ad_id text
)
RETURNS TABLE (lead_id uuid, created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_lead uuid;
BEGIN
  SELECT id INTO v_existing
  FROM public.leads_crm
  WHERE store_id = p_store_id
    AND custom_fields ->> 'meta_leadgen_id' = p_leadgen_id
  FOR UPDATE;

  IF v_existing IS NOT NULL THEN
    UPDATE public.leads_crm
    SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || COALESCE(p_custom_fields, '{}'::jsonb),
        last_contacted_at = now(),
        updated_at = now()
    WHERE id = v_existing;
    RETURN QUERY SELECT v_existing, false;
    RETURN;
  END IF;

  INSERT INTO public.leads_crm (store_id, full_name, email, phone, title, source, lead_source_detail, status, custom_fields, last_contacted_at)
  VALUES (p_store_id, COALESCE(NULLIF(p_full_name, ''), 'Lead Meta'), NULLIF(p_email, ''), NULLIF(p_phone, ''),
          'Lead Form Meta #' || COALESCE(NULLIF(right(p_form_id, 4), ''), 'Instantâneo'), 'meta_lead_ad',
          'Ad: ' || COALESCE(NULLIF(p_ad_id, ''), 'Meta') || ' | Form: ' || COALESCE(NULLIF(p_form_id, ''), 'Nativo'),
          'new', COALESCE(p_custom_fields, '{}'::jsonb), now())
  RETURNING id INTO v_lead;

  INSERT INTO public.lead_activities (lead_id, store_id, type, content, metadata)
  VALUES (v_lead, p_store_id, 'lead_ad_received', 'Lead recebido via Meta Lead Ads. Prioridade: Speed-to-Lead em até 5 min.',
          jsonb_build_object('form_id', p_form_id, 'ad_id', p_ad_id, 'leadgen_id', p_leadgen_id));

  RETURN QUERY SELECT v_lead, true;
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_meta_lead_atomic(uuid, text, text, text, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_meta_lead_atomic(uuid, text, text, text, text, jsonb, text, text) TO service_role;

-- The compatibility view must never expose the legacy credentials JSON to anon/authenticated.
CREATE OR REPLACE VIEW public.store_integrations
WITH (security_invoker = true) AS
  SELECT
    id,
    store_id,
    provider,
    COALESCE(public_metadata, token_payload, '{}'::jsonb) AS config,
    CASE WHEN is_active THEN 'active' ELSE 'inactive' END AS status,
    created_at,
    updated_at
  FROM public.integration_credentials;

REVOKE ALL ON public.store_integrations FROM anon;
GRANT SELECT ON public.store_integrations TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
