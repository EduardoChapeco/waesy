import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })() });

async function run() {
  const res = await pool.query(`
    SELECT e.id, e.status, e.reason, e.created_at, e.total_value_cents, o.public_token, o.total_cents, o.customer_snapshot
    FROM exchanges e
    LEFT JOIN orders o ON o.id = e.original_order_id
    LIMIT 5
  `);
  console.log('Query success! Rows:', res.rows);
  await pool.end();
}
run().catch(console.error);
