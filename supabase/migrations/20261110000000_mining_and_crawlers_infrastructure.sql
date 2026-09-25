-- Migration: 20261110000000_mining_and_crawlers_infrastructure.sql
-- Infraestrutura Unificada de Crawlers, Feeds RSS, Mineradores e Ãndices Multi-Verticais
-- HarmonizaÃ§Ã£o e compatibilizaÃ§Ã£o com a migraÃ§Ã£o 20260828060000_mining_pipeline_and_content_factory.sql

-- 1. crawl_queue - Fila Unificada de ExploraÃ§Ã£o ContÃ­nua e Curadoria
CREATE TABLE IF NOT EXISTS public.crawl_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crawl_queue
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS depth INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_url TEXT,
  ADD COLUMN IF NOT EXISTS discovered_via TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'news',
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'news',
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS processing_error TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extracted_data JSONB,
  ADD COLUMN IF NOT EXISTS mined_article_id UUID,
  ADD COLUMN IF NOT EXISTS store_id UUID,
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_cq_domain ON public.crawl_queue(domain);
CREATE INDEX IF NOT EXISTS idx_cq_status ON public.crawl_queue(status);
CREATE INDEX IF NOT EXISTS idx_cq_priority ON public.crawl_queue(priority DESC, scheduled_for ASC);

-- 2. crawl_cache - Cache de Respostas, ConteÃºdo Limpo e DeduplicaÃ§Ã£o SHA-256
CREATE TABLE IF NOT EXISTS public.crawl_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  status_code INTEGER,
  content_hash TEXT,
  html_content TEXT,
  extracted_json_ld JSONB,
  extracted_open_graph JSONB,
  headers JSONB DEFAULT '{}'::jsonb,
  response_time_ms INTEGER,
  crawled_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cc_domain ON public.crawl_cache(domain);
CREATE INDEX IF NOT EXISTS idx_cc_content_hash ON public.crawl_cache(content_hash);

-- 3. rss_feeds - Fontes de Feeds RSS/Atom Monitoradas
CREATE TABLE IF NOT EXISTS public.rss_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  feed_url TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rss_feeds
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'news',
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'news',
  ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'Geral/Nacional',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_fetched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS items_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS error_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_enqueue BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quality_threshold INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS fetch_interval_minutes INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS max_items_per_fetch INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS items_published_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_rejected_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS store_id UUID,
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_rf_active ON public.rss_feeds(is_active);

-- 4. scraper_configs - ConfiguraÃ§Ãµes Unificadas de Scrapers e Seletores por DomÃ­nio
CREATE TABLE IF NOT EXISTS public.scraper_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scraper_configs
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS domain_pattern TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS selectors JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS requires_javascript BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS request_delay_ms INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS max_requests_per_hour INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS css_title TEXT,
  ADD COLUMN IF NOT EXISTS css_description TEXT,
  ADD COLUMN IF NOT EXISTS css_body TEXT,
  ADD COLUMN IF NOT EXISTS css_cover_image TEXT,
  ADD COLUMN IF NOT EXISTS css_author TEXT,
  ADD COLUMN IF NOT EXISTS css_date TEXT,
  ADD COLUMN IF NOT EXISTS css_categories TEXT,
  ADD COLUMN IF NOT EXISTS reliability_score INTEGER NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS source_credibility TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS success_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fail_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_scraped INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_published INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_failed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 5. domain_configs - Rate Limits e Respeito a Robots.txt
CREATE TABLE IF NOT EXISTS public.domain_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  robots_txt TEXT,
  robots_allows_crawl BOOLEAN DEFAULT true,
  crawl_delay_seconds INTEGER DEFAULT 1,
  max_requests_per_day INTEGER DEFAULT 2000,
  requests_today INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  last_request_at TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. crawl_seeds - Sementes Iniciais de ExploraÃ§Ã£o
CREATE TABLE IF NOT EXISTS public.crawl_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  seed_url TEXT NOT NULL,
  domain TEXT NOT NULL,
  entity_type TEXT,
  category TEXT,
  region TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  metadata JSONB DEFAULT '{}'::jsonb,
  tenant_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. scraper_audit_log - Auditoria, Telemetria e LatÃªncia de ExecuÃ§Ãµes
CREATE TABLE IF NOT EXISTS public.scraper_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  records_affected INTEGER DEFAULT 0,
  input_params JSONB,
  result_summary JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sal_created_at ON public.scraper_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sal_scraper_name ON public.scraper_audit_log(scraper_name);

-- 8. indexed_businesses - Empresas Mineradas & DiretÃ³rio Comercial
CREATE TABLE IF NOT EXISTS public.indexed_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  neighborhood TEXT,
  lat NUMERIC,
  lng NUMERIC,
  phone TEXT,
  website TEXT,
  cnpj TEXT,
  rating NUMERIC,
  reviews_count INTEGER DEFAULT 0,
  price_level TEXT,
  hours JSONB DEFAULT '{}'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  delivery BOOLEAN DEFAULT false,
  scraper_source TEXT,
  data_quality_score INTEGER DEFAULT 50,
  last_validated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  indexed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_ib_city ON public.indexed_businesses(city);
CREATE INDEX IF NOT EXISTS idx_ib_cnpj ON public.indexed_businesses(cnpj);
CREATE INDEX IF NOT EXISTS idx_ib_quality ON public.indexed_businesses(data_quality_score DESC);

-- 9. indexed_jobs - Vagas Mineradas
CREATE TABLE IF NOT EXISTS public.indexed_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_logo TEXT,
  description TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  location_city TEXT,
  location_state TEXT,
  remote_type TEXT,
  employment_type TEXT,
  apply_url TEXT,
  posted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  category TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  indexed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, external_id)
);

-- 10. indexed_events - Eventos Minerados
CREATE TABLE IF NOT EXISTS public.indexed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  venue_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  banner_url TEXT,
  ticket_url TEXT,
  price_min NUMERIC,
  price_max NUMERIC,
  is_free BOOLEAN DEFAULT false,
  category TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  indexed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, external_id)
);

-- 11. indexed_products - Produtos Minerados
CREATE TABLE IF NOT EXISTS public.indexed_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  category TEXT,
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  discount_percent NUMERIC,
  thumbnail TEXT,
  product_url TEXT,
  rating NUMERIC,
  in_stock BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  indexed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, external_id)
);

-- 12. mining_schedules - Agendamentos e ConfiguraÃ§Ãµes por Minerador
CREATE TABLE IF NOT EXISTS public.mining_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  cron_expression TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PopulaÃ§Ã£o inicial idempotente
ALTER TABLE public.mining_schedules
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS cron_expression TEXT,
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

ALTER TABLE public.mining_schedules ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.mining_schedules ALTER COLUMN name SET DEFAULT '';

INSERT INTO public.mining_schedules (name, job_type, display_name, description, is_active, config)
VALUES
  ('Continuous Crawler', 'continuous-crawler', 'Continuous Crawler', 'Varredura contÃ­nua de pÃ¡ginas com seleÃ§Ã£o de estratÃ©gias e anÃ¡lise textual', true, '{"use_firecrawl": false, "max_depth": 2}'::jsonb),
  ('RSS Ingester', 'rss-fetcher', 'RSS Ingester', 'Varredura e parsing de feeds RSS/Atom e detecÃ§Ã£o de atualizaÃ§Ãµes', true, '{"fetch_interval_min": 30}'::jsonb),
  ('Market Data Miner (BCB SGS)', 'market-data', 'Market Data Miner (BCB SGS)', 'MineraÃ§Ã£o de Ã­ndices econÃ´micos oficiais (IPCA, SELIC, CÃ¢mbio DÃ³lar/Euro)', true, '{"refresh_hours": 12}'::jsonb),
  ('CNPJ & Business Scraper', 'cnpj-enrichment', 'CNPJ & Business Scraper', 'Enriquecimento cadastral via BrasilAPI, ReceitaWS e CNPJ.JA com QSA', true, '{"auto_mine": true, "batch_size": 20}'::jsonb),
  ('Social Content Miner', 'social-miner', 'Social Content Miner', 'ExtraÃ§Ã£o de metadados de mÃ­dias e perfis pÃºblicos', true, '{"platforms": ["instagram", "youtube", "tiktok"]}'::jsonb)
ON CONFLICT (job_type) DO NOTHING;

-- Seeds iniciais para bootstrapping da exploraÃ§Ã£o
INSERT INTO public.crawl_seeds (name, seed_url, domain, entity_type, category, region, priority)
VALUES
  ('G1 Santa Catarina', 'https://g1.globo.com/sc/santa-catarina/', 'g1.globo.com', 'news', 'regional', 'SC', 8),
  ('ND Mais NotÃ­cias', 'https://ndmais.com.br/', 'ndmais.com.br', 'news', 'regional', 'SC', 7),
  ('Portal DI Regional', 'https://diregional.com.br/', 'diregional.com.br', 'news', 'regional', 'SC', 7)
ON CONFLICT DO NOTHING;

-- RLS: Row Level Security Idempotente
ALTER TABLE public.crawl_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indexed_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indexed_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indexed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indexed_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mining_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "crawl_queue_staff_all" ON public.crawl_queue;
  DROP POLICY IF EXISTS "crawl_queue_staff_all" ON public.crawl_queue;
CREATE POLICY "crawl_queue_staff_all" ON public.crawl_queue FOR ALL USING (true);

  DROP POLICY IF EXISTS "crawl_cache_staff_all" ON public.crawl_cache;
  DROP POLICY IF EXISTS "crawl_cache_staff_all" ON public.crawl_cache;
CREATE POLICY "crawl_cache_staff_all" ON public.crawl_cache FOR ALL USING (true);

  DROP POLICY IF EXISTS "rss_feeds_staff_all" ON public.rss_feeds;
  DROP POLICY IF EXISTS "rss_feeds_staff_all" ON public.rss_feeds;
CREATE POLICY "rss_feeds_staff_all" ON public.rss_feeds FOR ALL USING (true);

  DROP POLICY IF EXISTS "scraper_configs_staff_all" ON public.scraper_configs;
  DROP POLICY IF EXISTS "scraper_configs_staff_all" ON public.scraper_configs;
CREATE POLICY "scraper_configs_staff_all" ON public.scraper_configs FOR ALL USING (true);

  DROP POLICY IF EXISTS "domain_configs_staff_all" ON public.domain_configs;
  DROP POLICY IF EXISTS "domain_configs_staff_all" ON public.domain_configs;
CREATE POLICY "domain_configs_staff_all" ON public.domain_configs FOR ALL USING (true);

  DROP POLICY IF EXISTS "crawl_seeds_staff_all" ON public.crawl_seeds;
  DROP POLICY IF EXISTS "crawl_seeds_staff_all" ON public.crawl_seeds;
CREATE POLICY "crawl_seeds_staff_all" ON public.crawl_seeds FOR ALL USING (true);

  DROP POLICY IF EXISTS "scraper_audit_log_staff_all" ON public.scraper_audit_log;
  DROP POLICY IF EXISTS "scraper_audit_log_staff_all" ON public.scraper_audit_log;
CREATE POLICY "scraper_audit_log_staff_all" ON public.scraper_audit_log FOR ALL USING (true);

  DROP POLICY IF EXISTS "indexed_businesses_read" ON public.indexed_businesses;
  DROP POLICY IF EXISTS "indexed_businesses_read" ON public.indexed_businesses;
CREATE POLICY "indexed_businesses_read" ON public.indexed_businesses FOR SELECT USING (true);

  DROP POLICY IF EXISTS "indexed_businesses_write" ON public.indexed_businesses;
  DROP POLICY IF EXISTS "indexed_businesses_write" ON public.indexed_businesses;
CREATE POLICY "indexed_businesses_write" ON public.indexed_businesses FOR ALL USING (true);

  DROP POLICY IF EXISTS "indexed_jobs_read" ON public.indexed_jobs;
  DROP POLICY IF EXISTS "indexed_jobs_read" ON public.indexed_jobs;
CREATE POLICY "indexed_jobs_read" ON public.indexed_jobs FOR SELECT USING (true);

  DROP POLICY IF EXISTS "indexed_jobs_write" ON public.indexed_jobs;
  DROP POLICY IF EXISTS "indexed_jobs_write" ON public.indexed_jobs;
CREATE POLICY "indexed_jobs_write" ON public.indexed_jobs FOR ALL USING (true);

  DROP POLICY IF EXISTS "indexed_events_read" ON public.indexed_events;
  DROP POLICY IF EXISTS "indexed_events_read" ON public.indexed_events;
CREATE POLICY "indexed_events_read" ON public.indexed_events FOR SELECT USING (true);

  DROP POLICY IF EXISTS "indexed_events_write" ON public.indexed_events;
  DROP POLICY IF EXISTS "indexed_events_write" ON public.indexed_events;
CREATE POLICY "indexed_events_write" ON public.indexed_events FOR ALL USING (true);

  DROP POLICY IF EXISTS "indexed_products_read" ON public.indexed_products;
  DROP POLICY IF EXISTS "indexed_products_read" ON public.indexed_products;
CREATE POLICY "indexed_products_read" ON public.indexed_products FOR SELECT USING (true);

  DROP POLICY IF EXISTS "indexed_products_write" ON public.indexed_products;
  DROP POLICY IF EXISTS "indexed_products_write" ON public.indexed_products;
CREATE POLICY "indexed_products_write" ON public.indexed_products FOR ALL USING (true);

  DROP POLICY IF EXISTS "mining_schedules_staff_all" ON public.mining_schedules;
  DROP POLICY IF EXISTS "mining_schedules_staff_all" ON public.mining_schedules;
CREATE POLICY "mining_schedules_staff_all" ON public.mining_schedules FOR ALL USING (true);
END $$;

