-- ============================================================================
-- Waesy Platform: Comprehensive Mining, Partitioned Content, Events RSVP & News Linking
-- Migration: 20261025000000_mining_and_events_comprehensive.sql
-- ============================================================================

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 1. Tipo Enum de ConteÃºdo Minerado
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DO $$ BEGIN
  CREATE TYPE public.mining_content_type AS ENUM (
    'noticia',
    'artigo',
    'blog_post',
    'educacao',
    'eventos',
    'portal_municipal',
    'portais_publicos'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 2. Tabela Central de ExtraÃ§Ãµes Brutas Particionadas (mined_raw_extractions)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.mined_raw_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type public.mining_content_type NOT NULL DEFAULT 'noticia',
  source_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  source_name TEXT NOT NULL,
  external_id TEXT,
  
  -- Dados Brutos MecÃ¢nicos
  raw_title TEXT NOT NULL,
  raw_lead TEXT,
  raw_body_text TEXT NOT NULL,
  raw_html_fragment TEXT,
  raw_author TEXT,
  raw_published_at TIMESTAMPTZ,
  cover_image_url TEXT,
  gallery_images TEXT[] DEFAULT '{}'::text[],
  
  -- Georreferenciamento e Cidades
  city TEXT DEFAULT 'ChapecÃ³',
  state TEXT DEFAULT 'SC',
  region TEXT DEFAULT 'oeste',
  tags TEXT[] DEFAULT '{}'::text[],
  
  -- Metadados DinÃ¢micos por Tipo
  type_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoria e MÃ©tricas de Integridade MecÃ¢nica
  word_count INT NOT NULL DEFAULT 0,
  paragraph_count INT NOT NULL DEFAULT 0,
  has_full_content BOOLEAN NOT NULL DEFAULT false,
  extraction_method TEXT NOT NULL DEFAULT 'mechanical', -- 'json_ld', 'css_selector', 'readability', 'api_pncp'
  
  -- ClusterizaÃ§Ã£o e DeduplicaÃ§Ã£o
  title_hash TEXT NOT NULL,
  cluster_id UUID,
  is_duplicate BOOLEAN NOT NULL DEFAULT false,
  primary_source_id UUID REFERENCES public.mined_raw_extractions(id) ON DELETE SET NULL,
  
  -- Ciclo de Vida do Pipeline
  status TEXT NOT NULL DEFAULT 'raw_extracted'
    CHECK (status IN ('raw_extracted', 'integrity_failed', 'clustered', 'curating', 'curated', 'published', 'rejected', 'archived')),
  integrity_failure_reason TEXT,
  
  -- RelaÃ§Ãµes de PublicaÃ§Ã£o e Multi-Tenant
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  curated_article_id UUID REFERENCES public.news_articles(id) ON DELETE SET NULL,
  curated_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  curated_at TIMESTAMPTZ,
  curator_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  curator_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT uq_mined_raw_source_url UNIQUE (source_url)
);

CREATE INDEX IF NOT EXISTS idx_mined_raw_type_status ON public.mined_raw_extractions(content_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mined_raw_city ON public.mined_raw_extractions(city, state);
CREATE INDEX IF NOT EXISTS idx_mined_raw_title_hash ON public.mined_raw_extractions(title_hash);
CREATE INDEX IF NOT EXISTS idx_mined_raw_cluster ON public.mined_raw_extractions(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mined_raw_store ON public.mined_raw_extractions(store_id);

-- RLS para mined_raw_extractions
ALTER TABLE public.mined_raw_extractions ENABLE ROW LEVEL SECURITY;

-- Leitura pÃºblica para itens jÃ¡ aprovados/publicados ou leitura ampla para membros de loja e admin master
DROP POLICY IF EXISTS "mined_raw_staff_read" ON public.mined_raw_extractions;
CREATE POLICY "mined_raw_staff_read" ON public.mined_raw_extractions
  FOR SELECT USING (
    public.is_platform_admin() OR 
    (store_id IS NOT NULL AND public.is_store_staff(store_id)) OR
    status = 'published'
  );

DROP POLICY IF EXISTS "mined_raw_master_write" ON public.mined_raw_extractions;
CREATE POLICY "mined_raw_master_write" ON public.mined_raw_extractions
  FOR ALL USING (public.is_platform_admin());

DROP POLICY IF EXISTS "mined_raw_store_write" ON public.mined_raw_extractions;
CREATE POLICY "mined_raw_store_write" ON public.mined_raw_extractions
  FOR UPDATE USING (
    store_id IS NOT NULL AND 
    public.has_workspace_role(store_id, ARRAY['owner', 'admin', 'manager', 'content'])
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 3. ExpansÃ£o de Events (Eventos Externos, RSVP e Relacionamento com MineraÃ§Ã£o)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_source TEXT, -- 'sympla', 'eventbrite', 'prefeitura', 'ingresse'
  ADD COLUMN IF NOT EXISTS venue TEXT,
  ADD COLUMN IF NOT EXISTS price_min_cents INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_max_cents INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rsvp_going_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rsvp_interested_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rsvp_not_going_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raw_extraction_id UUID REFERENCES public.mined_raw_extractions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_is_external ON public.events(is_external, event_date);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 4. Tabela de ConfirmaÃ§Ã£o de PresenÃ§a (event_rsvps)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_fingerprint TEXT,
  status TEXT NOT NULL CHECK (status IN ('going', 'interested', 'not_going')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_rsvp_user 
  ON public.event_rsvps(event_id, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_rsvp_session 
  ON public.event_rsvps(event_id, session_fingerprint) 
  WHERE user_id IS NULL AND session_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status ON public.event_rsvps(event_id, status);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_rsvps_public_read" ON public.event_rsvps;
CREATE POLICY "event_rsvps_public_read" ON public.event_rsvps
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_rsvps_insert_all" ON public.event_rsvps;
CREATE POLICY "event_rsvps_insert_all" ON public.event_rsvps
  FOR INSERT WITH CHECK (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (user_id IS NULL AND session_fingerprint IS NOT NULL) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "event_rsvps_update_owner" ON public.event_rsvps;
CREATE POLICY "event_rsvps_update_owner" ON public.event_rsvps
  FOR UPDATE USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    public.is_platform_admin()
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 5. RPC AtÃ´mico para RSVP de Eventos com Contadores Sincronizados
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.toggle_event_rsvp(
  p_event_id UUID,
  p_status TEXT, -- 'going', 'interested', 'not_going'
  p_session_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_prev_status TEXT;
  v_going_count INT;
  v_interested_count INT;
  v_not_going_count INT;
BEGIN
  IF p_status NOT IN ('going', 'interested', 'not_going') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS');
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT status INTO v_prev_status 
    FROM public.event_rsvps 
    WHERE event_id = p_event_id AND user_id = v_user_id;

    IF FOUND THEN
      IF v_prev_status = p_status THEN
        -- Desmarcar (remover)
        DELETE FROM public.event_rsvps WHERE event_id = p_event_id AND user_id = v_user_id;
      ELSE
        -- Atualizar voto
        UPDATE public.event_rsvps 
        SET status = p_status, updated_at = now()
        WHERE event_id = p_event_id AND user_id = v_user_id;
      END IF;
    ELSE
      -- Inserir novo
      INSERT INTO public.event_rsvps (event_id, user_id, status)
      VALUES (p_event_id, v_user_id, p_status);
    END IF;
  ELSE
    IF p_session_fingerprint IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'SESSION_REQUIRED_FOR_ANONYMOUS');
    END IF;

    SELECT status INTO v_prev_status 
    FROM public.event_rsvps 
    WHERE event_id = p_event_id AND session_fingerprint = p_session_fingerprint;

    IF FOUND THEN
      IF v_prev_status = p_status THEN
        DELETE FROM public.event_rsvps WHERE event_id = p_event_id AND session_fingerprint = p_session_fingerprint;
      ELSE
        UPDATE public.event_rsvps 
        SET status = p_status, updated_at = now()
        WHERE event_id = p_event_id AND session_fingerprint = p_session_fingerprint;
      END IF;
    ELSE
      INSERT INTO public.event_rsvps (event_id, session_fingerprint, status)
      VALUES (p_event_id, p_session_fingerprint, p_status);
    END IF;
  END IF;

  -- Recalcula contadores atÃ´micos
  SELECT 
    COUNT(*) FILTER (WHERE status = 'going'),
    COUNT(*) FILTER (WHERE status = 'interested'),
    COUNT(*) FILTER (WHERE status = 'not_going')
  INTO v_going_count, v_interested_count, v_not_going_count
  FROM public.event_rsvps
  WHERE event_id = p_event_id;

  UPDATE public.events
  SET 
    rsvp_going_count = v_going_count,
    rsvp_interested_count = v_interested_count,
    rsvp_not_going_count = v_not_going_count,
    updated_at = now()
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'going_count', v_going_count,
    'interested_count', v_interested_count,
    'not_going_count', v_not_going_count,
    'user_status', CASE WHEN v_prev_status = p_status THEN NULL ELSE p_status END
  );
END;
$$;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 6. Tabela de Relacionamento Bidirecional entre Eventos e NotÃ­cias (event_news_relations)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.event_news_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  news_article_id UUID NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'coverage' 
    CHECK (relation_type IN ('coverage', 'announcement', 'recap', 'ticket_launch', 'interview')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_event_news_relation UNIQUE (event_id, news_article_id)
);

CREATE INDEX IF NOT EXISTS idx_event_news_event ON public.event_news_relations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_news_article ON public.event_news_relations(news_article_id);

ALTER TABLE public.event_news_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_news_public_read" ON public.event_news_relations;
CREATE POLICY "event_news_public_read" ON public.event_news_relations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_news_staff_write" ON public.event_news_relations;
CREATE POLICY "event_news_staff_write" ON public.event_news_relations
  FOR ALL USING (
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_news_relations.event_id 
        AND public.has_workspace_role(e.store_id, ARRAY['owner', 'admin', 'manager', 'content'])
    )
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 7. Tabela de Squads de Curadoria Customizados (curation_squad_registry)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.curation_squad_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE, -- NULL = Squad Global da Plataforma
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  tone TEXT NOT NULL DEFAULT 'editorial_clean', -- 'editorial_clean', 'investigative', 'pop_viral', 'corporate_sober', 'community_direct'
  target_audience TEXT DEFAULT 'Leitores regionais mÃ³veis',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{
    "max_reading_time_minutes": 3,
    "require_5w1h_check": true,
    "anti_ai_smell_filter": true,
    "generate_key_takeaways": true,
    "max_paragraph_lines": 3
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_squad_store_slug UNIQUE (store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_curation_squad_store ON public.curation_squad_registry(store_id, is_active);

ALTER TABLE public.curation_squad_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "curation_squad_public_read" ON public.curation_squad_registry;
CREATE POLICY "curation_squad_public_read" ON public.curation_squad_registry
  FOR SELECT USING (
    store_id IS NULL OR 
    public.is_store_staff(store_id) OR 
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "curation_squad_admin_all" ON public.curation_squad_registry;
CREATE POLICY "curation_squad_admin_all" ON public.curation_squad_registry
  FOR ALL USING (
    public.is_platform_admin() OR 
    (store_id IS NOT NULL AND public.has_workspace_role(store_id, ARRAY['owner', 'admin']))
  );

-- Seed dos squads canÃ´nicos
INSERT INTO public.curation_squad_registry (store_id, name, slug, description, tone, target_audience, is_default)
VALUES
  (NULL, 'Squad PhD Jornalismo & Anti-AI (Waesy Oficial)', 'waesy-official-phd', 
   'Equipe de elite com rigor investigativo 5W1H, escrita mobile-first concisa e filtro anti-AI rigoroso.', 
   'editorial_clean', 'PÃºblico geral de ChapecÃ³ e Santa Catarina', true),
  (NULL, 'Squad RÃ¡pido & Viral (TendÃªncias & Acontecimentos)', 'waesy-viral-trends', 
   'Focado em agilidade, notÃ­cias urgentes, calor de pauta e chamadas dinÃ¢micas sem sensacionalismo.', 
   'pop_viral', 'Leitores Ã¡vidos de redes sociais e feeds rÃ¡pidos', false),
  (NULL, 'Squad Municipal & Cidadania (Prefeituras & Editais)', 'waesy-public-portal', 
   'Especializado na simplificaÃ§Ã£o de editais, licitaÃ§Ãµes, obras e utilidade pÃºblica municipal.', 
   'community_direct', 'CidadÃ£os, empresÃ¡rios e servidores locais', false)
ON CONFLICT DO NOTHING;

