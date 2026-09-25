-- 20261019000000_mining_telemetry_enhancements.sql
-- Adiciona colunas para screenshots visuais do Steel.dev e histórico de economia de tokens

ALTER TABLE IF EXISTS public.scraper_audit_log
ADD COLUMN IF NOT EXISTS screenshot_url text,
ADD COLUMN IF NOT EXISTS tokens_saved integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS content_type text;

-- Índice para busca rápida de auditorias com screenshot
CREATE INDEX IF NOT EXISTS idx_scraper_audit_log_screenshot 
ON public.scraper_audit_log(created_at DESC) 
WHERE screenshot_url IS NOT NULL;
