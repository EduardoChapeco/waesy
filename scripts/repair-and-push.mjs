/**
 * repair-and-push.mjs
 * 
 * 1. Remove as migrations com estado corrompido (versões registradas mas com SQL que falhou)
 * 2. Re-aplica as migrations pendentes via supabase db push
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load env
function loadEnv(filePath) {
  const secrets = {};
  if (!existsSync(filePath)) return secrets;
  const lines = readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^([^=]+)=(.*)/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    secrets[m[1].trim()] = v;
  }
  return secrets;
}

const env1 = loadEnv(join(root, '.env'));
const env2 = loadEnv(join(root, '.env.secrets'));
const env = { ...env1, ...env2 };

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = env.PROJECT_REF || 'jfuebqmltksyznovhlwa';
const DB_PASSWORD = env.SUPABASE_DB_PASSWORD || '';
const ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN || '';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// The migrations that need repair (were registered but SQL failed)
const BROKEN_VERSIONS = ['20260925000000'];

console.log('Step 1: Repairing corrupted migration state...');

for (const version of BROKEN_VERSIONS) {
  // Try via Management API (most reliable)
  if (ACCESS_TOKEN) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          query: `DELETE FROM supabase_migrations.schema_migrations WHERE version = '${version}'`
        })
      }
    );
    const resJson = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`API repair failed for ${version}:`, JSON.stringify(resJson));
    } else {
      console.log(`Repaired version ${version} via Management API`);
    }
  }
}

console.log('\nStep 2: Pushing all pending migrations...');

const envForCmd = { ...process.env, ...env };
const passwordFlag = DB_PASSWORD ? `-p "${DB_PASSWORD}"` : '';
const cmd = `npx supabase db push --project-ref ${PROJECT_REF} ${passwordFlag} --include-all --yes`;

try {
  const out = execSync(cmd, { env: envForCmd, encoding: 'utf8', stdio: 'pipe' });
  console.log('Push SUCCESS:\n', out);
} catch (err) {
  console.error('Push error:');
  if (err.stdout) console.log('STDOUT:\n', err.stdout.toString());
  if (err.stderr) console.error('STDERR:\n', err.stderr.toString());
  process.exit(1);
}
