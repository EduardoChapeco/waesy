import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })() });

async function run() {
  const res = await pool.query(`
    SELECT p.proname, pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    WHERE p.proname = 'process_exchange_transaction'
  `);
  console.log(res.rows[0]?.def);
  await pool.end();
}
run();
