-- 20261018000000_mining_advanced_engines.sql
-- Expansão de tipos de mineração, índices de performance e registro de pools para DataJud e Places

-- 1. Expansão do enum mining_content_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'mining_content_type' AND e.enumlabel = 'receitas') THEN
    ALTER TYPE mining_content_type ADD VALUE 'receitas';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'mining_content_type' AND e.enumlabel = 'empresas') THEN
    ALTER TYPE mining_content_type ADD VALUE 'empresas';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'mining_content_type' AND e.enumlabel = 'processos') THEN
    ALTER TYPE mining_content_type ADD VALUE 'processos';
  END IF;
END $$;

-- 2. Índices para performance de busca jurídica em mined_lawsuits
CREATE INDEX IF NOT EXISTS idx_mined_lawsuits_process_clean ON mined_lawsuits(process_number_clean);
CREATE INDEX IF NOT EXISTS idx_mined_lawsuits_court ON mined_lawsuits(court_code);
CREATE INDEX IF NOT EXISTS idx_mined_lawsuits_status ON mined_lawsuits(status);
CREATE INDEX IF NOT EXISTS idx_mined_lawsuits_origin_state ON mined_lawsuits(origin_state);

-- 3. Índices para diretório de empresas mineradas
CREATE INDEX IF NOT EXISTS idx_directory_listings_city_category ON directory_listings(city, category);
CREATE INDEX IF NOT EXISTS idx_directory_listings_crawled ON directory_listings(is_crawled);
CREATE INDEX IF NOT EXISTS idx_directory_listings_phone ON directory_listings(contact_phone);

-- 4. Registrar chaves de serviço no api_key_pools se ausentes
INSERT INTO api_key_pools (provider, label, encrypted_key, masked_key, priority, is_active, rate_limit_per_minute, daily_request_count)
SELECT 'datajud', 'DataJud CNJ API Pública', '', 'datajud-public', 1, true, 120, 0
WHERE NOT EXISTS (
  SELECT 1 FROM api_key_pools WHERE provider = 'datajud'
);

INSERT INTO api_key_pools (provider, label, encrypted_key, masked_key, priority, is_active, rate_limit_per_minute, daily_request_count)
SELECT 'places_scraper', 'Google Maps / Places Harvester', '', 'places-public', 1, true, 60, 0
WHERE NOT EXISTS (
  SELECT 1 FROM api_key_pools WHERE provider = 'places_scraper'
);

-- 5. Seed de agendamento de mineração para processos e empresas locais
INSERT INTO mining_schedules (job_type, name, schedule_cron, is_active, description)
SELECT 'datajud-sync', 'Sincronizador Processos DataJud', '0 */6 * * *', true, 'Sincronização periódica de movimentações processuais DataJud'
WHERE NOT EXISTS (
  SELECT 1 FROM mining_schedules WHERE job_type = 'datajud-sync'
);

INSERT INTO mining_schedules (job_type, name, schedule_cron, is_active, description)
SELECT 'places-discovery', 'Descoberta de Empresas Locais (Places)', '0 2 * * *', true, 'Varredura noturna de novos estabelecimentos comerciais locais'
WHERE NOT EXISTS (
  SELECT 1 FROM mining_schedules WHERE job_type = 'places-discovery'
);
