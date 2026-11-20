import pg from 'pg';

const SECOND_DB_HOST = 'db.wlxapubsesiwtxzbuygt.supabase.co';
const SECOND_DB_PORT = 5432;
const SECOND_DB_USER = 'postgres';
const SECOND_DB_PASSWORD = process.env.SUPABASE_OFFLOAD_DB_PASSWORD || '[REDACTED_PASSWORD]';
const SECOND_DB_NAME = 'postgres';

async function main() {
  console.log(`[PROVISION] Connecting to Offload Supabase DB at ${SECOND_DB_HOST}...`);
  const client = new pg.Client({
    host: SECOND_DB_HOST,
    port: SECOND_DB_PORT,
    user: SECOND_DB_USER,
    password: SECOND_DB_PASSWORD,
    database: SECOND_DB_NAME,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('[PROVISION] Connected successfully to PostgreSQL 17 on Offload DB.');

    // 1. Extensions
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 2. Core Telemetry & Logging Tables
    console.log('[PROVISION] Creating offload tables...');
    await client.query(`
      -- 1. Logs de Erro & Auditoria
      CREATE TABLE IF NOT EXISTS public.system_error_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        severity TEXT NOT NULL DEFAULT 'error',
        source TEXT,
        message TEXT,
        stack TEXT,
        context JSONB DEFAULT '{}'::jsonb,
        user_id UUID,
        store_id UUID
      );
      CREATE INDEX IF NOT EXISTS idx_system_error_logs_created_at ON public.system_error_logs (created_at DESC);

      CREATE TABLE IF NOT EXISTS public.security_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        action TEXT NOT NULL,
        actor_id UUID,
        target_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata JSONB DEFAULT '{}'::jsonb
      );
      CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON public.security_audit_logs (created_at DESC);

      CREATE TABLE IF NOT EXISTS public.telemetry_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        event_name TEXT NOT NULL,
        payload JSONB DEFAULT '{}'::jsonb,
        session_id TEXT,
        user_id UUID,
        store_id UUID
      );
      CREATE INDEX IF NOT EXISTS idx_telemetry_logs_created_at ON public.telemetry_logs (created_at DESC);

      CREATE TABLE IF NOT EXISTS public.ad_telemetry_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        event_type TEXT NOT NULL,
        store_id UUID,
        listing_id UUID,
        ad_id TEXT,
        campaign_id TEXT,
        metadata JSONB DEFAULT '{}'::jsonb
      );
      CREATE INDEX IF NOT EXISTS idx_ad_telemetry_created_at ON public.ad_telemetry_events (created_at DESC);

      -- 2. Scrapers, Crawlers & Mineração
      CREATE TABLE IF NOT EXISTS public.crawl_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        url TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        last_attempt_at TIMESTAMPTZ,
        error_message TEXT,
        metadata JSONB DEFAULT '{}'::jsonb
      );
      CREATE INDEX IF NOT EXISTS idx_crawl_queue_status ON public.crawl_queue (status);

      CREATE TABLE IF NOT EXISTS public.scraper_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        scraper_name TEXT NOT NULL,
        items_extracted INT NOT NULL DEFAULT 0,
        duration_ms INT,
        status TEXT NOT NULL,
        error_details TEXT
      );

      CREATE TABLE IF NOT EXISTS public.mined_raw_extractions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        source TEXT NOT NULL,
        external_id TEXT,
        payload JSONB NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS public.news_articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        title TEXT NOT NULL,
        summary TEXT,
        content TEXT,
        source_url TEXT,
        source_name TEXT,
        category TEXT,
        published_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'::jsonb
      );
      CREATE INDEX IF NOT EXISTS idx_news_articles_created_at ON public.news_articles (created_at DESC);

      -- 3. Webhooks & WhatsApp Outbox / Inbound Logs
      CREATE TABLE IF NOT EXISTS public.whatsapp_provider_webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        event_type TEXT,
        payload JSONB NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS public.agent_execution_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        agent_name TEXT NOT NULL,
        task_id TEXT,
        status TEXT NOT NULL,
        input_tokens INT,
        output_tokens INT,
        duration_ms INT,
        result_summary TEXT,
        error_details TEXT
      );
    `);

    // 3. TTL Maintenance Function & Auto-Purge on Offload DB
    await client.query(`
      CREATE OR REPLACE FUNCTION public.auto_purge_offload_telemetry(retention_days INT DEFAULT 14)
      RETURNS TABLE(purged_errors INT, purged_telemetry INT, purged_webhooks INT) AS $$
      DECLARE
        cnt_err INT := 0;
        cnt_tel INT := 0;
        cnt_wh INT := 0;
        cutoff TIMESTAMPTZ := now() - (retention_days || ' days')::INTERVAL;
      BEGIN
        DELETE FROM public.system_error_logs WHERE created_at < cutoff;
        GET DIAGNOSTICS cnt_err = ROW_COUNT;

        DELETE FROM public.telemetry_logs WHERE created_at < cutoff;
        GET DIAGNOSTICS cnt_tel = ROW_COUNT;

        DELETE FROM public.whatsapp_provider_webhook_events WHERE created_at < cutoff;
        GET DIAGNOSTICS cnt_wh = ROW_COUNT;

        RETURN QUERY SELECT cnt_err, cnt_tel, cnt_wh;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Check table count
    const res = await client.query(`
      SELECT count(*) as total_tables 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log(`[PROVISION] Done! Total public tables in Offload DB: ${res.rows[0].total_tables}`);
  } catch (err) {
    console.error('[PROVISION] Error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
