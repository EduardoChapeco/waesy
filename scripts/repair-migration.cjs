const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const version = process.argv[2];
const status = process.argv[3] || 'reverted';

if (!version) {
  console.error('Usage: node scripts/repair-migration.cjs <version> [status]');
  process.exit(1);
}

let secrets = {};
const secretsPath = path.join(process.cwd(), '.env.secrets');
if (fs.existsSync(secretsPath)) {
  const lines = fs.readFileSync(secretsPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      let v = match[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      secrets[match[1].trim()] = v;
    }
  }
}

const projectRef = secrets.PROJECT_REF || 'jfuebqmltksyznovhlwa';
const password = secrets.SUPABASE_DB_PASSWORD || '';

console.log(`Repairing migration ${version} -> status: ${status} on [${projectRef}]...`);

const args = [
  'supabase',
  'migration',
  'repair',
  '--status',
  status,
  version,
  '--project-ref',
  projectRef
];

if (password) {
  args.push('-p', password);
}

const res = cp.spawnSync('npx', args, {
  shell: true,
  encoding: 'utf8',
  env: Object.assign({}, process.env, secrets)
});

console.log('STDOUT:', res.stdout);
if (res.stderr) console.error('STDERR:', res.stderr);
if (res.status !== 0) {
  process.exit(res.status || 1);
}
console.log('SUCCESS');
