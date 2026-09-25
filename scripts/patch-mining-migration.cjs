const fs = require('fs');
const file = 'supabase/migrations/20261110000000_mining_and_crawlers_infrastructure.sql';
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `ALTER TABLE public.mining_schedules
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS cron_expression TEXT,
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

INSERT INTO public.mining_schedules (job_type, display_name, description, is_active, config)
VALUES
  ('continuous-crawler', 'Continuous Crawler', 'Varredura contÃ­nua de pÃ¡ginas com seleÃ§Ã£o de estratÃ©gias e anÃ¡lise textual', true, '{"use_firecrawl": false, "max_depth": 2}'::jsonb),
  ('rss-fetcher', 'RSS Ingester', 'Varredura e parsing de feeds RSS/Atom e detecÃ§Ã£o de atualizaÃ§Ãµes', true, '{"fetch_interval_min": 30}'::jsonb),
  ('market-data', 'Market Data Miner (BCB SGS)', 'MineraÃ§Ã£o de Ã­ndices econÃ´micos oficiais (IPCA, SELIC, CÃ¢mbio DÃ³lar/Euro)', true, '{"refresh_hours": 12}'::jsonb),
  ('cnpj-enrichment', 'CNPJ & Business Scraper', 'Enriquecimento cadastral via BrasilAPI, ReceitaWS e CNPJ.JA com QSA', true, '{"auto_mine": true, "batch_size": 20}'::jsonb),
  ('social-miner', 'Social Content Miner', 'ExtraÃ§Ã£o de metadados de mÃ­dias e perfis pÃºblicos', true, '{"platforms": ["instagram", "youtube", "tiktok"]}'::jsonb)
ON CONFLICT (job_type) DO NOTHING;`;

const newBlock = `ALTER TABLE public.mining_schedules
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS cron_expression TEXT,
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'mining_schedules' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.mining_schedules ALTER COLUMN name DROP NOT NULL;
    ALTER TABLE public.mining_schedules ALTER COLUMN name SET DEFAULT '';
  END IF;
END $$;

INSERT INTO public.mining_schedules (name, job_type, display_name, description, is_active, config)
VALUES
  ('Continuous Crawler', 'continuous-crawler', 'Continuous Crawler', 'Varredura contÃ­nua de pÃ¡ginas com seleÃ§Ã£o de estratÃ©gias e anÃ¡lise textual', true, '{"use_firecrawl": false, "max_depth": 2}'::jsonb),
  ('RSS Ingester', 'rss-fetcher', 'RSS Ingester', 'Varredura e parsing de feeds RSS/Atom e detecÃ§Ã£o de atualizaÃ§Ãµes', true, '{"fetch_interval_min": 30}'::jsonb),
  ('Market Data Miner (BCB SGS)', 'market-data', 'Market Data Miner (BCB SGS)', 'MineraÃ§Ã£o de Ã­ndices econÃ´micos oficiais (IPCA, SELIC, CÃ¢mbio DÃ³lar/Euro)', true, '{"refresh_hours": 12}'::jsonb),
  ('CNPJ & Business Scraper', 'cnpj-enrichment', 'CNPJ & Business Scraper', 'Enriquecimento cadastral via BrasilAPI, ReceitaWS e CNPJ.JA com QSA', true, '{"auto_mine": true, "batch_size": 20}'::jsonb),
  ('Social Content Miner', 'social-miner', 'Social Content Miner', 'ExtraÃ§Ã£o de metadados de mÃ­dias e perfis pÃºblicos', true, '{"platforms": ["instagram", "youtube", "tiktok"]}'::jsonb)
ON CONFLICT (job_type) DO NOTHING;`;

// Normalize line breaks before replacing
const normContent = content.replace(/\r\n/g, '\n');
const normOldBlock = oldBlock.replace(/\r\n/g, '\n');
if (normContent.includes(normOldBlock)) {
  const updated = normContent.replace(normOldBlock, newBlock.replace(/\r\n/g, '\n'));
  fs.writeFileSync(file, updated, 'utf8');
  console.log('Successfully updated 20261110000000 with name column fix!');
} else {
  console.error('Could not find oldBlock in file');
}
