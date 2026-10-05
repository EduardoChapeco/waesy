import fs from 'fs';
const report = JSON.parse(fs.readFileSync('design-lint.report.json', 'utf8'));
console.log('Sample violations by file:');
const p0List = report.violationsSample.filter(v => v.severity === 'P0');
console.log('P0 count:', p0List.length);
for (const v of p0List) {
  console.log(`${v.file}:${v.line} [${v.id}] ${v.message} (match: ${v.match})`);
}
