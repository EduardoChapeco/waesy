import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf-8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
);

async function main() {
  const { data, count, error } = await supabase
    .from('mined_raw_extractions')
    .select('id, content_type, url, domain, extracted_at', { count: 'exact' });

  console.log('Count:', count, 'Error:', error?.message);
  if (data) console.log('Sample extractions:', data.slice(0, 5));
}

main().catch(console.error);
