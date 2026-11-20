#!/usr/bin/env node
/**
 * SET-CLOUDFLARE-OFFLOAD-SECRETS.mjs
 * Adds the dual-supabase offload variables to Cloudflare Pages Production environment.
 * Idempotent — safe to run multiple times.
 */
import fs from 'fs';
import { execSync } from 'child_process';

const secrets = {};
for (const line of fs.readFileSync('.env.secrets', 'utf8').split('\n')) {
  const m = line.trim().match(/^([^=]+)=(.*)$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    secrets[m[1].trim()] = v;
  }
}

// Second Supabase project credentials (Offload node: vnmqummmgvgyazglnoav)
const OFFLOAD_URL = secrets.SUPABASE_OFFLOAD_URL || 'https://vnmqummmgvgyazglnoav.supabase.co';

// The service_role and anon keys need to be set from the Supabase dashboard
// For now, we set the topology mode and URL — the keys will need manual entry if not in .env.secrets
const OFFLOAD_ANON_KEY = secrets.SUPABASE_OFFLOAD_ANON_KEY || '';
const OFFLOAD_SERVICE_ROLE_KEY = secrets.SUPABASE_OFFLOAD_SERVICE_ROLE_KEY || '';

const VARS_TO_SET = [
  ['SUPABASE_OFFLOAD_URL', OFFLOAD_URL],
  ['SUPABASE_TOPOLOGY_MODE', 'dual'],
];

if (OFFLOAD_ANON_KEY) VARS_TO_SET.push(['SUPABASE_OFFLOAD_ANON_KEY', OFFLOAD_ANON_KEY]);
if (OFFLOAD_SERVICE_ROLE_KEY) VARS_TO_SET.push(['SUPABASE_OFFLOAD_SERVICE_ROLE_KEY', OFFLOAD_SERVICE_ROLE_KEY]);

console.log(`Setting ${VARS_TO_SET.length} Cloudflare Pages secrets for project "usewaesy"...`);

for (const [key, value] of VARS_TO_SET) {
  if (!value) {
    console.log(`  SKIP ${key} — empty value`);
    continue;
  }
  try {
    // Use echo piped to wrangler pages secret put
    const cmd = `echo "${value.replace(/"/g, '\\"')}" | cmd /c npx wrangler pages secret put ${key} --project-name usewaesy`;
    const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`  SET ${key}: OK`);
  } catch (e) {
    console.error(`  SET ${key}: FAILED — ${e.message.slice(0, 100)}`);
  }
}

console.log('\nDone! Verify at: https://dash.cloudflare.com/');
console.log('NOTE: If SUPABASE_OFFLOAD_ANON_KEY and SUPABASE_OFFLOAD_SERVICE_ROLE_KEY are missing,');
console.log('      get them from: https://supabase.com/dashboard/project/wlxapubsesiwtxzbuygt/settings/api');
