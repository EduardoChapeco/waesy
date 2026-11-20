import pg from 'pg';

// Try multiple connection strategies to reach the primary DB
const PRIMARY_HOST = 'db.jfuebqmltksyznovhlwa.supabase.co';
const PRIMARY_PASS = process.env.POSTGRES_PASSWORD || process.env.SUPABASE_DB_PASSWORD;

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
const dbPass = secrets.POSTGRES_PASSWORD || secrets.SUPABASE_DB_PASSWORD;
const poolerHost = `aws-0-sa-east-1.pooler.supabase.com`;
const poolerUser = `postgres.jfuebqmltksyznovhlwa`;

console.log('DB pass present:', !!dbPass);

async function tryConnect(label, cfg) {
  const c = new pg.Client({ ...cfg, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 6000 });
  try {
    await c.connect();
    console.log(`\n[${label}] CONNECTED!`);
    const r = await c.query(`SELECT version(), pg_database_size(current_database())::bigint as db_bytes;`);
    console.log(`[${label}] Version: ${r.rows[0].version.split(',')[0]}`);
    const dbMb = (r.rows[0].db_bytes / 1024 / 1024).toFixed(1);
    console.log(`[${label}] DB size: ${dbMb} MB`);

    // Top tables by size
    const t = await c.query(`
      SELECT schemaname, tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_total_relation_size(schemaname||'.'||tablename) AS raw_bytes
      FROM information_schema.tables
      WHERE table_schema IN ('public','auth','cron','storage','net')
      ORDER BY raw_bytes DESC NULLS LAST
      LIMIT 20;
    `);
    console.log(`[${label}] Top 20 tables by size:`);
    for (const row of t.rows) {
      console.log(`  ${row.schemaname}.${row.tablename}: ${row.total_size}`);
    }

    // WAL size
    const w = await c.query(`SELECT pg_size_pretty(sum(size)) AS wal_size FROM pg_ls_waldir();`).catch(() => ({rows:[{wal_size:'N/A'}]}));
    console.log(`[${label}] WAL size: ${w.rows[0].wal_size}`);

    // Auth users count
    const u = await c.query(`SELECT count(*) as cnt FROM auth.users;`).catch(() => ({rows:[{cnt:'N/A'}]}));
    console.log(`[${label}] Auth users: ${u.rows[0].cnt}`);

    await c.end();
    return true;
  } catch (e) {
    console.log(`[${label}] FAILED: ${e.message}`);
    try { await c.end(); } catch {}
    return false;
  }
}

async function main() {
  // Strategy 1: Direct port 5432 (may fail on IPv6)
  await tryConnect('direct-5432', { host: PRIMARY_HOST, port: 5432, user: 'postgres', password: dbPass, database: 'postgres' });
  // Strategy 2: Session Pooler port 5432
  await tryConnect('pooler-session-5432', { host: poolerHost, port: 5432, user: poolerUser, password: dbPass, database: 'postgres' });
  // Strategy 3: Transaction Pooler port 6543
  await tryConnect('pooler-transaction-6543', { host: poolerHost, port: 6543, user: poolerUser, password: dbPass, database: 'postgres' });
}

main();
