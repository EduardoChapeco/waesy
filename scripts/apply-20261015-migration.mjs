import pg from 'pg';
import fs from 'fs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })() });

async function run() {
  const sql = fs.readFileSync('supabase/migrations/20261015000000_fix_exchanges_schema_and_rpc.sql', 'utf8');
  console.log('Applying migration 20261015000000_fix_exchanges_schema_and_rpc.sql...');
  await pool.query(sql);
  console.log('Migration applied successfully!');
  await pool.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
