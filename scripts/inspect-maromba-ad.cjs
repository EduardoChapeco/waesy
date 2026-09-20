const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function inspectAd() {
  const { data: ads, error } = await supabase
    .from('classifieds')
    .select('*')
    .ilike('title', '%Mansão Maromba%');

  if (error) {
    console.error('Error fetching ad:', error);
    return;
  }

  console.log('Ads found:', ads?.length || 0);
  if (ads && ads.length > 0) {
    console.log(JSON.stringify(ads[0], null, 2));
  }
}

inspectAd().catch(console.error);
