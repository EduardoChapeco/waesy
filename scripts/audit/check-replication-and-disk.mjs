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

// Most conservative: storage DELETE — the storage server is refusing connections
// But storage objects themselves are stored on S3, not on the PG disk
// PG disk stores: data files, WAL, temp files, pg_tblspc

// Key insight: The disk is FULL (99.4%), which is why all services are UNHEALTHY
// The PostgreSQL process itself can't accept new connections because:
// 1. It may be in recovery mode
// 2. The WAL recycling may be blocked by replication slots

// Options via API:
// 1. PAUSE the project (releases WAL pressure) then RESUME
// 2. Force a pg_terminate_backend via management API 
// 3. Delete replication slots via management API

async function pauseProject() {
  console.log('Attempting to PAUSE project to release disk pressure...');
  const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/pause`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: '{}'
  });
  console.log('PAUSE status:', r.status, await r.text());
}

async function checkReplicationSlots() {
  console.log('\nChecking replication slots via management API...');
  for (const path of [
    `projects/${projectRef}/database/extensions`,
    `projects/${projectRef}/database/publications`,
    `projects/${projectRef}/database/connections`,
  ]) {
    const r = await fetch(`https://api.supabase.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log(`GET /v1/${path}:`, r.status, (await r.text()).slice(0, 200));
  }
}

async function main() {
  await checkReplicationSlots();
  
  // The only way to free disk when DB is unreachable is to let Supabase's 
  // platform-level recovery run. The restart we triggered earlier should
  // have initiated WAL checkpoint + old segment cleanup.
  // If the disk was full, Postgres enters "single-user mode" refusing all connections.
  
  // Let's check if the restart helped by checking disk util again
  const dRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/disk/util`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const d = await dRes.json();
  const usedMB = ((d.metrics?.fs_used_bytes || 0) / 1024 / 1024).toFixed(2);
  const freeMB = ((d.metrics?.fs_avail_bytes || 0) / 1024 / 1024).toFixed(2);
  const pct = (((d.metrics?.fs_used_bytes || 0) / (d.metrics?.fs_size_bytes || 1)) * 100).toFixed(1);
  console.log(`\n=== CURRENT DISK: ${usedMB}MB used, ${freeMB}MB free (${pct}% full) ===`);
  console.log('Updated at:', d.timestamp);
}

main().catch(console.error);
