-- 20270102000000_crawler_industrialization_indexes.sql
-- Índices de Alta Performance e Otimização para Crawlers, Mineradores & Diretório Urbano

-- 1. Índices para Licitações Oficiais (mined_tenders)
CREATE INDEX IF NOT EXISTS idx_mined_tenders_city_date 
  ON public.mined_tenders (city, publication_date DESC);

CREATE INDEX IF NOT EXISTS idx_mined_tenders_agency_cnpj 
  ON public.mined_tenders (agency_cnpj);

CREATE INDEX IF NOT EXISTS idx_mined_tenders_modality 
  ON public.mined_tenders (modality);

-- 2. Índices para Estabelecimentos & Diretório (directory_listings)
CREATE INDEX IF NOT EXISTS idx_directory_listings_cat_city 
  ON public.directory_listings (category, city) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_directory_listings_cnpj 
  ON public.directory_listings (cnpj) 
  WHERE cnpj IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_directory_listings_website_url
  ON public.directory_listings (website_url)
  WHERE website_url IS NOT NULL;

-- 3. Índices para Vagas de Emprego (jobs)
CREATE INDEX IF NOT EXISTS idx_jobs_status_created 
  ON public.jobs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_category 
  ON public.jobs (category);

-- 4. Índices para Fila de Mineração (crawl_queue)
CREATE INDEX IF NOT EXISTS idx_crawl_queue_status_prio 
  ON public.crawl_queue (status, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_crawl_queue_entity_status
  ON public.crawl_queue (entity_type, status);

-- 5. RLS: Garantir que directory_listings e mined_tenders tenham leitura pública liberada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mined_tenders' AND policyname = 'mined_tenders_public_select'
  ) THEN
    CREATE POLICY mined_tenders_public_select ON public.mined_tenders
      FOR SELECT USING (true);
  END IF;
END $$;
