import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import postgres from 'postgres';

const secretsFile = path.resolve('.env.secrets');
const env = { ...(fs.existsSync(secretsFile) ? dotenv.parse(fs.readFileSync(secretsFile)) : {}), ...process.env };
const projectRef = env.PROJECT_REF || new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0];
let sqlClient;
let useDirectDatabase = !env.SUPABASE_ACCESS_TOKEN;

async function query(sql) {
  if (useDirectDatabase) {
    if (!env.SUPABASE_DB_PASSWORD) throw new Error('SUPABASE_DB_PASSWORD is required for direct verification');
    sqlClient ??= postgres({
      host: env.SUPABASE_DB_HOST || 'aws-0-sa-east-1.pooler.supabase.com',
      port: Number(env.SUPABASE_DB_PORT || 6543),
      username: env.SUPABASE_DB_USER || `postgres.${projectRef}`,
      password: env.SUPABASE_DB_PASSWORD,
      database: env.SUPABASE_DB_NAME || 'postgres',
      ssl: 'require', prepare: false, max: 1, connect_timeout: 10,
    });
    return sqlClient.unsafe(sql);
  }
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(30000),
  });
  if (response.status === 401 && env.SUPABASE_DB_PASSWORD) {
    useDirectDatabase = true;
    console.log('Management credential unavailable; using the configured database connection.');
    return query(sql);
  }
  if (!response.ok) throw new Error(`Database query failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return response.json();
}

const creationFile = 'supabase/migrations/20270101010000_copilot_react_execution_persistence.sql';
const correctionFile = 'supabase/migrations/20261006164458_harden_copilot_execution_read_access.sql';

try {
  const before = await query("SELECT to_regclass('public.copilot_executions')::text AS executions, to_regclass('public.copilot_execution_steps')::text AS steps");
  console.log(JSON.stringify({ tables: before }));
  if (process.argv.includes('--apply')) {
    const files = before[0]?.executions ? [correctionFile] : [creationFile, correctionFile];
    const statements = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    await query(`BEGIN; ${statements}\nCOMMIT;`);
    console.log('Copilot read policies applied.');
  }
  const policies = await query("SELECT tablename, policyname, qual, roles FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('copilot_executions','copilot_execution_steps') ORDER BY tablename, policyname");
  console.log(JSON.stringify({ policies }));
  if (process.argv.includes('--test')) {
    await query(fs.readFileSync('supabase/tests/copilot_execution_access.sql', 'utf8'));
    console.log('PASS: owner allowed, non-owner denied, steps isolated, client writes/anonymous reads revoked; fixtures rolled back.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Copilot access verification failed');
  process.exitCode = 1;
} finally {
  if (sqlClient) await sqlClient.end({ timeout: 2 });
}
