-- ============================================================================
-- V127: OMNI-CRAWLER ENGINE, CRAWLER SOURCES & MASSIVE INDEXING INFRASTRUCTURE
-- ============================================================================
-- Criação da tabela canônica crawler_sources, índices de fila anti-bloqueio,
-- e automação de injeção de sementes para mineração autônoma contínua.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crawler_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN (
    'rss',             -- Feeds RSS/Atom
    'html_sitemap',    -- Sitemaps XML ou índices HTML
    'jobs_portal',     -- Portais de empregos e vagas abertas
    'real_estate',     -- Portais e classificados imobiliários
    'auctions',        -- Leilões judiciais e extrajudiciais
    'tenders',         -- Editais públicos e licitações (PNCP/DOM)
    'news',            -- Portais de jornalismo e notícias
    'ecommerce'        -- Lojas e marketplaces para inteligência de preço
  )),
  category TEXT DEFAULT 'general',
  region TEXT DEFAULT 'SC',
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'fetching', 'success', 'error', 'paused')),
  fetch_interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (fetch_interval_minutes >= 5),
  last_fetched_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  items_indexed_count INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices otimizados para busca de fontes prontas para execução (Scheduler / Workers)
CREATE INDEX IF NOT EXISTS idx_crawler_sources_active_type 
  ON public.crawler_sources (is_active, type, priority DESC);

CREATE INDEX IF NOT EXISTS idx_crawler_sources_next_fetch 
  ON public.crawler_sources (status, last_fetched_at ASC) 
  WHERE is_active = true;

-- Adicionar colunas de suporte na tabela crawl_queue para controle rigoroso de rate limit e anti-bloqueio
ALTER TABLE public.crawl_queue
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.crawler_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_agent_mode TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS ip_pool_tier TEXT DEFAULT 'residential',
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_crawl_queue_content_hash 
  ON public.crawl_queue (content_hash) 
  WHERE content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crawl_queue_source_status 
  ON public.crawl_queue (source_id, status);

-- Trigger para sincronização automática entre crawler_sources e crawl_seeds / rss_feeds
CREATE OR REPLACE FUNCTION public.sync_crawler_source_to_legacy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.type = 'rss' THEN
    INSERT INTO public.rss_feeds (
      name, feed_url, website_url, category, region, is_active, content_type
    ) VALUES (
      NEW.name, NEW.url, NEW.config->>'website_url', NEW.category, NEW.region, NEW.is_active, 'news'
    )
    ON CONFLICT (feed_url) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      category = EXCLUDED.category,
      updated_at = now();
  ELSE
    INSERT INTO public.crawl_seeds (
      name, seed_url, domain, entity_type, category, region, is_active, priority
    ) VALUES (
      NEW.name, 
      NEW.url, 
      COALESCE(NEW.config->>'domain', regexp_replace(regexp_replace(NEW.url, '^https?://(www\.)?', ''), '/.*$', '')),
      NEW.type, 
      NEW.category, 
      NEW.region, 
      NEW.is_active, 
      NEW.priority
    )
    ON CONFLICT (seed_url) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      priority = EXCLUDED.priority,
      category = EXCLUDED.category;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_crawler_source ON public.crawler_sources;
CREATE TRIGGER trg_sync_crawler_source
  AFTER INSERT OR UPDATE ON public.crawler_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_crawler_source_to_legacy();

-- RLS: Proteção e acesso seguro
ALTER TABLE public.crawler_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crawler_sources_admin_all" ON public.crawler_sources;
CREATE POLICY "crawler_sources_admin_all"
  ON public.crawler_sources
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comentários documentais
COMMENT ON TABLE public.crawler_sources IS 'Tabela canônica de fontes ativas do Omni-Crawler V127 (RSS, Vagas, Editais, Leilões, Imóveis).';
