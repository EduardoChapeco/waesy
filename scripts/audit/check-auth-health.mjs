import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const secrets = {};
for (const line of fs.readFileSync('.env.secrets', 'utf8').split('\n')) {
  const m = line.trim().match(/^([^=]+)=(.*)$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    secrets[m[1].trim()] = v;
  }
}

const url = secrets.VITE_SUPABASE_URL || 'https://jfuebqmltksyznovhlwa.supabase.co';
const anonKey = secrets.VITE_SUPABASE_ANON_KEY;
const serviceKey = secrets.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  console.log('--- GOTRUE HEALTH CHECK ---');
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey }
    });
    console.log('Health HTTP Status:', res.status);
    console.log('Health Body:', await res.text());
  } catch (e) {
    console.error('Health fetch failed:', e);
  }

  console.log('\n--- GOTRUE SETTINGS CHECK ---');
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey }
    });
    console.log('Settings HTTP Status:', res.status);
    console.log('Settings Body:', await res.text());
  } catch (e) {
    console.error('Settings fetch failed:', e);
  }

  console.log('\n--- ADMIN LIST USERS CHECK ---');
  try {
    const sbAdmin = createClient(url, serviceKey);
    const { data, error } = await sbAdmin.auth.admin.listUsers({ page: 1, perPage: 10 });
    if (error) {
      console.log('Admin listUsers error:', error);
    } else {
      console.log(`Found ${data.users.length} users:`);
      for (const u of data.users) {
        console.log(`- ID: ${u.id} | Email: ${u.email} | Confirmed: ${u.confirmed_at} | LastSignIn: ${u.last_sign_in_at}`);
      }
    }
  } catch (e) {
    console.error('Admin listUsers failed:', e);
  }
}

check();
