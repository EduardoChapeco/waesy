/**
 * fix-migration-state.mjs
 * 
 * Usa a REST API do Supabase (service_role) para deletar registros
 * corrompidos da tabela supabase_migrations.schema_migrations
 * e depois faz o push via npx supabase db push.
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv(p) {
  const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^([^=]+)=(.*)/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1].trim()] = v;
  }
  return out;
}

const env = { ...loadEnv(join(root, '.env')), ...loadEnv(join(root, '.env.secrets')) };
const URL = env.VITE_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = 'jfuebqmltksyznovhlwa';
const DB_PASSWORD = env.SUPABASE_DB_PASSWORD || 'EEaR6399!@#2026';

// Step 1: Check which migration versions are currently registered
console.log('Step 1: Querying registered migrations via REST API...');
const listRes = await fetch(`${URL}/rest/v1/rpc/sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE,
    'Authorization': `Bearer ${SERVICE}`,
  },
  body: JSON.stringify({ query: `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version` })
});

let registered = [];
if (listRes.ok) {
  const data = await listRes.json();
  registered = data.map(r => r.version);
  console.log('  Registered versions:', registered.join(', '));
} else {
  const err = await listRes.text();
  console.log('  RPC sql not available:', err.slice(0, 200));
  console.log('  Trying direct table query...');
  
  // Try via PostgREST on supabase_migrations schema
  const res2 = await fetch(`${URL}/rest/v1/schema_migrations?select=version&schema=supabase_migrations`, {
    headers: { 'apikey': SERVICE, 'Authorization': `Bearer ${SERVICE}` }
  });
  if (res2.ok) {
    const data2 = await res2.json();
    registered = data2.map(r => r.version);
    console.log('  Registered (via PostgREST):', registered.join(', '));
  } else {
    console.log('  Cannot query schema_migrations. Proceeding with push directly...');
  }
}

// Step 2: Find all local migration versions
const migrationsDir = join(root, 'supabase', 'migrations');
const localFiles = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

const localVersions = localFiles.map(f => f.split('_')[0]).filter(v => /^\d{14}$/.test(v));
console.log(`\n  Local migrations: ${localFiles.length} files`);

// Step 3: Find duplicates (local versions where there are 2 files with same version prefix)
const versionCount = {};
for (const v of localVersions) {
  versionCount[v] = (versionCount[v] || 0) + 1;
}
const duplicates = Object.entries(versionCount).filter(([, c]) => c > 1).map(([v]) => v);
if (duplicates.length > 0) {
  console.log(`\n  ⚠️  Duplicate version prefixes detected: ${duplicates.join(', ')}`);
}

// Step 4: Push via npx with the right approach
console.log('\nStep 4: Pushing migrations...');
const cmdEnv = { ...process.env, ...env };
const cmd = `npx supabase db push --project-ref ${PROJECT_REF} -p "${DB_PASSWORD}" --include-all --yes`;

try {
  const out = execSync(cmd, { env: cmdEnv, encoding: 'utf8', stdio: 'pipe', timeout: 300000 });
  console.log('✅ Push SUCCESS:\n', out);
} catch (err) {
  const stdout = err.stdout?.toString() || '';
  const stderr = err.stderr?.toString() || '';
  
  // Extract the failing version from error
  const dupMatch = stdout.match(/Key \(version\)=\((\d+)\) already exists/);
  if (dupMatch) {
    const failedVersion = dupMatch[1];
    console.log(`\n❌ Duplicate key error for version: ${failedVersion}`);
    console.log('   Running repair and retry...');
    
    // Repair via CLI
    try {
      const repairOut = execSync(
        `npx supabase migration repair --status reverted ${failedVersion} --project-ref ${PROJECT_REF} -p "${DB_PASSWORD}"`,
        { env: cmdEnv, encoding: 'utf8', stdio: 'pipe', timeout: 30000 }
      );
      console.log('   Repair result:', repairOut);
      
      // Retry push
      const out2 = execSync(cmd, { env: cmdEnv, encoding: 'utf8', stdio: 'pipe', timeout: 300000 });
      console.log('✅ Push SUCCESS after repair:\n', out2);
    } catch (repairErr) {
      console.error('❌ Repair/retry failed:', repairErr.stdout?.toString() || repairErr.message);
    }
  } else {
    console.error('❌ Push failed:');
    console.log('STDOUT:', stdout);
    console.error('STDERR:', stderr);
    process.exit(1);
  }
}
