const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function fixAd() {
  const { data: ads, error: getErr } = await supabase
    .from('classifieds')
    .select('*')
    .ilike('title', '%Mansão Maromba%');

  if (getErr || !ads || ads.length === 0) {
    console.error('Error fetching ad:', getErr);
    return;
  }

  const current = ads[0];
  console.log('Target Ad ID:', current.id);

  const updatedAttrs = {
    ...(current.attributes || {}),
    template_style: 'conveniencia',
    niche: 'mercado',
    delivery_mode: 'both',
    volume: '1L',
    temperature: 'gelada',
    is_alcoholic: true,
    brand: 'Mansão Maromba',
    city: 'São Miguel do Oeste',
    neighborhood: 'Centro',
    state: 'SC',
    hide_location: false,
    hide_address: false,
  };

  const { data, error } = await supabase
    .from('classifieds')
    .update({
      delivery_mode: 'both',
      delivery_type: 'both',
      location_name: 'Centro — São Miguel do Oeste - SC',
      location_text: 'Centro — São Miguel do Oeste - SC',
      attributes: updatedAttrs,
    })
    .eq('id', current.id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating ad:', error);
    return;
  }

  console.log('Successfully updated Maromba ad in Supabase!');
  console.log('template_style:', data.attributes.template_style);
  console.log('delivery_mode:', data.delivery_mode);
  console.log('location_name:', data.location_name);
}

fixAd().catch(console.error);
