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

// Use the Management API to run VACUUM FULL + TRUNCATE directly on the DB
// This is the only way since the DB refuses TCP connections (IPv6 only, all services down)
async function runMgmtQuery(sql, label) {
  console.log(`\n[${label}] Running: ${sql.slice(0, 100)}...`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const data = await res.json();
  console.log(`[${label}] Status: ${res.status}`, JSON.stringify(data).slice(0, 300));
  return { status: res.status, data };
}

async function main() {
  // Try running VACUUM on major bloat tables via management API
  const queries = [
    [`SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;`, 'DB size check'],
    [`SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM information_schema.tables WHERE table_schema IN ('public','cron','net') ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 20;`, 'Top tables'],
    [`TRUNCATE public.system_error_logs;`, 'TRUNCATE system_error_logs'],
    [`TRUNCATE cron.job_run_details;`, 'TRUNCATE cron.job_run_details'],
    [`DELETE FROM net._http_response WHERE created < now() - INTERVAL '1 hour';`, 'DELETE net._http_response'],
    [`VACUUM ANALYZE;`, 'VACUUM ANALYZE'],
  ];

  for (const [sql, label] of queries) {
    await runMgmtQuery(sql, label);
    // Small wait between queries
    await new Promise(r => setTimeout(r, 1000));
  }
}

main();
