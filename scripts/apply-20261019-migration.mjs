import postgres from 'postgres';
import fs from 'fs';

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: 'EEaR6399!@#2026',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log("Applying 20261019000000_mining_telemetry_enhancements.sql...");
  const migrationSql = fs.readFileSync('supabase/migrations/20261019000000_mining_telemetry_enhancements.sql', 'utf8');
  await sql.unsafe(migrationSql);
  console.log("Migration 20261019 applied successfully!");

  const cols = await sql.unsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'scraper_audit_log' ORDER BY ordinal_position");
  console.log("scraper_audit_log columns:", cols.map(c => `${c.column_name} (${c.data_type})`).join(", "));

  await sql.end();
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
