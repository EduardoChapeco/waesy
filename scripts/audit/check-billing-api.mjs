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
const orgId = 'iakxlpfvglyiljqiivbb';
const projectRef = 'jfuebqmltksyznovhlwa';

async function checkBilling() {
  for (const path of [
    `projects/${projectRef}/billing`,
    `projects/${projectRef}/upgrade/status`,
    `organizations/${orgId}/billing/subscription`,
    `organizations/${orgId}/billing`
  ]) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      console.log(`GET /v1/${path}:`, res.status, await res.text());
    } catch (e) {
      console.log(`GET /v1/${path} err:`, e.message);
    }
  }
}

checkBilling();
