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
  const { data, error } = await supabase
    .from('mined_raw_extractions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Sample row:', JSON.stringify(data[0], null, 2));
  } else {
    // If table is empty, query information_schema
    const { data: cols } = await supabase.rpc('get_table_columns', { p_table: 'mined_raw_extractions' }).catch(() => ({ data: null }));
    console.log('Table is empty or no data returned. Querying columns via select *...');
    const { data: sample, error: err2 } = await supabase.from('mined_raw_extractions').select('*').limit(0);
    console.log('Cols check:', err2?.message || 'Empty table');
  }
}

main().catch(console.error);
