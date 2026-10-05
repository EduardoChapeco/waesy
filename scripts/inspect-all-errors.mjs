import pg from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })();
const pool = new pg.Pool({ connectionString });

async function main() {
  const res = await pool.query('SELECT * FROM public.system_error_logs ORDER BY created_at DESC');
  console.log(`TOTAL ERRORS FOUND: ${res.rows.length}`);
  res.rows.forEach((r, idx) => {
    console.log(`--- [${idx + 1}] ${r.route} (${r.created_at}) ---`);
    console.log(`Message: ${r.error_message}`);
    console.log(`Payload: ${JSON.stringify(r.payload)}`);
    console.log(`Stack: ${r.stack_trace?.split('\n').slice(0, 3).join('\n')}`);
  });
  await pool.end();
}

main().catch(console.error);
