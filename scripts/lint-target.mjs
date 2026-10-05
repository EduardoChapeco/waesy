import path from 'path';
import { loadConfig, lintFiles } from './design-lint.mjs';

const targetPattern = process.argv[2];
if (!targetPattern) {
  console.log('Uso: node scripts/lint-target.mjs <padrao-ou-arquivo>');
  process.exit(1);
}

const config = loadConfig();
const normalized = targetPattern.replace(/\\/g, '/');
const fullPath = path.resolve(normalized);

const violations = lintFiles([fullPath], config);
console.log(`\nViolações em ${path.basename(fullPath)}: ${violations.length}`);
const byRule = {};
for (const v of violations) {
  byRule[v.rule] = (byRule[v.rule] || 0) + 1;
}
console.log('Por Regra:', byRule);
console.log('\nPrimeiras 30 violações:');
for (const v of violations.slice(0, 30)) {
  console.log(`[${v.severity}] ${v.rule} L${v.line}: ${v.message} => "${v.text || ''}"`);
}
