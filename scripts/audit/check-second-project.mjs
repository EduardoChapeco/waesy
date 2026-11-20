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
const secondRef = 'wlxapubsesiwtxzbuygt';
const secondPass = '[REDACTED_PASSWORD]';

async function checkSecondProject() {
  console.log('--- CHECKING SECOND PROJECT wlxapubsesiwtxzbuygt ---');
  try {
    const pRes = await fetch(`https://api.supabase.com/v1/projects/${secondRef}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('Project status:', pRes.status, await pRes.json());
  } catch (e) {
    console.log('Project API err:', e.message);
  }

  // Check health
  try {
    const hRes = await fetch(`https://api.supabase.com/v1/projects/${secondRef}/health?services=auth&services=db&services=rest&services=realtime&services=storage`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('Health API status:', hRes.status);
    console.log('Health info:', await hRes.json());
  } catch (e) {
    console.log('Health API err:', e.message);
  }

  // Check direct PG
  const client = new pg.Client({
    host: `db.${secondRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: secondPass,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log('Connected to PG on second project!');
    const r = await client.query('SELECT version(), pg_database_size(current_database()) as db_bytes;');
    console.log('PG version & size:', r.rows);
    await client.end();
  } catch (e) {
    console.log('PG connect err:', e.message);
  }
}

checkSecondProject();
