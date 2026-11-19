-- ============================================================================
-- Migration: 20270417000000_kanban_multiniche_stages_and_pixel_tags.sql
-- Description:
--   1. Destrava leads_crm.status para suportar estagios canônicos, sinonimos
--      multi-nicho e colunas customizadas (slug ^[a-z0-9_-]{2,64}$) sem 23514.
--   2. Adiciona leads_crm.pipeline_stage e sort_order, endurecendo RPC
--      persist_lead_move com custom_fields e ordenacao atomica.
--   3. Expande store_pixel_configs e tabelas de atribuicao com GTM, TikTok,
--      verification meta tags (Google Site Verification / Meta Domain),
--      gbraid / wbraid e atualiza RPC publica get_store_public_pixels.
-- ============================================================================

-- 1. Leads CRM: colunas de ordenacao e estagio canonico multi-nicho
ALTER TABLE public.leads_crm
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Normaliza eventuais valores legados fora do padrao slug antes da nova constraint
UPDATE public.leads_crm
SET status = COALESCE(
  NULLIF(regexp_replace(lower(trim(status)), '[^a-z0-9_-]+', '_', 'g'), ''),
  'new'
)
WHERE status IS NULL OR status !~ '^[a-z0-9_-]{2,64}$';

UPDATE public.leads_crm
SET pipeline_stage = COALESCE(
  NULLIF(custom_fields->>'kanban_stage_key', ''),
  status
)
WHERE pipeline_stage IS NULL;

DO $$
BEGIN
  ALTER TABLE public.leads_crm DROP CONSTRAINT IF EXISTS leads_crm_status_check;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.leads_crm
  ADD CONSTRAINT leads_crm_status_check
  CHECK (status ~ '^[a-z0-9_-]{2,64}$');

CREATE INDEX IF NOT EXISTS idx_leads_crm_store_stage_sort
  ON public.leads_crm(store_id, status, sort_order, created_at DESC);

-- 2. RPC Atomica Endurecida: persist_lead_move
CREATE OR REPLACE FUNCTION public.persist_lead_move(
  _lead_id UUID,
  _to_status TEXT,
  _reordered_ids UUID[],
  _store_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage TEXT;
  v_purpose TEXT;
  v_caller UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NOT NULL AND NOT (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_caller AND p.role IN ('admin', 'super_admin', 'platform_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = _store_id AND wm.profile_id = v_caller
    )
  ) THEN
    RAISE EXCEPTION 'Nao autorizado para movimentar leads desta loja';
  END IF;

  v_stage := regexp_replace(lower(trim(COALESCE(_to_status, 'new'))), '[^a-z0-9_-]+', '_', 'g');
  IF v_stage !~ '^[a-z0-9_-]{2,64}$' THEN
    RAISE EXCEPTION 'Estagio Kanban invalido: %', COALESCE(_to_status, '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.leads_crm l
    WHERE l.id = _lead_id AND l.store_id = _store_id
  ) THEN
    RAISE EXCEPTION 'Nao autorizado ou lead inexistente';
  END IF;

  SELECT ksc.purpose INTO v_purpose
  FROM public.kanban_stage_configs ksc
  WHERE ksc.store_id = _store_id
    AND lower(ksc.stage_key) = v_stage
  LIMIT 1;

  IF v_purpose IS NULL THEN
    v_purpose := CASE
      WHEN v_stage IN ('new', 'inbox', 'todo', 'open', 'pending', 'talent_pool', 'backlog', 'lead', 'draft') THEN 'inbox'
      WHEN v_stage IN ('won', 'converted', 'hired', 'completed', 'confirmed', 'delivered', 'approved', 'fechado') THEN 'won'
      WHEN v_stage IN ('lost', 'cancelled', 'rejected', 'perdido') THEN 'lost'
      WHEN v_stage IN ('archived', 'future_pool') THEN 'archived'
      WHEN v_stage IN ('proposal', 'negotiation', 'review', 'negotiating', 'ready') THEN 'review'
      ELSE 'in_progress'
    END;
  END IF;

  UPDATE public.leads_crm
  SET
    status = v_stage,
    pipeline_stage = v_stage,
    custom_fields = COALESCE(custom_fields, '{}'::jsonb) || jsonb_build_object(
      'kanban_stage_key', v_stage,
      'kanban_stage_purpose', v_purpose,
      'kanban_stage_updated_at', now()
    ),
    updated_at = now(),
    last_contacted_at = now(),
    closed_at = CASE
      WHEN v_purpose IN ('won', 'lost') OR v_stage IN ('won', 'lost', 'converted') THEN COALESCE(closed_at, now())
      ELSE closed_at
    END
  WHERE id = _lead_id AND store_id = _store_id;

  IF _reordered_ids IS NOT NULL AND array_length(_reordered_ids, 1) > 0 THEN
    WITH ordered AS (
      SELECT id_val, (idx - 1)::integer AS new_sort
      FROM unnest(_reordered_ids) WITH ORDINALITY AS t(id_val, idx)
    )
    UPDATE public.leads_crm l
    SET
      sort_order = ordered.new_sort,
      updated_at = CASE WHEN l.id = _lead_id THEN now() ELSE l.updated_at END
    FROM ordered
    WHERE l.id = ordered.id_val
      AND l.store_id = _store_id;
  END IF;

  INSERT INTO public.lead_activities (
    lead_id,
    store_id,
    author_id,
    type,
    content,
    metadata
  ) VALUES (
    _lead_id,
    _store_id,
    v_caller,
    'status_change',
    'Estagio alterado para: ' || v_stage,
    jsonb_build_object('new_status', v_stage, 'stage_purpose', v_purpose)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.persist_lead_move(UUID, TEXT, UUID[], UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.persist_lead_move(UUID, TEXT, UUID[], UUID) TO authenticated, service_role;

-- 3. Store Pixel Configs: verificacao de dominio/site, GTM, TikTok e Enhanced Conversions
ALTER TABLE public.store_pixel_configs
  ADD COLUMN IF NOT EXISTS google_ads_conversion_label TEXT,
  ADD COLUMN IF NOT EXISTS gtm_id TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS google_site_verification TEXT,
  ADD COLUMN IF NOT EXISTS meta_domain_verification TEXT;

ALTER TABLE IF EXISTS public.ad_attribution_touchpoints
  ADD COLUMN IF NOT EXISTS gbraid TEXT,
  ADD COLUMN IF NOT EXISTS wbraid TEXT;

ALTER TABLE IF EXISTS public.whatsapp_lead_conversions
  ADD COLUMN IF NOT EXISTS gbraid TEXT,
  ADD COLUMN IF NOT EXISTS wbraid TEXT;

ALTER TABLE IF EXISTS public.lead_form_submissions
  ADD COLUMN IF NOT EXISTS gbraid TEXT,
  ADD COLUMN IF NOT EXISTS wbraid TEXT;

CREATE OR REPLACE FUNCTION public.get_store_public_pixels(p_store_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'meta_pixel_id', meta_pixel_id,
    'google_ads_id', google_ads_id,
    'google_ads_conversion_label', google_ads_conversion_label,
    'ga4_measurement_id', ga4_measurement_id,
    'gtm_id', gtm_id,
    'tiktok_pixel_id', tiktok_pixel_id,
    'google_site_verification', google_site_verification,
    'meta_domain_verification', meta_domain_verification,
    'track_whatsapp_leads', COALESCE(track_whatsapp_leads, true),
    'track_page_views', COALESCE(track_page_views, true),
    'track_catalog_views', COALESCE(track_catalog_views, true),
    'track_purchases', COALESCE(track_purchases, true),
    'track_quotes', COALESCE(track_quotes, true)
  )
  FROM public.store_pixel_configs
  WHERE store_id = p_store_id;
$$;

REVOKE ALL ON FUNCTION public.get_store_public_pixels(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_store_public_pixels(uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
