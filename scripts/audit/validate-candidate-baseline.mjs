import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const manifestPath = 'docs/audits/CANDIDATE-BASELINE-cad8e3da.json';
const allowDirty = process.argv.includes('--allow-dirty');

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}
function fail(message) {
  console.error(`CANDIDATE_BASELINE_FAIL: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(manifestPath)) {
  fail(`manifesto ausente: ${manifestPath}`);
  process.exit();
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const head = git('rev-parse', 'HEAD');
const sourceTree = git('rev-parse', `${manifest.sourceCommit}^{tree}`);
const currentBase = git('merge-base', manifest.baseCommit, 'HEAD');
const trackedCount = Number(git('ls-tree', '-r', '--name-only', manifest.sourceCommit).split('\n').filter(Boolean).length);
const dirty = git('status', '--porcelain');

if (sourceTree !== manifest.sourceTree) fail(`tree divergente: ${sourceTree} != ${manifest.sourceTree}`);
if (trackedCount !== manifest.trackedFileCount) fail(`contagem divergente: ${trackedCount} != ${manifest.trackedFileCount}`);
if (currentBase !== manifest.baseCommit) fail(`base não ancestral do candidato: ${currentBase} != ${manifest.baseCommit}`);
if (!allowDirty && dirty) fail(`worktree sujo:\n${dirty}`);
if (manifest.preflight?.lockfilePolicy !== 'package-lock.json only') fail('política de lockfile inesperada');
if (manifest.preflight?.externalCertification !== false) fail('manifesto não pode declarar certificação externa');

if (!process.exitCode) {
  console.log('CANDIDATE_BASELINE_PASS');
  console.log(JSON.stringify({ sourceCommit: manifest.sourceCommit, head, sourceTree, trackedCount, dirty: Boolean(dirty) }, null, 2));
}
