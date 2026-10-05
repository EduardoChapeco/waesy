import fs from 'fs';
import path from 'path';
import { lintSource, loadConfig } from '../../../scripts/design-lint.mjs';

const config = loadConfig();

const targetFiles = [
  'src/routes/_store.diretorio.index.tsx',
  'src/routes/_store.empregos.index.tsx',
  'src/routes/_store.eventos.tsx',
  'src/routes/_store.noticias.index.tsx',
  'src/services/directory.functions.ts',
  'src/services/jobs.functions.ts',
  'src/services/news.functions.ts',
  'src/services/mining/event-harvester.ts'
];

const results = {};

for (const file of targetFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const violations = lintSource(content, file, config);
  results[file] = {
    total: violations.length,
    bySeverity: { P0: 0, P1: 0, P2: 0, P3: 0 },
    violations: violations.map(v => ({
      id: v.id,
      line: v.line,
      severity: v.severity,
      match: v.match,
      message: v.message
    }))
  };
  for (const v of violations) {
    results[file].bySeverity[v.severity] = (results[file].bySeverity[v.severity] || 0) + 1;
  }
}

console.log(JSON.stringify(results, null, 2));
