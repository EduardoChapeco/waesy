import fs from 'fs';
import path from 'path';
import { loadConfig, lintSource } from '../scripts/design-lint.mjs';

const cfg = loadConfig();

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'legacy_quarantine'].includes(item.name)) {
        results = results.concat(walk(full));
      }
    } else if (['.tsx', '.ts', '.jsx', '.js', '.css'].some(ext => item.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(path.resolve('src'));
const dl15 = [];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const viols = lintSource(content, f, cfg);
  for (const v of viols) {
    if (v.rule === 'DL-15') {
      dl15.push({ file: path.relative(process.cwd(), f), line: v.line, match: v.match });
    }
  }
}

console.log(`Total DL-15 found: ${dl15.length}`);
const map = {};
for (const item of dl15) {
  map[item.file] = (map[item.file] || 0) + 1;
}
for (const [k, v] of Object.entries(map)) {
  console.log(`  ${v} in ${k}`);
}
