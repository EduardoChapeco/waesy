import fs from 'fs';
import path from 'path';
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
const accessToken = secrets.SUPABASE_ACCESS_TOKEN;
const projectRef = 'jfuebqmltksyznovhlwa';

console.log('Project:', projectRef, 'URL:', url);

async function run() {
  // 1. Check project status from Management API
  try {
    const pRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const pData = await pRes.json();
    console.log('1. Management Project Status:', pData.status, '| Name:', pData.name, '| Region:', pData.region);
  } catch (e) {
    console.log('1. Management API error:', e.message);
  }

  // 2. Check disk utilization
  try {
    const dRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/disk/util`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const dData = await dRes.json();
    const metrics = dData.metrics || {};
    const availMb = ((metrics.fs_avail_bytes || 0) / (1024 * 1024)).toFixed(2);
    const usedMb = ((metrics.fs_used_bytes || 0) / (1024 * 1024)).toFixed(2);
    const sizeMb = ((metrics.fs_size_bytes || 0) / (1024 * 1024)).toFixed(2);
    console.log(`2. Disk Util: ${usedMb} MB used / ${sizeMb} MB total (${availMb} MB available for postgres)`);
  } catch (e) {
    console.log('2. Disk Util error:', e.message);
  }

  // 3. Test GoTrue Auth endpoints
  const sbAnon = createClient(url, anonKey);
  console.log('\n3. Testing GoTrue Auth with meuwider@gmail.com...');
  const res1 = await sbAnon.auth.signInWithPassword({
    email: 'meuwider@gmail.com',
    password: 'dummy-password-check-status-only',
  });
  console.log('res1 status:', res1.error?.status, '| code:', res1.error?.code, '| msg:', res1.error?.message);

  console.log('\n4. Testing GoTrue Auth with meuwilder@gmail.com...');
  const res2 = await sbAnon.auth.signInWithPassword({
    email: 'meuwilder@gmail.com',
    password: 'dummy-password-check-status-only',
  });
  console.log('res2 status:', res2.error?.status, '| code:', res2.error?.code, '| msg:', res2.error?.message);

  // 5. Query ClickHouse Logs via Management API
  try {
    console.log('\n5. Querying Supabase ClickHouse Logs (postgres_logs)...');
    const sql = `SELECT timestamp, event_message FROM edge_logs ORDER BY timestamp DESC LIMIT 5;`;
    const lRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/analytics/endpoints/logs?sql=${encodeURIComponent(sql)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('Logs HTTP status:', lRes.status);
    const lData = await lRes.json();
    if (lData?.result) {
      console.log(`Retrieved ${lData.result.length} log events:`);
      for (const r of lData.result) {
        console.log(`[${new Date(r.timestamp / 1000).toISOString()}] ${r.event_message}`);
      }
    } else {
      console.log('No result or error:', lData);
    }
  } catch (e) {
    console.log('Logs query error:', e.message);
  }
}

run();
