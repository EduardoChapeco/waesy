import pg from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })()
});

async function main() {
  const sql = fs.readFileSync('supabase/migrations/20261019000000_store_promotional_flyers.sql', 'utf8');
  console.log('Applying 20261019000000_store_promotional_flyers.sql...');
  await pool.query(sql);
  console.log('✓ Migration successfully applied to Supabase!');
  await pool.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
