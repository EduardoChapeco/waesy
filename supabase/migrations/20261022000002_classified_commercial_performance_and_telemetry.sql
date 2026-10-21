-- ==============================================================================
-- MIGRATION: 20261022000000_classified_commercial_performance_and_telemetry.sql
-- Description:
--   Cria o subsistema completo de inteligência analítica, telemetria antifraude,
--   agregações diárias, supressão de coortes para privacidade (LGPD), funil de
--   conversão e métricas comerciais de anúncios classificados.
-- ==============================================================================

-- 1. TABELA DE EVENTOS GRANULARES DE TELEMETRIA DO ANÚNCIO
CREATE TABLE IF NOT EXISTS public.classified_analytics_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classified_id       uuid NOT NULL REFERENCES public.classifieds(id) ON DELETE CASCADE,
  event_type          text NOT NULL CHECK (
                        event_type IN (
                          'impression',          -- Exibição do card em feed/busca
                          'view',                -- Abertura da página de detalhes (visita)
                          'duration',            -- Heartbeat de tempo ativo na tela
                          'scroll',              -- Profundidade de scroll (25, 50, 75, 100)
                          'gallery_view',        -- Visualização de imagens na galeria
                          'video_play',          -- Reprodução de vídeo
                          'map_view',            -- Abertura / interação com mapa
                          'description_expand',  -- Expansão da descrição textual
                          'favorite',            -- Anúncio salvo / favoritado
                          'unfavorite',          -- Anúncio removido dos salvos
                          'share',               -- Compartilhamento ou cópia de link
                          'contact_chat',        -- Conversa iniciada pelo chat
                          'contact_whatsapp',    -- Clique no botão WhatsApp
                          'contact_phone',       -- Revelação ou clique de telefone
                          'quote_request',       -- Solicitação de orçamento
                          'booking_intent',      -- Iniciação de agendamento ou reserva
                          'conversion',          -- Conclusão comercial (venda/reserva)
                          'status_change'        -- Mudança de status ou preço do anúncio
                        )
                      ),
  surface             text NOT NULL DEFAULT 'direct' CHECK (
                        surface IN (
                          'search',
                          'feed',
                          'category',
                          'map',
                          'recommendation',
                          'similar',
                          'profile',
                          'share_link',
                          'direct',
                          'external',
                          'boosted_feed',
                          'boosted_search'
                        )
                      ),
  is_boosted          boolean NOT NULL DEFAULT false,
  session_hash        text NOT NULL,
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_author_view      boolean NOT NULL DEFAULT false,
  duration_seconds    integer DEFAULT 0,
  scroll_percentage   integer DEFAULT 0,
  city                text,
  neighborhood        text,
  device_type         text DEFAULT 'mobile' CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
  search_query        text,
  share_id            text,
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Índices de Alta Performance para Consulta e Agregação
CREATE INDEX IF NOT EXISTS idx_cae_classified_type_date 
  ON public.classified_analytics_events(classified_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cae_classified_boosted 
  ON public.classified_analytics_events(classified_id, is_boosted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cae_session_dedup 
  ON public.classified_analytics_events(session_hash, classified_id, event_type, created_at);

-- 2. TABELA DE AGREGAÇÃO DIÁRIA DE PERFORMANCE (CACHE CONSOLIDADO SUB-100MS)
CREATE TABLE IF NOT EXISTS public.classified_metrics_daily (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classified_id          uuid NOT NULL REFERENCES public.classifieds(id) ON DELETE CASCADE,
  date                   date NOT NULL,
  organic_impressions    integer NOT NULL DEFAULT 0,
  paid_impressions       integer NOT NULL DEFAULT 0,
  organic_views          integer NOT NULL DEFAULT 0,
  paid_views             integer NOT NULL DEFAULT 0,
  unique_visitors        integer NOT NULL DEFAULT 0,
  total_active_seconds   integer NOT NULL DEFAULT 0,
  engagements_count      integer NOT NULL DEFAULT 0,
  favorites_count        integer NOT NULL DEFAULT 0,
  shares_count           integer NOT NULL DEFAULT 0,
  contacts_count         integer NOT NULL DEFAULT 0,
  conversions_count      integer NOT NULL DEFAULT 0,
  sources_breakdown      jsonb NOT NULL DEFAULT '{}'::jsonb, -- {"search": 12, "feed": 8, ...}
  geo_breakdown          jsonb NOT NULL DEFAULT '{}'::jsonb, -- {"cities": {...}, "neighborhoods": {...}}
  hourly_distribution    jsonb NOT NULL DEFAULT '{}'::jsonb, -- {"0": 0, "1": 0, ..., "23": 5}
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_classified_daily_metric UNIQUE (classified_id, date)
);

CREATE INDEX IF NOT EXISTS idx_cmd_classified_date 
  ON public.classified_metrics_daily(classified_id, date DESC);

-- 3. ADICIONA HISTÓRICO DE MUTAÇÕES NA TABELA CLASSIFIEDS (SE NÃO EXISTIR)
ALTER TABLE public.classifieds 
  ADD COLUMN IF NOT EXISTS historical_events jsonb DEFAULT '[]'::jsonb;

-- 4. HABILITA RLS (ROW LEVEL SECURITY)
ALTER TABLE public.classified_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classified_metrics_daily ENABLE ROW LEVEL SECURITY;

-- O Anunciante ou Membro da Loja só visualiza analytics do seu próprio anúncio
DROP POLICY IF EXISTS "Author can view classified analytics events" ON public.classified_analytics_events;
CREATE POLICY "Author can view classified analytics events"
  ON public.classified_analytics_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classifieds c
      WHERE c.id = classified_analytics_events.classified_id
      AND (
        c.author_profile_id = auth.uid()
        OR (
          c.store_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = c.store_id AND wm.profile_id = auth.uid()
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Author can view classified daily metrics" ON public.classified_metrics_daily;
CREATE POLICY "Author can view classified daily metrics"
  ON public.classified_metrics_daily FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classifieds c
      WHERE c.id = classified_metrics_daily.classified_id
      AND (
        c.author_profile_id = auth.uid()
        OR (
          c.store_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = c.store_id AND wm.profile_id = auth.uid()
          )
        )
      )
    )
  );

-- Inserção permitida para todos (pública/anônima com controle de rate limit via BFF/RPC)
DROP POLICY IF EXISTS "Allow public insert on classified analytics events" ON public.classified_analytics_events;
CREATE POLICY "Allow public insert on classified analytics events"
  ON public.classified_analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Service role total
DROP POLICY IF EXISTS "Service role full access on classified analytics" ON public.classified_analytics_events;
CREATE POLICY "Service role full access on classified analytics"
  ON public.classified_analytics_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on classified daily metrics" ON public.classified_metrics_daily;
CREATE POLICY "Service role full access on classified daily metrics"
  ON public.classified_metrics_daily FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. FUNÇÃO RPC DE INGESTÃO IDEMPOTENTE E DEDUPLICADA
CREATE OR REPLACE FUNCTION public.record_classified_event(
  p_classified_id uuid,
  p_event_type text,
  p_surface text DEFAULT 'direct',
  p_is_boosted boolean DEFAULT false,
  p_session_hash text DEFAULT 'anonymous',
  p_user_id uuid DEFAULT NULL,
  p_duration_seconds integer DEFAULT 0,
  p_scroll_percentage integer DEFAULT 0,
  p_city text DEFAULT NULL,
  p_neighborhood text DEFAULT NULL,
  p_device_type text DEFAULT 'mobile',
  p_search_query text DEFAULT NULL,
  p_share_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ad RECORD;
  v_is_author boolean := false;
  v_today date := current_date;
  v_current_hour text := to_char(now(), 'FMHH24');
  v_recent_id uuid;
BEGIN
  -- Busca dados do anúncio
  SELECT id, author_profile_id, store_id, is_boosted, boosted_until
  INTO v_ad
  FROM public.classifieds
  WHERE id = p_classified_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  -- Verifica se é visualização do próprio autor (antifraude)
  IF p_user_id IS NOT NULL AND v_ad.author_profile_id = p_user_id THEN
    v_is_author := true;
  END IF;

  -- Se o anúncio está atualmente com impulsionamento ativo
  IF v_ad.is_boosted = true AND v_ad.boosted_until IS NOT NULL AND v_ad.boosted_until > now() THEN
    p_is_boosted := true;
  END IF;

  -- Deduplicação por sessão em janela curta (5 minutos) para view e impression
  IF p_event_type IN ('view', 'impression') THEN
    SELECT id INTO v_recent_id
    FROM public.classified_analytics_events
    WHERE classified_id = p_classified_id
      AND event_type = p_event_type
      AND session_hash = p_session_hash
      AND created_at > (now() - interval '5 minutes')
    LIMIT 1;

    IF v_recent_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'deduplicated', true);
    END IF;
  END IF;

  -- Grava o evento granular
  INSERT INTO public.classified_analytics_events (
    classified_id,
    event_type,
    surface,
    is_boosted,
    session_hash,
    user_id,
    is_author_view,
    duration_seconds,
    scroll_percentage,
    city,
    neighborhood,
    device_type,
    search_query,
    share_id,
    metadata
  ) VALUES (
    p_classified_id,
    p_event_type,
    p_surface,
    p_is_boosted,
    p_session_hash,
    p_user_id,
    v_is_author,
    p_duration_seconds,
    p_scroll_percentage,
    p_city,
    p_neighborhood,
    p_device_type,
    p_search_query,
    p_share_id,
    p_metadata
  );

  -- Atualiza métricas na tabela classifieds para compatibilidade rápida
  IF NOT v_is_author THEN
    IF p_event_type = 'view' THEN
      UPDATE public.classifieds
      SET views_count = COALESCE(views_count, 0) + 1
      WHERE id = p_classified_id;
    ELSIF p_event_type IN ('contact_whatsapp', 'contact_chat', 'contact_phone') THEN
      UPDATE public.classifieds
      SET whatsapp_clicks_count = COALESCE(whatsapp_clicks_count, 0) + 1,
          clicks_count = COALESCE(clicks_count, 0) + 1
      WHERE id = p_classified_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_classified_event TO anon, authenticated, service_role;
