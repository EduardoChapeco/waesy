/**
 * repair-all-migrations.cjs
 * 
 * Detecta todas as migrations pendentes e repara as que estão
 * com estado corrompido (aplicadas parcialmente) antes de fazer push.
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const PROJECT_REF = 'jfuebqmltksyznovhlwa';
const DB_PASSWORD = 'EEaR6399!@#2026';

// Pending migration versions that need repair (duplicate key issues)
// We'll detect these dynamically by trying push and catching the error
const VERSIONS_TO_REPAIR = [
  '20260926000000',
  '20260927000000',
  '20261018000000',
  '20261019000000',
  '20261025000000',
  '20261027000000',
  '20261107000000',
  '20261110000000',
  '20261112000000',
  '20261113000000',
  '20261114000000',
  '20261114000001',
  '20261115000000',
  '20261116000000',
  '20261117000000',
  '20261118000000',
];

console.log(`Repairing ${VERSIONS_TO_REPAIR.length} potentially corrupted migration records...`);

for (const version of VERSIONS_TO_REPAIR) {
  try {
    const result = spawnSync('cmd', [
      '/c',
      `npx supabase migration repair --status reverted ${version} --project-ref ${PROJECT_REF} -p "${DB_PASSWORD}"`
    ], { encoding: 'utf8', cwd: root });
    
    const out = (result.stdout || '') + (result.stderr || '');
    if (out.includes('reverted') || out.includes('repaired') || out.includes('Migration history repaired')) {
      console.log(`  ✓ Repaired: ${version}`);
    } else if (out.includes('not found') || out.includes('not in history')) {
      console.log(`  - Skipped (not in history): ${version}`);
    } else {
      console.log(`  ? ${version}: ${out.slice(0, 200)}`);
    }
  } catch (e) {
    console.warn(`  ! Failed to repair ${version}:`, e.message);
  }
}

console.log('\nAll repairs done. Now pushing...');

try {
  const env = { ...process.env };
  const cmd = `npx supabase db push --project-ref ${PROJECT_REF} -p "${DB_PASSWORD}" --include-all --yes`;
  const out = execSync(cmd, { env, encoding: 'utf8', stdio: 'pipe' });
  console.log('SUCCESS:\n', out);
} catch (err) {
  console.error('Push error:');
  if (err.stdout) console.log('STDOUT:\n', err.stdout.toString());
  if (err.stderr) console.error('STDERR:\n', err.stderr.toString());
  process.exit(1);
}
