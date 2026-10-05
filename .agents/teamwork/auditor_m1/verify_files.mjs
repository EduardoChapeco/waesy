import fs from 'node:fs';
import { lintSource } from '../../../scripts/design-lint.mjs';

const files = [
  'scripts/design-lint.mjs',
  'src/components/ui/button.tsx',
  'src/components/ui/empty-state.tsx',
  'src/routes/_store.diretorio.index.tsx',
  'src/routes/_store.empregos.index.tsx',
  'src/routes/_store.eventos.tsx',
  'src/routes/_store.noticias.index.tsx'
];

console.log("=== INDIVIDUAL FILE VERIFICATION ===");
let totalV = 0;
for (const f of files) {
  const content = fs.readFileSync(f, 'utf-8');
  const violations = lintSource(content, f);
  const p0 = violations.filter(v => v.severity === 'P0').length;
  const p1 = violations.filter(v => v.severity === 'P1').length;
  const p2 = violations.filter(v => v.severity === 'P2').length;
  const p3 = violations.filter(v => v.severity === 'P3').length;
  console.log(`${f}: Total=${violations.length} (P0=${p0}, P1=${p1}, P2=${p2}, P3=${p3})`);
  totalV += violations.length;
}

console.log(`\nGrand Total for Milestone 1 files: ${totalV}`);
if (totalV > 0) {
  process.exit(1);
} else {
  console.log("ALL 7 FILES HAVE ZERO VIOLATIONS!");
  process.exit(0);
}
