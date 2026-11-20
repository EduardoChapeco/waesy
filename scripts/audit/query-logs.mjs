import fs from 'fs';

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

async function queryLogs(table) {
  console.log(`\n--- QUERYING ${table} ---`);
  const sql = `SELECT timestamp, event_message FROM ${table} ORDER BY timestamp DESC LIMIT 10;`;
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/analytics/endpoints/logs?sql=${encodeURIComponent(sql)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    if (data?.result) {
      for (const r of data.result) {
        console.log(`[${new Date(r.timestamp / 1000).toISOString()}] ${r.event_message}`);
      }
    } else {
      console.log('Response:', data);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

async function main() {
  const sql = `SELECT 1 as test_id`;
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/analytics/endpoints/logs?sql=${encodeURIComponent(sql)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  console.log('Test query status:', res.status);
  console.log('Test query result:', await res.json());
}

main();
