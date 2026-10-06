import postgres from 'postgres';
import fs from 'fs';

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: process.env.SUPABASE_DB_PASSWORD || (() => { throw new Error("SUPABASE_DB_PASSWORD is required"); })(),
  ssl: { rejectUnauthorized: false },
  connect_timeout: 30,
});

async function run() {
  console.log('Reading migration 20261013000000_security_audit_rls_hardening.sql...');
  const migrationSql = fs.readFileSync('supabase/migrations/20261013000000_security_audit_rls_hardening.sql', 'utf8');

  console.log('Executing migration on database...');
  await sql.unsafe(migrationSql);
  console.log('Migration executed successfully!');

  // Verify system_error_logs cols
  const cols = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'system_error_logs'
  `;
  console.log('system_error_logs columns now:', cols.map(c => c.column_name));

  // Verify store_pixel_configs
  const pixelCols = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'store_pixel_configs'
  `;
  console.log('store_pixel_configs columns:', pixelCols.map(c => c.column_name));

  // Verify employer_reviews
  const revCols = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'employer_reviews'
  `;
  console.log('employer_reviews columns:', revCols.map(c => c.column_name));

  await sql.end();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
