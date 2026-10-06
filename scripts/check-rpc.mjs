import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })() });

async function run() {
  const res = await pool.query(
    "SELECT routine_name FROM information_schema.routines WHERE routine_name ILIKE '%exchange%'"
  );
  console.log('Exchange routines:', res.rows);
  await pool.end();
}
run();
