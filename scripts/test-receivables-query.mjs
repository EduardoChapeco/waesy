import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })() });
const supabase = createClient(
  'https://jfuebqmltksyznovhlwa.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || (() => { throw new Error("SUPABASE_SERVICE_ROLE_KEY is required"); })()
);

async function run() {
  const pcols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position");
  console.log('Profiles columns:', pcols.rows.map(r => r.column_name).join(', '));

  // Test PostgREST without email:
  const { data, error } = await supabase
    .from("receivables")
    .select(`
      *,
      debtor:debtor_id (id, full_name, avatar_url, phone, username),
      creditor:creditor_id (id, full_name, avatar_url),
      contract:contract_id (id, title, status, verification_code),
      installments:receivable_installments (*)
    `)
    .limit(5);

  if (error) {
    console.error('Receivables query error:', error);
  } else {
    console.log('Receivables query SUCCESS! Rows returned:', data.length);
  }

  await pool.end();
}

run();
