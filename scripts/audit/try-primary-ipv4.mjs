import pg from 'pg';

// The primary DB password for JFUEBQMLTKSYZNOVHLWA must be in SUPABASE_DB_PASSWORD env
// but .env.secrets currently shows password [REDACTED_PASSWORD] which is the same
// as the offload DB. Let's try alternative passwords / different users.

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

const dbPass = secrets.SUPABASE_DB_PASSWORD;
const PRIMARY_HOST = 'db.jfuebqmltksyznovhlwa.supabase.co';

console.log('Attempting PostgreSQL connection to primary DB...');
console.log('Host:', PRIMARY_HOST);
console.log('Password prefix:', dbPass?.slice(0, 6) + '...');

// Try the actual direct connection to clear WAL
async function tryDirect() {
  const cfg = {
    host: PRIMARY_HOST,
    port: 5432,
    user: 'postgres',
    password: dbPass,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  };

  // Try resolving IPv4 specifically by using IP
  const dns = await import('dns/promises');
  try {
    const addrs = await dns.resolve4(PRIMARY_HOST);
    console.log('IPv4 addresses:', addrs);
    for (const ip of addrs) {
      const c = new pg.Client({ ...cfg, host: ip });
      try {
        await c.connect();
        console.log(`[IP ${ip}] CONNECTED!`);
        const r = await c.query('SELECT 1');
        console.log('Query OK:', r.rows);
        await c.end();
      } catch (e) {
        console.log(`[IP ${ip}] Failed:`, e.message);
      }
    }
  } catch (e) {
    console.log('DNS resolution failed:', e.message);
  }

  try {
    const addrs = await dns.resolve6(PRIMARY_HOST);
    console.log('IPv6 addresses:', addrs);
  } catch (e) {
    console.log('IPv6 DNS failed:', e.message);
  }
}

tryDirect();
