import fs from 'fs';

const secrets = {};
for (const line of fs.readFileSync('.env.secrets', 'utf8').split('\n')) {
  const m = line.trim().match(/^([^=]+)=(.*)$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    secrets[m[1].trim()] = v;
  }
}

const accessToken = secrets.SUPABASE_ACCESS_TOKEN;
const projectRef = 'jfuebqmltksyznovhlwa';

async function getFullDiskInfo() {
  const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/disk/util`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const d = await r.json();
  const usedMB = ((d.metrics?.fs_used_bytes || 0) / 1024 / 1024).toFixed(2);
  const totalMB = ((d.metrics?.fs_size_bytes || 0) / 1024 / 1024).toFixed(2);
  const freeMB = ((d.metrics?.fs_avail_bytes || 0) / 1024 / 1024).toFixed(2);
  const pctFull = (((d.metrics?.fs_used_bytes || 0) / (d.metrics?.fs_size_bytes || 1)) * 100).toFixed(1);
  console.log(`=== PRIMARY DB DISK: ${usedMB} MB used / ${totalMB} MB total (${freeMB} MB free = ${pctFull}% full) ===`);
  console.log('Timestamp:', d.timestamp);
  return d;
}

async function getStorageObjects() {
  // Try listing storage objects via REST API to understand what takes space
  const supabase_url = secrets.VITE_SUPABASE_URL;
  const service_key = secrets.SUPABASE_SERVICE_ROLE_KEY;
  
  try {
    const r = await fetch(`${supabase_url}/storage/v1/bucket`, {
      headers: {
        Authorization: `Bearer ${service_key}`,
        apikey: service_key
      }
    });
    console.log('\nStorage buckets status:', r.status);
    const buckets = await r.json();
    if (Array.isArray(buckets)) {
      console.log(`Total buckets: ${buckets.length}`);
      for (const b of buckets) {
        console.log(`  - ${b.name} (${b.id}): public=${b.public}, size=${b.file_size_limit || 'unlimited'}`);
      }
    } else {
      console.log('Buckets response:', buckets);
    }
  } catch (e) {
    console.log('Storage API error:', e.message);
  }
}

async function checkReplicaSlots() {
  const supabase_url = secrets.VITE_SUPABASE_URL;
  const service_key = secrets.SUPABASE_SERVICE_ROLE_KEY;

  // Try using PostgREST to run a query through the REST API
  try {
    const r = await fetch(`${supabase_url}/rest/v1/rpc/version`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${service_key}`,
        apikey: service_key,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    console.log('\nRPC version status:', r.status, await r.text());
  } catch (e) {
    console.log('RPC error:', e.message);
  }
}

async function main() {
  await getFullDiskInfo();
  await getStorageObjects();
  await checkReplicaSlots();
}

main().catch(console.error);
