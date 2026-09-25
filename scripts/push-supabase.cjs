const fs = require('fs');
const cp = require('child_process');
const path = require('path');

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

const env = Object.assign({}, process.env, secrets);
const projectRef = secrets.PROJECT_REF || 'jfuebqmltksyznovhlwa';
const password = secrets.SUPABASE_DB_PASSWORD || '';
const isDryRun = process.argv.includes('--dry-run');

console.log(`Pushing migrations to Supabase [${projectRef}] (DryRun: ${isDryRun})...`);

const dryRunFlag = isDryRun ? '--dry-run' : '';
const passwordFlag = password ? `-p "${password}"` : '';

try {
  const cmd = `npx supabase db push --project-ref ${projectRef} ${passwordFlag} --include-all --yes ${dryRunFlag}`;
  const out = cp.execSync(cmd, { env, encoding: 'utf8' });
  console.log('SUCCESS:\n', out);
} catch (err) {
  console.error('ERROR during supabase db push:');
  if (err.stdout) console.log('STDOUT:\n', err.stdout.toString());
  if (err.stderr) console.error('STDERR:\n', err.stderr.toString());
  process.exit(1);
}
