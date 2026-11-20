import pg from 'pg';

const SECOND_HOST = 'db.wlxapubsesiwtxzbuygt.supabase.co';
const SECOND_PASS = '[REDACTED_PASSWORD]';

async function main() {
  const client = new pg.Client({
    host: SECOND_HOST,
    port: 5432,
    user: 'postgres',
    password: SECOND_PASS,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  await client.connect();
  console.log('[CONSOLIDATE-SCRIPT-GENERATOR] Connected to Offload DB!');

  // Show the anon and service_role JWTs from pg_catalog  
  const r = await client.query(`
    SELECT current_setting('app.settings.jwt_secret', true) as jwt_secret
  `).catch(() => ({ rows: [{ jwt_secret: 'N/A' }] }));
  console.log('JWT secret available:', r.rows[0]);

  // Check if PostgREST/auth is configured
  // The offload DB via REST API needs anon/service_role JWTs
  // These are set when the project is created on Supabase
  // We need to read them from the Supabase dashboard: Settings > API
  
  // For the dual-db setup, we primarily use direct pg connections for offload writes
  // since the offload DB is not exposed via CORS/JWT to the browser

  // Generate a consolidation script that copies data back from offload to primary
  const consolidateSql = `
-- CONSOLIDATION SCRIPT: Move data from Offload DB → Primary DB
-- Run this when you want to merge back to single DB or migrate to self-hosted
-- Direction: wlxapubsesiwtxzbuygt → jfuebqmltksyznovhlwa

-- Step 1: Create foreign data wrapper in primary DB to access offload
-- (run this in the PRIMARY DB)
/*
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SERVER offload_db_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'db.wlxapubsesiwtxzbuygt.supabase.co', port '5432', dbname 'postgres');

CREATE USER MAPPING FOR postgres
  SERVER offload_db_server
  OPTIONS (user 'postgres', password '${SECOND_PASS}');

IMPORT FOREIGN SCHEMA public
  LIMIT TO (system_error_logs, telemetry_logs, news_articles, crawl_queue, scraper_audit_log, agent_execution_log)
  FROM SERVER offload_db_server
  INTO offload_schema;

-- Step 2: Copy data
INSERT INTO public.system_error_logs SELECT * FROM offload_schema.system_error_logs;
INSERT INTO public.telemetry_logs SELECT * FROM offload_schema.telemetry_logs;
-- ... repeat for each offload table

-- Step 3: Drop foreign schema + server
DROP SCHEMA offload_schema CASCADE;
DROP SERVER offload_db_server CASCADE;
*/
  `.trim();

  import fs from 'fs';
  fs.writeFileSync('scripts/ops/CONSOLIDATE_OFFLOAD_TO_PRIMARY.sql', consolidateSql);
  console.log('[CONSOLIDATE] Generated: scripts/ops/CONSOLIDATE_OFFLOAD_TO_PRIMARY.sql');

  await client.end();
}

main().catch(console.error);
