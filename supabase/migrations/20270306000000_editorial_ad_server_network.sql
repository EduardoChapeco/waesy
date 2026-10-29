-- ============================================================================
-- WAESY EDITORIAL AD SERVER & DISPLAY NETWORK MIGRATION
-- Ad Server editorial nativo, rede de display multi-zona, exclusividade
-- por matéria, telemetria IAB viewability e isolamento multi-tenant estrito.
-- ============================================================================

-- 1. EVOLUÇÃO DE public.sponsors
DO $$
BEGIN
  -- Modo de veiculação: 'all' (todas as zonas) ou 'specific' (apenas zonas permitidas)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'placement_mode'
  ) THEN
    ALTER TABLE public.sponsors 
      ADD COLUMN placement_mode TEXT NOT NULL DEFAULT 'all' 
      CHECK (placement_mode IN ('all', 'specific'));
  END IF;

  -- Lista de zonas permitidas para veiculação
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'allowed_placements'
  ) THEN
    ALTER TABLE public.sponsors 
      ADD COLUMN allowed_placements TEXT[] NOT NULL DEFAULT '{}';
  END IF;

  -- Filtros geográficos (cidades-alvo)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'target_cities'
  ) THEN
    ALTER TABLE public.sponsors 
      ADD COLUMN target_cities TEXT[] NOT NULL DEFAULT '{}';
  END IF;

  -- Filtros editoriais (editorias/categorias de matérias)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'target_categories'
  ) THEN
    ALTER TABLE public.sponsors 
      ADD COLUMN target_categories TEXT[] NOT NULL DEFAULT '{}';
  END IF;

  -- Criativos específicos por zona { [zone]: { banner_url, headline, cta_label, aspect_ratio } }
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'creatives_by_placement'
  ) THEN
    ALTER TABLE public.sponsors 
      ADD COLUMN creatives_by_placement JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  -- Período de vigência da campanha
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE public.sponsors ADD COLUMN starts_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'ends_at'
  ) THEN
    ALTER TABLE public.sponsors ADD COLUMN ends_at TIMESTAMPTZ;
  END IF;

  -- Quotas contratadas de veiculação e cliques
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'max_impressions_quota'
  ) THEN
    ALTER TABLE public.sponsors ADD COLUMN max_impressions_quota INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'max_clicks_quota'
  ) THEN
    ALTER TABLE public.sponsors ADD COLUMN max_clicks_quota INTEGER;
  END IF;

  -- Peso de prioridade na rotação ponderada (1-100)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'priority_weight'
  ) THEN
    ALTER TABLE public.sponsors ADD COLUMN priority_weight INTEGER NOT NULL DEFAULT 10;
  END IF;

  -- Token B2B seguro para relatório público sem login
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'public_report_token'
  ) THEN
    ALTER TABLE public.sponsors ADD COLUMN public_report_token UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;

  -- Contadores agregados caso não existam
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'views_count'
  ) THEN
    ALTER TABLE public.sponsors ADD COLUMN views_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sponsors' AND column_name = 'clicks_count'
  ) THEN
    ALTER TABLE public.sponsors ADD COLUMN clicks_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sponsors_report_token ON public.sponsors(public_report_token);
CREATE INDEX IF NOT EXISTS idx_sponsors_schedule ON public.sponsors(store_id, active, starts_at, ends_at);


-- 2. CONFIGURAÇÃO PUBLICITÁRIA EM public.news_articles
DO $$
BEGIN
  -- Política de publicidade na matéria
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'news_articles' AND column_name = 'ad_policy'
  ) THEN
    ALTER TABLE public.news_articles 
      ADD COLUMN ad_policy TEXT NOT NULL DEFAULT 'inherit_network' 
      CHECK (ad_policy IN ('inherit_network', 'exclusive_lock', 'ads_disabled'));
  END IF;

  -- Lista de patrocinadores com exclusividade na matéria
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'news_articles' AND column_name = 'exclusive_sponsor_ids'
  ) THEN
    ALTER TABLE public.news_articles 
      ADD COLUMN exclusive_sponsor_ids UUID[] NOT NULL DEFAULT '{}';
  END IF;

  -- Fixação de patrocinador específico por zona na matéria
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'news_articles' AND column_name = 'placement_overrides'
  ) THEN
    ALTER TABLE public.news_articles 
      ADD COLUMN placement_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_news_articles_ad_policy ON public.news_articles(store_id, ad_policy);


-- 3. TABELA DE TELEMETRIA IAB & AUDITORIA DE ANÚNCIOS (public.sponsor_ad_events)
CREATE TABLE IF NOT EXISTS public.sponsor_ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  sponsor_id UUID REFERENCES public.sponsors(id) ON DELETE SET NULL,
  placement_zone TEXT NOT NULL,
  article_id UUID REFERENCES public.news_articles(id) ON DELETE SET NULL,
  page_slug TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('ad_loaded', 'viewable_impression', 'click', 'view_duration')),
  is_exclusive_delivery BOOLEAN NOT NULL DEFAULT false,
  viewer_city TEXT,
  device_type TEXT NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  session_token TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  user_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de alta performance para agregações e relatórios analíticos
CREATE INDEX IF NOT EXISTS idx_sponsor_ad_events_sponsor_date ON public.sponsor_ad_events(sponsor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_ad_events_store_date ON public.sponsor_ad_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_ad_events_zone ON public.sponsor_ad_events(store_id, placement_zone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_ad_events_article ON public.sponsor_ad_events(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_ad_events_session ON public.sponsor_ad_events(session_token, sponsor_id, placement_zone);

-- 4. RLS RIGOROSO COM ISOLAMENTO MULTI-TENANT ESTRETO
ALTER TABLE public.sponsor_ad_events ENABLE ROW LEVEL SECURITY;

-- Telemetria pode ser inserida anonimamente por leitores (client-side beacon)
DROP POLICY IF EXISTS "sponsor_ad_events_insert_public" ON public.sponsor_ad_events;
CREATE POLICY "sponsor_ad_events_insert_public" ON public.sponsor_ad_events
  FOR INSERT WITH CHECK (true);

-- Leitura de telemetria apenas para equipe da loja/portal
DROP POLICY IF EXISTS "sponsor_ad_events_staff_read" ON public.sponsor_ad_events;
CREATE POLICY "sponsor_ad_events_staff_read" ON public.sponsor_ad_events
  FOR SELECT USING (public.is_store_staff(store_id));

-- RPC para registro atômico de evento de display com anti-fraude e deduplicação
CREATE OR REPLACE FUNCTION public.record_editorial_ad_telemetry(
  p_store_id UUID,
  p_sponsor_id UUID,
  p_placement_zone TEXT,
  p_article_id UUID DEFAULT NULL,
  p_page_slug TEXT DEFAULT NULL,
  p_event_type TEXT DEFAULT 'viewable_impression',
  p_is_exclusive BOOLEAN DEFAULT FALSE,
  p_viewer_city TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT 'desktop',
  p_session_token TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT 0
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recent_count INT;
BEGIN
  -- Anti-duplicação: Se for viewable_impression e tiver session_token, checar se já registrou nos últimos 30 minutos
  IF p_event_type = 'viewable_impression' AND p_session_token IS NOT NULL AND p_session_token <> '' THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM public.sponsor_ad_events
    WHERE session_token = p_session_token
      AND sponsor_id = p_sponsor_id
      AND placement_zone = p_placement_zone
      AND event_type = 'viewable_impression'
      AND created_at > now() - INTERVAL '30 minutes';

    IF v_recent_count > 0 THEN
      RETURN FALSE; -- Deduplicado com sucesso
    END IF;
  END IF;

  -- Inserir evento de telemetria
  INSERT INTO public.sponsor_ad_events (
    store_id,
    sponsor_id,
    placement_zone,
    article_id,
    page_slug,
    event_type,
    is_exclusive_delivery,
    viewer_city,
    device_type,
    session_token,
    duration_seconds
  ) VALUES (
    p_store_id,
    p_sponsor_id,
    p_placement_zone,
    p_article_id,
    p_page_slug,
    p_event_type,
    p_is_exclusive,
    p_viewer_city,
    p_device_type,
    p_session_token,
    p_duration_seconds
  );

  -- Atualizar contadores agregados em public.sponsors de forma atômica
  IF p_sponsor_id IS NOT NULL THEN
    IF p_event_type = 'viewable_impression' THEN
      UPDATE public.sponsors
      SET views_count = views_count + 1,
          updated_at = now()
      WHERE id = p_sponsor_id;
    ELSIF p_event_type = 'click' THEN
      UPDATE public.sponsors
      SET clicks_count = clicks_count + 1,
          updated_at = now()
      WHERE id = p_sponsor_id;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;
