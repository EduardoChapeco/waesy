import fs from 'fs';
import pg from 'pg';

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

const accessToken = secrets.SUPABASE_ACCESS_TOKEN;
const projectRef = 'jfuebqmltksyznovhlwa';

async function testDisk() {
  console.log('--- TESTING POST /config/disk with full gp3 attributes ---');
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/disk`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributes: { type: 'gp3', size_gb: 10, iops: 3000, throughput_mibps: 125 } })
    });
    console.log('POST status:', res.status, await res.text());
  } catch (e) {
    console.log('POST err:', e.message);
  }
}

testDisk();
