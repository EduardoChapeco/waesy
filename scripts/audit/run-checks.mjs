import fs from 'fs';
import path from 'path';
import { runForensicAudit } from './forensic-repo-audit.mjs';

function getSourceFiles(dir, extensions = ['.ts', '.tsx']) {
  let files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', 'dist', '.git', '.cache', 'build', 'legacy_quarantine'].includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__') continue;
        files = files.concat(getSourceFiles(fullPath, extensions));
      } else if (extensions.includes(path.extname(entry.name)) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
        files.push(fullPath.replace(/\\/g, '/'));
      }
    }
  } catch (e) {}
  return files;
}

const srcFiles = getSourceFiles('src');

const EVALUATED_IN_THIS_SCRIPT = new Set([
  'C01', 'C02', 'C03', 'C06', 'C07', 'C08', 'C09', 'C18', 'C22', 'C23', 'C26', 'C27', 'C28', 'C29', 'C37', 'C40', 'C42', 'C43'
]);

const results = {};
for (let i = 1; i <= 43; i++) {
  const code = 'C' + String(i).padStart(2, '0');
  results[code] = {
    count: 0,
    evaluated: EVALUATED_IN_THIS_SCRIPT.has(code),
    violations: []
  };
}

srcFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // C01: Cores cruas (hex or rgb or text-slate- / text-gray-)
    if (/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|(bg|text)-(slate|gray|zinc|neutral|stone)-[0-9]{2,3})/i.test(line)) {
      if (!file.includes('tokens') && !file.includes('styles.css') && !line.includes('//') && !line.includes('/*')) {
        results['C01'].count++;
        if (results['C01'].violations.length < 5) results['C01'].violations.push(`${file}:${lineNum}`);
      }
    }

    // C02: Raio fora do token (rounded-[...])
    if (/rounded-\[[^\]]+\]/.test(line)) {
      results['C02'].count++;
      if (results['C02'].violations.length < 5) results['C02'].violations.push(`${file}:${lineNum}`);
    }

    // C03: Espaço fora da escala (p-[...], m-[...], gap-[...])
    if (/(p|m|gap|px|py|pl|pr|pt|pb|mx|my|ml|mr|mt|mb)-\[[0-9]+px\]/.test(line)) {
      results['C03'].count++;
      if (results['C03'].violations.length < 5) results['C03'].violations.push(`${file}:${lineNum}`);
    }

    // C06: Gradiente decorativo
    if (/(bg-gradient|from-|via-|to-)/.test(line) && !file.includes('ui/')) {
      results['C06'].count++;
      if (results['C06'].violations.length < 5) results['C06'].violations.push(`${file}:${lineNum}`);
    }

    // C07: Glassmorphism (backdrop-blur)
    if (/backdrop-blur/.test(line)) {
      results['C07'].count++;
      if (results['C07'].violations.length < 5) results['C07'].violations.push(`${file}:${lineNum}`);
    }

    // C08: Emoji em JSX
    if (/[\u{1F300}-\u{1F9FF}]/u.test(line) && !line.includes('//')) {
      results['C08'].count++;
      if (results['C08'].violations.length < 5) results['C08'].violations.push(`${file}:${lineNum}`);
    }

    // C09: Sombra em superfície (shadow-md, shadow-lg fora de overlay)
    if (/shadow-(md|lg|xl|2xl)/.test(line) && !file.includes('dialog') && !file.includes('sheet') && !file.includes('popover')) {
      results['C09'].count++;
      if (results['C09'].violations.length < 5) results['C09'].violations.push(`${file}:${lineNum}`);
    }

    // C18: 100vh em vez de 100dvh
    if (/(h-screen|min-h-screen|100vh)/.test(line)) {
      results['C18'].count++;
      if (results['C18'].violations.length < 5) results['C18'].violations.push(`${file}:${lineNum}`);
    }

    // C22: MOCK_/dummy/fake/sample/Lorem
    if (/\b(mock|dummy|lorem|fakeData|sampleData)\b/i.test(line) && !file.includes('.test.') && !file.includes('.spec.')) {
      results['C22'].count++;
      if (results['C22'].violations.length < 5) results['C22'].violations.push(`${file}:${lineNum}`);
    }

    // C23: any, as any, @ts-ignore, eslint-disable
    if (/(\bas any\b|:\s*any\b|@ts-ignore|eslint-disable)/.test(line) && !file.includes('.test.')) {
      results['C23'].count++;
      if (results['C23'].violations.length < 5) results['C23'].violations.push(`${file}:${lineNum}`);
    }

    // C28: TODO/FIXME/XXX/HACK
    if (/\b(TODO|FIXME|XXX|HACK)\b/.test(line)) {
      results['C28'].count++;
      if (results['C28'].violations.length < 5) results['C28'].violations.push(`${file}:${lineNum}`);
    }

    // C37: setTimeout/setInterval em componentes
    if (/(setTimeout|setInterval)/.test(line) && file.includes('/components/')) {
      results['C37'].count++;
      if (results['C37'].violations.length < 5) results['C37'].violations.push(`${file}:${lineNum}`);
    }
  });
});

// AST & Structure checks reais (zero constantes falsas):
const astReport = runForensicAudit(process.cwd());

// C26: Duplicação de helpers / módulos @deprecated com múltiplos donos ou shims ativos
const dupHelpers = astReport.watchlistedDuplicates || [];
const depEntries = astReport.deprecatedWithCallers || [];
results['C26'].count = dupHelpers.length + depEntries.length;
results['C26'].violations = [
  ...dupHelpers.map((d) => `${d.name} (${d.count}x em ${d.uniqueFiles.length} arquivos)`),
  ...depEntries.slice(0, 10).map((d) => `@deprecated: ${d.relPath} (${d.nonTestCallersCount} callers)`)
].slice(0, 15);

// C27: Broken imports/re-exports + armadilhas de rotas pesadas com redirect incondicional
results['C27'].count = astReport.brokenImports.length + astReport.routeRedirectTraps.length;
results['C27'].violations = [
  ...astReport.brokenImports.map((b) => `broken import: ${b.file}:${b.line} -> ${b.specifier}`),
  ...astReport.routeRedirectTraps.map((r) => `redirect trap: ${r.relPath} (${r.loc} LOC, callers: ${r.importedByCount})`)
];

// C29: Clusters de funções AST clonadas em 3+ arquivos distintos
const multiFileClones = (astReport.astCloneClustersCount ? astReport.astClones : []).filter((c) => c.uniqueFilesCount >= 3);
results['C29'].count = multiFileClones.length;
results['C29'].violations = multiFileClones.slice(0, 10).map(
  (c) => `clone "${c.sampleName}" em ${c.uniqueFilesCount} arquivos`
);

// C40: Acesso direto ao banco (.from) fora da camada services/
const directDb = astReport.layerViolations.filter((v) => v.rule === 'NON_SERVICE_DIRECT_DB_QUERY');
results['C40'].count = directDb.length;
results['C40'].violations = directDb.slice(0, 10).map((v) => `${v.file} (${v.count}x .from)`);

// C42: Unicidade e não-vazio real das migrations versionadas
const migDir = path.join(process.cwd(), 'supabase', 'migrations');
const migViolations = [];
if (fs.existsSync(migDir)) {
  const seenVersions = new Map();
  for (const file of fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'))) {
    const m = file.match(/^(\d+)_(.+)\.sql$/);
    if (!m) {
      migViolations.push(`nome invalido: ${file}`);
      continue;
    }
    const ver = m[1];
    if (seenVersions.has(ver)) {
      migViolations.push(`versao duplicada ${ver}: ${seenVersions.get(ver)} vs ${file}`);
    } else {
      seenVersions.set(ver, file);
    }
    const sqlSize = fs.statSync(path.join(migDir, file)).size;
    if (sqlSize === 0) migViolations.push(`migration vazia: ${file}`);
  }
}
results['C42'].count = migViolations.length;
results['C42'].violations = migViolations.slice(0, 10);

// C43: Verificação real de src/integrations/supabase/types.ts sem `Database = any`
const supaTypesPath = path.join(process.cwd(), 'src', 'integrations', 'supabase', 'types.ts');
if (!fs.existsSync(supaTypesPath)) {
  results['C43'].count = 1;
  results['C43'].violations = ['src/integrations/supabase/types.ts ausente'];
} else {
  const typesContent = fs.readFileSync(supaTypesPath, 'utf8');
  if (/export\s+type\s+Database\s*=\s*any\b/.test(typesContent)) {
    results['C43'].count = 1;
    results['C43'].violations = ['src/integrations/supabase/types.ts declara Database = any'];
  }
}

// C41 permanece não computado por regex estática (coberto por reconciliação MCP na Onda 5)
results['C41'].evaluated = false;

fs.mkdirSync('.audit', { recursive: true });
fs.writeFileSync('.audit/checks-raw.json', JSON.stringify(results, null, 2));

console.log('Checks executed. Summary:');
for (const [k, v] of Object.entries(results)) {
  if (v.count > 0) {
    console.log(`  ${k}: ${v.count} ocorrencias (amostra: ${v.violations[0] || 'N/A'})`);
  }
}
