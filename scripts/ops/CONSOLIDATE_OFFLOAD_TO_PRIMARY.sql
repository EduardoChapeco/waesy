-- CONSOLIDATION SCRIPT: Move data from Offload DB → Primary DB (or Self-Hosted)
-- ============================================================================
-- Purpose: Reversibility — merge wlxapubsesiwtxzbuygt → jfuebqmltksyznovhlwa
-- Run these commands IN THE PRIMARY DB (jfuebqmltksyznovhlwa).
-- ============================================================================

-- Step 1: Enable Foreign Data Wrapper extension (in Primary DB)
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Step 2: Create foreign server pointing to Offload DB
CREATE SERVER IF NOT EXISTS offload_db_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (
    host 'db.wlxapubsesiwtxzbuygt.supabase.co',
    port '5432',
    dbname 'postgres',
    sslmode 'require'
  );

-- Step 3: User mapping (use the offload DB postgres password)
CREATE USER MAPPING IF NOT EXISTS FOR postgres
  SERVER offload_db_server
  OPTIONS (user 'postgres', password '[REDACTED_PASSWORD]');

-- Step 4: Create a schema to import foreign tables
CREATE SCHEMA IF NOT EXISTS offload_import;

-- Step 5: Import foreign schema (all offload tables)
IMPORT FOREIGN SCHEMA public
  LIMIT TO (
    system_error_logs,
    security_audit_logs,
    telemetry_logs,
    ad_telemetry_events,
    crawl_queue,
    scraper_audit_log,
    mined_raw_extractions,
    news_articles,
    whatsapp_provider_webhook_events,
    agent_execution_log
  )
  FROM SERVER offload_db_server
  INTO offload_import;

-- Step 6: Copy data into primary tables (create them first if needed, then INSERT)
-- NOTE: Primary DB tables must exist. If they don't, create them matching the offload schema.
INSERT INTO public.system_error_logs
  SELECT * FROM offload_import.system_error_logs
  ON CONFLICT (id) DO NOTHING;

INSERT INTO public.security_audit_logs
  SELECT * FROM offload_import.security_audit_logs
  ON CONFLICT (id) DO NOTHING;

INSERT INTO public.telemetry_logs
  SELECT * FROM offload_import.telemetry_logs
  ON CONFLICT (id) DO NOTHING;

INSERT INTO public.news_articles
  SELECT * FROM offload_import.news_articles
  ON CONFLICT (id) DO NOTHING;

INSERT INTO public.crawl_queue
  SELECT * FROM offload_import.crawl_queue
  ON CONFLICT (id) DO NOTHING;

INSERT INTO public.agent_execution_log
  SELECT * FROM offload_import.agent_execution_log
  ON CONFLICT (id) DO NOTHING;

-- Repeat for other tables as needed...

-- Step 7: Cleanup foreign imports
DROP SCHEMA IF EXISTS offload_import CASCADE;
DROP SERVER IF EXISTS offload_db_server CASCADE;

-- Step 8: Set topology mode back to single
-- (Set environment variable SUPABASE_TOPOLOGY_MODE=single in Cloudflare Pages)
-- Then redeploy — no code changes needed.
