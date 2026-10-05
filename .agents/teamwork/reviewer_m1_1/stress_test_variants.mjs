import { lintSource } from '../../../scripts/design-lint.mjs';

const cases = [
  { name: '!hover:bg-red-500', code: '<div className="!hover:bg-red-500" />' },
  { name: '!sm:p-4', code: '<div className="!sm:p-4" />' },
  { name: '!md:hidden', code: '<div className="!md:hidden" />' },
];

for (const c of cases) {
  const violations = lintSource(c.code, 'src/test.tsx');
  console.log(`=== ${c.name} ===`);
  console.log(`Violations: ${violations.length}`);
  for (const v of violations) {
    console.log(`  [${v.id}] line ${v.line}: ${v.message} (${v.match})`);
  }
}
