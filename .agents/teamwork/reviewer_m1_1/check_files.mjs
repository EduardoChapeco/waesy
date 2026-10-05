import { lintSource } from '../../../scripts/design-lint.mjs';
import fs from 'fs';

const files = [
  'src/routes/_store.diretorio.index.tsx',
  'src/routes/_store.empregos.index.tsx',
  'src/routes/_store.eventos.tsx',
  'src/routes/_store.noticias.index.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/empty-state.tsx',
  'scripts/design-lint.mjs',
];

let totalViolations = 0;
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const violations = lintSource(content, f);
  console.log(`File: ${f} -> ${violations.length} violations`);
  for (const v of violations) {
    console.log(`  [${v.severity}] ${v.id} (line ${v.line}): ${v.message} (match: "${v.match}")`);
    totalViolations++;
  }
}

console.log(`\nTOTAL: ${totalViolations} violations`);
