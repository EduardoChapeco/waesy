-- Migration: 20261115000000_crawler_resilience_and_mined_products.sql
-- Infraestrutura de Resiliência dos Crawlers, Cooldown de Domínios e Base Global de Preços & Produtos

-- 1. Enriquecimento de crawl_queue com campos de telemetria anti-bloqueio
ALTER TABLE public.crawl_queue
  ADD COLUMN IF NOT EXISTS last_http_status INTEGER,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_type TEXT,
  ADD COLUMN IF NOT EXISTS extracted_entities JSONB DEFAULT '{}'::jsonb;

-- Índice para deduplicação segura de URLs na fila
CREATE UNIQUE INDEX IF NOT EXISTS idx_cq_url_unique ON public.crawl_queue(url);

-- Índice para agendamento e backoff por domínio
CREATE INDEX IF NOT EXISTS idx_cq_scheduled_cooldown ON public.crawl_queue(scheduled_for, cooldown_until)
  WHERE status = 'pending';

-- 2. Tabela de Cooldowns de Domínio Persistente (Circuito Elétrico Anti-Banimento)
CREATE TABLE IF NOT EXISTS public.domain_cooldowns (
  domain TEXT PRIMARY KEY,
  reason TEXT NOT NULL, -- 'rate_limit_429', 'cloudflare_403', 'server_error_5xx', 'timeout'
  http_status INTEGER,
  cooldown_until TIMESTAMPTZ NOT NULL,
  consecutive_errors INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dc_cooldown_until ON public.domain_cooldowns(cooldown_until);

ALTER TABLE public.domain_cooldowns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "domain_cooldowns_public_read" ON public.domain_cooldowns;
  CREATE POLICY "domain_cooldowns_public_read" ON public.domain_cooldowns FOR SELECT USING (true);

  DROP POLICY IF EXISTS "domain_cooldowns_staff_all" ON public.domain_cooldowns;
  CREATE POLICY "domain_cooldowns_staff_all" ON public.domain_cooldowns FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Base Global de Produtos & Inteligência de Preços (mined_products)
CREATE TABLE IF NOT EXISTS public.mined_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT UNIQUE NOT NULL,
  source_domain TEXT NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.directory_listings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  sku TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  compare_at_cents INTEGER CHECK (compare_at_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  image_url TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  availability TEXT NOT NULL DEFAULT 'in_stock' CHECK (availability IN ('in_stock', 'out_of_stock', 'preorder')),
  category TEXT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_history JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de { date: string, price_cents: number }
  quality_score INTEGER NOT NULL DEFAULT 80,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'synced')),
  synced_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mp_domain ON public.mined_products(source_domain);
CREATE INDEX IF NOT EXISTS idx_mp_status ON public.mined_products(status);
CREATE INDEX IF NOT EXISTS idx_mp_store ON public.mined_products(store_id);
CREATE INDEX IF NOT EXISTS idx_mp_listing ON public.mined_products(listing_id);
CREATE INDEX IF NOT EXISTS idx_mp_price ON public.mined_products(price_cents);

ALTER TABLE public.mined_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "mined_products_public_read" ON public.mined_products;
  CREATE POLICY "mined_products_public_read" ON public.mined_products FOR SELECT USING (true);

  DROP POLICY IF EXISTS "mined_products_staff_all" ON public.mined_products;
  CREATE POLICY "mined_products_staff_all" ON public.mined_products FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
