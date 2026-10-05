import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jfuebqmltksyznovhlwa.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || (() => { throw new Error("SUPABASE_SERVICE_ROLE_KEY is required"); })()
);

async function run() {
  const { data, error } = await supabase
    .from('exchanges')
    .select('id, status, reason, created_at, total_value_cents, original_order_id, orders:original_order_id(public_token, total_cents)')
    .limit(5);

  if (error) {
    console.error('Customer exchanges query error:', error);
  } else {
    console.log('Customer exchanges query success! Data:', data);
  }
}

run();
