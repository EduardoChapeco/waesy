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

async function testMgmt() {
  const pRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const pData = await pRes.json();
  console.log('Project info:', JSON.stringify(pData, null, 2));

  // Check services or health
  const hRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/health?services=auth&services=db&services=rest&services=realtime&services=storage`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  console.log('Health API status:', hRes.status);
  try {
    const hData = await hRes.json();
    console.log('Health info:', JSON.stringify(hData, null, 2));
  } catch (e) {
    console.log('Health body not json:', await hRes.text());
  }
}

testMgmt();
