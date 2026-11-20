import pg from 'pg';
import fs from 'fs';

const secrets = {};
for (const line of fs.readFileSync('.env.secrets', 'utf8').split('\n')) {
  const m = line.trim().match(/^([^=]+)=(.*)$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    secrets[m[1].trim()] = v;
  }
}

const dbPass = secrets.SUPABASE_DB_PASSWORD;

// All known connection strings for jfuebqmltksyznovhlwa
const strategies = [
  // Direct - standard
  { label: 'direct-5432', host: 'db.jfuebqmltksyznovhlwa.supabase.co', port: 5432, user: 'postgres', family: 0 },
  // Direct - force IPv4
  { label: 'direct-5432-ipv4', host: 'db.jfuebqmltksyznovhlwa.supabase.co', port: 5432, user: 'postgres', family: 4 },
  // Supavisor session mode (AWS pooler sa-east-1)
  { label: 'pooler-session-5432', host: 'aws-0-sa-east-1.pooler.supabase.com', port: 5432, user: 'postgres.jfuebqmltksyznovhlwa', family: 0 },
  // Supavisor transaction mode
  { label: 'pooler-txn-6543', host: 'aws-0-sa-east-1.pooler.supabase.com', port: 6543, user: 'postgres.jfuebqmltksyznovhlwa', family: 0 },
  // Supavisor session via different region  
  { label: 'pooler-5432-ipv4', host: 'aws-0-sa-east-1.pooler.supabase.com', port: 5432, user: 'postgres.jfuebqmltksyznovhlwa', family: 4 },
];

async function tryCleanup(strategy) {
  const { label, host, port, user, family } = strategy;
  const client = new pg.Client({
    host, port, user, password: dbPass, database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    ...(family ? { family } : {})
  });

  try {
    await client.connect();
    console.log(`\n✅ [${label}] CONNECTED! Running emergency cleanup...`);

    // Get DB size
    const sz = await client.query(`SELECT pg_size_pretty(pg_database_size(current_database())) as s;`);
    console.log(`[${label}] DB size BEFORE: ${sz.rows[0].s}`);

    // Get top 10 tables
    const tops = await client.query(`
      SELECT schemaname||'.'||tablename AS tbl,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS sz,
        pg_total_relation_size(schemaname||'.'||tablename) AS raw
      FROM information_schema.tables
      WHERE table_schema IN ('public','cron','net','auth')
      ORDER BY raw DESC NULLS LAST LIMIT 10;
    `);
    console.log(`[${label}] Top 10 tables:`);
    for (const r of tops.rows) console.log(`  ${r.tbl}: ${r.sz}`);

    // Truncate log tables
    const truncateTables = [
      'public.system_error_logs', 'public.security_audit_logs', 'public.network_audit_log',
      'public.agent_execution_log', 'public.ad_telemetry_events', 'public.telemetry_logs',
      'public.ai_telemetry_logs', 'public.pixel_dispatch_log', 'public.pwa_telemetry',
      'public.crawl_queue', 'public.mined_raw_extractions', 'public.news_articles',
      'public.whatsapp_provider_webhook_events', 'public.scraper_audit_log',
    ];
    for (const t of truncateTables) {
      try {
        await client.query(`TRUNCATE ${t};`);
        console.log(`[${label}] TRUNCATED: ${t}`);
      } catch (e) {
        if (!e.message.includes('does not exist')) console.log(`[${label}] SKIP ${t}: ${e.message.slice(0,60)}`);
      }
    }

    // Delete from cron/net/auth
    try { await client.query(`DELETE FROM cron.job_run_details WHERE end_time < now() - INTERVAL '1 hour';`); console.log(`[${label}] Cleaned cron.job_run_details`); } catch(e) { console.log(`[${label}] cron skip: ${e.message.slice(0,60)}`); }
    try { await client.query(`DELETE FROM net._http_response WHERE created < now() - INTERVAL '1 hour';`); console.log(`[${label}] Cleaned net._http_response`); } catch(e) { console.log(`[${label}] net skip: ${e.message.slice(0,60)}`); }
    try { await client.query(`DELETE FROM auth.sessions WHERE not_after < now() - INTERVAL '7 days';`); console.log(`[${label}] Cleaned auth.sessions`); } catch(e) { console.log(`[${label}] auth.sessions skip: ${e.message.slice(0,60)}`); }
    try { await client.query(`DELETE FROM auth.refresh_tokens WHERE revoked = true AND created_at < now() - INTERVAL '7 days';`); console.log(`[${label}] Cleaned auth.refresh_tokens`); } catch(e) { console.log(`[${label}] auth.rt skip: ${e.message.slice(0,60)}`); }
    
    // VACUUM
    try {
      await client.query(`VACUUM ANALYZE;`);
      console.log(`[${label}] VACUUM ANALYZE done`);
    } catch(e) { console.log(`[${label}] VACUUM error: ${e.message.slice(0,60)}`); }

    // DB size after
    const sz2 = await client.query(`SELECT pg_size_pretty(pg_database_size(current_database())) as s;`);
    console.log(`[${label}] DB size AFTER: ${sz2.rows[0].s}`);

    await client.end();
    return true;
  } catch (e) {
    console.log(`❌ [${label}] FAILED: ${e.message}`);
    try { await client.end(); } catch {}
    return false;
  }
}

async function main() {
  console.log(`Password: ${dbPass?.slice(0,6)}...`);
  for (const s of strategies) {
    const ok = await tryCleanup(s);
    if (ok) {
      console.log('\n🎉 Cleanup successful! Restart services and test login.');
      process.exit(0);
    }
  }
  console.log('\n💀 ALL connection strategies failed. DB is completely inaccessible externally.');
  console.log('The disk is full and PostgreSQL has shut down. Only Supabase internal admin access can fix this.');
}

main();
