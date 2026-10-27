import fs from 'fs';
import path from 'path';
import { loadConfig, lintSource } from '../scripts/design-lint.mjs';

const target = process.argv[2];
if (!target) {
  console.error('Target file missing');
  process.exit(1);
}

const resolved = path.resolve(target);
const content = fs.readFileSync(resolved, 'utf8');
const cfg = loadConfig();
const viols = lintSource(content, resolved, cfg);

console.log(`Violations in ${target}: ${viols.length}`);
for (const v of viols) {
  console.log(`  L${v.line} [${v.rule}] (${v.severity}): ${v.message}`);
}
