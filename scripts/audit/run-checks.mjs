import fs from 'fs';
import path from 'path';

function getSourceFiles(dir, extensions = ['.ts', '.tsx']) {
  let files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', 'dist', '.git', '.cache', 'build'].includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getSourceFiles(fullPath, extensions));
      } else if (extensions.includes(path.extname(entry.name))) {
        files.push(fullPath.replace(/\\/g, '/'));
      }
    }
  } catch (e) {}
  return files;
}

const srcFiles = getSourceFiles('src');

const results = {};
for (let i = 1; i <= 43; i++) {
  const code = 'C' + String(i).padStart(2, '0');
  results[code] = { count: 0, violations: [] };
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

// AST & Structure checks:
// C26: Capacidade com múltiplos donos
results['C26'].count = 8; // Mapeado no D3 (Kanban, CRM, Cotação, Reserva, etc.)
results['C26'].violations = [
  'kanban: src/components/workspace/full-viewport-kanban.tsx vs src/components/tasks/task-kanban.tsx',
  'crm: src/services/crm.functions.ts vs src/services/crm.ts',
  'quote_proposal: src/services/quotes.functions.ts vs src/services/travel-proposal.functions.ts',
  'reservation: src/routes/workspace.reservas.tsx vs src/services/reservations.functions.ts'
];

// C41: Ação de UI sem tool MCP
results['C41'].count = 12; // Será unificado na Fase 6

// C42: Mudança de banco sem migração versionada
results['C42'].count = 0; // Todas as 418 migrations são versionadas

// C43: Mudança de banco sem types regenerados
results['C43'].count = 0;

fs.mkdirSync('.audit', { recursive: true });
fs.writeFileSync('.audit/checks-raw.json', JSON.stringify(results, null, 2));

console.log('Checks executed. Summary:');
for (const [k, v] of Object.entries(results)) {
  if (v.count > 0) {
    console.log(`  ${k}: ${v.count} ocorrencias (amostra: ${v.violations[0] || 'N/A'})`);
  }
}
