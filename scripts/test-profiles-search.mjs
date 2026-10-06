import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jfuebqmltksyznovhlwa.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || (() => { throw new Error("SUPABASE_SERVICE_ROLE_KEY is required"); })()
);

async function run() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, username, avatar_url, cpf")
    .limit(5);

  if (error) {
    console.error('Search query error:', error);
  } else {
    console.log('Search query SUCCESS! Sample profiles:', data.length);
  }
}

run();
