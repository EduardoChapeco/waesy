import fs from 'node:fs';
import path from 'node:path';

const ledgerPath = path.resolve('docs/audits/W0-W17-RELEASE-LEDGER-20261012.json');
const strict = process.argv.includes('--require-release');
const allowedStatuses = new Set(['open', 'partial', 'blocked', 'verified']);
const expectedIds = Array.from({ length: 18 }, (_, index) => `W${index}`);

function fail(message) {
  console.error(`RELEASE_LEDGER_FAIL: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(ledgerPath)) {
  fail(`ledger ausente: ${ledgerPath}`);
  process.exit();
}

let ledger;
try {
  ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
} catch (error) {
  fail(`JSON inválido: ${error.message}`);
  process.exit();
}

const phases = Array.isArray(ledger.phases) ? ledger.phases : [];
const ids = phases.map((phase) => phase.id);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
const missing = expectedIds.filter((id) => !ids.includes(id));
const unexpected = ids.filter((id) => !expectedIds.includes(id));

if (missing.length) fail(`fases ausentes: ${missing.join(', ')}`);
if (unexpected.length) fail(`fases inesperadas: ${unexpected.join(', ')}`);
if (duplicates.length) fail(`fases duplicadas: ${[...new Set(duplicates)].join(', ')}`);

for (const phase of phases) {
  if (!phase.id || !phase.name || !phase.priority || !phase.status) {
    fail(`fase incompleta: ${JSON.stringify(phase)}`);
  }
  if (!allowedStatuses.has(phase.status)) {
    fail(`${phase.id}: status inválido ${phase.status}`);
  }
  if (!Array.isArray(phase.evidence) || !Array.isArray(phase.gap)) {
    // `gap` is a string in the human-readable ledger; normalize this check below.
    if (!Array.isArray(phase.evidence) || typeof phase.gap !== 'string') {
      fail(`${phase.id}: evidence deve ser array e gap deve ser string`);
    }
  }
  if (phase.status === 'verified' && (!phase.evidence?.length || phase.gap)) {
    fail(`${phase.id}: verified exige evidência e gap vazio`);
  }
  if (phase.status !== 'verified' && !phase.gap) {
    fail(`${phase.id}: status não verificado exige gap explícito`);
  }
}

const p0Unverified = phases.filter(
  (phase) => phase.priority === 'P0' && phase.status !== 'verified',
);
if (strict && p0Unverified.length) {
  fail(`release não autorizado; P0 não verificados: ${p0Unverified.map((phase) => phase.id).join(', ')}`);
}

if (!process.exitCode) {
  const summary = phases.reduce((acc, phase) => {
    acc[phase.status] = (acc[phase.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`RELEASE_LEDGER_PASS: ${phases.length} fases W0-W17 válidas`);
  console.log(JSON.stringify({ summary, strict, p0Unverified: p0Unverified.map((phase) => phase.id) }, null, 2));
}
