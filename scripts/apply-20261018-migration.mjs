import postgres from 'postgres';

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: 'EEaR6399!@#2026',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const enums = await sql.unsafe("SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'mining_content_type'");
  console.log("Current mining_content_type enum labels:", enums.map(e => e.enumlabel));

  const schedules = await sql.unsafe("SELECT job_type, name, is_active, schedule_cron FROM mining_schedules WHERE job_type IN ('datajud-sync', 'places-discovery')");
  console.log("Active mining schedules:", schedules);

  const keys = await sql.unsafe("SELECT provider, label, masked_key, is_active FROM api_key_pools WHERE provider IN ('datajud', 'places_scraper')");
  console.log("API Key pools:", keys);

  await sql.end();
}

run();
