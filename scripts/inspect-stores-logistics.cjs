const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function check() {
  const { data: stores } = await supabase.from('stores').select('id, name, settings').limit(3);
  console.log('Stores Sample:');
  console.log(JSON.stringify(stores, null, 2));

  const { data: creds } = await supabase.from('integration_credentials').select('*').limit(5);
  console.log('Integration Credentials Sample:');
  console.log(JSON.stringify(creds, null, 2));
}

check().catch(console.error);
