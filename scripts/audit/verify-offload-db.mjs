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
  console.log('[OFFLOAD-DB] Connected!');

  // Verify tables are provisioned
  const r = await client.query(`
    SELECT table_name, pg_size_pretty(pg_total_relation_size('public.'||table_name)) AS size
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log('[OFFLOAD-DB] Tables:');
  for (const row of r.rows) {
    console.log(`  - ${row.table_name}: ${row.size}`);
  }

  // Check if anon key / service role are needed
  // Note: for the offload DB we use direct postgres, not PostgREST
  // Let's also check connectivity via pooler
  const q = await client.query(`SELECT current_database(), version(), pg_database_size(current_database()) as bytes;`);
  const mb = (q.rows[0].bytes / 1024 / 1024).toFixed(2);
  console.log(`[OFFLOAD-DB] DB: ${q.rows[0].current_database}, Size: ${mb} MB`);

  await client.end();
}

main().catch(err => { console.error('[OFFLOAD-DB] Error:', err.message); process.exit(1); });
